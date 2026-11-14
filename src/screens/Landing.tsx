import { useState, type ReactNode } from 'react'
import { BarChart3, Compass, Heart, Code2, Megaphone, Palette, Check } from 'lucide-react'
import Mentor from '../components/Mentor'
import type { AppState } from '../lib'
import { cx } from '../lib'

type P = { state: AppState; patch: (p: Partial<AppState>) => void; reset: () => void }

const cats = [
  { icon: Megaphone, label: 'Komunikasi' }, { icon: Palette, label: 'Visual' }, { icon: BarChart3, label: 'Analitis' },
  { icon: Compass, label: 'Organisasi' }, { icon: Heart, label: 'Empati' }, { icon: Code2, label: 'Teknologi' },
]

function Feature({ title, body, bg, flip, children }: { title: string; body: string; bg: string; flip?: boolean; children: ReactNode }) {
  return (
    <section className={bg}>
      <div className={cx('mx-auto grid max-w-[1200px] items-center gap-10 px-5 py-16 md:grid-cols-2 md:gap-16 md:py-24')}>
        <div className={cx('flex justify-center', flip ? 'md:order-2' : 'md:order-1')}>{children}</div>
        <div className={cx(flip ? 'md:order-1' : 'md:order-2', 'md:max-w-[420px]')}>
          <h2 className="text-[44px] leading-[1.05] md:text-[56px]">{title}</h2>
          <p className="mt-4 text-lg text-muted">{body}</p>
        </div>
      </div>
    </section>
  )
}

export function Welcome({ state, patch, reset }: P) {
  const has = Object.keys(state.answers).length > 0 || state.result
  const mission = state.mission
  const stepsDone = mission ? mission.roadmap.filter((r) => state.stepDone[r.id]).length : 0
  const allDone = !!mission && stepsDone === mission.roadmap.length
  const start = () => patch({ screen: 'intro', qIndex: 0 })

  return (
    <div>
      <section className="overflow-hidden">
        <div className="mx-auto grid max-w-[1200px] items-center gap-6 px-5 pb-16 pt-12 md:grid-cols-[1.25fr_1fr] md:pb-24 md:pt-20">
          <div className="text-center md:text-left">
            <h1 className="text-[clamp(44px,6.4vw,88px)] leading-[0.98] tracking-[-0.03em]">Temukan potensimu dari kebiasaan sehari-hari.</h1>
            <p className="mx-auto mt-6 max-w-[460px] text-lg text-muted md:mx-0">10 pertanyaan singkat, sekitar 4 menit, tanpa daftar akun. Lalu buktikan lewat misi nyata untuk UMKM.</p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start sm:justify-center">
              <button className="btn-primary" onClick={start}>Mulai</button>
              {has && <button className="btn-secondary" onClick={() => patch({ screen: state.result ? 'results' : 'quiz' })}>{state.result ? 'Lihat potensiku' : 'Lanjutkan jawabanku'}</button>}
            </div>
            {mission && (
              <button onClick={() => patch({ screen: allDone ? 'report' : 'workspace' })} className="mt-5 flex w-full max-w-[460px] items-center justify-between gap-4 rounded-2xl border border-line bg-white px-5 py-4 text-left md:mx-0 mx-auto">
                <span>
                  <span className="block text-sm text-muted">{allDone ? 'Misi selesai' : 'Misi yang sedang berjalan'}</span>
                  <span className="block font-semibold">{mission.usaha}</span>
                  <span className="block text-sm text-muted">{stepsDone} dari {mission.roadmap.length} langkah selesai</span>
                </span>
                <span className="btn-primary !min-h-11 !px-5 !text-sm">{allDone ? 'Lihat laporan' : 'Lanjutkan misi'}</span>
              </button>
            )}
            <p className="mt-4 text-sm text-muted">Jawaban, nama, cerita, dan catatan kerjamu dikirim ke layanan AI pihak ketiga (Google Gemini) untuk dianalisis. Jangan menulis data pribadi orang lain. Lokasi kasar (dibulatkan) hanya dikirim ke penyedia peta bila kamu mengizinkan. Hasilmu disimpan di perangkatmu dan tidak disimpan di server kami.</p>
          </div>
          <div className="mx-auto flex w-full max-w-[420px] justify-center">
            <Mentor mood="greet" size={320} interactive />
          </div>
        </div>
      </section>

      <div className="border-y border-line bg-white">
        <ul className="mx-auto flex max-w-[1200px] flex-wrap justify-center gap-x-10 gap-y-2 px-5 py-4">
          {cats.map(({ icon: I, label }) => <li key={label} className="flex min-h-11 items-center gap-2 text-sm font-medium"><I size={18} strokeWidth={1.75} className="text-leaf" />{label}</li>)}
        </ul>
      </div>

      <section className="grid-dark text-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 text-center md:py-20">
          <h2 className="text-[36px] leading-[1.1] md:text-[48px]">Dari jawaban singkat sampai bukti nyata</h2>
          <dl className="mt-10 grid gap-8 sm:grid-cols-3">
            {[['10', 'pertanyaan singkat'], ['3', 'potensi dengan bukti'], ['3', 'langkah misi yang terarah']].map(([n, l]) => (
              <div key={l}><dt className="font-display text-6xl">{n}</dt><dd className="mt-1 text-white/75">{l}</dd></div>
            ))}
          </dl>
        </div>
      </section>

      <Feature bg="bg-white" title="Potensi yang terbaca jelas" body="Jawabanmu dibaca sebagai pola: apa yang sering kamu lakukan dan seberapa kamu menikmatinya. Hasilnya langsung terlihat.">
        <svg viewBox="0 0 400 400" className="w-full max-w-[420px]" aria-hidden>
          {[60, 120, 180].map((r) => <circle key={r} cx="200" cy="360" r={r} fill="none" stroke="#e4e4ea" strokeWidth="2" />)}
          <line x1="200" y1="360" x2="310" y2="90" stroke="#121212" strokeWidth="4" /><circle cx="310" cy="90" r="16" fill="#3b82f6" />
          <path d="M200 360 L200 290 A70 70 0 0 1 252 300 Z" fill="#f59e0b" />
          <line x1="200" y1="360" x2="200" y2="40" stroke="#121212" strokeWidth="2" strokeDasharray="6 6" />
        </svg>
      </Feature>

      <Feature bg="bg-gradient-to-b from-[#f3efff] to-white" flip title="Sesuai levelmu" body="Mulai dari 10 pertanyaan, lanjut ke misi yang cocok dengan potensi teratasmu, mulai dari yang mudah.">
        <div className="relative h-[320px] w-full max-w-[440px]" aria-hidden>
          <div className="absolute left-0 top-4 w-[62%] rounded-3xl border-2 border-[#7c4dff] bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-[#7c4dff] px-3 py-1 text-xs font-semibold text-white">Untukmu</span>
              <span className="h-2 w-10 rounded-full bg-line" />
            </div>
            <div className="mt-6 h-16 rounded-2xl bg-[#ddd6fe]" />
            <div className="mt-3 h-2.5 w-2/3 rounded-full bg-line" />
          </div>
          <div className="absolute right-0 top-24 w-[50%] rounded-3xl border border-line bg-white p-5">
            <div className="h-14 rounded-2xl bg-[#fde68a]" />
            <div className="mt-3 h-2.5 w-3/4 rounded-full bg-line" />
          </div>
          <div className="absolute bottom-0 left-8 w-[50%] rounded-3xl border border-line bg-white p-5">
            <div className="h-10 rounded-2xl bg-[#bbf7d0]" />
            <div className="mt-3 h-2.5 w-1/2 rounded-full bg-line" />
          </div>
        </div>
      </Feature>

      <Feature bg="bg-gradient-to-b from-[#fffbe0] to-white" title="Tetap semangat" body="Selesaikan satu langkah kecil setiap hari. Mentor AI bertanya balik dan memberi petunjuk bertahap, bukan jawaban jadi.">
        <div className="flex items-center gap-6">
          {['S', 'S', 'R'].map((d, i) => <span key={i} className={cx('grid h-24 w-24 place-items-center rounded-full text-3xl font-semibold', i < 2 ? 'bg-[#d9f24a]' : 'border-2 border-line bg-white text-muted')}>{i < 2 ? <Check size={40} strokeWidth={2.5} /> : d}</span>)}
        </div>
      </Feature>

      <Feature bg="bg-gradient-to-b from-[#fff1e6] to-white" flip title="Langkah kecil yang terarah" body="Setiap misi dipecah menjadi tiga langkah. Langkah berikutnya terbuka setelah yang sebelumnya selesai.">
        <svg viewBox="0 0 400 300" className="w-full max-w-[420px]" aria-hidden>
          <path d="M60 60 H200 V160 H300 V260" fill="none" stroke="#f59e0b" strokeWidth="5" strokeLinejoin="round" />
          <rect x="30" y="30" width="60" height="60" rx="14" fill="#fb923c" /><rect x="170" y="130" width="60" height="60" rx="14" fill="#fb923c" opacity=".5" />
          <rect x="270" y="230" width="60" height="60" rx="14" fill="#a1a1aa" />
          <path d="M48 62 l9 9 l17-18" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" />
        </svg>
      </Feature>

      <Feature bg="bg-gradient-to-b from-[#e8fbee] to-white" title="Hasilnya bisa kamu tunjukkan" body="Di akhir, kamu mendapat Impact Report yang bisa disalin ke CV, lengkap dengan testimoni dari pemilik usaha.">
        <div className="w-full max-w-[360px] rounded-2xl border border-line bg-white p-6"><div className="h-3 w-1/2 rounded bg-ink" /><div className="mt-4 space-y-2"><div className="h-2 rounded bg-line" /><div className="h-2 w-5/6 rounded bg-line" /><div className="h-2 w-2/3 rounded bg-line" /></div><div className="mt-5 rounded-xl bg-[#e8fbee] p-3 text-sm font-medium text-leaf">Diisi oleh pemilik usaha</div></div>
      </Feature>

      <section className="grid-dark text-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 text-center md:py-20">
          <h2 className="text-[36px] leading-[1.1] md:text-[48px]">Enam kekuatan yang kami baca</h2>
          <ul className="mt-8 flex flex-wrap justify-center gap-x-10 gap-y-3 font-display text-2xl text-white/80">{cats.map((c) => <li key={c.label}>{c.label}</li>)}</ul>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 text-center md:py-24">
          <h2 className="text-[36px] leading-[1.1] md:text-[48px]">Misi nyata, bukan contoh</h2>
          <p className="mx-auto mt-4 max-w-[62ch] text-lg text-muted">
            Kamu memilih sendiri usaha di sekitarmu atau menambahkan usaha yang kamu kenal. Jeje lalu merancang tiga
            langkah yang bisa kamu kerjakan, dimulai dari bertemu pemilik dan meminta izin.
          </p>
          <ol className="mx-auto mt-10 grid max-w-[900px] gap-4 text-left md:grid-cols-3">
            {[
              ['Pilih usaha', 'Cari UMKM di sekitar atau tambahkan sendiri.'],
              ['Ceritakan masalahnya', 'Tulis apa yang kamu lihat atau dikeluhkan pemilik.'],
              ['Kerjakan misinya', 'Tiga langkah terarah, didampingi mentor AI.'],
            ].map(([t, b], i) => (
              <li key={t} className="rounded-3xl bg-paper p-6">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#7c4dff] text-sm font-semibold text-white">{i + 1}</span>
                <p className="mt-3 font-semibold">{t}</p>
                <p className="mt-1 text-sm text-muted">{b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="grid-dark text-center text-white">
        <div className="mx-auto max-w-[1200px] px-5 py-20 md:py-28">
          <h2 className="text-[48px] leading-[1.05] md:text-[72px]">Mulai perjalananmu</h2>
          <p className="mt-4 text-white/80">Sepuluh pertanyaan, empat menit, tanpa akun.</p>
          <button className="btn-primary mt-8" onClick={start}>Mulai</button>
        </div>
      </section>

      <footer className="bg-black text-white">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 py-10 text-sm">
          <p className="font-display text-2xl">JejakBakat</p>
          <p className="text-white/70">Jawaban dan teks masalahmu dikirim ke layanan AI untuk dianalisis. Lokasi kasar dikirim ke penyedia peta hanya bila kamu mengizinkan.</p>
          {has && <button onClick={() => { if (confirm('Hapus semua jawaban dan hasil dari perangkat ini?')) reset() }} className="min-h-11 underline underline-offset-4">Hapus data saya</button>}
        </div>
      </footer>
    </div>
  )
}
