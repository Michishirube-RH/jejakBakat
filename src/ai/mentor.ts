import { mentorReplies, sampleImpactReport, type Mission, type RoadmapStep, type SampleImpactReport } from '../data/mockData'

export type MentorIntent = 'hint' | 'check' | 'example' | 'general'
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const counters: Record<string, number> = {}

export interface MentorContext {
  mission?: Mission
  step?: RoadmapStep
  userNotes?: string
  recentChats?: Array<{ from: 'mentor' | 'user'; text: string }>
}

/**
 * Memanggil LLM untuk balasan mentor Jeje.
 * Mengirimkan misi, langkah aktif, catatan pengguna, 10 pesan chat terakhir, dan pesan pengguna.
 * Bila gagal atau terjadi timeout, otomatis menggunakan balasan statis terarah sebagai cadangan.
 */
export async function mentorReply(
  intent: MentorIntent,
  message: string,
  key: string,
  context?: MentorContext
): Promise<string> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'mentorReply',
        payload: {
          intent,
          message,
          mission: context?.mission
            ? {
                businessName: context.mission.businessName,
                businessType: context.mission.businessType,
                location: context.mission.location,
                problem: context.mission.problem,
                target: context.mission.target,
                ownerName: context.mission.ownerName,
              }
            : undefined,
          step: context?.step
            ? {
                title: context.step.title,
                goal: context.step.goal,
                tasks: context.step.tasks,
              }
            : undefined,
          userNotes: context?.userNotes,
          recentChats: context?.recentChats?.slice(-10),
        },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      if (data?.result && typeof data.result === 'string' && data.result.trim()) {
        return data.result.trim()
      }
    }
  } catch (err) {
    console.warn('Panggilan LLM mentor gagal atau timeout, beralih ke balasan cadangan.', err)
  }

  // Cadangan cerdas dan kontekstual dari data lokal
  await wait(600 + Math.random() * 400)
  const q = message.toLowerCase().trim()
  const biz = context?.mission?.businessName || 'UMKM ini'
  const owner = context?.mission?.ownerName || 'pemilik usaha'
  const stepTitle = context?.step?.title || 'langkah ini'
  const stepGoal = context?.step?.goal || 'tujuan langkah ini'

  if (q.includes('aku siapa') || q.includes('siapa aku')) {
    return `Kamu adalah peserta penjelajah bakat di JejakBakat AI yang sedang belajar sambil membantu Kak ${owner} (${biz}).`
  }
  if (q.includes('kamu siapa') || q.includes('siapa kamu')) {
    return `Aku Jeje, mentor AI-mu di JejakBakat AI! Aku siap mendampingimu langkah demi langkah menyelesaikan misi ${biz}.`
  }
  if (q.includes('maksud') || q.includes('tujuan') || q.includes('apa yang harus') || q.includes('ngapain') || q.includes('gimana')) {
    return `Di langkah "${stepTitle}", tujuan kita adalah ${stepGoal.toLowerCase()}. Coba fokus mulai dari tugas pertama dulu ya!`
  }
  if (q === 'oy' || q === 'halo' || q === 'hai' || q === 'tes' || q === 'p') {
    return `Halo! Yuk kita fokus lagi bantu Kak ${owner} di langkah "${stepTitle}". Ada bagian tugas yang membuatmu ragu?`
  }

  const list = mentorReplies[intent]
  const k = key + intent
  const i = (counters[k] = (counters[k] ?? -1) + 1)
  return list[i % list.length]
}

export interface ReportInput {
  mission: Mission
  userName: string
  notes: Record<string, string>
  potentialName: string
}

/**
 * Menyusun Impact Report berbasis misi aktif, catatan pengguna, dan ringkasan LLM.
 * Jika LLM gagal atau timeout, otomatis menggunakan fallback template lokal yang kontekstual.
 */
export async function buildImpactReport({ mission, userName, notes, potentialName }: ReportInput): Promise<SampleImpactReport> {
  const userNotes = mission.roadmap.map((s) => notes[s.id]?.trim()).filter(Boolean) as string[]

  let summary = userNotes.length
    ? `${mission.target} Catatan kerja: ${userNotes.join(' ')}`
    : `Menyelesaikan misi untuk ${mission.businessName} dengan target: ${mission.target}.`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'buildReportSummary',
        payload: {
          mission: {
            businessName: mission.businessName,
            businessType: mission.businessType,
            location: mission.location,
            problem: mission.problem,
            target: mission.target,
            ownerName: mission.ownerName,
          },
          userNotes,
          userName: userName || 'Peserta',
        },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      if (data?.result && typeof data.result === 'string' && data.result.trim()) {
        summary = data.result.trim()
      }
    }
  } catch (err) {
    console.warn('Panggilan LLM ringkasan laporan gagal atau timeout, memakai template cadangan.', err)
  }

  return {
    userName: userName || '',
    missionName: `Misi ${mission.businessName}: ${mission.target}`,
    date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    business: `${mission.businessName}, ${mission.location}`,
    summary,
    provenSkills: mission.skills || [],
    metrics: (mission.metricsOptions || []).map((opt) => ({
      label: opt.label,
      unit: opt.unit,
      before: '',
      after: '',
    })),
    hours: mission.estimatedHours || 6,
    ownerTestimonial: '',
    sampleTestimonial: mission.sampleTestimonial || '',
    ownerName: mission.ownerName || '',
    strengthenedPotential: potentialName,
    nextSteps: mission.nextSteps || [],
  }
}
