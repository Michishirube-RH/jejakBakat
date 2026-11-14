import Mentor, { MENTOR_NAME, type MentorMood } from './Mentor'
import { questions } from '../data/mockData'
import type { AppState } from '../lib'

function pick(state: AppState): { mood: MentorMood; text: string } | null {
  switch (state.screen) {
    case 'intro':
      return null
    case 'welcome':
      return { mood: 'idle', text: `Halo, aku ${MENTOR_NAME}! Aku menemanimu dari awal sampai akhir.` }
    case 'quiz': {
      const q = questions[state.qIndex]
      const a = state.answers[q.id]
      const done = q.type === 'text' ? !!a?.text?.trim() : (a?.choice?.length ?? 0) > 0
      return done
        ? { mood: 'happy', text: 'Jawaban yang bagus. Lanjut saja kapan pun kamu siap.' }
        : { mood: 'thinking', text: 'Tidak ada jawaban benar atau salah. Pilih yang paling mirip dirimu.' }
    }
    case 'loading':
      return { mood: 'thinking', text: 'Sebentar ya, aku sedang membaca pola jawabanmu.' }
    case 'results':
      return { mood: 'happy', text: 'Ini baru gambaran awal. Pilih satu misi untuk mengujinya.' }
    case 'mission':
      return { mood: 'idle', text: 'Aku yang membimbing, kamu yang mengerjakan. Siap ambil misinya?' }
    case 'workspace':
      return { mood: 'talking', text: 'Aku di sini. Tanya apa saja kalau kamu mentok.' }
    case 'report':
      return { mood: 'celebrate', text: 'Hebat! Misimu selesai dan laporannya siap dipakai.' }
  }
}

export function mentorLine(state: AppState) { return pick(state) }

/** Jeje + gelembung ucapan, ditaruh di bagian utama halaman (bukan di bar atas). */
export function MentorSay({ state, size = 110, className = '', tone = 'paper' }: { state: AppState; size?: number; className?: string; tone?: 'paper' | 'white' }) {
  const c = pick(state)
  if (!c) return null
  return (
    <div className={`no-print flex items-center gap-4 ${className}`}>
      <Mentor mood={c.mood} size={size} entrance={false} interactive />
      <p role="status" className={`relative max-w-[34ch] rounded-[24px] px-5 py-4 leading-6 before:absolute before:-left-1.5 before:top-1/2 before:h-3 before:w-3 before:-translate-y-1/2 before:rotate-45 before:content-[''] ${tone === 'white' ? 'bg-white before:bg-white' : 'bg-paper before:bg-paper'}`}>
        {c.text}
      </p>
    </div>
  )
}
