import { useEffect } from "react"
import { Outlet } from "react-router-dom"
import { initDB } from "./lib/db"
import { useTimerStore } from "./stores/timerStore"
import { useTimer } from "./hooks/useTimer"
import { useKeyboard } from "./hooks/useKeyboard"
import { TimerBar } from "./components/timer/TimerBar"
import { FloatingButton } from "./components/timer/FloatingButton"
import { DistractionModal } from "./components/timer/DistractionModal"
import { ConfirmDialog } from "./components/ui/ConfirmDialog"
import { RecoveryBanner } from "./components/ui/RecoveryBanner"
import { TimerContext } from "./contexts/TimerContext"

export default function App() {
  const phase = useTimerStore((s) => s.phase)
  const isPaused = useTimerStore((s) => s.isPaused)
  const setPaused = useTimerStore((s) => s.setPaused)

  // useTimer manages the interval — called ONCE here, never in child components
  const timerActions = useTimer()

  useKeyboard({
    pauseResume: () => {
      if (phase === "idle") return
      setPaused(!isPaused)
    },
  })

  useEffect(() => {
    initDB().catch(console.error)
  }, [])

  return (
    <TimerContext.Provider value={timerActions}>
      <div className="flex flex-col h-screen bg-bg text-text-primary">
        {/* Fixed top bar — takes h-12 (48px) when visible */}
        <TimerBar />
        {/* Recovery banner shown below TimerBar when session is restored */}
        <RecoveryBanner />
        {/* Global confirm dialog — portal-style, mounted once */}
        <ConfirmDialog />
        {/* Global distraction modal — portal-style, mounted once */}
        <DistractionModal />
        {/* Floating button — visible only during focus phase */}
        <FloatingButton />
        {/* Main content — top padding when TimerBar is visible */}
        <main className={["flex-1 overflow-auto", phase !== "idle" ? "pt-12" : ""].join(" ")}>
          <Outlet />
        </main>
      </div>
    </TimerContext.Provider>
  )
}
