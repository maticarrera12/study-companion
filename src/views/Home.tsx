import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTimerStore } from "../stores/timerStore"
import { useTimerActions } from "../contexts/TimerContext"
import { Input } from "../components/ui/Input"
import { Button } from "../components/ui/Button"

export default function Home() {
  const [topic, setTopic] = useState("")
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { start } = useTimerActions()
  const phase = useTimerStore((s) => s.phase)

  async function handleStart() {
    if (starting) return
    setStarting(true)
    try {
      setError(null)
      await start(topic.trim())
      navigate("/timer")
    } catch (err) {
      console.error("Failed to start session:", err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setStarting(false)
    }
  }

  // If a session is active redirect user to /timer
  if (phase === "focus" || phase === "break") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-text-secondary text-sm">
          {phase === "focus" ? "Pomodoro en curso" : "Descanso en curso"}
        </p>
        <Button variant="primary" onClick={() => navigate("/timer")}>
          Ver temporizador
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <div className="w-full max-w-sm flex flex-col gap-4">
        <h1 className="text-text-primary text-xl font-semibold text-center">
          Nuevo pomodoro
        </h1>
        <Input
          placeholder="¿En qué vas a trabajar hoy?"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleStart()
          }}
          maxLength={120}
          autoFocus
        />
        <Button
          variant="primary"
          size="lg"
          onClick={handleStart}
          disabled={starting}
          className="w-full"
        >
          {starting ? "Iniciando…" : "Iniciar pomodoro"}
        </Button>

        {error && (
          <p className="text-red-400 text-xs text-center break-all">{error}</p>
        )}

        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            type="button"
            onClick={() => navigate("/library")}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-100"
          >
            Ver flashcards
          </button>
          <span className="text-border text-xs">·</span>
          <button
            type="button"
            onClick={() => navigate("/new-card")}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-100"
          >
            Nueva flashcard
          </button>
        </div>
      </div>
    </div>
  )
}
