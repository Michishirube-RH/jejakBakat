import { useEffect, useRef } from 'react'
import { useAppState, type Screen } from './lib'
import { Quiz, Loading } from './screens/Intro'
import { Welcome } from './screens/Landing'
import { Results, MissionDetail } from './screens/Results'
import { Workspace } from './screens/Workspace'
import { Report } from './screens/Report'
import { Nav } from './components/ui'
import { ResultsBackdrop } from './components/ResultsBackdrop'
import { Intro } from './screens/Intro2'

const labels: Record<Screen, string> = {
  welcome: 'Mulai', intro: 'Perkenalan', quiz: 'Kuesioner', loading: 'Membaca', results: 'Potensimu', mission: 'Detail misi', workspace: 'Ruang kerja', report: 'Impact Report',
}

export default function App() {
  const { state, patch, reset } = useAppState()

  // Ref untuk menandai apakah transisi layar berasal dari tombol Back/Forward browser
  const isPopStateRef = useRef(false)
  const lastHistoryRef = useRef<{ screen: Screen; viewMissionId: string | null; qIndex: number }>({
    screen: state.screen,
    viewMissionId: state.viewMissionId,
    qIndex: state.qIndex,
  })

  // Inisialisasi listener popstate dan history.replaceState awal
  useEffect(() => {
    const initial = {
      screen: state.screen,
      viewMissionId: state.viewMissionId,
      qIndex: state.qIndex,
    }
    if (!window.history.state || !window.history.state.screen) {
      window.history.replaceState(initial, '')
    }
    lastHistoryRef.current = initial

    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.screen) {
        isPopStateRef.current = true
        lastHistoryRef.current = {
          screen: e.state.screen,
          viewMissionId: e.state.viewMissionId ?? null,
          qIndex: e.state.qIndex ?? 0,
        }
        patch({
          screen: e.state.screen,
          viewMissionId: e.state.viewMissionId ?? null,
          ...(e.state.qIndex !== undefined ? { qIndex: e.state.qIndex } : {}),
        })
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Sinkronisasi navigasi ke history.pushState
  useEffect(() => {
    if (isPopStateRef.current) {
      isPopStateRef.current = false
      return
    }

    const last = lastHistoryRef.current
    const isSame =
      last.screen === state.screen &&
      last.viewMissionId === state.viewMissionId &&
      (state.screen !== 'quiz' || last.qIndex === state.qIndex)

    if (isSame) return

    // Jangan rekam layar loading ke history agar tombol Kembali tidak tersangkut di loading
    if (state.screen === 'loading') return

    const nextHistory = {
      screen: state.screen,
      viewMissionId: state.viewMissionId,
      qIndex: state.qIndex,
    }

    window.history.pushState(nextHistory, '')
    lastHistoryRef.current = nextHistory
  }, [state.screen, state.viewMissionId, state.screen === 'quiz' ? state.qIndex : 0])

  // Setiap pindah layar selalu mulai dari atas halaman
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior }) }, [state.screen, state.viewMissionId])
  const p = { state, patch, reset }
  const screens = { welcome: Welcome, intro: Intro, quiz: Quiz, loading: Loading, results: Results, mission: MissionDetail, workspace: Workspace, report: Report }
  const S = screens[state.screen]
  const wipe = () => { if (confirm('Hapus semua jawaban dan hasil dari perangkat ini?')) reset() }
  return (
    <div className={`${['results', 'mission', 'workspace', 'report'].includes(state.screen) ? 'results-bg relative isolate overflow-x-clip' : 'page-bg'} min-h-screen`}>
      {['results', 'mission', 'workspace', 'report'].includes(state.screen) && <ResultsBackdrop />}
      <Nav label={labels[state.screen]} isHome={state.screen === 'welcome'} onHome={() => patch({ screen: 'welcome' })} onStart={() => patch({ screen: 'intro', qIndex: 0 })} onWipe={wipe} />
      <S {...p} />
    </div>
  )
}
