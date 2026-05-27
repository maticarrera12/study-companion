import { create } from "zustand"

export type TimerPhase = "idle" | "focus" | "break" | "done"

interface TimerState {
  sessionId: number | null
  elapsed: number // seconds elapsed in current phase
  duration: number // total duration of current phase in seconds
  isPaused: boolean
  topic: string
  phase: TimerPhase
  pomodoroCountToday: number
  distractionsThisSession: number
  wasRestored: boolean // true when state was recovered from crash
}

interface TimerActions {
  setPhase(phase: TimerPhase): void
  setSessionId(id: number | null): void
  tick(): void
  setPaused(val: boolean): void
  setTopic(t: string): void
  setDuration(s: number): void
  setPomodoroCount(n: number): void
  incrementDistractions(): void
  reset(): void
  restore(state: Partial<TimerState>): void
}

export const useTimerStore = create<TimerState & TimerActions>()((set) => ({
  sessionId: null,
  elapsed: 0,
  duration: 25 * 60,
  isPaused: false,
  topic: "",
  phase: "idle",
  pomodoroCountToday: 0,
  distractionsThisSession: 0,
  wasRestored: false,

  setPhase: (phase) => set({ phase }),
  setSessionId: (id) => set({ sessionId: id }),
  tick: () => set((s) => ({ elapsed: s.elapsed + 1 })),
  setPaused: (val) => set({ isPaused: val }),
  setTopic: (t) => set({ topic: t }),
  setDuration: (s) => set({ duration: s }),
  setPomodoroCount: (n) => set({ pomodoroCountToday: n }),
  incrementDistractions: () =>
    set((s) => ({ distractionsThisSession: s.distractionsThisSession + 1 })),
  reset: () =>
    set({
      sessionId: null,
      elapsed: 0,
      isPaused: false,
      topic: "",
      phase: "idle",
      distractionsThisSession: 0,
      wasRestored: false,
    }),
  restore: (state) => set((s) => ({ ...s, ...state })),
}))
