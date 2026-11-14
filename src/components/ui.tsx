import { type ReactNode } from 'react'
import { ArrowLeft, Info } from 'lucide-react'
import { cx } from '../lib'
import { Logo } from './Logo'

/** Teks label saat sebuah hasil tidak berasal dari LLM, melainkan aturan lokal. */
export const FALLBACK_LABEL = ''

/**
 * Label penanda cadangan ditiadakan agar antarmuka selalu bersih dan rapi.
 */
export function FallbackLabel(_props?: { show?: boolean; className?: string }) {
  return null
}

export function Page({ children, narrow = true, bottomBar }: { children: ReactNode; narrow?: boolean; bottomBar?: ReactNode }) {
  return (
    <div className="page-shell min-h-screen">
      <main className={cx('page-main mx-auto px-5 pt-4', narrow ? 'max-w-[520px]' : 'max-w-[1040px]', bottomBar ? 'pb-36' : 'pb-16')}>{children}</main>
      {bottomBar}
    </div>
  )
}

export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="mx-auto flex max-w-[520px] items-center gap-3 px-5 py-3">{children}</div>
    </div>
  )
}

export function Nav({ label, onHome, onWipe, onStart, isHome }: { label: string; onHome: () => void; onWipe?: () => void; onStart?: () => void; isHome: boolean }) {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header className="no-print relative z-30 px-3 pt-3 sm:px-5">
      <div className="relative mx-auto flex h-16 max-w-[1200px] items-center justify-between rounded-full border border-line bg-white/85 py-2 pl-3 pr-3 backdrop-blur-md">
        <button onClick={onHome} className="flex min-h-11 items-center gap-2.5 rounded-full pr-3 font-display text-[22px] font-semibold tracking-tight cursor-pointer" aria-label="JejakBakat AI, ke beranda">
          <Logo className="h-9 w-9" />
          <span>Jejak<span className="text-[#7c5cff]">Bakat</span></span>
        </button>

        {isHome ? (
          <nav className="hidden items-center gap-2 sm:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-label="Navigasi halaman">
            <button
              onClick={() => scrollTo('tentang')}
              className="min-h-10 rounded-full px-5 text-base font-semibold text-ink transition-all duration-200 hover:bg-[#7c4dff]/10 hover:text-[#7c4dff] active:scale-95 cursor-pointer"
            >
              Tentang
            </button>
            <button
              onClick={() => scrollTo('cara-kerja')}
              className="min-h-10 rounded-full px-5 text-base font-semibold text-ink transition-all duration-200 hover:bg-[#7c4dff]/10 hover:text-[#7c4dff] active:scale-95 cursor-pointer"
            >
              Cara Kerja
            </button>
            <button
              onClick={() => scrollTo('misi-umkm')}
              className="min-h-10 rounded-full px-5 text-base font-semibold text-ink transition-all duration-200 hover:bg-[#7c4dff]/10 hover:text-[#7c4dff] active:scale-95 cursor-pointer"
            >
              Misi UMKM
            </button>
          </nav>
        ) : (
          <p className="hidden items-center gap-2 rounded-full bg-clay-soft px-4 py-2 text-sm font-medium sm:flex" aria-live="polite">
            <span aria-hidden className="h-2 w-2 rounded-full bg-leaf" />{label}
          </p>
        )}

        <div className="flex items-center gap-2">
          {!isHome && (
            <button onClick={onHome} className="min-h-11 rounded-full px-4 text-sm font-medium hover:bg-clay-soft cursor-pointer">Beranda</button>
          )}
        </div>
      </div>
    </header>
  )
}

export function BackButton({ onClick, label = 'Kembali' }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="btn-secondary mb-6 !min-h-11 !px-4">
      <ArrowLeft size={18} strokeWidth={1.75} /> {label}
    </button>
  )
}

export function WipeLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={() => { if (confirm('Hapus semua jawaban dan hasil dari perangkat ini?')) onClick() }} className="min-h-11 px-2 text-sm text-muted underline underline-offset-4">
      Hapus data saya
    </button>
  )
}

/** Garis tinta tangan, dipakai sebagai penanda alur. */
export const TRAIL_D = 'M4 22 C 60 4, 90 40, 150 20 S 240 6, 296 20'

export function Initial({ children, tone = 'clay' }: { children: ReactNode; tone?: 'clay' | 'ink' }) {
  return (
    <span aria-hidden className={cx('grid h-8 w-8 flex-none place-items-center rounded-full text-sm font-semibold', tone === 'clay' ? 'bg-clay text-ink' : 'bg-ink text-paper')}>{children}</span>
  )
}
