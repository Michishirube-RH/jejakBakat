import { useEffect, useState } from 'react'
import { Check, TriangleAlert } from 'lucide-react'
import { questions, type Question } from '../data/mockData'
import Mentor, { MENTOR_NAME } from '../components/Mentor'
import { analyzePotential } from '../ai/analyzePotential'
import type { Answer } from '../ai/types'
import { BottomBar, Page, TRAIL_D } from '../components/ui'
import { cx, type AppState } from '../lib'

type P = { state: AppState; patch: (p: Partial<AppState>) => void; reset: () => void }

function Trail({ answered, total }: { answered: number; total: number }) {
  const done = answered / total
  return (
    <div className="mb-10">
      <div role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered} aria-label="Pertanyaan yang sudah dijawab">
        <svg viewBox="-6 -6 312 42" className="h-auto w-full" aria-hidden>
          <path d={TRAIL_D} fill="none" stroke="#e0dbce" strokeWidth="3" strokeLinecap="round" />
          <path className="trail trail-prog" pathLength={1} strokeDasharray="1 2" strokeDashoffset={1 - done} strokeWidth="3" d={TRAIL_D} />
        </svg>
      </div>
      <p className="mt-1 text-sm text-muted">{answered} dari {total} terjawab</p>
    </div>
  )
}

function Scale({ label, left, right, value, onChange }: { label: string; left: string; right: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="font-semibold">{label}
        <input type="range" min={0} max={100} value={value} onChange={(e) => onChange(+e.target.value)} />
      </label>
      <div className="flex justify-between text-sm text-muted"><span>{left}</span><span>{right}</span></div>
    </div>
  )
}

function QuestionBody({ q, a, set }: { q: Question; a: Answer | undefined; set: (a: Answer) => void }) {
  const chosen = a?.choice ?? []
  const toggle = (id: string) => {
    if (q.type === 'single') return set({ ...a, choice: [id] })
    set({ ...a, choice: chosen.includes(id) ? chosen.filter((c) => c !== id) : [...chosen, id] })
  }
  const answered = q.type === 'text' ? !!a?.text?.trim() : chosen.length > 0
  return (
    <div>
      {q.type !== 'text' && (
        <div className="flex flex-col gap-3" role={q.type === 'single' ? 'radiogroup' : 'group'} aria-label={q.text}>
          {q.options!.map((o) => {
            const on = chosen.includes(o.id)
            return (
              <button key={o.id} role={q.type === 'single' ? 'radio' : 'checkbox'} aria-checked={on} onClick={() => toggle(o.id)}
                className={cx('flex min-h-14 w-full items-center gap-4 rounded-[20px] border-2 px-5 py-3.5 text-left transition-colors', on ? 'border-[#7c4dff] bg-clay-soft' : 'border-line bg-white hover:bg-clay-soft')}>
                <span className={cx('grid h-6 w-6 flex-none place-items-center border-[1.5px]', q.type === 'single' ? 'rounded-full' : 'rounded-[4px]', on ? 'border-[#7c4dff] bg-[#7c4dff]' : 'border-ink/40')}>
                  {on && <Check size={15} strokeWidth={3} color="#fff" aria-label="Terpilih" />}
                </span>
                <span className={cx(on && 'font-semibold')}>{o.label}</span>
              </button>
            )
          })}
        </div>
      )}
      {q.type === 'text' && (
        <div>
          <label className="sr-only" htmlFor="ans">Jawabanmu</label>
          <textarea id="ans" rows={6} maxLength={300} value={a?.text ?? ''} placeholder={q.placeholder}
            onChange={(e) => set({ ...a, text: e.target.value })}
            className="sheet w-full resize-none p-6 text-xl leading-8 placeholder:font-sans placeholder:text-base placeholder:text-muted" />
          <div className="mt-1 flex justify-between text-sm text-muted"><span>Boleh dilewati.</span><span>{(a?.text ?? '').length}/300</span></div>
        </div>
      )}
      {q.hasFrequency && answered && (
        <div className="mt-8 flex flex-col gap-4 rounded-[20px] bg-white p-5">
          <Scale label="Seberapa sering?" left="jarang" right="sering" value={a?.frequency ?? 50} onChange={(v) => set({ ...a, frequency: v })} />
          <Scale label="Seberapa menyenangkan?" left="melelahkan" right="menyenangkan" value={a?.enjoyment ?? 50} onChange={(v) => set({ ...a, enjoyment: v })} />
        </div>
      )}
    </div>
  )
}

export function Quiz({ state, patch }: P) {
  const q = questions[state.qIndex]
  const a = state.answers[q.id]
  const last = state.qIndex === questions.length - 1
  const ok = q.type === 'text' ? true : (a?.choice?.length ?? 0) > 0
  const okMood = q.type === 'text' ? !!a?.text?.trim() : ok
  const answered = questions.filter((question) => {
    const answer = state.answers[question.id]
    return question.type === 'text' ? !!answer?.text?.trim() : (answer?.choice?.length ?? 0) > 0
  }).length
  return (
    <Page
      bottomBar={
        <BottomBar>
          <button className="btn-secondary" onClick={() => (state.qIndex === 0 ? patch({ screen: 'welcome' }) : patch({ qIndex: state.qIndex - 1 }))}>Kembali</button>
          <button className="btn-primary flex-1 !px-4" disabled={!ok}
            onClick={() => (last ? patch({ screen: 'loading' }) : patch({ qIndex: state.qIndex + 1 }))}>
            {last ? 'Lihat potensiku' : 'Lanjut'}
          </button>
        </BottomBar>
      }
    >
      <Trail answered={answered} total={questions.length} />
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[34px] leading-[1.1] tracking-[-0.02em] md:text-[48px]">{q.text}</h2>
        <Mentor mood={okMood ? 'happy' : 'thinking'} size={92} entrance={false} className="no-print flex-none" />
      </div>
      <p className="no-print mt-3 text-sm text-muted" role="status">{MENTOR_NAME}: {okMood ? 'Jawaban yang bagus. Lanjut kapan pun kamu siap.' : 'Tidak ada jawaban benar atau salah. Pilih yang paling mirip dirimu.'}</p>
      {q.hint && <p className="mt-2 text-sm text-muted">{q.hint}</p>}
      <div className="mt-6">
        <QuestionBody key={q.id} q={q} a={a} set={(na) => patch({ answers: { ...state.answers, [q.id]: na } })} />
      </div>
    </Page>
  )
}

export function Loading({ state, patch }: P) {
  const [err, setErr] = useState(false)
  const [try_, setTry] = useState(0)
  const [msg, setMsg] = useState(0)
  const hasAnswers = questions.some((q) => { const a = state.answers[q.id]; return a && (a.choice?.length || a.text?.trim()) })

  useEffect(() => {
    if (!hasAnswers) return
    let live = true
    setErr(false)
    const t = setTimeout(() => setMsg(1), 800)
    analyzePotential(state.answers)
      .then((result) => live && patch({ result, screen: 'results' }))
      .catch(() => live && setErr(true))
    return () => { live = false; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [try_])

  if (!hasAnswers)
    return (
      <Page><div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <h2 className="text-[40px] leading-[1.1]">Kamu belum menjawab apa pun</h2>
        <p className="mt-2 text-muted">Jawab minimal satu pertanyaan agar AI punya bahan untuk dibaca.</p>
        <button className="btn-primary mt-6" onClick={() => patch({ screen: 'quiz', qIndex: 0 })}>Mulai</button>
      </div></Page>
    )
  if (err)
    return (
      <Page><div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <TriangleAlert size={36} strokeWidth={1.75} className="text-ink" />
        <h2 className="mt-3 text-[40px] leading-[1.1]">Analisis belum berhasil</h2>
        <p className="mt-2 text-muted">Analisis belum berhasil. Coba lagi.</p>
        <button className="btn-primary mt-6" onClick={() => setTry(try_ + 1)}>Coba lagi</button>
      </div></Page>
    )
  const dots = [['-120px', '-60px'], ['110px', '-40px'], ['-80px', '70px'], ['100px', '60px']]
  return (
    <Page>
      <div className="flex min-h-[80vh] flex-col items-center justify-center text-center" role="status" aria-live="polite">
        <Mentor mood="thinking" size={150} />
        <div className="relative mt-4 h-40 w-full max-w-[320px]">
          <svg viewBox="-6 -6 312 42" className="absolute inset-x-0 top-6 w-full" aria-hidden>
            <path className="trail trail-draw" pathLength={1} strokeWidth="3" d={TRAIL_D} />
          </svg>
          {dots.map(([x, y], i) => (
            <span key={i} className="dot-gather absolute left-1/2 top-[74px] -ml-1.5 h-3 w-3 rounded-full bg-ink" style={{ ['--x' as string]: x, ['--y' as string]: y }} />
          ))}
          <div className="note-appear sheet absolute inset-x-8 bottom-0 flex flex-col gap-2 p-4 text-left">
            <span className="h-2 w-2/3 rounded bg-ink/80" /><span className="h-2 w-full rounded bg-line" /><span className="h-2 w-4/5 rounded bg-line" />
          </div>
        </div>
        <p className="mt-6 text-muted" key={msg}>{msg === 0 ? 'AI sedang membaca pola kebiasaanmu...' : 'Mencocokkan dengan potensi dan misi...'}</p>
      </div>
    </Page>
  )
}
