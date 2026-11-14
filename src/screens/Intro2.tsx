import Mentor, { MENTOR_NAME } from '../components/Mentor'
import type { AppState } from '../lib'

type P = { state: AppState; patch: (p: Partial<AppState>) => void }

/** Perkenalan mentor sebelum kuesioner. */
export function Intro({ patch }: P) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-[620px] flex-col items-center justify-between px-5 pb-8 pt-10">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <Mentor mood="greet" size={200} />
        <h1 className="mt-6 font-sans text-[28px] font-bold leading-9 tracking-normal md:text-[32px] md:leading-10">
          Hai, aku {MENTOR_NAME}!<br />Aku akan jadi mentor pribadimu.
        </h1>
        <p className="mt-3 max-w-[40ch] text-muted">Jawab 10 pertanyaan singkat, lalu aku bantu kamu membuktikan potensimu lewat misi nyata.</p>
      </div>
      <button className="btn-dark" onClick={() => patch({ screen: 'quiz', qIndex: 0 })}>Lanjut</button>
    </main>
  )
}
