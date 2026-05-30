import { useNavigate } from "react-router-dom"
import { useTimerStore } from "../stores/timerStore"
import { useTimerActions } from "../contexts/TimerContext"
import { TimerRing } from "../components/timer/TimerRing"
import { Button } from "../components/ui/Button"

export default function Timer() {
  const navigate = useNavigate()
  const elapsed = useTimerStore((s) => s.elapsed)
  const duration = useTimerStore((s) => s.duration)
  const isPaused = useTimerStore((s) => s.isPaused)
  const topic = useTimerStore((s) => s.topic)
  const phase = useTimerStore((s) => s.phase)
  const sessionId = useTimerStore((s) => s.sessionId)
  const setPaused = useTimerStore((s) => s.setPaused)
  const { cancel, complete, completeBreak, addBreakTime } = useTimerActions()

  // If no active session, go home
  if (phase === "idle") {
    navigate("/")
    return null
  }

  const phaseLabel = phase === "focus" ? "Foco" : phase === "break" ? "Descanso" : "Listo"

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-4">
      {/* Phase label */}
      <span className="text-text-secondary text-sm uppercase tracking-widest">
        {phaseLabel}
      </span>

      {/* Ring */}
      <TimerRing elapsed={elapsed} total={duration} size={220} />

      {/* Topic */}
      {topic && (
        <p className="text-text-secondary text-sm max-w-xs text-center truncate">
          {topic}
        </p>
      )}

      {/* Controls */}
      <div className="flex gap-3 flex-col justify-center">
        <div className="flex gap-3 flex-wrap justify-center">
        <Button
          variant="primary"
          size="lg"
          onClick={() => setPaused(!isPaused)}
        >
          {isPaused ? "Reanudar" : "Pausar"}
        </Button>
        {phase === "focus" && (
          <Button
            variant="ghost"
            size="md"
            onClick={() => {
              navigate("/cornell", {
                state: {
                  sessionId,
                  timing: "mid-focus",
                  breakMin: 0,
                  sessionTema: topic || null,
                },
              })
            }}
          >
            Tomar notas
          </Button>
        )}
        {phase === "focus" && (
          <Button variant="ghost" size="md" onClick={complete}>
            Finalizar
          </Button>
        )}
        {phase === "break" && (
          <>
            <Button variant="ghost" size="md" onClick={completeBreak}>
              Finalizar
            </Button>
            {[1, 2, 5].map((min) => (
              <Button key={min} variant="ghost" size="md" onClick={() => addBreakTime(min)}>
                +{min} min
              </Button>
            ))}
          </>
        )}
        <Button variant="danger" size="md" onClick={cancel}>
          Cancelar
        </Button>
        </div>
        

      </div>
    </div>
  )
}
