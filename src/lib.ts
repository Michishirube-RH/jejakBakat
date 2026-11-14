import { useEffect, useState } from 'react'
import type { Answers, AnalysisResult } from './ai/types'

export type Screen = 'welcome' | 'intro' | 'quiz' | 'loading' | 'results' | 'mission' | 'workspace' | 'report'

export interface ChatMsg { from: 'mentor' | 'user'; text: string }

export interface AppState {
  screen: Screen
  qIndex: number
  answers: Answers
  result: AnalysisResult | null
  missionId: string | null
  viewMissionId: string | null
  stepDone: Record<string, boolean>
  tasks: Record<string, boolean[]>
  notes: Record<string, string>
  userName: string
  ownerTestimonial: string
  ownerName: string
  metricsData: Record<string, { before: string; after: string }>
  chats: Record<string, ChatMsg[]>
}

export const initialState: AppState = {
  screen: 'welcome', qIndex: 0, answers: {}, result: null, missionId: null, viewMissionId: null,
  stepDone: {}, tasks: {}, notes: {}, userName: '', ownerTestimonial: '', ownerName: '', metricsData: {}, chats: {},
}

const KEY = 'jejakbakat:v1'

export function useAppState() {
  const [state, setState] = useState<AppState>(() => {
    try {
      const raw = localStorage.getItem(KEY)
      const s = raw ? { ...initialState, ...JSON.parse(raw) } : initialState
      if (!s.metricsData) s.metricsData = {}
      // layar loading tidak boleh dipulihkan
      if (s.screen === 'loading') s.screen = s.result ? 'results' : 'quiz'
      return s as AppState
    } catch {
      return initialState
    }
  })
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* penyimpanan penuh */ }
  }, [state])
  const patch = (p: Partial<AppState>) => setState((s) => ({ ...s, ...p }))
  const reset = () => { try { localStorage.removeItem(KEY) } catch { /* abaikan */ } setState(initialState) }
  return { state, patch, reset }
}

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
