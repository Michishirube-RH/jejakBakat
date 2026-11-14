import { useEffect, useState } from 'react'
import { BadgeCheck, Check, Copy, Share2, ShieldAlert, ShieldCheck } from 'lucide-react'
import { buildImpactReport, type ImpactReportData } from '../ai/mentor'
import { Sertifikat } from '../components/Sertifikat'
import { FallbackLabel, Page } from '../components/ui'
import { potentials } from '../data/mockData'
import { cx, type AppState } from '../lib'

type P = { state: AppState; patch: (p: Partial<AppState>) => void; reset: () => void }

/**
 * Layar Laporan Dampak.
 *
 * Isinya satu hal saja: sertifikat. Lembar laporan panjang sengaja tidak lagi
 * ditampilkan, karena sertifikat sudah memuat nama peserta, misi, UMKM, jam
 * kerja, dan skill yang terbukti. Yang perlu diisi pengguna (nama, testimoni)
 * diletakkan di atas sertifikat, dan tombol unduh di bawahnya.
 */
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
          <p className="mt-2 text-muted">Rancang misi dulu, kerjakan, lalu sertifikat ini akan terisi.</p>
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
        <p className="text-muted" role="status">Menyusun sertifikat...</p>
      </Page>
    )
  }

  const note = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200) }

  const testimonial = state.ownerTestimonial?.trim() ?? ''
  const ownerName = state.ownerName?.trim() ?? ''

  // Teks untuk "Salin untuk CV" dan "Bagikan": ringkasan sertifikat dalam satu
  // paragraf, disusun dari data yang sama agar tidak ada angka berbeda.
  const testimonialSection = testimonial
    ? ` Testimoni pemilik${ownerName ? ` (${ownerName})` : ''}: "${testimonial}".`
    : ''
  const permissionSection = ` Izin pemilik: ${rep.ownerPermissionGranted ? 'sudah diberikan' : 'belum dihubungi'}.`
  const name = state.userName?.trim() || 'Peserta'
  const text = `${name}: ${rep.missionName} (${rep.date}). Skill terbukti: ${rep.provenSkills.join(', ')}. ${rep.hours} jam kerja untuk ${rep.business}.${permissionSection}${testimonialSection}`

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); note('Teks CV disalin') } catch { note('Gagal menyalin. Salin manual dari sertifikat.') }
  }
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: rep.missionName, text })
      else { await navigator.clipboard.writeText(text); note('Ringkasan disalin untuk dibagikan') }
    } catch { /* dibatalkan */ }
  }
  const field = 'w-full rounded-full bg-white px-4 py-2 ring-1 ring-line text-ink placeholder:text-ink/60'
  const perluNama = !state.userName.trim()

  return (
    <Page narrow={false}>
      <div className="mx-auto w-full max-w-[1123px]">
        <header className="no-print mb-6 sm:mb-8">
          <p className="text-sm font-medium text-muted">Laporan Dampak · JejakBakat AI</p>
          <h1 className="mt-1 text-[28px] leading-[1.15] tracking-[-0.02em] md:text-[34px]">{rep.missionName}</h1>
          <FallbackLabel show={rep.usedFallback} className="mt-3" />
        </header>

        {/* Data yang hanya bisa diisi pengguna. Tanpa ini sertifikat tidak
            akan pernah punya nama peserta. */}
        <section className="no-print grid gap-5 rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8 md:grid-cols-2 md:gap-6">
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Nama kamu
            <input
              className={field + ' font-normal'}
              value={state.userName}
              placeholder="Contoh: Rian Pratama"
              onChange={(e) => patch({ userName: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold">
            Nama pemilik usaha
            <input
              className={field + ' font-normal'}
              value={state.ownerName}
              placeholder="Contoh: Budi"
              onChange={(e) => patch({ ownerName: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold md:col-span-2">
            Testimoni pemilik usaha
            <textarea
              rows={2}
              className={field + ' resize-none !rounded-[24px] font-normal'}
              value={state.ownerTestimonial}
              placeholder="Tulis kutipan langsung dari pemilik usaha. Boleh dikosongkan."
              onChange={(e) => patch({ ownerTestimonial: e.target.value })}
            />
          </label>

          {/* Status izin tetap ditampilkan: ini kejujuran yang dijaga sejak awal
              dan tidak boleh hilang hanya karena tampilannya berubah. */}
          <div className="flex flex-col gap-2.5 pt-3 md:col-span-2 border-t border-line/60">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={cx(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                rep.ownerPermissionGranted ? 'bg-[#d8f5e1] text-[#0f3d26]' : 'bg-paper text-muted ring-1 ring-line',
              )}>
                {rep.ownerPermissionGranted
                  ? <><ShieldCheck size={14} strokeWidth={1.75} aria-hidden />Izin pemilik: Sudah izin</>
                  : <><ShieldAlert size={14} strokeWidth={1.75} aria-hidden />Izin pemilik: Belum dihubungi</>}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-clay-soft px-3 py-1 text-xs font-semibold text-ink">
                <BadgeCheck size={14} strokeWidth={1.75} aria-hidden />Diisi oleh pemilik usaha
              </span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              {rep.ownerPermissionGranted
                ? 'Pemilik sudah memberi izin sebelum misi dijalankan. Minta pemilik memeriksa sertifikat ini sebelum dibagikan.'
                : 'Pemilik belum dihubungi atau belum memberi izin. Hubungi pemilik lebih dulu sebelum membagikan sertifikat.'}
            </p>
          </div>
          {perluNama && (
            <p className="rounded-2xl bg-[#fff4e5] px-4 py-3 text-xs leading-relaxed text-[#8a4b08] ring-1 ring-[#f3d9b5] md:col-span-2">
              Nama peserta masih kosong. Isi dulu agar sertifikat tidak menampilkan nama contoh.
            </p>
          )}
        </section>
      </div>

      <Sertifikat state={state} rep={rep} patch={patch} />

      <div className="no-print mx-auto mt-8 sm:mt-10 mb-8 flex w-full max-w-[1123px] flex-wrap justify-center gap-3.5">
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
