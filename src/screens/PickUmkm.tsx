import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Check, Loader2, LocateFixed, MapPin, Phone, Plus, Search, Store } from 'lucide-react'
import { BackButton, Page } from '../components/ui'
import { cx, type AppState } from '../lib'
import {
  JENIS_USAHA,
  LIMITS,
  jenisUsahaLabel,
  type JenisUsaha,
  type PlaceResult,
  type Umkm,
} from '../data/umkmTypes'

type P = { state: AppState; patch: (p: Partial<AppState>) => void; reset: () => void }

/** Pusat cadangan bila pengguna tidak mengizinkan lokasi: Padang. */
const PADANG = { lat: -0.9471, lon: 100.3543 }

type Status = 'idle' | 'locating' | 'loading' | 'ready' | 'empty' | 'error' | 'nokey'

/** ID UMKM yang stabil dan tidak bergantung pada nama. */
function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${Date.now().toString(36)}-${rand}`
}

export function PickUmkm({ state, patch }: P) {
  const [tab, setTab] = useState<'cari' | 'manual'>('cari')

  // ---- Tab pencarian ----
  const [status, setStatus] = useState<Status>('idle')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [message, setMessage] = useState('')
  const [radiusKm, setRadiusKm] = useState(2)
  const [centerSource, setCenterSource] = useState<'user' | 'default' | null>(null)
  const [pickedId, setPickedId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  /** Menandai apakah pengguna sudah menyetujui pemakaian lokasi. */
  const [locationAllowed, setLocationAllowed] = useState(false)

  // ---- Tab manual ----
  const [name, setName] = useState('')
  const [jenis, setJenis] = useState<JenisUsaha>('Warung makan')
  const [jenisLain, setJenisLain] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [manualError, setManualError] = useState('')

  const canManual = name.trim().length > 0 && city.trim().length > 0

  /* ---------------------------------------------------------------- */
  /* Pencarian                                                        */
  /* ---------------------------------------------------------------- */

  const search = async (opts: { withLocation: boolean; radius: number }) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStatus(opts.withLocation ? 'locating' : 'loading')
    setMessage('')
    setResults([])
    setPickedId(null)

    let coords: { lat: number; lon: number } | null = null

    if (opts.withLocation) {
      coords = await getCoarseLocation()
      if (!coords) {
        // Izin ditolak atau gagal: beri tahu dan pakai pusat default.
        setLocationAllowed(false)
        setMessage('Lokasi tidak bisa dibaca. Kami pakai pusat kota Padang sebagai gantinya.')
      } else {
        setLocationAllowed(true)
      }
    }
    if (controller.signal.aborted) return

    setStatus('loading')
    try {
      const res = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(coords ? { lat: coords.lat, lon: coords.lon } : {}),
          radiusKm: opts.radius,
        }),
        signal: controller.signal,
      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 503) {
        setStatus('nokey')
        setMessage(data.message || 'Pencarian lokasi belum tersedia. Tambahkan usahamu sendiri.')
        return
      }
      if (!res.ok) {
        setStatus('error')
        setMessage(data.message || 'Pencarian gagal. Coba lagi atau tambahkan usaha sendiri.')
        return
      }

      const list: PlaceResult[] = Array.isArray(data.results) ? data.results : []
      setCenterSource(data.center?.source === 'user' ? 'user' : 'default')
      setResults(list)
      setStatus(list.length === 0 ? 'empty' : 'ready')
      if (list.length === 0) {
        setMessage('Tidak ada usaha yang cocok di sekitar sini. Coba perbesar radius atau tambahkan usaha sendiri.')
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      setStatus('error')
      setMessage('Tidak bisa menghubungi layanan peta. Periksa koneksimu atau tambahkan usaha sendiri.')
    }
  }

  // Muat pertama kali tanpa meminta lokasi: pakai pusat default.
  useEffect(() => {
    search({ withLocation: false, radius: radiusKm })
    return () => abortRef.current?.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ubahRadius = (r: number) => {
    setRadiusKm(r)
    search({ withLocation: locationAllowed, radius: r })
  }

  const choose = (r: PlaceResult) => {
    setPickedId(r.id)
    const umkm: Umkm = {
      id: makeId('places'),
      source: 'places',
      name: r.name.slice(0, LIMITS.businessName),
      jenisUsaha: r.jenisUsaha,
      ...(r.jenisUsaha === 'Lainnya' ? { jenisUsahaLain: r.categoryLabel } : {}),
      city: extractCity(r.address) || 'Padang',
      address: (r.address || '').slice(0, LIMITS.address),
      ...(r.phone ? { phone: r.phone } : {}),
      ...(r.openingHours ? { openingHours: r.openingHours } : {}),
      categoryLabel: r.categoryLabel,
      ...(r.lat != null ? { lat: r.lat } : {}),
      ...(r.lon != null ? { lon: r.lon } : {}),
    }
    patch({
      umkm,
      mission: null,
      problem: '',
      ownerPermissionGranted: false,
      introMessage: '',
      screen: 'tellProblem',
    })
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }

  const saveManual = () => {
    if (!canManual) {
      setManualError('Nama usaha dan kota perlu diisi.')
      return
    }
    setManualError('')
    const umkm: Umkm = {
      id: makeId('manual'),
      source: 'manual',
      name: name.trim().slice(0, LIMITS.businessName),
      jenisUsaha: jenis,
      ...(jenis === 'Lainnya' && jenisLain.trim()
        ? { jenisUsahaLain: jenisLain.trim().slice(0, LIMITS.jenisUsahaLain) }
        : {}),
      city: city.trim().slice(0, LIMITS.city),
      address: address.trim().slice(0, LIMITS.address),
    }
    patch({
      umkm,
      mission: null,
      problem: '',
      ownerPermissionGranted: false,
      introMessage: '',
      screen: 'tellProblem',
    })
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }

  /* ---------------------------------------------------------------- */
  /* Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <Page narrow={false}>
      <BackButton onClick={() => patch({ screen: 'results' })} />

      <p className="text-muted">Langkah 2 dari 3</p>
      <h1 className="mt-1 text-[38px] leading-[1.1] tracking-[-0.02em] md:text-[56px]">Pilih UMKM</h1>
      <p className="mt-3 max-w-[62ch] text-lg leading-8 text-muted">
        Pilih usaha di sekitarmu atau tambahkan sendiri. Setelah itu Jeje merancang misi 3 hari yang bisa kamu kerjakan.
      </p>

      {/* Tab */}
      <div role="tablist" aria-label="Cara memilih UMKM" className="mt-8 flex gap-2 overflow-x-auto pb-1">
        <TabButton active={tab === 'cari'} onClick={() => setTab('cari')} icon={Search} label="Cari di sekitar" />
        <TabButton active={tab === 'manual'} onClick={() => setTab('manual')} icon={Plus} label="Tambah sendiri" />
      </div>

      {tab === 'cari' ? (
        <section className="mt-6" aria-label="Cari UMKM di sekitar">
          {/* Kontrol pencarian */}
          <div className="sheet flex flex-col gap-4 p-5 md:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="btn-secondary !min-h-11 !px-4"
                onClick={() => search({ withLocation: true, radius: radiusKm })}
                disabled={status === 'loading' || status === 'locating'}
              >
                <LocateFixed size={18} strokeWidth={1.75} />
                Pakai lokasiku
              </button>
              <p className="text-sm text-muted">
                {centerSource === 'user'
                  ? 'Mencari di sekitar lokasimu (dibulatkan ke ~100 m).'
                  : 'Mencari di sekitar pusat Kota Padang.'}
              </p>
            </div>

            <p className="rounded-2xl bg-clay-soft px-4 py-3 text-sm leading-5">
              Jawaban, nama, cerita, dan catatan kerjamu dikirim ke layanan AI pihak ketiga (Google Gemini) untuk
              dianalisis. Jangan menulis data pribadi orang lain. Lokasi kasar (dibulatkan) hanya dikirim ke penyedia
              peta bila kamu mengizinkan. Hasilmu disimpan di perangkatmu dan tidak disimpan di server kami.
            </p>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="radius" className="text-sm font-semibold">Radius pencarian</label>
                <span className="text-sm text-muted" aria-live="polite">{radiusKm} km</span>
              </div>
              <input
                id="radius"
                type="range"
                min={1}
                max={5}
                step={1}
                value={radiusKm}
                onChange={(e) => ubahRadius(Number(e.target.value))}
                className="mt-2 w-full accent-[#7c4dff]"
              />
              <div className="flex justify-between text-xs text-muted"><span>1 km</span><span>5 km</span></div>
            </div>
          </div>

          {/* Status & hasil */}
          {(status === 'loading' || status === 'locating') && (
            <div role="status" className="sheet mt-4 flex items-center gap-3 p-6 text-muted">
              <Loader2 size={20} className="animate-spin" aria-hidden />
              {status === 'locating' ? 'Membaca lokasimu...' : 'Mencari usaha di sekitar...'}
            </div>
          )}

          {(status === 'error' || status === 'empty' || status === 'nokey') && (
            <div role="status" className="sheet mt-4 flex flex-col gap-3 p-6">
              <p className="flex items-start gap-2">
                <AlertCircle size={20} strokeWidth={1.75} className="mt-0.5 flex-none text-[#c2410c]" aria-hidden />
                <span>{message}</span>
              </p>
              {status !== 'nokey' && (
                <p className="text-sm text-muted">
                  Perbesar radius di atas, atau pilih tab <strong>Tambah sendiri</strong>.
                </p>
              )}
              <button className="btn-primary self-start" onClick={() => setTab('manual')}>
                <Plus size={18} strokeWidth={2} />
                Tambah sendiri
              </button>
            </div>
          )}

          {status === 'ready' && (
            <>
              {message && (
                <p role="status" className="mt-4 rounded-2xl bg-clay-soft px-4 py-3 text-sm">{message}</p>
              )}
              <p className="mt-4 text-sm text-muted" aria-live="polite">
                {results.length} usaha ditemukan. Pilih satu untuk lanjut.
              </p>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => choose(r)}
                      className={cx(
                        'sheet flex w-full flex-col gap-2 p-5 text-left transition-colors hover:bg-clay-soft',
                        pickedId === r.id && 'ring-2 ring-[#7c4dff]',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-semibold leading-6">
                            <Store size={17} strokeWidth={1.75} className="flex-none text-muted" aria-hidden />
                            <span className="truncate">{r.name}</span>
                          </p>
                          <p className="mt-0.5 text-sm text-muted">{r.categoryLabel}</p>
                        </div>
                        {pickedId === r.id && (
                          <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-[#7c4dff]" aria-hidden>
                            <Check size={15} strokeWidth={3} color="#fff" />
                          </span>
                        )}
                      </div>
                      {r.address && (
                        <p className="flex items-start gap-1.5 text-sm text-muted">
                          <MapPin size={14} strokeWidth={1.75} className="mt-1 flex-none" aria-hidden />
                          <span className="line-clamp-2">{r.address}</span>
                        </p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                        {r.openingHours && <span>Buka: {r.openingHours}</span>}
                        {r.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={13} strokeWidth={1.75} aria-hidden />
                            {r.phone}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs text-muted">© OpenStreetMap contributors dan Geoapify</p>
            </>
          )}
        </section>
      ) : (
        <ManualForm
          {...{ name, setName, jenis, setJenis, jenisLain, setJenisLain, city, setCity, address, setAddress }}
          error={manualError}
          canSave={canManual}
          onSave={saveManual}
        />
      )}
    </Page>
  )
}

/* ==================================================================== */
/* Komponen bantu                                                       */
/* ==================================================================== */

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Search; label: string }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cx(
        'inline-flex min-h-11 flex-none items-center gap-2 rounded-full px-5 text-sm font-semibold ring-1 transition-colors',
        active ? 'bg-ink text-white ring-ink' : 'bg-white text-ink ring-line hover:bg-clay-soft',
      )}
    >
      <Icon size={17} strokeWidth={1.75} aria-hidden />
      {label}
    </button>
  )
}

interface ManualProps {
  name: string
  setName: (v: string) => void
  jenis: JenisUsaha
  setJenis: (v: JenisUsaha) => void
  jenisLain: string
  setJenisLain: (v: string) => void
  city: string
  setCity: (v: string) => void
  address: string
  setAddress: (v: string) => void
  error: string
  canSave: boolean
  onSave: () => void
}

function ManualForm(p: ManualProps) {
  const field = 'w-full rounded-2xl bg-white px-4 py-3 ring-1 ring-line placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[#7c4dff]'
  return (
    <section className="mt-6" aria-label="Tambahkan UMKM sendiri">
      <div className="sheet flex flex-col gap-5 p-5 md:p-7">
        <div>
          <label htmlFor="umkm-nama" className="text-sm font-semibold">Nama usaha</label>
          <input
            id="umkm-nama"
            className={cx(field, 'mt-1.5')}
            value={p.name}
            maxLength={LIMITS.businessName}
            placeholder="Contoh: Warung Makan Pak Budi"
            onChange={(e) => p.setName(e.target.value.slice(0, LIMITS.businessName))}
            autoComplete="off"
          />
          <p className="mt-1 text-right text-xs text-muted">{p.name.length}/{LIMITS.businessName}</p>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold">Jenis usaha</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {JENIS_USAHA.map((j) => (
              <button
                key={j}
                type="button"
                aria-pressed={p.jenis === j}
                onClick={() => p.setJenis(j)}
                className={cx(
                  'min-h-10 rounded-full px-4 text-sm font-medium ring-1 transition-colors',
                  p.jenis === j ? 'bg-[#7c4dff] text-white ring-[#7c4dff]' : 'bg-white text-ink ring-line hover:bg-clay-soft',
                )}
              >
                {j}
              </button>
            ))}
          </div>
          {p.jenis === 'Lainnya' && (
            <div className="mt-3">
              <label htmlFor="umkm-jenis-lain" className="text-sm text-muted">Sebutkan jenis usahanya</label>
              <input
                id="umkm-jenis-lain"
                className={cx(field, 'mt-1')}
                value={p.jenisLain}
                maxLength={LIMITS.jenisUsahaLain}
                placeholder="Contoh: jasa cuci motor"
                onChange={(e) => p.setJenisLain(e.target.value.slice(0, LIMITS.jenisUsahaLain))}
              />
            </div>
          )}
        </fieldset>

        <div>
          <label htmlFor="umkm-kota" className="text-sm font-semibold">Kota</label>
          <input
            id="umkm-kota"
            className={cx(field, 'mt-1.5')}
            value={p.city}
            maxLength={LIMITS.city}
            placeholder="Contoh: Padang"
            onChange={(e) => p.setCity(e.target.value.slice(0, LIMITS.city))}
            autoComplete="address-level2"
          />
        </div>

        <div>
          <label htmlFor="umkm-alamat" className="text-sm font-semibold">
            Alamat singkat <span className="font-normal text-muted">(opsional)</span>
          </label>
          <input
            id="umkm-alamat"
            className={cx(field, 'mt-1.5')}
            value={p.address}
            maxLength={LIMITS.address}
            placeholder="Contoh: Jl. Pasar Raya No. 12"
            onChange={(e) => p.setAddress(e.target.value.slice(0, LIMITS.address))}
            autoComplete="street-address"
          />
          <p className="mt-1 text-right text-xs text-muted">{p.address.length}/{LIMITS.address}</p>
        </div>

        {p.error && (
          <p role="alert" className="flex items-center gap-2 rounded-2xl bg-[#ffe9cc] px-4 py-3 text-sm">
            <AlertCircle size={17} strokeWidth={1.75} className="flex-none text-[#c2410c]" aria-hidden />
            {p.error}
          </p>
        )}

        <button className="btn-primary w-full md:w-auto md:self-start" onClick={p.onSave} disabled={!p.canSave}>
          Lanjut ceritakan masalahnya
        </button>
      </div>
    </section>
  )
}

/* ==================================================================== */
/* Utilitas                                                             */
/* ==================================================================== */

/**
 * Membaca lokasi pengguna lalu membulatkannya ke 3 desimal (~110 m) supaya
 * hanya lokasi kasar yang keluar dari perangkat.
 */
function getCoarseLocation(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null)
    const timer = setTimeout(() => resolve(null), 8000)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer)
        resolve({
          lat: Math.round(pos.coords.latitude * 1000) / 1000,
          lon: Math.round(pos.coords.longitude * 1000) / 1000,
        })
      },
      () => {
        clearTimeout(timer)
        resolve(null)
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 5 * 60 * 1000 },
    )
  })
}

/** Mengambil nama kota dari alamat Geoapify yang dipisah koma. */
function extractCity(address: string): string {
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean)
  return parts.length > 1 ? parts[parts.length - 2] || '' : ''
}
