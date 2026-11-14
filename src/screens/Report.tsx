import { useEffect, useState } from 'react'
import { BadgeCheck, Clock, Copy, Download, Share2, Check, ShieldCheck, ShieldAlert } from 'lucide-react'
import { buildImpactReport, type ImpactReportData } from '../ai/mentor'
import { MentorSay } from '../components/Companion'
import { Page } from '../components/ui'
import { potentials } from '../data/mockData'
import { cx, type AppState } from '../lib'

type P = { state: AppState; patch: (p: Partial<AppState>) => void; reset: () => void }

export function Report({ state, patch }: P) {
  const mission = state.mission
  const [rep, setRep] = useState<ImpactReportData | null>(null)
  const [toast, setToast] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!mission) return
    const topId = state.result?.potentials?.[0]?.potentialId ?? ''
    const potName = potentials.find((p) => p.id === topId)?.name ?? mission.cocokDengan
    let alive = true
    buildImpactReport({ mission, userName: state.userName, notes: state.notes, potentialName: potName })
      .then((r) => { if (alive) setRep(r) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Tanpa misi, arahkan ke pemilihan UMKM (bukan layar kosong).
  if (!mission) {
    return (
      <Page>
        <div className="flex min-h-[60vh] flex-col justify-center">
          <h2 className="text-[34px] leading-[1.15]">Belum ada misi untuk dilaporkan</h2>
          <p className="mt-2 text-muted">Rancang misi dulu, kerjakan, lalu laporan ini akan terisi.</p>
          <button className="btn-primary mt-6 self-start" onClick={() => patch({ screen: 'pickUmkm' })}>
            Pilih UMKM
          </button>
        </div>
      </Page>
    )
  }

  if (failed) {
    return (
      <Page>
        <div className="flex min-h-[60vh] flex-col justify-center">
          <h2 className="text-[34px] leading-[1.15]">Laporan gagal disusun</h2>
          <p className="mt-2 text-muted">Coba muat ulang halaman ini, atau kembali ke ruang kerja.</p>
          <button className="btn-primary mt-6 self-start" onClick={() => patch({ screen: 'workspace' })}>
            Kembali ke ruang kerja
          </button>
        </div>
      </Page>
    )
  }

  if (!rep) {
    return (
      <Page>
        <p className="text-muted" role="status">Menyusun laporan...</p>
      </Page>
    )
  }

  const note = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200) }

  const testimonial = state.ownerTestimonial?.trim() ?? ''
  const ownerName = state.ownerName?.trim() ?? ''

  const testimonialSection = testimonial
    ? ` Testimoni pemilik${ownerName ? ` (${ownerName})` : ''}: "${testimonial}".`
    : ''
  const permissionSection = ` Izin pemilik: ${rep.ownerPermissionGranted ? 'sudah diberikan' : 'belum dihubungi'}.`

  const name = state.userName?.trim() || 'Peserta'
  const text = `${name}: ${rep.missionName} (${rep.date}). ${rep.summary} Skill: ${rep.provenSkills.join(', ')}. ${rep.hours} jam kerja untuk ${rep.business}.${permissionSection}${testimonialSection}`

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); note('Teks CV disalin') } catch { note('Gagal menyalin. Salin manual dari lembar laporan.') }
  }
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: rep.missionName, text })
      else { await navigator.clipboard.writeText(text); note('Ringkasan disalin untuk dibagikan') }
    } catch { /* dibatalkan */ }
  }
  const field = 'w-full rounded-full bg-white px-4 py-2 ring-1 ring-line text-ink placeholder:text-ink/60'

  return (
    <Page narrow={false}>
      <MentorSay state={state} size={130} tone="white" className="mx-auto mb-6 max-w-[720px]" />
      <article className="report-sheet mx-auto max-w-[720px] rounded-[24px] bg-white p-7 text-ink md:p-10">
        <header className="border-b border-ink/10 pb-5">
          <p className="text-sm font-medium text-muted">Laporan Dampak · JejakBakat AI</p>
          <h1 className="mt-2 text-[28px] leading-[1.15] tracking-[-0.02em] md:text-[38px]">{rep.missionName}</h1>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <label className="font-semibold">Nama kamu
              <input className={field + ' mt-1 font-normal'} value={state.userName} placeholder="Contoh: Rian Pratama" onChange={(e) => patch({ userName: e.target.value })} />
            </label>
            <div><p className="font-semibold">Tanggal</p><p className="mt-1 py-2">{rep.date}</p></div>
            <div><p className="font-semibold">UMKM</p><p>{rep.business}</p></div>
            <div className="flex items-center gap-1.5"><Clock size={16} strokeWidth={1.75} aria-hidden /><p><span className="font-semibold">{rep.hours} jam</span> kerja</p></div>
          </div>
        </header>

        <section className="mt-6">
          <h2 className="text-xl leading-[26px]">Ringkasan misi</h2>
          <p className="mt-2 text-ink/80 leading-relaxed">{rep.summary}</p>
          {mission.masalah && (
            <p className="mt-3 rounded-2xl bg-paper px-4 py-3 text-sm leading-6 text-ink/80">
              <span className="font-semibold">Masalah yang diceritakan: </span>{mission.masalah}
            </p>
          )}
        </section>

        <section className="mt-6">
          <h2 className="text-xl leading-[26px]">Skill yang terbukti</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {rep.provenSkills.map((s) => <span key={s} className="rounded-full bg-clay-soft px-3 py-1 text-sm font-medium text-ink">{s}</span>)}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-xl leading-[26px]">Langkah yang diselesaikan</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink/80 leading-relaxed">
            {mission.roadmap.map((s) => (
              <li key={s.id} className={cx(state.stepDone[s.id] ? 'text-ink' : 'text-muted')}>
                {s.title}{state.stepDone[s.id] ? ' — selesai' : ' — belum ditandai selesai'}
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-6 rounded-[20px] bg-paper p-5 print:bg-white print:p-0 print:border-t print:border-ink/10">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl leading-[26px]">Verifikasi UMKM</h2>
            <span className={cx(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
              rep.ownerPermissionGranted ? 'bg-[#d8f5e1] text-[#0f3d26]' : 'bg-white text-muted ring-1 ring-line',
            )}>
              {rep.ownerPermissionGranted
                ? <><ShieldCheck size={14} strokeWidth={1.75} aria-hidden />Izin pemilik: Sudah izin</>
                : <><ShieldAlert size={14} strokeWidth={1.75} aria-hidden />Izin pemilik: Belum dihubungi</>}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-clay-soft px-2.5 py-0.5 text-xs font-semibold text-ink">
              <BadgeCheck size={14} strokeWidth={1.75} aria-hidden />Diisi oleh pemilik usaha
            </span>
          </div>

          <p className="mt-2 text-sm text-muted">
            {rep.ownerPermissionGranted
              ? 'Pemilik sudah memberi izin sebelum misi dijalankan. Minta pemilik memeriksa bagian ini sebelum laporan dibagikan.'
              : 'Pemilik belum dihubungi atau belum memberi izin. Hubungi pemilik lebih dulu sebelum membagikan laporan.'}
          </p>

          <div className="print:hidden">
            <label className="mt-3 block text-sm font-semibold">Testimoni
              <textarea
                rows={3}
                className={field + ' mt-1 resize-none !rounded-[24px] font-normal'}
                value={state.ownerTestimonial}
                placeholder="Tulis kutipan langsung dari pemilik usaha."
                onChange={(e) => patch({ ownerTestimonial: e.target.value })}
              />
            </label>
            <label className="mt-3 block text-sm font-semibold">Nama pemilik usaha
              <input
                className={field + ' mt-1 font-normal'}
                value={state.ownerName}
                placeholder="Contoh: Budi"
                onChange={(e) => patch({ ownerName: e.target.value })}
              />
            </label>
          </div>

          <div className="hidden print:block mt-3 text-sm">
            {testimonial ? (
              <>
                <blockquote className="italic text-ink/90">"{testimonial}"</blockquote>
                <p className="mt-2 font-semibold text-ink">— {ownerName || 'Pemilik usaha'}</p>
              </>
            ) : (
              <p className="italic text-muted">Testimoni belum diisi.</p>
            )}
          </div>
        </section>

        {rep.strengthenedPotential && (
          <section className="mt-6">
            <h2 className="text-xl leading-[26px]">Potensi yang diperkuat</h2>
            <p className="mt-2 font-semibold text-ink">{rep.strengthenedPotential}</p>
          </section>
        )}

        {rep.nextSteps.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xl leading-[26px]">Saran langkah berikutnya</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink/80 leading-relaxed">
              {rep.nextSteps.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </section>
        )}
      </article>

      <div className="no-print mx-auto mt-6 flex max-w-[720px] flex-wrap justify-center gap-3">
        <button className="btn-primary" onClick={() => window.print()}><Download size={18} strokeWidth={1.75} aria-hidden />Unduh PDF</button>
        <button className="btn-secondary" onClick={copy}><Copy size={18} strokeWidth={1.75} aria-hidden />Salin untuk CV</button>
        <button className="btn-secondary" onClick={share}><Share2 size={18} strokeWidth={1.75} aria-hidden />Bagikan</button>
        <button className="btn-secondary" onClick={() => patch({ screen: 'workspace' })}>Kembali ke ruang kerja</button>
      </div>
      {toast && (
        <div role="status" className="sheet fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 px-5 py-3 text-sm">
          <Check size={16} strokeWidth={2} className="text-moss" aria-hidden />{toast}
        </div>
      )}
    </Page>
  )
}
