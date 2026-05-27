import { createContext, useContext } from "react"
import type { useTimer } from "../hooks/useTimer"

type TimerActions = ReturnType<typeof useTimer>

export const TimerContext = createContext<TimerActions | null>(null)

export function useTimerActions(): TimerActions {
  const ctx = useContext(TimerContext)
  if (!ctx) throw new Error("useTimerActions must be used inside TimerContext.Provider")
  return ctx
}
