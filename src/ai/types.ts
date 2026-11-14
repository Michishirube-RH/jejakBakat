import type { Confidence, Signal } from '../data/mockData'

export interface Answer {
  /** Option ids for choice questions, or free text for text questions */
  choice?: string[]
  text?: string
  frequency?: number
  enjoyment?: number
}
export type Answers = Record<string, Answer>

export interface Evidence {
  quote: string
  explanation: string
}
export interface PotentialResult {
  potentialId: string
  confidence: Confidence
  score: number
  evidence: Evidence[]
}
export interface AnalysisResult {
  potentials: PotentialResult[]
  signalScores: Record<Signal, number>
}
