import { useEffect, useRef, useState } from 'react'
import { BarChart3, Code2, Compass, Heart, Megaphone, Palette } from 'lucide-react'
import { questions, signalMap, type Signal } from '../data/mockData'
import type { Answers } from '../ai/types'
import Mentor from './Mentor'

const AXES = Object.keys(signalMap) as Signal[]

// Data contoh bila pengguna belum punya jawaban tersimpan
const SAMPLE: Record<Signal, number> = { komunikasi: 6.2, visual: 8.4, analitis: 3.1, organisasi: 5.0, empati: 7.3, teknologi: 4.2 }

/**
 * Skor per sumbu memakai rumus yang sama dengan analyzePotential:
 * bobot = 1 + (frekuensi + kesenangan) / 200, ditambah 1,5 per kata kunci pada jawaban teks.
 */
export function scoreSignals(answers: Answers): Record<Signal, number> | null {
  const scores = Object.fromEntries(AXES.map((s) => [s, 0])) as Record<Signal, number>
  let any = false
  for (const q of questions) {
    const a = answers[q.id]
    if (!a) continue
    const weight = 1 + ((a.frequency ?? 50) + (a.enjoyment ?? 50)) / 200
    for (const id of a.choice ?? []) {
      const opt = q.options?.find((o) => o.id === id)
      if (!opt) continue
      any = true
      for (const s of opt.signals) scores[s] += weight
    }
    const text = a.text?.trim().toLowerCase()
    if (text) {
      for (const s of AXES) {
        const hits = signalMap[s].keywords.filter((k) => text.includes(k))
        if (hits.length) { any = true; scores[s] += hits.length * 1.5 }
      }
    }
  }
  return any ? scores : null
}

const ARCHETYPE: Record<Signal, { code: string; name: string; icon: typeof Heart; line: string }> = {
  komunikasi: { code: 'K', name: 'Si Penghubung', icon: Megaphone, line: 'pandai merangkai cerita dan menyambungkan orang' },
  visual: { code: 'V', name: 'Si Perancang', icon: Palette, line: 'peka pada tampilan, warna, dan kesan pertama' },
  analitis: { code: 'A', name: 'Si Penganalisis', icon: BarChart3, line: 'senang mencari pola dan memutuskan dari data' },
  organisasi: { code: 'O', name: 'Si Pengatur', icon: Compass, line: 'mengubah kekacauan menjadi rencana yang jalan' },
  empati: { code: 'E', name: 'Si Pendamping', icon: Heart, line: 'memahami kebutuhan orang sebelum diminta' },
  teknologi: { code: 'T', name: 'Si Pembangun', icon: Code2, line: 'suka mencoba alat baru sampai masalah selesai' },
}

const CX = 280, CY = 160, R = 112
const LEVELS = 5
const point = (i: number, r: number) => {
  const a = (-90 + (360 / AXES.length) * i) * (Math.PI / 180)
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const
}

interface Props {
  answers: Answers
  /** Dua sumbu yang disorot (dari kartu potensi yang diketuk) */
  highlight?: Signal[]
  className?: string
}

export default function PotensiRadar({ answers, highlight = [], className = '' }: Props) {
  const real = scoreSignals(answers)
  const scores = real ?? SAMPLE
  const max = Math.max(...Object.values(scores), 1)
  const [mood, setMood] = useState<'celebrate' | 'idle'>('celebrate')
  const [run, setRun] = useState(0)
  const timer = useRef<number>(0)
  // Jeje menyambut hasil dengan salto lucu, lalu santai; ketuk Jeje untuk mengulang
  useEffect(() => {
    setMood('celebrate')
    timer.current = window.setTimeout(() => setMood('idle'), 2400)
    return () => window.clearTimeout(timer.current)
  }, [run])

  const ranked = [...AXES].sort((a, b) => scores[b] - scores[a])
  const top = ranked[0]
  const type = ranked.slice(0, 3).map((s) => ARCHETYPE[s].code).join('')
  const arch = ARCHETYPE[top]
  const Icon = arch.icon

  const ratio = (s: Signal) => Math.max(0.1, scores[s] / max)
  const value = (s: Signal) => ratio(s) * LEVELS
  const poly = AXES.map((s, i) => point(i, R * ratio(s)).join(',')).join(' ')
  const ring = (k: number) => AXES.map((_, i) => point(i, R * k).join(',')).join(' ')
  const on = (s: Signal) => highlight.includes(s)

  return (
    <div className={className}>
      <section aria-label="Karakter potensimu" className="mb-6 flex items-center gap-5 border-b border-line pb-6">
        <span aria-hidden className="grid h-24 w-24 flex-none place-items-center rounded-[28px] bg-[#e9e2ff]"><Icon size={44} strokeWidth={1.5} className="text-[#5b32d6]" /></span>
        <div>
          <h2 className="font-sans text-[28px] font-bold leading-9 tracking-normal">Karaktermu</h2>
          <p className="mt-1 text-xl"><strong className="font-bold">{type}</strong> ({arch.name})</p>
          <p className="mt-1 text-sm text-muted">Kecenderungan terkuatmu: {arch.line}.</p>
        </div>
      </section>
      <div className="flex w-full flex-col items-center justify-center gap-4 md:flex-row md:gap-10">
      <figure className="w-full max-w-[560px] flex-1">
        <svg viewBox="0 0 560 330" className="h-auto w-full" role="img"
          aria-label={`Grafik radar potensi, ${AXES.map((s) => `${signalMap[s].label} ${value(s).toFixed(1)}`).join(', ')}`}>
          <defs>
            <radialGradient id="radar-fill" cx="50%" cy="50%" r="70%">
              <stop offset="0" stopColor="#bbf7d0" stopOpacity="0.95" />
              <stop offset="1" stopColor="#22c55e" stopOpacity="0.75" />
            </radialGradient>
          </defs>
          {Array.from({ length: LEVELS }, (_, k) => <polygon key={k} points={ring((k + 1) / LEVELS)} fill="none" stroke="#8b6cff" strokeWidth="1.6" />)}
          {AXES.map((s, i) => {
            const [x, y] = point(i, R)
            return <line key={s} x1={CX} y1={CY} x2={x} y2={y} stroke={on(s) ? '#5b32d6' : '#8b6cff'} strokeWidth={on(s) ? 3.2 : 1.4} style={{ transition: 'stroke .25s, stroke-width .25s' }} />
          })}
          <g className="radar-shape">
            <polygon points={poly} fill="url(#radar-fill)" stroke="#16a34a" strokeWidth="2.5" strokeLinejoin="round" />
          </g>
          {AXES.map((s, i) => {
            if (!on(s)) return null
            const [x, y] = point(i, R * ratio(s))
            return <circle key={s} cx={x} cy={y} r="8" fill="#7c4dff" stroke="#fff" strokeWidth="2.5" />
          })}
          {AXES.map((s, i) => {
            const [x, y] = point(i, R + 18)
            const anchor = Math.abs(x - CX) < 4 ? 'middle' : x > CX ? 'start' : 'end'
            return (
              <text key={s} x={x + (anchor === 'start' ? 4 : anchor === 'end' ? -4 : 0)} y={y + (y < CY - R / 2 ? -2 : y > CY + R / 2 ? 8 : 4)} textAnchor={anchor} fontSize="15" fontWeight={on(s) ? 700 : 400}
                fill={on(s) ? '#5b32d6' : '#121212'} style={{ transition: 'fill .25s' }}>{signalMap[s].label}</text>
            )
          })}
        </svg>
        {!real && <figcaption className="text-center text-xs text-muted">Contoh data. Jawab kuesioner untuk melihat grafikmu.</figcaption>}
      </figure>
      <div key={run} className="jeje-tumble flex-none">
        <Mentor mood={mood} size={230} entrance={false} interactive onClick={() => setRun((r) => r + 1)} />
      </div>
      </div>
    </div>
  )
}
