import { useTimerStore } from "../../stores/timerStore"
import { useUIStore } from "../../stores/uiStore"
import { clearTimerState } from "../../lib/store"
import { abandonSession } from "../../lib/db/sessions"
import { Button } from "./Button"

export function RecoveryBanner() {
  const { phase, isPaused, topic, sessionId, wasRestored, setPaused, reset } = useTimerStore()
  const { showConfirm } = useUIStore()

  // Only show when a session was recovered from a crash/restart
  if (!(phase === "focus" && isPaused && wasRestored)) return null

  function handleResume() {
    setPaused(false)
  }

  function handleDiscard() {
    showConfirm({
      message: "¿Descartás la sesión recuperada? Se perderá el progreso.",
      onConfirm: async () => {
        if (sessionId !== null) await abandonSession(sessionId)
        await clearTimerState()
        reset()
      },
    })
  }

  return (
    <div className="w-full bg-surface border-b border-border px-4 py-3 flex items-center justify-between gap-4">
      <p className="text-text-secondary text-sm">
        ¿Continuás tu sesión de{" "}
        <span className="text-text-primary font-medium">
          {topic || "pomodoro anterior"}
        </span>
        ?
      </p>
      <div className="flex gap-2 shrink-0">
        <Button variant="ghost" size="sm" onClick={handleDiscard}>
          Descartar
        </Button>
        <Button variant="primary" size="sm" onClick={handleResume}>
          Retomar
        </Button>
      </div>
    </div>
  )
}
