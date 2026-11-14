/**
 * Memeriksa apakah setiap task AI benar-benar dilayani LLM.
 *
 *   npm run cek-ai
 *
 * Skrip ini memanggil `handleAiRequest` langsung (tanpa jaringan HTTP) untuk
 * kelima task: analyzePotential, mentorReply, buildReportSummary, introMessage,
 * planMission. Tiap task dilaporkan LULUS atau GAGAL.
 *
 * Aturan aman: TIDAK PERNAH mencetak nilai kunci API, isi .env, maupun isi
 * pesan galat mentah dari penyedia (bisa memuat URL berisi kunci). Yang
 * dilaporkan hanya nama variabel kunci yang terdeteksi dan jenis kegagalannya.
 *
 * Variabel lingkungan yang dibaca (hanya nama, bukan nilai):
 *   AI_BASE_URL   opsional, default http://localhost:8443
 */

import { handleAiRequest } from '../server/aiHandler.ts'

/**
 * Hanya nama variabel. Nilai kunci tidak pernah disalin ke variabel lain,
 * tidak dicetak, dan tidak ditulis ke berkas.
 */
const KEY_NAMES = [
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'OPENAI_API_KEY',
  'GROQ_API_KEY',
  'OPENROUTER_API_KEY',
  'AI_API_KEY',
] as const

/** Menyembunyikan kemungkinan kunci yang terbawa di dalam pesan galat. */
function redact(text: string): string {
  return String(text)
    // Google API key (AIza...) dan bentuk umum di query string.
    .replace(/AIza[0-9A-Za-z_-]{10,}/g, '***')
    .replace(/([?&]key=)[^&\s"']+/gi, '$1***')
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1***')
    .replace(/sk-[A-Za-z0-9]{10,}/g, '***')
    .replace(/\b[0-9a-f]{32}\b/gi, '***')
}

/** Meringkas galat menjadi label jenis, tanpa isi mentah. */
function classify(err: any): string {
  const msg = redact(String(err?.message ?? err ?? 'unknown'))
  if (/NO_API_KEY_CONFIGURED/.test(msg)) return 'kunci API tidak tersedia'
  if (/401|403|API key not valid|PERMISSION_DENIED|UNAUTHENTICATED/i.test(msg)) return 'kunci ditolak penyedia'
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) return 'kuota/limit penyedia habis'
  if (/404|NOT_FOUND|not found for API version|is not found/i.test(msg)) return 'model tidak tersedia'
  if (/timeout|ETIMEDOUT|aborted/i.test(msg)) return 'waktu habis'
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|network/i.test(msg)) return 'jaringan gagal'
  if (/JSON|Unexpected token/i.test(msg)) return 'balasan LLM bukan JSON yang sah'
  return msg.slice(0, 120)
}

/* ------------------------------------------------------------------ */
/* Data uji (statis, tidak menyentuh data pengguna)                    */
/* ------------------------------------------------------------------ */

const AVAILABLE = [
  { id: 'p1', name: 'Komunikasi & Empati', description: 'Mudah dekat dan bicara dengan orang', signals: ['Orang', 'Cerita'] },
  { id: 'p2', name: 'Kriya & Keterampilan Tangan', description: 'Suka membuat dan merapikan barang', signals: ['Tangan', 'Rapi'] },
  { id: 'p3', name: 'Analisis & Data', description: 'Suka mencatat dan mengurutkan angka', signals: ['Angka', 'Logika'] },
]

const ANSWERS = [
  {
    questionId: 'q1',
    question: 'Kegiatan yang paling kamu nikmati',
    chosen: ['Ngobrol dengan pembeli baru', 'Mendengar cerita orang'],
    frequency: 85,
    enjoyment: 90,
    textAnswer: 'Aku paling senang kalau bisa ngobrol lama dengan orang dan mendengar cerita mereka.',
  },
]

const UMKM = { name: 'Kedai Uji Cek AI', jenisUsaha: 'Kedai kopi', city: 'Padang', address: 'Jl. Uji 1', openingHours: '08.00-21.00' }

const MISSION = {
  businessName: 'Kedai Uji Cek AI',
  businessType: 'Kedai kopi',
  location: 'Padang',
  problem: 'belum ada foto menu',
  target: 'foto menu siap dipasang',
}

const STEP = { title: 'Hari 1: Izin dan wawancara', goal: 'meminta izin pemilik', tasks: ['datang', 'wawancara'] }

/* ------------------------------------------------------------------ */
/* Pemeriksaan                                                         */
/* ------------------------------------------------------------------ */

type Hasil = { task: string; ok: boolean; catatan: string }

/** Setiap task punya bentuk balasan yang diharapkan bila LLM benar-benar menjawab. */
const CHECKS: { task: string; payload: any; valid: (body: any) => string | null }[] = [
  {
    task: 'analyzePotential',
    payload: { answersSummary: ANSWERS, availablePotentials: AVAILABLE },
    valid: (b) => {
      const list = b?.result?.potentials
      if (!Array.isArray(list) || list.length === 0) return 'tidak ada daftar potensi'
      if (!list.every((p: any) => typeof p.potentialId === 'string' && p.potentialId)) return 'potentialId kosong'
      return null
    },
  },
  {
    task: 'mentorReply',
    payload: {
      intent: 'general',
      message: 'apa maksud langkah ini?',
      mission: MISSION,
      step: STEP,
      userNotes: 'pemilik belum punya foto menu',
      recentChats: [],
    },
    valid: (b) => (typeof b?.result === 'string' && b.result.trim() ? null : 'balasan mentor kosong'),
  },
  {
    task: 'buildReportSummary',
    payload: { mission: MISSION, userNotes: ['sudah wawancara pemilik', 'memotret tiga menu'], userName: 'Cek AI' },
    valid: (b) => (typeof b?.result === 'string' && b.result.trim() ? null : 'ringkasan kosong'),
  },
  {
    task: 'introMessage',
    payload: { umkm: UMKM, problem: 'belum ada foto menu', userName: 'Cek AI' },
    valid: (b) => (typeof b?.result === 'string' && b.result.trim() ? null : 'pesan perkenalan kosong'),
  },
  {
    task: 'planMission',
    payload: { umkm: UMKM, problem: 'belum ada foto menu', potentialName: 'Komunikasi & Empati' },
    valid: (b) => {
      const m = b?.result
      if (!m) return 'tidak ada misi'
      if (!Array.isArray(m.roadmap) || m.roadmap.length < 3) return 'roadmap kurang dari 3 langkah'
      if (!m.target || !m.ringkasan) return 'target/ringkasan kosong'
      return null
    },
  },
]

async function main() {
  const terdeteksi = KEY_NAMES.filter((n) => !!process.env[n])

  console.log('='.repeat(66))
  console.log('CEK AI — memanggil tiap task LLM satu kali')
  console.log('='.repeat(66))
  console.log(
    `  Variabel kunci terdeteksi : ${terdeteksi.length ? terdeteksi.join(', ') : 'TIDAK ADA'}`,
  )
  console.log('  (nama variabel saja, nilai kunci tidak pernah dicetak)')
  console.log('')

  if (terdeteksi.length === 0) {
    console.log('  PERINGATAN: tidak ada variabel kunci sama sekali.')
    console.log('  Semua task di bawah akan melaporkan GAGAL karena sistem memakai cadangan lokal.')
    console.log('')
  }

  const hasil: Hasil[] = []

  for (const c of CHECKS) {
    const started = Date.now()
    let ok = false
    let catatan = ''

    try {
      const res = await handleAiRequest({ task: c.task, payload: c.payload })
      const ms = Date.now() - started

      if (res.status !== 200) {
        // Badan galat dari server tidak memuat kunci, tapi tetap diredaksi.
        catatan = `HTTP ${res.status} — ${classify(res.body?.error || res.body?.message || 'galat tanpa pesan')}`
      } else {
        const invalid = c.valid(res.body)
        if (invalid) {
          catatan = `balasan tidak sesuai: ${invalid}`
        } else {
          ok = true
          catatan = `HTTP 200 dalam ${ms} ms`
        }
      }
    } catch (err: any) {
      catatan = classify(err)
    }

    hasil.push({ task: c.task, ok, catatan })
    console.log(`  [${ok ? 'LULUS' : 'GAGAL'}] ${c.task.padEnd(20)} ${catatan}`)
  }

  const gagal = hasil.filter((h) => !h.ok)
  console.log('')
  console.log('='.repeat(66))
  console.log(`RANGKUMAN: ${hasil.length - gagal.length} LULUS, ${gagal.length} GAGAL`)
  console.log('='.repeat(66))

  if (gagal.length > 0) {
    console.log('')
    console.log('Task yang gagal:')
    for (const g of gagal) console.log(`  - ${g.task}: ${g.catatan}`)
    console.log('')
    console.log('Aplikasi tetap berjalan memakai cadangan aturan lokal, tetapi hasilnya')
    console.log('bukan dari AI. Periksa variabel kunci di .env (lokal) atau di Vercel.')
    process.exitCode = 1
    return
  }

  console.log('')
  console.log('Semua task dilayani LLM. Tidak ada kunci yang dicetak oleh skrip ini.')
}

await main()
