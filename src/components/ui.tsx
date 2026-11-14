import { type ReactNode } from 'react'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { cx } from '../lib'

export function Page({ children, narrow = true, bottomBar }: { children: ReactNode; narrow?: boolean; bottomBar?: ReactNode }) {
  return (
    <div className="min-h-screen">
      <main className={cx('mx-auto px-5 pt-4', narrow ? 'max-w-[520px]' : 'max-w-[1040px]', bottomBar ? 'pb-36' : 'pb-16')}>{children}</main>
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

export function Nav({ label, onHome, onWipe, onStart, isHome }: { label: string; onHome: () => void; onWipe: () => void; onStart: () => void; isHome: boolean }) {
  return (
    <header className="no-print relative z-30 px-3 pt-3 sm:px-5">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between rounded-full border border-line bg-white/85 py-2 pl-2.5 pr-2.5 backdrop-blur-md">
        <button onClick={onHome} className="flex min-h-11 items-center gap-2.5 rounded-full pr-3 font-display text-[22px] font-semibold tracking-tight" aria-label="JejakBakat AI, ke beranda">
          <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full bg-leaf">
            <svg viewBox="0 0 24 24" className="h-6 w-6"><path d="M3 18 C 8 4, 11 22, 14 11 S 19 8, 21 5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" /></svg>
          </span>
          JejakBakat
        </button>

        {!isHome && (
          <p className="hidden items-center gap-2 rounded-full bg-clay-soft px-4 py-2 text-sm font-medium sm:flex" aria-live="polite">
            <span aria-hidden className="h-2 w-2 rounded-full bg-leaf" />{label}
          </p>
        )}

        <div className="flex items-center gap-2">
          {isHome ? (
            <button onClick={onStart} className="btn-primary !min-h-11 !px-6 !text-[15px]">Mulai</button>
          ) : (
            <button onClick={onHome} className="hidden min-h-11 rounded-full px-4 text-sm font-medium hover:bg-clay-soft sm:block">Beranda</button>
          )}
          <button onClick={onWipe} aria-label="Hapus data saya" title="Hapus data saya" className="grid h-11 w-11 place-items-center rounded-full border border-line text-muted hover:bg-clay-soft hover:text-ink">
            <Trash2 size={18} strokeWidth={1.75} />
          </button>
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
