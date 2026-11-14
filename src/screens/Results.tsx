import { useState } from 'react'
import { ArrowLeft, BarChart3, CircleAlert, Code2, Compass, FileText, Heart, MapPin, Megaphone, Palette, RotateCw, Sparkles, Target } from 'lucide-react'
import { potentials, type Signal } from '../data/mockData'
import type { PotentialResult } from '../ai/types'
import PotensiRadar from '../components/PotensiRadar'
import { FallbackLabel, Page } from '../components/ui'
import { cx, type AppState } from '../lib'

type P = { state: AppState; patch: (p: Partial<AppState>) => void; reset: () => void }

const flipIcons = { megaphone: Megaphone, palette: Palette, chart: BarChart3, compass: Compass, heart: Heart, code: Code2 }
const flipTones = [
  { bg: 'bg-[#e9e2ff]', chip: 'bg-[#7c4dff] text-white', back: 'bg-[#2a1f66] text-white' },
  { bg: 'bg-[#d8f5e1]', chip: 'bg-leaf text-white', back: 'bg-[#0f3d26] text-white' },
  { bg: 'bg-[#ffe9cc]', chip: 'bg-[#c2410c] text-white', back: 'bg-[#4a2108] text-white' },
]

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
          <p className="mt-auto pt-4 text-sm text-white/70">{p.name} Â· keyakinan {r.confidence}</p>
        </div>
      </div>
    </div>
  )
}

export function Results({ state, patch }: P) {
  const [selected, setSelected] = useState<Signal[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const result = state.result

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
      <FallbackLabel show={state.fallback.analysis} className="mb-4" />
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

      {/* Ajakan memilih UMKM nyata di sekitar pengguna. */}
      <section className="sheet mt-12 flex flex-col gap-4 p-6 md:p-9" aria-labelledby="ajakan-misi">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <h2 id="ajakan-misi" className="text-[28px] leading-[1.15] tracking-[-0.02em] md:text-[40px]">
              Buktikan potensimu lewat misi UMKM
            </h2>
            <p className="mt-2 max-w-[56ch] text-muted">
              Pilih usaha di sekitarmu atau tambahkan sendiri, lalu Jeje merancang misinya.
            </p>
          </div>
          <button
            className="group relative inline-flex min-h-14 flex-none items-center justify-center gap-2.5 self-start overflow-hidden rounded-full bg-[#7c4dff] px-7 text-base font-semibold text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#15803d]/30 active:translate-y-0 active:scale-[0.98] md:self-auto cursor-pointer"
            onClick={() => patch({ screen: 'pickUmkm' })}
          >
            {/* Animasi warna hijau menyebar/swirl yang memenuhi tombol saat hover */}
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,_#22c55e_0%,_#16a34a_40%,_#15803d_80%)] opacity-0 scale-0 transition-all duration-500 ease-out group-hover:scale-100 group-hover:opacity-100 group-hover:rotate-180"
            />
            <Compass size={20} strokeWidth={2} className="relative z-10 transition-transform duration-500 ease-out group-hover:rotate-90 group-hover:scale-110" aria-hidden />
            <span className="relative z-10">Pilih UMKM-mu</span>
          </button>
        </div>
        {state.umkm && (
          <p className="text-sm text-muted">
            Terakhir kamu memilih <strong className="font-semibold text-ink">{state.umkm.name}</strong>.
            {state.mission
              ? ' Misi untuk usaha ini sudah dirancang.'
              : ' Lanjutkan dengan menceritakan masalahnya.'}
          </p>
        )}
      </section>

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
