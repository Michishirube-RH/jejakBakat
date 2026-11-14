import { potentials, questions, signalMap, type Signal } from '../data/mockData'
import type { Answers, AnalysisResult, Evidence, PotentialResult } from './types'

const SIGNALS = Object.keys(signalMap) as Signal[]
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Menganalisis potensi pengguna.
 * Menghitung skor sinyal secara lokal (untuk radar dan cadangan), lalu mencoba
 * memanggil LLM melalui endpoint server /api/ai. Bila panggilan gagal atau timeout 15 detik,
 * otomatis menggunakan hasil lokal tanpa memunculkan error ke pengguna.
 */
export async function analyzePotential(answers: Answers): Promise<AnalysisResult> {
  // 1. Perhitungan Sinyal & Skor Lokal (Cadangan & Radar)
  const signalScores = Object.fromEntries(SIGNALS.map((s) => [s, 0])) as Record<Signal, number>
  const evidenceBySignal: Record<Signal, Evidence[]> = Object.fromEntries(SIGNALS.map((s) => [s, []])) as never

  for (const q of questions) {
    const a = answers[q.id]
    if (!a) continue
    // Frekuensi dan rasa senang memperkuat bobot sinyal (1 sampai 2)
    const weight = 1 + ((a.frequency ?? 50) + (a.enjoyment ?? 50)) / 200
    for (const id of a.choice ?? []) {
      const opt = q.options?.find((o) => o.id === id)
      if (!opt) continue
      for (const s of opt.signals) {
        signalScores[s] += weight
        evidenceBySignal[s].push({
          quote: opt.label,
          explanation: `Pilihan ini menunjukkan kecenderungan ${signalMap[s].label.toLowerCase()}.`,
        })
      }
    }
    const text = a.text?.trim()
    if (text) {
      const lower = text.toLowerCase()
      for (const s of SIGNALS) {
        const hits = signalMap[s].keywords.filter((k) => lower.includes(k))
        if (hits.length) {
          signalScores[s] += hits.length * 1.5
          evidenceBySignal[s].unshift({
            quote: text.length > 140 ? text.slice(0, 137) + '...' : text,
            explanation: `Kata "${hits[0]}" dalam ceritamu mengarah pada ${signalMap[s].label.toLowerCase()}.`,
          })
        }
      }
    }
  }

  const scored = potentials
    .map((p) => ({
      p,
      score: p.signals.reduce((sum, s) => sum + signalScores[s], 0),
    }))
    .sort((a, b) => {
      // Aturan seri skor konsisten: urutkan berdasarkan skor tertinggi, jika seri urutkan berdasarkan id
      if (Math.abs(b.score - a.score) > 0.0001) {
        return b.score - a.score
      }
      return a.p.id.localeCompare(b.p.id)
    })
    .slice(0, 3)

  const localResult: AnalysisResult = {
    signalScores,
    potentials: scored.map(({ p, score }, i) => {
      const seen = new Set<string>()
      const evidence = p.signals
        .flatMap((s) => evidenceBySignal[s])
        .filter((e) => (seen.has(e.quote) ? false : (seen.add(e.quote), true)))
        .slice(0, 2)
      const confidence = i === 0 && score >= 6 ? 'Tinggi' : score >= 3 ? 'Sedang' : 'Awal'
      return { potentialId: p.id, score, confidence, evidence }
    }),
  }

  // 2. Siapkan Rangkuman Jawaban & Potensi untuk LLM
  const answersSummary = questions
    .map((q) => {
      const a = answers[q.id]
      if (!a) return null
      const selectedLabels = (a.choice || [])
        .map((cid) => q.options?.find((o) => o.id === cid)?.label)
        .filter(Boolean)
      return {
        questionId: q.id,
        question: q.text,
        chosen: selectedLabels,
        frequency: a.frequency,
        enjoyment: a.enjoyment,
        textAnswer: a.text?.trim() || undefined,
      }
    })
    .filter(Boolean)

  const availablePotentials = potentials.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    signals: p.signals.map((s) => signalMap[s].label),
  }))

  // 3. Panggilan LLM ke serverless endpoint /api/ai dengan batas waktu 15 detik
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'analyzePotential',
        payload: {
          answersSummary,
          availablePotentials,
        },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      const llmPotentials = data?.result?.potentials
      if (Array.isArray(llmPotentials) && llmPotentials.length >= 2) {
        const validated: PotentialResult[] = llmPotentials.slice(0, 3).map((item: any) => {
          const match = potentials.find((p) => p.id === item.potentialId) || potentials[0]
          const localMatch = localResult.potentials.find((lp) => lp.potentialId === match.id)
          const score = localMatch?.score ?? match.signals.reduce((sum, s) => sum + signalScores[s], 0)
          const confidence = ['Tinggi', 'Sedang', 'Awal'].includes(item.confidence)
            ? item.confidence
            : 'Awal'
          const rawEv = Array.isArray(item.evidence) ? item.evidence : []
          const evidence: Evidence[] = rawEv.slice(0, 2).map((ev: any) => ({
            quote: String(ev.quote || '').trim(),
            explanation: String(ev.explanation || '').trim(),
          }))

          return {
            potentialId: match.id,
            score,
            confidence,
            evidence: evidence.length > 0 ? evidence : (localMatch?.evidence || []),
          }
        })

        return {
          signalScores,
          potentials: validated,
        }
      }
    }
  } catch (err) {
    console.warn('Panggilan LLM analisis potensi gagal atau melewati 15 detik, beralih ke analisis lokal.', err)
  }

  // Jeda kecil agar transisi animasi loading tetap terasa natural pada analisis lokal
  await wait(1200)
  return localResult
}
