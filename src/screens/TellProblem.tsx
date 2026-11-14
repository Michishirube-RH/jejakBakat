import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Check,
  ClipboardCopy,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Store,
} from 'lucide-react'
import { BackButton, Page } from '../components/ui'
import { cx, type AppState } from '../lib'
import {
  LIMITS,
  PROBLEM_SUGGESTIONS,
  jenisUsahaLabel,
  type Mission,
  type Umkm,
} from '../data/umkmTypes'
import { fillTemplate, templateForJenis } from '../data/missionTemplates'
import { potentials } from '../data/mockData'

type P = { state: AppState; patch: (p: Partial<AppState>) => void; reset: () => void }
type Busy = 'none' | 'intro' | 'mission'

/** Batas jumlah chip saran yang tampil agar layar 390 px tetap rapi. */
const MAX_SUGGESTIONS = 4

export function TellProblem({ state, patch }: P) {
  const umkm = state.umkm
  const [problem, setProblem] = useState(state.problem ?? '')
  const [permission, setPermission] = useState(!!state.ownerPermissionGranted)
  const [busy, setBusy] = useState<Busy>('none')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [intro, setIntro] = useState(state.introMessage ?? '')
  const copyTimer = useRef<number | null>(null)

  // Simpan teks masalah & status izin ke state utama secara berkala.
  useEffect(() => {
    const t = setTimeout(() => patch({ problem, ownerPermissionGranted: permission }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem, permission])

  useEffect(() => () => { if (copyTimer.current) window.clearTimeout(copyTimer.current) }, [])

  const suggestions = useMemo(() => {
    if (!umkm) return []
    return (PROBLEM_SUGGESTIONS[umkm.jenisUsaha] ?? []).slice(0, MAX_SUGGESTIONS)
  }, [umkm])

  // Layar ini butuh UMKM. Tanpa itu, kembalikan ke pemilihan.
  if (!umkm) {
    return (
      <Page>
        <div className="flex min-h-[60vh] flex-col justify-center">
          <h2 className="text-[34px] leading-[1.15]">Belum ada UMKM yang dipilih</h2>
          <p className="mt-2 text-muted">Pilih usaha di sekitarmu atau tambahkan sendiri dulu.</p>
          <button className="btn-primary mt-6 self-start" onClick={() => patch({ screen: 'pickUmkm' })}>
            Pilih UMKM
          </button>
        </div>
      </Page>
    )
  }

  const tolakKarakter = (max: number, val: string) => val.slice(0, max)

  /* -------------------------------------------------------------- */
  /* Aksi                                                           */
  /* -------------------------------------------------------------- */

  const buatPesan = async () => {
    if (busy !== 'none') return
    setBusy('intro')
    setError('')
    setCopied(false)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'introMessage',
          payload: {
            umkm: { name: umkm.name, jenisUsaha: jenisUsahaLabel(umkm), city: umkm.city },
            problem,
            userName: state.userName,
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.result) throw new Error(data?.message || 'gagal')
      const text = String(data.result).slice(0, LIMITS.introMessage)
      setIntro(text)
      patch({ introMessage: text })
    } catch {
      // Cadangan lokal: tetap sopan dan tidak mengarang nama pemilik.
      const fallback =
        `Selamat siang, saya ${state.userName?.trim() || 'seorang mahasiswa'}. ` +
        `Saya ingin belajar membantu usaha ${umkm.name}${umkm.city ? ` di ${umkm.city}` : ''}. ` +
        `Boleh saya berkunjung sebentar untuk meminta izin dan bertanya langsung? Terima kasih.`
      setIntro(fallback)
      patch({ introMessage: fallback })
      setError('Pesan perkenalan memakai contoh bawaan karena layanan AI belum bisa dihubungi. Kamu tetap bisa menyuntingnya.')
    } finally {
      setBusy('none')
    }
  }

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(intro)
      setCopied(true)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 2200)
    } catch {
      setError('Gagal menyalin otomatis. Pilih teks pesan lalu salin manual.')
    }
  }

  const rancangMisi = async () => {
    if (busy !== 'none') return
    setBusy('mission')
    setError('')

    const topId = state.result?.potentials?.[0]?.potentialId ?? ''
    const potensiName = potentials.find((p) => p.id === topId)?.name ?? ''

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'planMission',
          payload: {
            umkm: {
              name: umkm.name,
              jenisUsaha: jenisUsahaLabel(umkm),
              city: umkm.city,
              address: umkm.address,
              openingHours: umkm.openingHours,
            },
            problem,
            potentialName: potensiName,
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.result) throw new Error(data?.message || 'gagal')

      const mission = toMission(data.result, umkm, problem, permission, potensiName)
      patch({ mission, screen: 'workspace', stepDone: {}, tasks: {}, notes: {}, chats: {} })
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    } catch {
      // Cadangan: template per jenis usaha, tidak pernah menyebut UMKM tertentu.
      const mission = missionFromTemplate(umkm, problem, permission, potensiName)
      patch({ mission, screen: 'workspace', stepDone: {}, tasks: {}, notes: {}, chats: {} })
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    } finally {
      setBusy('none')
    }
  }

  /* -------------------------------------------------------------- */
  /* Render                                                         */
  /* -------------------------------------------------------------- */

  const telp = umkm.phone ? digitsOnly(umkm.phone) : ''
  const isMobile = /^(628|08)\d{7,}$/.test(telp)

  return (
    <Page narrow={false}>
      <BackButton onClick={() => patch({ screen: 'pickUmkm' })} />

      <p className="text-muted">Langkah 3 dari 3</p>
      <h1 className="mt-1 text-[38px] leading-[1.1] tracking-[-0.02em] md:text-[56px]">Ceritakan masalahnya</h1>
      <p className="mt-3 max-w-[62ch] text-lg leading-8 text-muted">
        Tulis apa yang kamu lihat atau yang dikeluhkan pemilik. Kosong pun boleh: Jeje akan mulai dari wawancara.
      </p>

      {/* Ringkasan UMKM */}
      <div className="sheet mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 p-5">
        <p className="flex items-center gap-2 font-semibold">
          <Store size={18} strokeWidth={1.75} className="text-muted" aria-hidden />
          {umkm.name}
        </p>
        <p className="text-sm text-muted">{jenisUsahaLabel(umkm)}</p>
        {umkm.city && (
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <MapPin size={14} strokeWidth={1.75} aria-hidden />
            {umkm.city}
          </p>
        )}
        <button className="text-sm font-semibold text-[#5b32d6] underline" onClick={() => patch({ screen: 'pickUmkm' })}>
          Ganti
        </button>
      </div>

      {/* Masalah */}
      <section className="sheet mt-4 flex flex-col gap-3 p-5 md:p-7">
        <label htmlFor="masalah" className="text-lg font-semibold">
          Masalah yang kamu lihat atau dikeluhkan pemilik
        </label>
        <p className="-mt-1 text-sm text-muted">Opsional. Semakin jelas, semakin tepat rancangan misinya.</p>
        <textarea
          id="masalah"
          rows={4}
          value={problem}
          maxLength={LIMITS.problem}
          onChange={(e) => setProblem(tolakKarakter(LIMITS.problem, e.target.value))}
          placeholder="Contoh: pembeli baru jarang datang, belum ada foto menu, catatan penjualan masih di buku."
          className="min-h-[112px] w-full resize-none rounded-2xl bg-white p-4 ring-1 ring-line placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[#7c4dff]"
        />
        <p className="text-right text-xs text-muted">{problem.length}/{LIMITS.problem}</p>

        {suggestions.length > 0 && (
          <div>
            <p className="text-sm font-semibold">Saran cepat</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((s) => {
                const active = problem.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      if (active) {
                        setProblem(problem.replace(s, '').replace(/\s*,\s*,\s*/g, ', ').trim())
                      } else {
                        const next = problem.trim() ? `${problem.trim().replace(/\.$/, '')}, ${s}` : s
                        setProblem(tolakKarakter(LIMITS.problem, next))
                      }
                    }}
                    className={cx(
                      'rounded-full px-3.5 py-2 text-sm ring-1 transition-colors',
                      active ? 'bg-[#7c4dff] text-white ring-[#7c4dff]' : 'bg-white text-ink ring-line hover:bg-clay-soft',
                    )}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <p className="rounded-2xl bg-clay-soft px-4 py-3 text-xs leading-5">
          Jawaban dan teks masalah dikirim ke layanan AI untuk dianalisis. Jangan menuliskan data pribadi orang lain
          (nomor KTP, nomor rekening, atau alamat rumah lengkap).
        </p>
      </section>

      {/* Izin pemilik */}
      <section className="sheet mt-4 flex flex-col gap-3 p-5 md:p-7">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={permission}
            onChange={(e) => setPermission(e.target.checked)}
          />
          <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-md border-2 border-ink/50 peer-checked:border-leaf peer-checked:bg-leaf peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky">
            {permission && <Check size={16} strokeWidth={2.5} color="#fff" />}
          </span>
          <span>
            <span className="font-semibold">Sudah izin pemilik</span>
            <span className="mt-0.5 block text-sm text-muted">
              Centang bila pemilik sudah setuju kamu membantu. Belum juga tidak masalah.
            </span>
          </span>
        </label>
        <p
          role="status"
          className={cx(
            'inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold',
            permission ? 'bg-[#d8f5e1] text-[#0f3d26]' : 'bg-paper text-muted ring-1 ring-line',
          )}
        >
          <ShieldCheck size={15} strokeWidth={1.75} aria-hidden />
          {permission ? 'Sudah izin' : 'Belum dihubungi'}
        </p>
      </section>

      {/* Pesan perkenalan */}
      <section className="sheet mt-4 flex flex-col gap-3 p-5 md:p-7">
        <h2 className="text-lg font-semibold">Pesan perkenalan</h2>
        <p className="-mt-1 text-sm text-muted">
          Jeje menyusun pesan WhatsApp singkat dan sopan untuk membuka percakapan dengan pemilik.
        </p>

        <button className="btn-secondary w-full md:w-auto md:self-start" onClick={buatPesan} disabled={busy !== 'none'}>
          {busy === 'intro' ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Sparkles size={18} strokeWidth={1.75} aria-hidden />}
          {busy === 'intro' ? 'Menyusun pesan...' : intro ? 'Susun ulang pesan' : 'Buat pesan perkenalan'}
        </button>

        {intro && (
          <div className="flex flex-col gap-3">
            <label htmlFor="intro" className="sr-only">Pesan perkenalan</label>
            <textarea
              id="intro"
              rows={5}
              value={intro}
              maxLength={LIMITS.introMessage}
              onChange={(e) => { const v = tolakKarakter(LIMITS.introMessage, e.target.value); setIntro(v); patch({ introMessage: v }) }}
              className="min-h-[132px] w-full resize-none rounded-2xl bg-white p-4 text-[15px] leading-6 ring-1 ring-line focus:outline-none focus:ring-2 focus:ring-[#7c4dff]"
            />
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary !min-h-11 !px-4" onClick={salin}>
                {copied ? <Check size={17} strokeWidth={2.5} aria-hidden /> : <ClipboardCopy size={17} strokeWidth={1.75} aria-hidden />}
                {copied ? 'Tersalin' : 'Salin pesan'}
              </button>
              {isMobile && (
                <a
                  className="btn-primary !min-h-11 !px-4"
                  href={`https://wa.me/${telp}?text=${encodeURIComponent(intro)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={17} strokeWidth={1.75} aria-hidden />
                  Kirim via WhatsApp
                </a>
              )}
              {!isMobile && umkm.phone && (
                <a className="btn-primary !min-h-11 !px-4" href={`tel:${telp}`}>
                  <Phone size={17} strokeWidth={1.75} aria-hidden />
                  Telepon
                </a>
              )}
            </div>
            {!isMobile && umkm.phone && (
              <p className="text-xs text-muted">
                Nomor ini tampak seperti telepon rumah, jadi WhatsApp tidak bisa dibuka otomatis. Salin pesannya lalu
                hubungi lewat telepon.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Tips keselamatan */}
      <aside className="sheet mt-4 p-5 md:p-7">
        <h2 className="text-lg font-semibold">Tips keselamatan</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted">
          <li>Datang siang hari saat usaha sedang buka.</li>
          <li>Ajak teman bila memungkinkan.</li>
          <li>Bertemu di lokasi usaha, bukan di tempat sepi.</li>
          <li>Jangan membagikan data pribadi berlebihan.</li>
        </ul>
      </aside>

      {error && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-[#ffe9cc] px-4 py-3 text-sm">
          <AlertCircle size={17} strokeWidth={1.75} className="mt-0.5 flex-none text-[#c2410c]" aria-hidden />
          {error}
        </p>
      )}

      {/* Aksi utama */}
      <div className="mt-6 flex flex-col gap-3 pb-4 md:flex-row md:items-center">
        <button className="btn-primary w-full md:w-auto" onClick={rancangMisi} disabled={busy !== 'none'}>
          {busy === 'mission' ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Sparkles size={18} strokeWidth={1.75} aria-hidden />}
          {busy === 'mission' ? 'Merancang misi...' : 'Rancang misiku'}
        </button>
        <p className="text-sm text-muted">Jeje merancang 3 langkah, mulai dari bertemu pemilik dan meminta izin.</p>
      </div>
    </Page>
  )
}

/* ================================================================== */
/* Utilitas                                                           */
/* ================================================================== */

/** Membuang semua karakter selain angka. */
function digitsOnly(v: string): string {
  return v.replace(/\D/g, '')
}

/** Memetakan hasil LLM (bentuk server) ke objek Mission yang disimpan. */
function toMission(
  raw: any,
  umkm: Umkm,
  problem: string,
  ownerPermissionGranted: boolean,
  potensiName: string,
): Mission {
  const jenis = jenisUsahaLabel(umkm)
  return {
    id: `mission-${Date.now().toString(36)}`,
    umkmId: umkm.id,
    usaha: umkm.name,
    lokasi: umkm.address || umkm.city,
    jenisUsaha: jenis,
    masalah: problem,
    ringkasan: String(raw.ringkasan ?? '').slice(0, 400),
    target: String(raw.target ?? '').slice(0, 300),
    skills: Array.isArray(raw.skills) ? raw.skills.slice(0, 5).map((s: any) => String(s)) : [],
    durasi: String(raw.durasi ?? '3 hari'),
    jam: Number(raw.jam) || 5,
    kesulitan: ['Mudah', 'Sedang', 'Menantang'].includes(raw.kesulitan) ? raw.kesulitan : 'Sedang',
    cocokDengan: potensiName,
    asumsi: Array.isArray(raw.asumsi) ? raw.asumsi.slice(0, 4).map((a: any) => String(a)) : [],
    ownerPermissionGranted,
    roadmap: Array.isArray(raw.roadmap)
      ? raw.roadmap.slice(0, 3).map((s: any, i: number) => ({
          id: `s${i + 1}`,
          title: String(s?.title ?? `Langkah ${i + 1}`),
          goal: String(s?.goal ?? ''),
          tasks: Array.isArray(s?.tasks) ? s.tasks.slice(0, 5).map((t: any) => String(t)) : [],
          mentorOpening: String(s?.mentorOpening ?? ''),
        }))
      : [],
    createdAt: new Date().toISOString(),
  }
}

/** Membangun misi dari template cadangan per jenis usaha. */
function missionFromTemplate(
  umkm: Umkm,
  problem: string,
  ownerPermissionGranted: boolean,
  potensiName: string,
): Mission {
  const jenis = jenisUsahaLabel(umkm)
  const t = templateForJenis(jenis)
  const data = { usaha: umkm.name, lokasi: umkm.address || umkm.city, jenis }
  return {
    id: `mission-${Date.now().toString(36)}`,
    umkmId: umkm.id,
    usaha: umkm.name,
    lokasi: umkm.address || umkm.city,
    jenisUsaha: jenis,
    masalah: problem,
    ringkasan: fillTemplate(t.ringkasan, data),
    target: fillTemplate(t.target, data),
    skills: t.skills,
    durasi: t.durasi,
    jam: t.jam,
    kesulitan: t.kesulitan,
    cocokDengan: potensiName,
    asumsi: ['Misi ini disusun dari template umum karena layanan AI belum bisa dihubungi. Sesuaikan dengan kondisi usaha saat wawancara.'],
    ownerPermissionGranted,
    roadmap: t.roadmap.map((s) => ({
      ...s,
      goal: fillTemplate(s.goal, data),
      tasks: s.tasks.map((x) => fillTemplate(x, data)),
      mentorOpening: fillTemplate(s.mentorOpening, data),
    })),
    createdAt: new Date().toISOString(),
  }
}
