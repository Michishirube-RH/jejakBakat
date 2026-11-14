import { useEffect, useRef } from 'react'
import { useAppState, type Screen } from './lib'
import { Quiz, Loading } from './screens/Intro'
import { Welcome } from './screens/Landing'
import { Results } from './screens/Results'
import { PickUmkm } from './screens/PickUmkm'
import { TellProblem } from './screens/TellProblem'
import { MissionDetail } from './screens/MissionDetail'
import { Workspace } from './screens/Workspace'
import { Report } from './screens/Report'
import { Nav } from './components/ui'
import { ResultsBackdrop } from './components/ResultsBackdrop'
import { Intro } from './screens/Intro2'

const labels: Record<Screen, string> = {
  welcome: 'Mulai',
  intro: 'Perkenalan',
  quiz: 'Kuesioner',
  loading: 'Membaca',
  results: 'Potensimu',
  pickUmkm: 'Pilih UMKM',
  tellProblem: 'Ceritakan masalahnya',
  mission: 'Detail misi',
  workspace: 'Ruang kerja',
  report: 'Laporan Dampak',
}

/** Layar yang memakai latar hasil analisis. */
const RESULTS_BG: Screen[] = ['results', 'pickUmkm', 'tellProblem', 'mission', 'workspace', 'report']

export default function App() {
  const { state, patch, reset } = useAppState()

  /**
   * Menandai bahwa perubahan layar berikutnya berasal dari tombol Back/Forward
   * browser, sehingga tidak perlu pushState lagi.
   */
  const isPopStateRef = useRef(false)
  /** Isi history.state untuk posisi yang sedang aktif. */
  const lastHistoryRef = useRef<{ screen: Screen; qIndex: number }>({
    screen: state.screen,
    qIndex: state.qIndex,
  })
  /**
   * Layar terakhir yang sudah tercatat di history. Dipakai sebagai pembanding
   * agar efek navigasi tidak jalan saat state berubah karena hal lain
   * (misalnya mengisi jawaban kuesioner).
   */
  const lastScreenRef = useRef<Screen>(state.screen)

  // Inisialisasi listener popstate dan samakan posisi history saat ini
  // dengan layar yang benar-benar dibuka, bukan nilai awal komponen.
  useEffect(() => {
    const current = { screen: state.screen, qIndex: state.qIndex }
    const existing = window.history.state
    if (!existing || !existing.screen || existing.screen !== current.screen) {
      window.history.replaceState(current, '')
    }
    lastHistoryRef.current = current
    lastScreenRef.current = current.screen

    const handlePopState = (e: PopStateEvent) => {
      const next = e.state && e.state.screen
        ? { screen: e.state.screen as Screen, qIndex: e.state.qIndex ?? 0 }
        : { screen: 'welcome' as Screen, qIndex: 0 }
      isPopStateRef.current = true
      lastHistoryRef.current = next
      lastScreenRef.current = next.screen
      patch({ screen: next.screen, qIndex: next.qIndex })
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sinkronisasi navigasi ke history.pushState
  useEffect(() => {
    const fromPop = isPopStateRef.current
    isPopStateRef.current = false

    // Bandingkan layar, bukan objek state: perubahan jawaban atau catatan
    // tidak boleh menambah entri history.
    if (lastScreenRef.current === state.screen) {
      lastHistoryRef.current = { screen: state.screen, qIndex: state.qIndex }
      return
    }
    lastScreenRef.current = state.screen

    if (fromPop) return

    // Layar loading tidak direkam agar tombol Kembali tidak tersangkut di sana.
    if (state.screen === 'loading') {
      lastHistoryRef.current = { screen: state.screen, qIndex: state.qIndex }
      return
    }

    const nextHistory = { screen: state.screen, qIndex: state.qIndex }
    window.history.pushState(nextHistory, '')
    lastHistoryRef.current = nextHistory
  }, [state.screen, state.qIndex])

  // Setiap pindah layar selalu mulai dari atas halaman
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [state.screen])

  const p = { state, patch, reset }
  const screens = {
    welcome: Welcome,
    intro: Intro,
    quiz: Quiz,
    loading: Loading,
    results: Results,
    pickUmkm: PickUmkm,
    tellProblem: TellProblem,
    mission: MissionDetail,
    workspace: Workspace,
    report: Report,
  }
  const S = screens[state.screen]
  const wipe = () => { if (confirm('Hapus semua jawaban dan hasil dari perangkat ini?')) reset() }
  const useResultsBg = RESULTS_BG.includes(state.screen)

  return (
    <div className={`${useResultsBg ? 'results-bg relative isolate overflow-x-clip' : 'page-bg'} min-h-screen`}>
      {useResultsBg && <ResultsBackdrop />}
      <Nav
        label={labels[state.screen]}
        isHome={state.screen === 'welcome'}
        onHome={() => patch({ screen: 'welcome' })}
        onStart={() => patch({ screen: 'intro', qIndex: 0 })}
        onWipe={wipe}
      />
      <S {...p} />
    </div>
  )
}
