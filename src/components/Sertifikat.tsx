import { useEffect, useRef, useState } from 'react'
import { Download, Type } from 'lucide-react'
import type { AppState } from '../lib'
import { cx } from '../lib'
import type { ImpactReportData } from '../ai/mentor'
import { Logo } from './Logo'
import { TandaTangan } from './TandaTangan'

/**
 * Sertifikat Laporan Dampak.
 *
 * Warna diambil dari palet aplikasi agar seragam: indigo-deep #1e1a4d,
 * midnight #14112b, dan violet #7c5cff. Latar memakai pola heksagon
 * seperti referensi desain, digambar sebagai SVG agar tajam saat dicetak.
 *
 * Sertifikat ini bersifat penghargaan dan portofolio, bukan dokumen resmi
 * berlegalitas -- tidak ada pihak yang bisa memverifikasi keasliannya.
 */

type Props = {
  state: AppState
  rep: ImpactReportData
  patch: (p: Partial<AppState>) => void
}

/** Pola heksagon tipis untuk latar sertifikat. */
function Heksagon() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id="hex" width="132" height="114" patternUnits="userSpaceOnUse">
          <path
            d="M33 1 L66 20 L66 57 L33 76 L0 57 L0 20 Z M99 39 L132 58 L132 95 L99 114 L66 95 L66 58 Z"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.2"
            opacity="0.09"
          />
        </pattern>
        <linearGradient id="glowA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c5cff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7c5cff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="glowB" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8f7bff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8f7bff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex)" />
      <circle cx="0" cy="0" r="420" fill="url(#glowA)" />
      <circle cx="100%" cy="0" r="380" fill="url(#glowB)" />
    </svg>
  )
}

/** Pita ungu di kiri-kanan, meniru bingkai pada referensi desain. */
function Pita() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-y-0 left-0 h-full w-[13%]" viewBox="0 0 120 100" preserveAspectRatio="none">
      <path d="M0 0 H70 V100 H0 Z" fill="#7c5cff" opacity="0.28" />
      <path d="M0 22 H38 V100 H0 Z" fill="#9d86ff" opacity="0.3" />
    </svg>
  )
}
function PitaKanan() {
  return (
    <svg aria-hidden className="pointer-events-none absolute inset-y-0 right-0 h-full w-[13%]" viewBox="0 0 120 100" preserveAspectRatio="none">
      <path d="M120 0 H50 V100 H120 Z" fill="#7c5cff" opacity="0.28" />
      <path d="M120 22 H82 V100 H120 Z" fill="#9d86ff" opacity="0.3" />
    </svg>
  )
}

/** Medali emas, digambar vektor agar tetap tajam di kertas. */
function Medali({ size = 74 }: { size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <radialGradient id="emas" cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#ffe9a8" />
          <stop offset="45%" stopColor="#e0b34a" />
          <stop offset="100%" stopColor="#a97b1f" />
        </radialGradient>
      </defs>
      {/* Pita bawah */}
      <path d="M32 62 L24 96 L38 86 L46 98 L52 66 Z" fill="#c99a32" opacity=".9" />
      <path d="M68 62 L76 96 L62 86 L54 98 L48 66 Z" fill="#b1862a" opacity=".9" />
      {/* Gerigi medali */}
      <g fill="url(#emas)">
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (i / 16) * Math.PI * 2
          const cx = 50 + Math.cos(a) * 33
          const cy = 44 + Math.sin(a) * 33
          return <circle key={i} cx={cx} cy={cy} r="7" />
        })}
      </g>
      <circle cx="50" cy="44" r="30" fill="url(#emas)" stroke="#8a6416" strokeWidth="1.2" />
      <circle cx="50" cy="44" r="22" fill="none" stroke="#fff4cf" strokeWidth="1.6" opacity=".85" />
      <circle cx="42" cy="36" r="7" fill="#fff8dc" opacity=".55" />
    </svg>
  )
}

export function Sertifikat({ state, rep, patch }: Props) {
  const wrap = useRef<HTMLDivElement | null>(null)
  const [zoom, setZoom] = useState(1)
  /** true bila pengguna memperbesar sertifikat agar bisa dibaca di ponsel. */
  const [perbesar, setPerbesar] = useState(false)

  /**
   * Sertifikat digambar pada ukuran tetap 1123x794 (A4 landscape @96dpi),
   * lalu diperkecil agar pas di layar. Dengan begitu tata letaknya tidak
   * berubah-ubah dan hasil cetaknya selalu sama.
   *
   * Di ponsel skala itu membuat teks sangat kecil, jadi ada tombol perbesar:
   * sertifikat ditampilkan dengan skala lebih besar dan pengguna bisa
   * menggeser. Hasil cetak tidak terpengaruh.
   *
   * Pembungkusnya diberi tinggi = 794 x skala. Tanpa itu, sisa ruang dari
   * elemen yang di-scale tetap memakan tempat setinggi 794 px asli.
   */
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const fit = () => {
      const lebar = el.clientWidth
      if (!lebar) return
      const pas = Math.min(1, (lebar - 2) / 1123)
      // Saat diperbesar, minimal 0.55 supaya teks terbaca; pengguna menggeser.
      setZoom(perbesar ? Math.max(pas, 0.55) : pas)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    // Font web bisa selesai dimuat setelah pengukuran pertama; ukur ulang.
    document.fonts?.ready.then(fit).catch(() => { /* abaikan */ })
    window.addEventListener('resize', fit)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [perbesar])

  const nama = state.userName.trim() || 'Nama Peserta'
  // Tombol perbesar hanya berguna kalau sertifikat memang mengecil di layar.
  const bisaPerbesar = Math.min(1, ((wrap.current?.clientWidth ?? 1123) - 2) / 1123) < 0.9

  return (
    <div className="cert-wrap mt-8 sm:mt-10 flex flex-col gap-5 sm:gap-6">
      {bisaPerbesar && (
        <div className="no-print mx-auto flex w-full max-w-[1123px] justify-end">
          <button
            type="button"
            className="chip"
            aria-pressed={perbesar}
            onClick={() => setPerbesar((v) => !v)}
            onMouseDown={(e) => e.preventDefault()}
          >
            {perbesar ? 'Perkecil' : 'Perbesar'}
          </button>
        </div>
      )}
      <div
        ref={wrap}
        className={cx('cert-fit mx-auto w-full max-w-[1123px]', perbesar && 'overflow-x-auto')}
        data-perbesar={perbesar ? 'true' : 'false'}
        style={{ height: Math.round(794 * zoom) }}
      >
        <div
          style={{ width: 1123, height: 794, transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          className="cert-scale relative overflow-hidden rounded-2xl"
        >
          {/* Kertas sertifikat */}
          <div data-sertifikat="true" className="cert-sheet relative h-full w-full overflow-hidden text-white">
            <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #1e1a4d 0%, #14112b 55%, #1b1440 100%)' }} />
            <Heksagon />
            <Pita />
            <PitaKanan />

            {/* Isi */}
            <div className="relative flex h-full flex-col items-center px-16 py-10 text-center">
              {/* Kepala: logo + nama aplikasi */}
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10 ring-1 ring-white/25">
                  <Logo className="h-8 w-8" />
                </span>
                <span className="text-left text-2xl leading-tight font-semibold">
                  Jejak<span className="text-[#a78bfa]">Bakat</span> AI
                </span>
              </div>

              <h1 className="cert-judul mt-4 text-[82px] font-semibold uppercase leading-none tracking-[0.04em] text-[#a78bfa]">
                Sertifikat
              </h1>
              <p className="cert-sub mt-1 text-[28px] font-medium uppercase tracking-[0.34em] text-white/90">
                Laporan Dampak
              </p>

              <p className="mt-5 rounded-full bg-white/10 px-6 py-1.5 text-lg text-white/85 ring-1 ring-white/15">
                Diberikan kepada
              </p>

              <p className="cert-nama mt-3 max-w-[820px] truncate text-[54px] font-extrabold italic leading-tight">
                {nama}
              </p>
              <div className="mt-2 h-px w-[640px] bg-white/70" />
              <p className="mt-2 text-xl italic text-[#a78bfa]">Peserta JejakBakat AI</p>

              <p className="cert-isi mt-5 max-w-[760px] text-[17px] leading-7 text-white/85">
                Atas penyelesaian misi <span className="font-semibold text-white">“{rep.missionName}”</span> untuk{' '}
                <span className="font-semibold text-white">{rep.business}</span> pada {rep.date} —{' '}
                {rep.hours} jam kerja, dengan skill terbukti:{' '}
                <span className="text-white">{rep.provenSkills.join(', ')}</span>.
              </p>

              <p className="mt-2 text-sm text-white/55">
                No. {rep.nomorSertifikat || 'JB-BELUM-DIBUAT'}
              </p>

              {/* Kaki: tanda tangan kiri, medali tengah, penerbit kanan */}
              <div className="mt-auto grid w-full max-w-[880px] grid-cols-3 items-end gap-6 pb-1">
                <div className="flex flex-col items-center">
                  {state.ttdPeserta ? (
                    <img
                      src={state.ttdPeserta}
                      alt="Tanda tangan peserta"
                      className="cert-ttd max-h-[70px] w-full object-contain object-bottom"
                    />
                  ) : (
                    <span className="flex h-[70px] items-end pb-1 text-[13px] text-white/40">
                      belum ditandatangani
                    </span>
                  )}
                  <div className="mt-1 h-px w-full bg-white/45" />
                  <p className="mt-2 text-base font-semibold text-[#a78bfa]">{nama}</p>
                  <p className="text-sm text-white/70">Peserta</p>
                </div>

                <div className="flex flex-col items-center pb-6">
                  <Medali />
                  <p className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-white/55">3 hari · 3 langkah</p>
                </div>

                <div className="flex flex-col items-center">
                  <span className="flex h-[70px] items-center">
                    <svg width="150" height="52" viewBox="0 0 150 52" aria-hidden>
                      <path
                        d="M8 36c10-18 16-4 22-14s10 10 18 2 10 6 18-4 12 12 20 4 14 4 22-6 12 8 20 2"
                        fill="none"
                        stroke="#cbb9ff"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <div className="mt-1 h-px w-full bg-white/45" />
                  <p className="mt-2 text-base font-semibold text-[#a78bfa]">JejakBakat AI</p>
                  <p className="text-sm text-white/70">Penerbit</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pengaturan tanda tangan, tidak ikut tercetak */}
      <div className="no-print mx-auto mt-6 sm:mt-8 flex w-full max-w-[1123px] flex-col gap-5 sm:gap-6 rounded-3xl bg-white p-6 sm:p-8 ring-1 ring-line">
        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Type size={15} strokeWidth={1.75} aria-hidden />
            Tanda tangan peserta
          </p>
          <p className="text-xs text-muted">Goreskan tanda tanganmu dengan mouse atau jari untuk dicantumkan di sertifikat.</p>
          <TandaTangan
            value={state.ttdPeserta}
            onChange={(v) => patch({ ttdPeserta: v })}
            label="Tanda tangan peserta di sini"
            className="mt-2.5 max-w-xl"
          />
        </div>
        <div className="flex flex-col gap-3 pt-3 border-t border-line/60">
          <p className="text-xs text-muted leading-relaxed">
            Sertifikat ini adalah penghargaan dan portofolio. Keabsahannya dapat dikonfirmasi ke UMKM yang
            bersangkutan, tidak diverifikasi oleh sistem.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-primary" onClick={() => window.print()}>
              <Download size={18} strokeWidth={1.75} aria-hidden />
              Unduh sertifikat (PDF)
            </button>
            <p className="text-xs text-muted">
              Pilih <strong>Landscape</strong> dan matikan <strong>Headers and footers</strong> saat menyimpan PDF.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
