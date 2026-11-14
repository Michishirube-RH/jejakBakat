import { useEffect, useRef, useState } from 'react'
import { Check, Home, Lock, Send, ListChecks, NotebookPen, ShieldCheck } from 'lucide-react'
import { mentorReply, type MentorIntent } from '../ai/mentor'
import { MentorSay } from '../components/Companion'
import { FallbackLabel, Page } from '../components/ui'
import { cx, type AppState, type ChatMsg } from '../lib'

type P = { state: AppState; patch: (p: Partial<AppState>) => void; reset: () => void }
type Msg = ChatMsg

const quick: { label: string; intent: MentorIntent }[] = [
  { label: 'Beri aku petunjuk', intent: 'hint' },
  { label: 'Periksa hasil kerjaku', intent: 'check' },
  { label: 'Contohnya seperti apa?', intent: 'example' },
]

export function Workspace({ state, patch }: P) {
  const mission = state.mission
  const firstOpen = mission ? mission.roadmap.findIndex((s) => !state.stepDone[s.id]) : 0
  const activeIdx = firstOpen === -1 ? (mission?.roadmap.length ?? 1) - 1 : firstOpen
  const [view, setView] = useState(activeIdx)
  const [chats, setChats] = useState<Record<string, Msg[]>>(state.chats ?? {})
  const [typing, setTyping] = useState(false)
  const [text, setText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const step = mission?.roadmap[view]
  const ck = (id: string) => `${mission?.id}:${id}`
  const msgs = (step && chats[ck(step.id)]) || []

  // Percakapan ikut tersimpan bersama progres
  useEffect(() => { patch({ chats }) }, [chats]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pesan pembuka mentor saat langkah dibuka
  useEffect(() => {
    if (!step) return
    setChats((c) => (c[ck(step.id)] ? c : { ...c, [ck(step.id)]: [{ from: 'mentor', text: step.mentorOpening }] }))
  }, [step])
  // Gulir hanya di dalam area chat, bukan seluruh halaman
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [msgs.length, typing])

  if (!mission || !step) {
    return (
      <Page>
        <div className="flex min-h-[60vh] flex-col justify-center">
          <h2 className="text-[34px] leading-[1.15]">Belum ada misi aktif</h2>
          <p className="mt-2 text-muted">Pilih UMKM dulu, lalu Jeje merancang misinya untukmu.</p>
          <button className="btn-primary mt-6 self-start" onClick={() => patch({ screen: 'pickUmkm' })}>
            Pilih UMKM
          </button>
        </div>
      </Page>
    )
  }

  const done = state.tasks[step.id] ?? step.tasks.map(() => false)
  const allDone = done.every(Boolean)
  const stepFinished = !!state.stepDone[step.id]
  const isLast = view === mission.roadmap.length - 1
  const tasksTotal = mission.roadmap.reduce((n, r) => n + r.tasks.length, 0)
  const tasksDone = mission.roadmap.reduce((n, r) => n + (state.tasks[r.id] ?? []).filter(Boolean).length, 0)

  const send = async (intent: MentorIntent, userText: string) => {
    if (typing) return
    const id = ck(step.id)
    const outgoing: Msg = { from: 'user', text: userText }
    setChats((c) => ({ ...c, [id]: [...(c[id] ?? []), outgoing] }))
    setTyping(true)
    const reply = await mentorReply(intent, userText, step.id, {
      mission,
      step,
      userNotes: state.notes[step.id],
      recentChats: [...msgs, outgoing].slice(-10),
    })
    setChats((c) => ({ ...c, [id]: [...(c[id] ?? []), { from: 'mentor', text: reply.text }] }))
    // Penanda bila balasan terakhir berasal dari cadangan lokal, bukan dari LLM.
    patch({ fallback: { ...state.fallback, mentorReply: reply.usedFallback ? id : '' } })
    setTyping(false)
  }
  const submit = () => {
    const t = text.trim().slice(0, 500)
    if (!t) return
    setText('')
    send('general', t)
  }

  const finish = () => {
    const stepDone = { ...state.stepDone, [step.id]: true }
    if (isLast) patch({ stepDone, screen: 'report' })
    else { patch({ stepDone }); setView(view + 1) }
  }

  return (
    <Page narrow={false}>
      <div className="mb-10 flex flex-wrap items-center gap-3">
        <button onClick={() => patch({ screen: 'welcome' })} className="btn-secondary !min-h-11 !px-4"><Home size={18} strokeWidth={1.75} />Beranda</button>
        <button onClick={() => patch({ screen: 'mission' })} className="btn-secondary !min-h-11 !px-4">Detail misi</button>
        <button onClick={() => patch({ screen: 'tellProblem' })} className="btn-secondary !min-h-11 !px-4">Ceritakan masalahnya</button>
        <p className="flex items-center gap-2 rounded-full bg-clay-soft px-4 py-2 text-sm" role="status">
          <Check size={16} strokeWidth={2} className="text-leaf" />
          Progres tersimpan otomatis · {tasksDone} dari {tasksTotal} tugas selesai
        </p>
      </div>
      <h1 className="pb-1 text-[34px] leading-[1.15] tracking-[-0.02em] md:text-[48px]">{mission.usaha}</h1>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        <span>{mission.jenisUsaha}</span>
        <span className={cx(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-semibold',
          mission.ownerPermissionGranted ? 'bg-[#d8f5e1] text-[#0f3d26]' : 'bg-paper ring-1 ring-line',
        )}>
          <ShieldCheck size={13} strokeWidth={1.75} aria-hidden />
          Izin pemilik: {mission.ownerPermissionGranted ? 'Sudah izin' : 'Belum dihubungi'}
        </span>
      </p>
      <p className="mt-4 max-w-[68ch] text-lg leading-8 text-muted">{mission.target}</p>

      <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-4">
          <ol className="sheet flex flex-col p-7" aria-label="Roadmap">
            {mission.roadmap.map((s, i) => {
              const fin = !!state.stepDone[s.id]
              const locked = i > activeIdx && !fin
              const active = i === view
              return (
                <li key={s.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < mission.roadmap.length - 1 && (
                    <span className={cx('absolute left-[19px] top-10 h-[calc(100%-36px)] w-[3px] rounded', fin ? 'bg-leaf' : 'bg-line')} />
                  )}
                  <button disabled={locked} onClick={() => setView(i)} aria-label={`Langkah ${i + 1}: ${s.title}${locked ? ', terkunci' : ''}`} aria-current={active ? 'step' : undefined}
                    className={cx('relative grid h-10 w-10 flex-none place-items-center rounded-full border-2 transition-colors',
                      fin ? 'border-leaf bg-leaf text-white' : locked ? 'border-line bg-white text-muted' : 'border-[#7c4dff] bg-white text-ink',
                      active && !locked && 'ring-4 ring-clay')}>
                    {fin ? <Check size={20} strokeWidth={2.5} /> : locked ? <Lock size={16} strokeWidth={1.75} /> : <span className="font-semibold">{i + 1}</span>}
                  </button>
                  <div className={cx('pt-1', locked && 'opacity-70')}>
                    <p className="text-xl leading-6">{s.title}</p>
                    <p className="text-sm text-muted">{s.goal}</p>
                  </div>
                </li>
              )
            })}
          </ol>

          <section className="sheet flex flex-1 flex-col p-7">
            <h2 className="flex items-center gap-2 text-xl leading-[26px]"><ListChecks size={20} strokeWidth={1.75} className="text-ink" />Tugas langkah {view + 1}</h2>
            <ul className="mt-3 flex flex-col gap-1">
              {step.tasks.map((t, i) => (
                <li key={t}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
                    <input type="checkbox" className="sr-only peer" checked={done[i]} disabled={stepFinished}
                      onChange={() => patch({ tasks: { ...state.tasks, [step.id]: done.map((d, j) => (j === i ? !d : d)) } })} />
                    <span className="pop mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-md border-2 border-ink/50 peer-checked:border-leaf peer-checked:bg-leaf peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky">
                      {done[i] && <Check size={16} strokeWidth={2.5} color="#fff" />}
                    </span>
                    <span className={cx(done[i] && 'text-muted line-through')}>{t}</span>
                  </label>
                </li>
              ))}
            </ul>
            <label className="mt-4 flex items-center gap-2 text-sm font-semibold" htmlFor="note"><NotebookPen size={16} strokeWidth={1.75} />Catatan hasil</label>
            <textarea id="note" rows={3} value={state.notes[step.id] ?? ''} onChange={(e) => patch({ notes: { ...state.notes, [step.id]: e.target.value } })}
              placeholder="Tulis temuan atau hasil kerjamu di sini."
              className="mt-2 min-h-[96px] w-full flex-1 resize-none rounded-[24px] bg-paper p-4 placeholder:text-muted" />
            <button className={cx("btn-primary mt-4 w-full", stepFinished && isLast && "hidden")} disabled={!allDone || stepFinished} onClick={finish}>
              {isLast ? 'Buat laporan dampakku' : 'Selesaikan langkah'}
            </button>
            {stepFinished && isLast && (
              <button className="btn-secondary mt-3 w-full" onClick={() => patch({ screen: 'report' })}>Buat laporan dampakku</button>
            )}
          </section>
        </div>

        <section className="sheet relative min-h-[640px]" aria-label="Percakapan dengan mentor">
          <div className="absolute inset-0 flex flex-col">
          <div className="shrink-0 px-6 pt-6">
            <MentorSay state={{ ...state, screen: 'workspace' }} size={120} className="border-b border-line pb-5" />
          </div>
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5" tabIndex={0} aria-label="Riwayat percakapan">
            <div className="flex flex-col gap-4" aria-live="polite">
              {msgs.map((m, i) => (
                <div key={i} className={cx('flex', m.from === 'user' && 'justify-end')}>
                  <p className={cx('max-w-[88%] leading-7',
                    m.from === 'mentor' ? 'border-l-[3px] border-[#7c4dff] pl-4 text-lg' : 'rounded-[20px] bg-clay-soft px-4 py-2')}>{m.text}</p>
                </div>
              ))}
              {typing && (
                <div className="flex items-center gap-2 border-l-[3px] border-[#7c4dff] pl-4 text-sm text-muted" role="status" aria-label="Jeje sedang mengetik">
                  Jeje sedang mengetik
                  <span className="flex gap-1">
                    {[0, 1, 2].map((d) => <i key={d} className="dot-blink h-1.5 w-1.5 rounded-full bg-muted" style={{ animationDelay: `${d * 0.2}s` }} />)}
                  </span>
                </div>
              )}
              <FallbackLabel show={state.fallback.mentorReply === ck(step.id)} />
            </div>
          </div>
          <div className="shrink-0 border-t border-line p-4">
            <div className="mb-2 flex flex-wrap gap-2">
              {quick.map((q) => <button key={q.intent} className="chip" disabled={typing} onClick={() => send(q.intent, q.label)}>{q.label}</button>)}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); submit() }} className="flex items-center gap-2 rounded-full border border-line bg-paper p-1.5 pl-5">
              <label htmlFor="chat" className="sr-only">Pesan untuk mentor</label>
              <input id="chat" maxLength={500} value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} placeholder="Tulis pesan untuk mentor (maksimal 500 karakter)" autoComplete="off"
                className="min-h-11 flex-1 bg-transparent placeholder:text-muted focus:outline-none" />
              {text.length > 400 && (
                <span className="text-xs text-muted pr-1" aria-live="polite">
                  {text.length}/500
                </span>
              )}
              <button type="submit" disabled={!text.trim() || typing} aria-label="Kirim"
                className="grid h-11 w-11 place-items-center rounded-full bg-coral disabled:opacity-40"><Send size={18} strokeWidth={1.75} color="#fff" /></button>
            </form>
          </div>
          </div>
        </section>
      </div>
    </Page>
  )
}
