import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BarChart3, Check, CircleAlert, Code2, Coffee, Compass, FileText, Heart, MapPin, Megaphone, Palette, RotateCw, Shirt, Sparkles, Target, UtensilsCrossed } from 'lucide-react'
import { missions, potentials, type Mission, type Signal } from '../data/mockData'
import type { PotentialResult } from '../ai/types'
import Mentor, { MENTOR_NAME } from '../components/Mentor'
import { MentorSay } from '../components/Companion'
import PotensiRadar from '../components/PotensiRadar'
import { BackButton, BottomBar, Page, TRAIL_D } from '../components/ui'
import { cx, type AppState } from '../lib'

type P = { state: AppState; patch: (p: Partial<AppState>) => void; reset: () => void }

export function matchFor(m: Mission, state: AppState) {
  const top = state.result?.potentials ?? []
  for (const r of top) {
    const p = potentials.find((x) => x.id === r.potentialId)!
    if (p.signals.some((s) => m.matchSignals.includes(s))) return p
  }
  return potentials.find((x) => x.id === top[0]?.potentialId) ?? potentials[0]
}

const flipIcons = { megaphone: Megaphone, palette: Palette, chart: BarChart3, compass: Compass, heart: Heart, code: Code2 }
const flipTones = [
  { bg: 'bg-[#e9e2ff]', chip: 'bg-[#7c4dff] text-white', back: 'bg-[#2a1f66] text-white' },
  { bg: 'bg-[#d8f5e1]', chip: 'bg-leaf text-white', back: 'bg-[#0f3d26] text-white' },
  { bg: 'bg-[#ffe9cc]', chip: 'bg-[#c2410c] text-white', back: 'bg-[#4a2108] text-white' },
]

/** Titik masuk dan keluar kursor menjadi pusat penyebaran warna tombol. */
const fillOrigin = (e: React.PointerEvent<HTMLElement>) => {
  const b = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--x', `${e.clientX - b.left}px`)
  e.currentTarget.style.setProperty('--y', `${e.clientY - b.top}px`)
}

function MissionVisual({ missionId }: { missionId: string }) {
  if (missionId === 'm1') {
    return (
      <div className="mission-visual bg-[#fff0dd]" aria-label="Ilustrasi Warung Bu Sari">
        <svg viewBox="0 0 260 180" role="img">
          <path d="M34 74h192v82H34z" fill="#fff" />
          <path d="M26 74 46 35h168l20 39z" fill="#ff705d" />
          <path d="M46 35h168l-8 15H38z" fill="#f5e211" />
          <path d="M55 74v82M205 74v82" stroke="#2c2e2a" strokeWidth="4" />
          <path d="M75 99h72v57H75z" fill="#8ed462" />
          <path d="M160 98h31v58h-31z" fill="#e8fbee" stroke="#2c2e2a" strokeWidth="3" />
          <rect x="91" y="52" width="78" height="32" rx="16" fill="#fff" />
          <text x="130" y="73" textAnchor="middle" fontSize="14" fontWeight="700" fill="#2c2e2a">BU SARI</text>
          <ellipse cx="112" cy="121" rx="24" ry="10" fill="#fff" />
          <path d="M94 121q18 17 36 0" fill="#f59e0b" />
          <circle cx="48" cy="31" r="13" fill="#2ba0ff" />
          <path d="m43 31 4 4 7-9" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    )
  }
  if (missionId === 'm2') {
    return (
      <div className="mission-visual bg-[#e8f4ff]" aria-label="Ilustrasi Kopi Tetangga">
        <svg viewBox="0 0 260 180" role="img">
          <circle cx="52" cy="45" r="25" fill="#f5e211" />
          <path d="M35 139h188v17H35z" fill="#2c2e2a" />
          <path d="M69 62h115v77H69z" fill="#fff" />
          <path d="m59 62 15-29h105l15 29z" fill="#8ed462" />
          <path d="M88 85h78v54H88z" fill="#f5f1e4" />
          <path d="M99 97h37v29H99z" fill="#ff705d" />
          <path d="M136 103h8q14 0 14 10t-14 10h-8" fill="none" stroke="#2c2e2a" strokeWidth="4" />
          <path d="M105 94q5-12 10 0q5-12 10 0" fill="none" stroke="#2c2e2a" strokeWidth="3" strokeLinecap="round" />
          <rect x="91" y="44" width="72" height="28" rx="14" fill="#fff" />
          <text x="127" y="63" textAnchor="middle" fontSize="12" fontWeight="700" fill="#2c2e2a">KOPI</text>
          <path d="M197 72v67M190 83h30" stroke="#2c2e2a" strokeWidth="4" />
          <circle cx="205" cy="61" r="17" fill="#7c4dff" />
          <path d="M199 61h12M205 55v12" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    )
  }
  return (
    <div className="mission-visual bg-[#f2eaff]" aria-label="Ilustrasi Batik Ibu Lastri">
      <svg viewBox="0 0 260 180" role="img">
        <circle cx="212" cy="39" r="23" fill="#8ed462" />
        <path d="M54 37h152v119H54z" fill="#fff" />
        <path d="M44 58 65 27h132l19 31z" fill="#7c4dff" />
        <path d="M72 76h116v80H72z" fill="#ffcfb8" />
        <path d="M90 75v81M130 75v81M170 75v81" stroke="#fff" strokeWidth="4" />
        <path d="M72 96h116M72 135h116" stroke="#fff" strokeWidth="4" />
        <g fill="none" stroke="#c2410c" strokeWidth="3">
          <path d="M82 85q10 20 20 0q10 20 20 0" />
          <path d="M140 106q10 20 20 0q10 20 20 0" />
          <path d="M82 145q10-20 20 0q10-20 20 0" />
        </g>
        <rect x="89" y="38" width="82" height="29" rx="14" fill="#fff" />
        <text x="130" y="58" textAnchor="middle" fontSize="12" fontWeight="700" fill="#2c2e2a">BATIK LASTRI</text>
        <path d="m205 39 7 7 13-16" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function FlipCard({ r, rank, selected, onSelect }: { r: PotentialResult; rank: number; selected?: boolean; onSelect?: (signals: Signal[]) => void }) {
  const tilt = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const b = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - b.left) / b.width - 0.5
    const y = (e.clientY - b.top) / b.height - 0.5
    e.currentTarget.style.setProperty('--ry', `${x * 8}deg`)
    e.currentTarget.style.setProperty('--rx', `${-y * 8}deg`)
  }
  const untilt = (e: React.PointerEvent<HTMLDivElement>) => { e.currentTarget.style.setProperty('--ry', '0deg'); e.currentTarget.style.setProperty('--rx', '0deg') }
  const [flipped, setFlipped] = useState(false)
  const p = potentials.find((x) => x.id === r.potentialId)!
  const Icon = flipIcons[p.icon as keyof typeof flipIcons] ?? Compass
  const t = flipTones[rank % 3]
  const toggle = () => { setFlipped((f) => !f); onSelect?.(p.signals) }
  return (
    <div
      className={cx('flip h-[400px] cursor-pointer select-none rounded-[28px] outline-offset-4', flipped && 'is-flipped')}
      role="button" tabIndex={0} aria-pressed={flipped}
      aria-label={`${p.name}, keyakinan ${r.confidence}. ${flipped ? 'Tutup bukti' : 'Lihat bukti dari jawabanmu'}`}
      style={{ ['--i' as string]: rank }} onPointerMove={tilt} onPointerLeave={untilt}
      onClick={toggle} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle() } }}
    >
      <div className="flip-inner h-full w-full">
        <div className={cx('flip-face flip-front flex flex-col justify-between p-7', t.bg)}>
          <div>
            <div className="flex items-center justify-between">
              <span className={cx('flip-icon grid h-14 w-14 place-items-center rounded-2xl', t.chip)}><Icon size={28} strokeWidth={1.75} /></span>
              <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-medium">{rank === 0 ? 'Paling kuat' : `Peringkat ${rank + 1}`}</span>
            </div>
            <h3 className="mt-8 text-[34px] leading-[1.05] tracking-[-0.02em]">{p.name}</h3>
            <p className="mt-3 text-muted">{p.description}</p>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Keyakinan {r.confidence}</span>
            <span className="inline-flex items-center gap-1.5 text-muted"><RotateCw size={16} strokeWidth={1.75} />Balik kartu</span>
          </div>
        </div>
        <div className={cx('flip-face flip-back flex flex-col overflow-y-auto p-7', t.back)} aria-hidden={!flipped}>
          <h4 className="text-sm font-semibold text-white/80">Bukti dari jawabanmu</h4>
          {r.evidence.length === 0 && <p className="mt-3 text-white/80">Belum ada kutipan. Tambah jawaban teks agar buktinya lebih kuat.</p>}
          {r.evidence.map((e, j) => (
            <blockquote key={j} className="mt-4 border-l-[3px] border-white/60 pl-4">
              <p className="font-display text-xl leading-7">{e.quote}</p>
              <p className="mt-1 text-sm text-white/80">{e.explanation}</p>
            </blockquote>
          ))}
          <p className="mt-auto pt-4 text-sm text-white/70">{p.name} · keyakinan {r.confidence}</p>
        </div>
      </div>
    </div>
  )
}

export function Results({ state, patch }: P) {
  const [selected, setSelected] = useState<Signal[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const result = state.result
  const ordered = useMemo(() => {
    if (!result) return missions
    const topSignals = potentials.find((p) => p.id === result.potentials[0]?.potentialId)?.signals ?? []
    const rank = (m: Mission) => m.matchSignals.filter((s) => topSignals.includes(s)).length
    return [...missions].sort((a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id))
  }, [result])

  if (!result)
    return (
      <Page><div className="flex min-h-[70vh] flex-col justify-center">
        <h2 className="text-[40px] leading-[1.1]">Potensimu belum terbaca</h2>
        <p className="mt-2 text-muted">Jawab kuesioner dulu agar kami bisa menunjukkan potensimu.</p>
        <button className="btn-primary mt-6 self-start" onClick={() => patch({ screen: 'quiz', qIndex: 0 })}>Mulai</button>
      </div></Page>
    )



  return (
    <Page narrow={false}>
      <p className="text-muted">Halo, ini hasil bacaan dari jawabanmu.</p>
      <h1 className="mt-1 text-[clamp(56px,11vw,140px)] leading-[0.95] tracking-[-0.03em]">Potensimu</h1>

      <div className="mt-14 rounded-[32px] border border-line bg-white p-5 md:mt-20 md:px-10 md:py-6">
        <PotensiRadar answers={state.answers} highlight={selected} />
      </div>

      <p className="mb-4 mt-10 text-muted">Klik kartu untuk membalik dan menyorot dua sumbu yang berkaitan di grafik.</p>
      <div className="grid gap-5 md:grid-cols-3">
        {result.potentials.map((r, i) => (
          <FlipCard key={r.potentialId} r={r} rank={i} selected={selectedId === r.potentialId}
            onSelect={(sig) => { setSelectedId(selectedId === r.potentialId ? null : r.potentialId); setSelected(selectedId === r.potentialId ? [] : sig) }} />
        ))}
      </div>

      <aside className="sheet mt-12 max-w-[640px] p-7">
        <p className="font-semibold">Catatan jujur</p>
        <p className="mt-1 text-muted">Ini gambaran awal dari 10 jawabanmu, bukan vonis. Uji lewat tindakan nyata dan coba lagi seiring waktu.</p>
      </aside>

      
      <h2 className="mt-4 text-[40px] leading-[1.1] tracking-[-0.02em] md:text-[53px]">Buktikan potensimu lewat misi UMKM</h2>
      <ul className="mt-6 flex flex-col gap-4">
        {ordered.map((m) => {
          const match = matchFor(m, state)
          return (
            <li key={m.id} className="sheet mission-card grid overflow-hidden md:grid-cols-[240px_1fr_auto] md:items-center">
              <MissionVisual missionId={m.id} />
              <div className="p-6 md:p-7">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-2xl leading-8">{m.businessName}</h3>
                  <span className="rounded-full bg-paper px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-line">
                    Misi contoh untuk demo
                  </span>
                </div>
                <p className="text-sm text-muted">{m.businessType} · {m.location}</p>
                <p className="mt-4">{m.summary}</p>
                <p className="mt-2 text-sm text-muted">{m.duration} · {m.difficulty}</p>
                <span className="chip on mt-3">Cocok dengan: {match.name}</span>
              </div>
              <button className="btn-secondary btn-fill mx-6 mb-6 justify-self-start md:mb-0 md:ml-0 md:mr-7" onPointerEnter={fillOrigin} onPointerLeave={fillOrigin} onClick={() => patch({ viewMissionId: m.id, screen: 'mission' })}>Lihat misi</button>
            </li>
          )
        })}
      </ul>

      <div className="mt-10">
        <button
          className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#7c4dff] px-7 text-base font-semibold text-white"
          onClick={() => patch({ screen: 'quiz', qIndex: 0, answers: {}, result: null })}>
          <ArrowLeft size={20} strokeWidth={2} aria-hidden />
          Ulangi kuesioner
        </button>
      </div>
    </Page>
  )
}

const BUSINESS_LOGO: Record<string, { icon: typeof Coffee; tone: string }> = {
  m1: { icon: UtensilsCrossed, tone: 'bg-[#ffe9cc] text-[#c2410c]' },
  m2: { icon: Coffee, tone: 'bg-[#e3f0ff] text-[#1d6fd1]' },
  m3: { icon: Shirt, tone: 'bg-[#e9e2ff] text-[#5b32d6]' },
}

function Section({ title, icon: Icon, tone, children }: { title: string; icon: typeof Target; tone: string; children: React.ReactNode }) {
  return (
    <section className="sheet flex flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <span aria-hidden className={cx('grid h-10 w-10 flex-none place-items-center rounded-xl', tone)}><Icon size={20} strokeWidth={1.75} /></span>
        <h3 className="font-sans text-lg font-semibold leading-6 tracking-normal">{title}</h3>
      </div>
      <div className="text-[15px] leading-7 text-ink/85">{children}</div>
    </section>
  )
}

export function MissionDetail({ state, patch }: P) {
  const m = missions.find((x) => x.id === state.viewMissionId)
  const [taken, setTaken] = useState(false)
  useEffect(() => {
    if (!taken || !m) return
    const t = setTimeout(() => {
      const keep = state.missionId === m.id
      patch({ missionId: m.id, screen: 'workspace', ...(keep ? {} : { stepDone: {}, tasks: {}, notes: {}, chats: {} }) })
    }, 1100)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taken])
  if (!m) { patch({ screen: 'results' }); return null }

  const match = matchFor(m, state)
  const logo = BUSINESS_LOGO[m.id] ?? BUSINESS_LOGO.m1
  const LogoIcon = logo.icon
  const take = (
    <button className="btn-primary w-full" disabled={taken} onClick={() => setTaken(true)}>Ambil misi ini</button>
  )
  return (
    <Page narrow={false} bottomBar={<div className="lg:hidden"><BottomBar>{take}</BottomBar></div>}>
      <BackButton onClick={() => patch({ screen: 'results' })} />
      <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <div className="sheet overflow-hidden md:grid md:grid-cols-[1fr_230px]">
            <div className="flex flex-col justify-center gap-4 p-6 md:p-8">
              <div className="flex items-center gap-4">
                <span aria-hidden className={cx('grid h-16 w-16 flex-none place-items-center rounded-[20px]', logo.tone)}><LogoIcon size={32} strokeWidth={1.75} /></span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-[34px] leading-[1.1] md:text-[42px]">{m.businessName}</h1>
                    <span className="rounded-full bg-paper px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-line">
                      Misi contoh untuk demo
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-muted">
                <p className="font-medium text-ink">{m.businessType}</p>
                <p className="mt-0.5 flex items-center gap-1 text-sm"><MapPin size={14} strokeWidth={1.75} className="flex-none" />{m.location}</p>
              </div>
              <p className="flex items-start gap-2 rounded-2xl bg-clay-soft px-4 py-3 text-sm leading-5">
                <Sparkles size={16} strokeWidth={1.75} className="mt-0.5 flex-none text-[#5b32d6]" />
                <span>Cocok dengan potensi <strong className="font-semibold">{match.name}</strong></span>
              </p>
            </div>
            <MissionVisual missionId={m.id} />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Section title="Masalah" icon={CircleAlert} tone="bg-[#ffe9cc] text-[#c2410c]"><p>{m.problem}</p></Section>
            <Section title="Targetmu" icon={Target} tone="bg-[#e9e2ff] text-[#5b32d6]"><p>{m.target}</p></Section>
            <Section title="Skill yang akan kamu latih" icon={Sparkles} tone="bg-[#d8f5e1] text-leaf">
              <div className="flex flex-wrap gap-2">{m.skills.map((sk) => <span key={sk} className="chip !min-h-9 !text-sm">{sk}</span>)}</div>
            </Section>
            <Section title="Hasil akhir yang kamu dapat" icon={FileText} tone="bg-[#e3f0ff] text-[#1d6fd1]"><p>{m.deliverable}</p></Section>
          </div>

          <section className="sheet mt-4 p-6">
            <h3 className="font-sans text-lg font-semibold leading-6 tracking-normal">Langkah yang akan kamu jalani</h3>
            <ol className="mt-5 grid gap-4 md:grid-cols-3">
              {m.roadmap.map((r, i) => (
                <li key={r.id} className="flex flex-col gap-2 rounded-[20px] bg-clay-soft p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[#7c4dff] text-sm font-semibold text-white">{i + 1}</span>
                    <p className="font-semibold leading-5">{r.title}</p>
                  </div>
                  <p className="text-sm leading-6 text-muted">{r.goal}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="sheet flex flex-col items-center p-6 text-center">
            <Mentor mood="idle" size={240} entrance={false} interactive />
            <p className="mt-3 text-muted"><span className="font-semibold text-ink">{MENTOR_NAME}:</span> Mentor AI akan memandumu langkah demi langkah. Kamu yang mengerjakan, AI yang membimbing.</p>
          </div>
          <dl className="sheet grid grid-cols-3 divide-x divide-line p-2 text-center">
            <div className="p-3"><dt className="text-xs text-muted">Durasi</dt><dd className="mt-1 text-sm font-semibold">{m.duration}</dd></div>
            <div className="p-3"><dt className="text-xs text-muted">Tingkat</dt><dd className="mt-1 text-sm font-semibold">{m.difficulty}</dd></div>
            <div className="p-3"><dt className="text-xs text-muted">Langkah</dt><dd className="mt-1 text-sm font-semibold">{m.roadmap.length}</dd></div>
          </dl>
          <div className="hidden lg:block">{take}</div>
        </aside>
      </div>
      {taken && (
        <div role="status" className="fixed inset-0 z-30 grid place-items-center bg-white/90">
          <div className="sheet flex items-center gap-3 px-6 py-5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-leaf"><Check size={20} strokeWidth={2.5} color="#fff" /></span>
            <p className="text-2xl">Misi diambil</p>
          </div>
        </div>
      )}
    </Page>
  )
}
