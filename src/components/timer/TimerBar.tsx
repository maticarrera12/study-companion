import { useNavigate } from "react-router-dom"
import { useTimerStore } from "../../stores/timerStore"
import { formatMMSS, truncate } from "../../lib/utils/format"

export function TimerBar() {
  const navigate = useNavigate()
  const phase = useTimerStore((s) => s.phase)
  const elapsed = useTimerStore((s) => s.elapsed)
  const isPaused = useTimerStore((s) => s.isPaused)
  const topic = useTimerStore((s) => s.topic)
  const setPaused = useTimerStore((s) => s.setPaused)

  if (phase === "idle") return null

  const phaseLabel = phase === "focus" ? "Foco" : phase === "break" ? "Descanso" : "Listo"

  function handleBarClick(e: React.MouseEvent) {
    // Avoid navigation when clicking the pause/resume button
    if ((e.target as HTMLElement).closest("button")) return
    navigate("/timer")
  }

  function handleTogglePause(e: React.MouseEvent) {
    e.stopPropagation()
    setPaused(!isPaused)
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 h-12 w-full bg-surface border-b border-border z-40 px-4 flex items-center justify-between cursor-pointer"
      onClick={handleBarClick}
    >
      {/* Left: elapsed + phase label */}
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <span className="tabular-nums text-text-primary font-medium">
          {formatMMSS(elapsed)}
        </span>
        <span className="text-text-secondary">{phaseLabel}</span>
      </div>

      {/* Center: topic */}
      <span className="text-sm text-text-secondary truncate max-w-[200px]">
        {truncate(topic || "Sin tema", 24)}
      </span>

      {/* Right: pause/resume button */}
      <button
        className="text-text-secondary hover:text-text-primary transition-colors duration-100 p-1 rounded"
        onClick={handleTogglePause}
        aria-label={isPaused ? "Reanudar" : "Pausar"}
      >
        {isPaused ? (
          // Play icon
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M4 2.5l10 5.5-10 5.5V2.5z" />
          </svg>
        ) : (
          // Pause icon
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <rect x="3" y="2" width="4" height="12" rx="1" />
            <rect x="9" y="2" width="4" height="12" rx="1" />
          </svg>
        )}
      </button>
    </div>
  )
}
