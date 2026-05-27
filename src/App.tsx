import { useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import { initDB } from "./lib/db"
import { useTimerStore } from "./stores/timerStore"
import { useReviewStore } from "./stores/reviewStore"
import { useTimer } from "./hooks/useTimer"
import { useKeyboard } from "./hooks/useKeyboard"
import { updateFlashcardProgress } from "./lib/db/flashcards"
import { recordReview } from "./lib/db/reviews"
import { updateLevel, nextReviewDate } from "./lib/sr/algorithm"
import { TimerBar } from "./components/timer/TimerBar"
import { FloatingButton } from "./components/timer/FloatingButton"
import { DistractionModal } from "./components/timer/DistractionModal"
import { ConfirmDialog } from "./components/ui/ConfirmDialog"
import { RecoveryBanner } from "./components/ui/RecoveryBanner"
import { TimerContext } from "./contexts/TimerContext"
import { useUIStore } from "./stores/uiStore"

async function handleReviewResult(result: "sabido" | "fallado") {
  const { cards, currentIndex, recordResult, advance } = useReviewStore.getState()
  const card = cards[currentIndex]
  if (!card) return
  const newLevel = updateLevel(card.intervalo_actual, result)
  await recordReview(card.id, result)
  await updateFlashcardProgress(card.id, {
    intervalo_actual: newLevel,
    proxima_revision: nextReviewDate(newLevel),
    veces_revisada: card.veces_revisada + 1,
  })
  recordResult(result)
  advance()
}

export default function App() {
  const [ready, setReady] = useState(false)
  const phase = useTimerStore((s) => s.phase)
  const isPaused = useTimerStore((s) => s.isPaused)
  const setPaused = useTimerStore((s) => s.setPaused)
  const isRevealed = useReviewStore((s) => s.isRevealed)
  const reviewCards = useReviewStore((s) => s.cards)
  const reveal = useReviewStore((s) => s.reveal)

  const inReview = reviewCards.length > 0

  // useTimer manages the interval — called ONCE here, never in child components
  const timerActions = useTimer()

  useKeyboard({
    pauseResume: () => {
      if (phase === "idle") return
      setPaused(!isPaused)
    },
    revealCard: inReview && !isRevealed ? () => reveal() : undefined,
    sabido: inReview && isRevealed ? () => handleReviewResult("sabido") : undefined,
    fallado: inReview && isRevealed ? () => handleReviewResult("fallado") : undefined,
    closeModal: () => useUIStore.getState().closeModal(),
  })

  useEffect(() => {
    initDB()
      .then(() => setReady(true))
      .catch((err) => {
        console.error("DB init failed:", err)
        setReady(true)
      })
  }, [])

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <span className="text-text-secondary text-sm">Cargando…</span>
      </div>
    )
  }

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
