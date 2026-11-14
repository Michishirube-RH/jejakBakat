import { useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import { cx } from '../lib'

/**
 * Kanvas tanda tangan. Pengguna menggoreskan tanda tangannya dengan mouse
 * atau jari, lalu hasilnya disimpan sebagai data URL (PNG transparan).
 *
 * Dua hal yang menentukan hasilnya rapi di sertifikat:
 *
 * 1. Yang disimpan hanya kotak terkecil yang memuat goresan, bukan seluruh
 *    kanvas. Kalau ruang kosong ikut tersimpan, gambarnya jadi sangat lebar
 *    dan saat diperkecil di sertifikat goresan berubah posisi.
 * 2. Skala (dikalikan rasio perangkat) diterapkan dengan transform, bukan
 *    ctx.scale. Dengan ctx.scale berulang, tinta makin tebal tiap kali
 *    gambar digambar ulang; dengan transform, ketebalan tetap konsisten.
 */

/** Kotak goresan dalam piksel CSS. */
type Kotak = { x0: number; y0: number; x1: number; y1: number }

/** Ketebalan tinta pada gambar hasil simpan, dalam piksel gambar. */
const TEBAL_SIMPAN = 3.2
/** Ruang kosong di sekeliling goresan agar garis tepi tidak terpotong. */
const PAD = 6
/**
 * Warna tinta. Dipilih terang dengan sengaja: tanda tangan ditampilkan di atas
 * latar sertifikat yang gelap (#1e1a4d - #14112b), jadi tinta gelap akan
 * hilang sama sekali. Di kanvas putih tinta ini tetap terbaca jelas.
 */
const WARNA_TINTA = '#cbb9ff'

export function TandaTangan({
  value,
  onChange,
  label = 'Tanda tangan di sini',
  tinggi = 150,
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
  /** Kotak goresan di kanvas (piksel CSS), diperbarui tiap ada goresan baru. */
  const bounds = useRef<Kotak | null>(null)
  const lastEmitted = useRef<string | null>(null)
  const [kosong, setKosong] = useState(!value)

  /** Menyamakan resolusi kanvas dengan ukuran tampilan, lalu menggambar ulang. */
  const siapkan = () => {
    const c = canvasRef.current
    if (!c) return null
    const dpr = window.devicePixelRatio || 1
    const rect = c.getBoundingClientRect()
    if (!rect.width) return null
    c.width = Math.round(rect.width * dpr)
    c.height = Math.round(rect.height * dpr)
    const ctx = c.getContext('2d')
    if (!ctx) return null
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#14112b'
    return rect
  }

  // Menggambar ulang tanda tangan yang sudah tersimpan. Dijalankan ulang bila
  // nilainya berubah dari luar (misalnya setelah halaman dimuat kembali).
  useEffect(() => {
    // Bila nilai yang masuk sama persis dengan yang baru saja dikirim oleh goresan
    // saat ini, kanvas sudah memuat goresan asli tanpa perlu digambar ulang.
    if (value && value === lastEmitted.current) return
    lastEmitted.current = value

    const c = canvasRef.current
    if (!c) return
    const gambarkan = () => {
      const rect = siapkan()
      const ctx = c.getContext('2d')
      if (!rect || !ctx) return
      bounds.current = null
      if (!value) {
        setKosong(true)
        return
      }
      const img = new Image()
      img.onload = () => {
        const r = siapkan()
        const x = c.getContext('2d')
        if (!r || !x) return
        // Simpanan sudah dipotong ke kotak goresan, jadi gambarnya mengisi
        // kanvas selebar mungkin tanpa meregang: tinggi dihitung dari rasio.
        const rasio = img.naturalWidth / img.naturalHeight
        const w = Math.min(r.width, r.height * rasio)
        const h = w / rasio
        const dx = (r.width - w) / 2
        // Rata bawah: tanda tangan lazim menempel di garis.
        const dy = r.height - h
        x.drawImage(img, dx, dy, w, h)
        setKosong(false)
      }
      img.src = value
    }
    gambarkan()
    // Ukuran elemen bisa berubah setelah font termuat; gambar ulang sekali.
    document.fonts?.ready.then(gambarkan).catch(() => { /* abaikan */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  /** Titik koordinat relatif kanvas, dibatasi agar tidak keluar tepi. */
  const titik = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return {
      x: Math.min(Math.max(e.clientX - r.left, 0), r.width),
      y: Math.min(Math.max(e.clientY - r.top, 0), r.height),
    }
  }

  /** Memperbarui kotak goresan dengan titik baru. */
  const tambahBatas = (p: { x: number; y: number }) => {
    const b = bounds.current
    if (!b) {
      bounds.current = { x0: p.x, y0: p.y, x1: p.x, y1: p.y }
      return
    }
    b.x0 = Math.min(b.x0, p.x)
    b.y0 = Math.min(b.y0, p.y)
    b.x1 = Math.max(b.x1, p.x)
    b.y1 = Math.max(b.y1, p.y)
  }

  const mulai = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    const t = titik(e)
    last.current = t
    tambahBatas(t)
    setKosong(false)
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
    tambahBatas(t)
  }

  const selesai = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    drawing.current = false
    last.current = null
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId)
    } catch {
      /* abaikan */
    }

    const c = canvasRef.current
    const b = bounds.current
    if (!c) return
    if (!b) {
      lastEmitted.current = ''
      onChange('')
      return
    }

    // Potong ke kotak goresan saja dengan padding aman agar tidak keluar kanvas.
    const dpr = window.devicePixelRatio || 1
    const sx = Math.max(0, Math.floor(b.x0 * dpr - PAD))
    const sy = Math.max(0, Math.floor(b.y0 * dpr - PAD))
    const sRight = Math.min(c.width, Math.ceil(b.x1 * dpr + PAD))
    const sBottom = Math.min(c.height, Math.ceil(b.y1 * dpr + PAD))
    const sw = Math.max(1, sRight - sx)
    const sh = Math.max(1, sBottom - sy)

    const out = document.createElement('canvas')
    out.width = sw
    out.height = sh
    const ox = out.getContext('2d')
    if (!ox) return
    ox.drawImage(c, sx, sy, sw, sh, 0, 0, sw, sh)

    try {
      const dataUrl = out.toDataURL('image/png')
      lastEmitted.current = dataUrl
      onChange(dataUrl)
    } catch {
      /* abaikan */
    }
  }

  const hapus = () => {
    const c = canvasRef.current
    if (!c) return
    const rect = siapkan()
    if (!rect) return
    bounds.current = null
    last.current = null
    lastEmitted.current = ''
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
          style={{ height: tinggi, touchAction: 'none', cursor: 'crosshair' }}
          className="w-full rounded-xl border-[1.5px] border-dashed border-line bg-white"
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

/** Lebar dan tinggi gambar tanda tangan dari data URL, untuk menjaga rasio. */
export function ukuranTandaTangan(dataUrl: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    if (!dataUrl) return resolve(null)
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}
