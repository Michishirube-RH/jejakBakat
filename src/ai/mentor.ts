import { mentorReplies } from '../data/mockData'
import type { RoadmapStep } from '../data/mockData'
import type { Mission } from '../data/umkmTypes'

export type MentorIntent = 'hint' | 'check' | 'example' | 'general'
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const counters: Record<string, number> = {}

export interface MentorContext {
  mission?: Mission
  step?: RoadmapStep
  userNotes?: string
  recentChats?: Array<{ from: 'mentor' | 'user'; text: string }>
}

export interface MentorReply {
  text: string
  /** True bila balasan berasal dari cadangan lokal, bukan dari LLM. */
  usedFallback: boolean
}

/**
 * Memanggil LLM untuk balasan mentor Jeje.
 * Mengirimkan misi, langkah aktif, catatan pengguna, 10 pesan chat terakhir, dan pesan pengguna.
 * Bila gagal atau terjadi timeout, otomatis menggunakan balasan statis terarah sebagai cadangan.
 */
export async function mentorReply(
  intent: MentorIntent,
  message: string,
  key: string,
  context?: MentorContext
): Promise<MentorReply> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'mentorReply',
        payload: {
          intent,
          message,
          mission: context?.mission
            ? {
                namaUsaha: context.mission.usaha,
                jenisUsaha: context.mission.jenisUsaha,
                lokasi: context.mission.lokasi,
                masalah: context.mission.masalah,
                target: context.mission.target,
              }
            : undefined,
          step: context?.step
            ? {
                title: context.step.title,
                goal: context.step.goal,
                tasks: context.step.tasks,
              }
            : undefined,
          userNotes: context?.userNotes,
          recentChats: context?.recentChats?.slice(-10),
        },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      if (data?.result && typeof data.result === 'string' && data.result.trim()) {
        return { text: data.result.trim(), usedFallback: false }
      }
    }
  } catch (err) {
    console.warn('Panggilan LLM mentor gagal atau timeout, beralih ke balasan cadangan.', err)
  }

  // Cadangan cerdas dan kontekstual dari data lokal
  await wait(600 + Math.random() * 400)
  const q = message.toLowerCase().trim()
  const biz = context?.mission?.usaha || 'UMKM ini'
  const stepTitle = context?.step?.title || 'langkah ini'
  const stepGoal = context?.step?.goal || 'tujuan langkah ini'

  if (q.includes('aku siapa') || q.includes('siapa aku')) {
    return { text: `Kamu adalah peserta penjelajah bakat di JejakBakat AI yang sedang belajar sambil membantu ${biz}.`, usedFallback: true }
  }
  if (q.includes('kamu siapa') || q.includes('siapa kamu')) {
    return { text: `Aku Jeje, mentor AI-mu di JejakBakat AI! Aku siap mendampingimu langkah demi langkah menyelesaikan misi ${biz}.`, usedFallback: true }
  }
  if (q.includes('maksud') || q.includes('tujuan') || q.includes('apa yang harus') || q.includes('ngapain') || q.includes('gimana')) {
    return { text: `Di langkah "${stepTitle}", tujuan kita adalah ${stepGoal.toLowerCase()}. Coba fokus mulai dari tugas pertama dulu ya!`, usedFallback: true }
  }
  if (q === 'oy' || q === 'halo' || q === 'hai' || q === 'tes' || q === 'p') {
    return { text: `Halo! Yuk kita fokus lagi bantu ${biz} di langkah "${stepTitle}". Ada bagian tugas yang membuatmu ragu?`, usedFallback: true }
  }

  const list = mentorReplies[intent]
  const k = key + intent
  const i = (counters[k] = (counters[k] ?? -1) + 1)
  return { text: list[i % list.length], usedFallback: true }
}

/** Hasil siap tampil untuk Impact Report. */
export interface ImpactReportData {
  userName: string
  missionName: string
  date: string
  business: string
  summary: string
  provenSkills: string[]
  hours: number
  ownerPermissionGranted: boolean
  strengthenedPotential: string
  nextSteps: string[]
  /**
   * Nomor sertifikat, mis. JB-2026-A7F2-9C41. Dihitung ulang dari data yang
   * sama setiap kali, jadi selalu identik untuk laporan yang sama tanpa perlu
   * disimpan di server.
   */
  nomorSertifikat: string
  /** True bila ringkasan berasal dari template lokal, bukan dari LLM. */
  usedFallback: boolean
}

export interface ReportInput {
  mission: Mission
  userName: string
  notes: Record<string, string>
  potentialName: string
}

/**
 * Menyusun Impact Report berbasis misi aktif, catatan pengguna, dan ringkasan LLM.
 * Jika LLM gagal atau timeout, otomatis menggunakan fallback template lokal yang kontekstual.
 */
export async function buildImpactReport({
  mission,
  userName,
  notes,
  potentialName,
}: ReportInput): Promise<ImpactReportData> {
  const userNotes = mission.roadmap.map((s) => notes[s.id]?.trim()).filter(Boolean) as string[]

  let summary = userNotes.length
    ? `${mission.target} Catatan kerja: ${userNotes.join(' ')}`
    : `Menyelesaikan misi untuk ${mission.usaha} dengan target: ${mission.target}.`
  let usedFallback = true

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'buildReportSummary',
        payload: {
          mission: {
            namaUsaha: mission.usaha,
            jenisUsaha: mission.jenisUsaha,
            lokasi: mission.lokasi,
            masalah: mission.masalah,
            target: mission.target,
          },
          userNotes,
          userName: userName || 'Peserta',
        },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      if (data?.result && typeof data.result === 'string' && data.result.trim()) {
        summary = data.result.trim()
        usedFallback = false
      }
    }
  } catch (err) {
    console.warn('Panggilan LLM ringkasan laporan gagal atau timeout, memakai template cadangan.', err)
  }

  // Tanggal dikunci ke saat misi dirancang, bukan saat laporan dibuka. Kalau
  // memakai hari ini, sertifikat yang dibuka minggu depan akan bertanggal
  // berbeda dari sertifikat yang dibuka hari ini.
  const tanggalMisi = new Date(mission.createdAt || Date.now())

  return {
    userName: userName || '',
    missionName: `Misi ${mission.usaha}`,
    date: tanggalMisi.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    business: mission.lokasi ? `${mission.usaha}, ${mission.lokasi}` : mission.usaha,
    summary,
    provenSkills: mission.skills || [],
    hours: mission.jam || 5,
    ownerPermissionGranted: mission.ownerPermissionGranted,
    strengthenedPotential: potentialName || '',
    nextSteps: mission.roadmap.map((s) => s.title),
    nomorSertifikat: buatNomorSertifikat(mission, tanggalMisi),
    usedFallback,
  }
}

/**
 * Membuat nomor sertifikat yang stabil dari data misi.
 *
 * Tidak disimpan di mana pun: nomor dihitung ulang tiap kali laporan dibuka,
 * sehingga data yang sama selalu menghasilkan nomor yang sama. Tanpa server,
 * ini satu-satunya cara agar nomornya konsisten tanpa menyimpan apa pun.
 */
export function buatNomorSertifikat(mission: Mission, tanggal: Date): string {
  const tahun = tanggal.getFullYear()
  const bahan = `${mission.id}|${mission.usaha}|${mission.lokasi}|${mission.target}|${mission.createdAt}`
  // FNV-1a 32-bit: cukup untuk nomor tampilan, bukan untuk keamanan.
  let h = 0x811c9dc5
  for (let i = 0; i < bahan.length; i++) {
    h ^= bahan.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  const hex = h.toString(16).toUpperCase().padStart(8, '0')
  return `JB-${tahun}-${hex.slice(0, 4)}-${hex.slice(4, 8)}`
}
