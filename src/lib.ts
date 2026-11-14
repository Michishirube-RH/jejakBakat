import { useEffect, useState } from 'react'
import type { Answers, AnalysisResult } from './ai/types'
import type { Mission, Umkm } from './data/umkmTypes'

export type Screen =
  | 'welcome'
  | 'intro'
  | 'quiz'
  | 'loading'
  | 'results'
  | 'pickUmkm'
  | 'tellProblem'
  | 'mission'
  | 'workspace'
  | 'report'

export interface ChatMsg { from: 'mentor' | 'user'; text: string }

export interface AppState {
  screen: Screen
  qIndex: number
  answers: Answers
  result: AnalysisResult | null
  /** UMKM yang dipilih pengguna, dari pencarian maupun input manual. */
  umkm: Umkm | null
  /** Misi hasil rancangan AI atau template cadangan untuk UMKM di atas. */
  mission: Mission | null
  /** Teks masalah yang diketik pengguna di layar "Ceritakan masalahnya". */
  problem: string
  /** Status izin pemilik: true bila kotak "Sudah izin pemilik" dicentang. */
  ownerPermissionGranted: boolean
  /** Pesan perkenalan WhatsApp hasil susunan AI. */
  introMessage: string
  stepDone: Record<string, boolean>
  tasks: Record<string, boolean[]>
  notes: Record<string, string>
  userName: string
  ownerTestimonial: string
  ownerName: string
  /** Tanda tangan peserta pada sertifikat (data URL PNG), kosong bila belum. */
  ttdPeserta: string
  /** Tanda tangan penerbit pada sertifikat (data URL PNG), kosong bila belum. */
  ttdPenerbit: string
  metricsData: Record<string, { before: string; after: string }>
  chats: Record<string, ChatMsg[]>
  /**
   * Penanda layar-layar yang hasilnya berasal dari cadangan aturan lokal
   * karena LLM gagal atau sedang tidak tersedia.
   */
  fallback: {
    /** Kartu potensi di layar Hasil. */
    analysis: boolean
    /** Pesan perkenalan terakhir yang disusun. */
    introMessage: boolean
    /** Misi terakhir yang dirancang. */
    mission: boolean
    /** Ringkasan Impact Report terakhir. */
    reportSummary: boolean
    /** Id pesan mentor yang berasal dari cadangan lokal, dipisah koma. */
    mentorReply: string
  }
}

export const initialState: AppState = {
  screen: 'welcome',
  qIndex: 0,
  answers: {},
  result: null,
  umkm: null,
  mission: null,
  problem: '',
  ownerPermissionGranted: false,
  introMessage: '',
  stepDone: {},
  tasks: {},
  notes: {},
  userName: '',
  ownerTestimonial: '',
  ownerName: '',
  ttdPeserta: '',
  ttdPenerbit: '',
  metricsData: {},
  chats: {},
  fallback: {
    analysis: false,
    introMessage: false,
    mission: false,
    reportSummary: false,
    mentorReply: '',
  },
}

/** Layar yang boleh dipulihkan saat halaman dimuat ulang. */
const RESTORABLE: Screen[] = ['welcome', 'results', 'pickUmkm', 'tellProblem', 'mission', 'workspace', 'report']

const KEY = 'jejakbakat:v2'
const LEGACY_KEY = 'jejakbakat:v1'

/** Menyusun state awal dari localStorage, dengan pemulihan yang aman. */
function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>
      const s: AppState = { ...initialState, ...parsed }
      if (!s.metricsData) s.metricsData = {}
      if (!s.chats) s.chats = {}
      if (!s.stepDone) s.stepDone = {}
      if (!s.tasks) s.tasks = {}
      if (!s.notes) s.notes = {}

      // Layar loading tidak boleh dipulihkan.
      if (s.screen === 'loading') s.screen = s.result ? 'results' : 'quiz'

      // Layar yang butuh prasyarat: tanpa misi atau UMKM, kembalikan ke awal alur.
      if ((s.screen === 'workspace' || s.screen === 'report') && !s.mission) {
        s.screen = s.umkm ? 'tellProblem' : 'results'
      }
      if (s.screen === 'mission' && !s.mission) {
        s.screen = s.umkm ? 'tellProblem' : 'results'
      }
      if (s.screen === 'tellProblem' && !s.umkm) s.screen = 'results'
      if (s.screen === 'results' && !s.result) s.screen = 'quiz'
      if (!RESTORABLE.includes(s.screen) && s.screen !== 'quiz') s.screen = 'welcome'

      return s
    }

    // Migrasi dari versi lama: hanya jawaban dan hasil yang masih relevan.
    // Data misi lama (nama usaha bawaan) sengaja tidak dibawa.
    const legacyRaw = localStorage.getItem(LEGACY_KEY)
    if (legacyRaw) {
      const old = JSON.parse(legacyRaw) as Record<string, unknown>
      const migrated: AppState = {
        ...initialState,
        answers: (old.answers as Answers) ?? {},
        result: (old.result as AnalysisResult) ?? null,
        userName: (old.userName as string) ?? '',
        qIndex: 0,
        screen: old.result ? 'results' : 'welcome',
      }
      try {
        localStorage.removeItem(LEGACY_KEY)
      } catch {
        /* abaikan */
      }
      return migrated
    }
  } catch {
    /* data rusak: mulai bersih */
  }
  return initialState
}

export function useAppState() {
  const [state, setState] = useState<AppState>(loadState)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* penyimpanan penuh */
    }
  }, [state])

  const patch = (p: Partial<AppState>) => setState((s) => ({ ...s, ...p }))

  const reset = () => {
    try {
      localStorage.removeItem(KEY)
      localStorage.removeItem(LEGACY_KEY)
    } catch {
      /* abaikan */
    }
    setState(initialState)
  }

  return { state, patch, reset }
}

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
