import { useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import { cx } from '../lib'

/**
 * Kanvas tanda tangan. Pengguna menggoreskan tanda tangannya dengan mouse
 * atau jari, lalu hasilnya disimpan sebagai data URL (PNG transparan).
 *
 * Disimpan sebagai gambar, bukan daftar titik, supaya ringan di localStorage
 * dan langsung bisa ditampilkan pada sertifikat maupun dicetak.
 */
export function TandaTangan({
  value,
  onChange,
  label = 'Tanda tangan di sini',
  tinggi = 110,
  className = '',
}: {
  /** Data URL PNG, atau string kosong bila belum ditandatangani. */
  value: string
  onChange: (v: string) => void
  label?: string
  tinggi?: number
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const [kosong, setKosong] = useState(!value)

  /**
   * Menyamakan resolusi kanvas dengan ukuran tampilannya (dikalikan rasio
   * perangkat) agar goresan tidak pecah di layar retina maupun saat dicetak.
   */
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    const rect = c.getBoundingClientRect()
    if (!rect.width) return
    c.width = Math.round(rect.width * dpr)
    c.height = Math.round(rect.height * dpr)
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#14112b'

    // Tanda tangan yang sudah tersimpan digambar ulang.
    if (value) {
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height)
        ctx.drawImage(img, 0, 0, rect.width, rect.height)
        setKosong(false)
      }
      img.src = value
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Titik koordinat relatif terhadap kanvas. */
  const titik = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const mulai = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    last.current = titik(e)
  }

  const gerak = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    const t = titik(e)
    const prev = last.current
    if (!ctx || !prev) return
    ctx.beginPath()
    ctx.moveTo(prev.x, prev.y)
    ctx.lineTo(t.x, t.y)
    ctx.stroke()
    last.current = t
    if (kosong) setKosong(false)
  }

  const selesai = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    drawing.current = false
    last.current = null
    const c = canvasRef.current
    if (!c) return
    try {
      onChange(c.toDataURL('image/png'))
    } catch {
      /* abaikan */
    }
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  const hapus = () => {
    const c = canvasRef.current
    const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const r = c.getBoundingClientRect()
    ctx.clearRect(0, 0, r.width, r.height)
    last.current = null
    setKosong(true)
    onChange('')
  }

  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          data-tanda-tangan="true"
          role="img"
          aria-label={`Kanvas tanda tangan: ${label}`}
          onPointerDown={mulai}
          onPointerMove={gerak}
          onPointerUp={selesai}
          onPointerCancel={selesai}
          style={{ height: tinggi, touchAction: 'none' }}
          className="w-full cursor-crosshair rounded-xl border-[1.5px] border-dashed border-line bg-white"
        />
        {kosong && (
          <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted">
            {label}
          </span>
        )}
      </div>
      {!kosong && (
        <button type="button" onClick={hapus} className="inline-flex w-fit items-center gap-1.5 text-xs text-muted underline underline-offset-4">
          <Eraser size={13} strokeWidth={1.75} aria-hidden />
          Hapus tanda tangan
        </button>
      )}
    </div>
  )
}
