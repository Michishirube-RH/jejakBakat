import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Check,
  CircleAlert,
  Clock,
  FileText,
  Lightbulb,
  MapPin,
  ShieldCheck,
  Sparkles,
  Store,
  Target,
} from 'lucide-react'
import Mentor, { MENTOR_NAME } from '../components/Mentor'
import { BackButton, BottomBar, Page } from '../components/ui'
import { cx, type AppState } from '../lib'
import { jenisUsahaLabel } from '../data/umkmTypes'

type P = { state: AppState; patch: (p: Partial<AppState>) => void; reset: () => void }

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
  const mission = state.mission
  const umkm = state.umkm
  const [taken, setTaken] = useState(false)

  useEffect(() => {
    if (!taken) return
    const t = setTimeout(() => {
      patch({ screen: 'workspace', ...(state.mission ? {} : { stepDone: {}, tasks: {}, notes: {}, chats: {} }) })
    }, 1100)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taken])

  // Layar ini butuh misi. Tanpa misi, arahkan ke pemilihan UMKM.
  if (!mission) {
    return (
      <Page>
        <div className="flex min-h-[60vh] flex-col justify-center">
          <h2 className="text-[34px] leading-[1.15]">Belum ada misi yang dirancang</h2>
          <p className="mt-2 text-muted">Pilih UMKM dulu, lalu Jeje merancang misinya untukmu.</p>
          <button className="btn-primary mt-6 self-start" onClick={() => patch({ screen: 'pickUmkm' })}>
            Pilih UMKM
          </button>
        </div>
      </Page>
    )
  }

  const jenis = umkm ? jenisUsahaLabel(umkm) : mission.jenisUsaha
  const statusIzin = mission.ownerPermissionGranted ? 'Sudah izin' : 'Belum dihubungi'
  const isFallback = mission.asumsi.some((a) => /template/i.test(a))

  const take = (
    <button className="btn-primary w-full" disabled={taken} onClick={() => setTaken(true)}>Mulai misi ini</button>
  )

  return (
    <Page narrow={false} bottomBar={<div className="lg:hidden"><BottomBar>{take}</BottomBar></div>}>
      <BackButton onClick={() => patch({ screen: 'tellProblem' })} />

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <div className="sheet flex flex-col gap-4 p-6 md:p-8">
            <div className="flex flex-wrap items-start gap-4">
              <span aria-hidden className="grid h-16 w-16 flex-none place-items-center rounded-[20px] bg-[#e9e2ff] text-[#5b32d6]">
                <Store size={30} strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <h1 className="text-[30px] leading-[1.12] tracking-[-0.02em] md:text-[40px]">{mission.usaha}</h1>
                <p className="mt-1 font-medium text-muted">{jenis}</p>
                {mission.lokasi && (
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
                    <MapPin size={14} strokeWidth={1.75} className="flex-none" aria-hidden />
                    {mission.lokasi}
                  </p>
                )}
              </div>
            </div>

            {mission.cocokDengan && (
              <p className="flex items-start gap-2 rounded-2xl bg-clay-soft px-4 py-3 text-sm leading-5">
                <Sparkles size={16} strokeWidth={1.75} className="mt-0.5 flex-none text-[#5b32d6]" aria-hidden />
                <span>Cocok dengan potensi <strong className="font-semibold">{mission.cocokDengan}</strong></span>
              </p>
            )}

            <p className={cx(
              'inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold',
              mission.ownerPermissionGranted ? 'bg-[#d8f5e1] text-[#0f3d26]' : 'bg-paper text-muted ring-1 ring-line',
            )}>
              <ShieldCheck size={15} strokeWidth={1.75} aria-hidden />
              Izin pemilik: {statusIzin}
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Section title="Ringkasan misi" icon={FileText} tone="bg-[#e3f0ff] text-[#1d6fd1]">
              <p>{mission.ringkasan}</p>
            </Section>
            <Section title="Target" icon={Target} tone="bg-[#e9e2ff] text-[#5b32d6]">
              <p>{mission.target}</p>
            </Section>
            {mission.masalah && (
              <Section title="Masalah yang kamu ceritakan" icon={CircleAlert} tone="bg-[#ffe9cc] text-[#c2410c]">
                <p>{mission.masalah}</p>
              </Section>
            )}
            <Section title="Skill yang akan kamu latih" icon={Sparkles} tone="bg-[#d8f5e1] text-leaf">
              <div className="flex flex-wrap gap-2">
                {mission.skills.map((sk) => <span key={sk} className="chip !min-h-9 !text-sm">{sk}</span>)}
              </div>
            </Section>
          </div>

          {mission.asumsi.length > 0 && (
            <section className="sheet mt-4 p-6">
              <h3 className="flex items-center gap-2 font-sans text-lg font-semibold leading-6 tracking-normal">
                <Lightbulb size={19} strokeWidth={1.75} className="text-[#c2410c]" aria-hidden />
                Asumsi yang dipakai
              </h3>
              <p className="mt-1 text-sm text-muted">
                {isFallback
                  ? 'Misi ini disusun dari template cadangan. Sesuaikan saat wawancara dengan pemilik.'
                  : 'Rancangan ini dibuat tanpa data lengkap, jadi ada hal yang diasumsikan.'}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink/80">
                {mission.asumsi.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </section>
          )}

          <section className="sheet mt-4 p-6">
            <h3 className="font-sans text-lg font-semibold leading-6 tracking-normal">Langkah yang akan kamu jalani</h3>
            <ol className="mt-5 grid gap-4 md:grid-cols-3">
              {mission.roadmap.map((r, i) => (
                <li key={r.id} className="flex flex-col gap-2 rounded-[20px] bg-clay-soft p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[#7c4dff] text-sm font-semibold text-white">{i + 1}</span>
                    <p className="font-semibold leading-5">{r.title}</p>
                  </div>
                  <p className="text-sm leading-6 text-muted">{r.goal}</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm leading-6 text-muted">
                    {r.tasks.map((t, j) => <li key={j}>{t}</li>)}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="sheet flex flex-col items-center p-6 text-center">
            <Mentor mood="idle" size={240} entrance={false} interactive />
            <p className="mt-3 text-muted">
              <span className="font-semibold text-ink">{MENTOR_NAME}:</span> Mentor AI akan memandumu langkah demi
              langkah. Kamu yang mengerjakan, AI yang membimbing.
            </p>
          </div>
          <dl className="sheet grid grid-cols-3 divide-x divide-line p-2 text-center">
            <div className="p-3"><dt className="text-xs text-muted">Durasi</dt><dd className="mt-1 text-sm font-semibold">{mission.durasi}</dd></div>
            <div className="p-3">
              <dt className="text-xs text-muted">Jam</dt>
              <dd className="mt-1 flex items-center justify-center gap-1 text-sm font-semibold"><Clock size={13} strokeWidth={1.75} aria-hidden />{mission.jam}</dd>
            </div>
            <div className="p-3"><dt className="text-xs text-muted">Tingkat</dt><dd className="mt-1 text-sm font-semibold">{mission.kesulitan}</dd></div>
          </dl>
          <div className="hidden lg:block">{take}</div>
        </aside>
      </div>

      {taken && (
        <div role="status" className="fixed inset-0 z-30 grid place-items-center bg-white/90">
          <div className="sheet flex items-center gap-3 px-6 py-5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-leaf"><Check size={20} strokeWidth={2.5} color="#fff" /></span>
            <p className="text-2xl">Misi dimulai</p>
          </div>
        </div>
      )}
    </Page>
  )
}
