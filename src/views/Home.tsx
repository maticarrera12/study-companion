import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTimerStore } from "../stores/timerStore"
import { useTimerActions } from "../contexts/TimerContext"
import { getDueCards } from "../lib/db/flashcards"
import { getTodayCreatedCount } from "../lib/db/flashcards"
import { getTodaySessionCount, getRecentSessions } from "../lib/db/sessions"
import { getTodayReviewCount } from "../lib/db/reviews"
import { getTodayDistractionsCount } from "../lib/db/distractions"
import { getSessionIdsWithNotes } from "../lib/db/notes"
import { Input } from "../components/ui/Input"
import { Button } from "../components/ui/Button"
import { PomodoroSettingsPanel } from "../components/settings/PomodoroSettings"
import { formatDuration, formatDate } from "../lib/utils/date"
import type { Session } from "../types"

interface DayStats {
  pomodoros: number
  cardsCreated: number
  cardsReviewed: number
  distractions: number
}

export default function Home() {
  const [topic, setTopic] = useState("")
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dueCount, setDueCount] = useState(0)
  const [stats, setStats] = useState<DayStats | null>(null)
  const [recentSessions, setRecentSessions] = useState<Session[]>([])
  const [sessionIdsWithNotes, setSessionIdsWithNotes] = useState<Set<number>>(new Set())
  const navigate = useNavigate()
  const { start } = useTimerActions()
  const phase = useTimerStore((s) => s.phase)

  useEffect(() => {
    getDueCards()
      .then((cards) => setDueCount(cards.length))
      .catch(console.error)

    Promise.all([
      getTodaySessionCount(),
      getTodayCreatedCount(),
      getTodayReviewCount(),
      getTodayDistractionsCount(),
    ])
      .then(([pomodoros, cardsCreated, cardsReviewed, distractions]) => {
        setStats({ pomodoros, cardsCreated, cardsReviewed, distractions })
      })
      .catch(console.error)

    getRecentSessions(5)
      .then((sessions) => {
        setRecentSessions(sessions)
        const ids = sessions.map((s) => s.id)
        return getSessionIdsWithNotes(ids)
      })
      .then((ids) => setSessionIdsWithNotes(new Set(ids)))
      .catch(console.error)
  }, [])

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
    <div className="flex flex-col items-center px-6 py-8 h-full overflow-auto">
      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* Start form */}
        <div className="flex flex-col gap-4">
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

          <PomodoroSettingsPanel />

          <Button
            variant="primary"
            size="lg"
            onClick={handleStart}
            disabled={starting}
            className="w-full flex items-center justify-center gap-2"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {starting ? "Iniciando…" : "Iniciar pomodoro"}
          </Button>

          {error && (
            <p className="text-red-400 text-xs text-center break-all">{error}</p>
          )}

          {dueCount > 0 && (
            <button
              type="button"
              onClick={() => navigate("/review")}
              className="w-full text-center py-2 rounded-lg bg-accent/10 border border-accent/20 text-accent text-sm hover:bg-accent/20 transition-colors duration-100"
            >
              {dueCount} card{dueCount !== 1 ? "s" : ""} para revisar hoy &rarr;
            </button>
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

        {/* Today stats */}
        {stats !== null && (
          <div className="flex flex-col gap-3">
            <h2 className="text-text-secondary text-xs font-semibold uppercase tracking-wider">
              Hoy
            </h2>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-surface rounded-lg px-3 py-2 text-center">
                <p className="text-text-primary font-semibold text-base">{stats.pomodoros}</p>
                <p className="text-text-secondary text-xs mt-0.5">pomodoros</p>
              </div>
              <div className="bg-surface rounded-lg px-3 py-2 text-center">
                <p className="text-text-primary font-semibold text-base">{stats.cardsCreated}</p>
                <p className="text-text-secondary text-xs mt-0.5">creadas</p>
              </div>
              <div className="bg-surface rounded-lg px-3 py-2 text-center">
                <p className="text-text-primary font-semibold text-base">{stats.cardsReviewed}</p>
                <p className="text-text-secondary text-xs mt-0.5">revisadas</p>
              </div>
              <div className="bg-surface rounded-lg px-3 py-2 text-center">
                <p className="text-text-primary font-semibold text-base">{stats.distractions}</p>
                <p className="text-text-secondary text-xs mt-0.5">distracciones</p>
              </div>
            </div>
          </div>
        )}

        {/* Recent sessions */}
        {recentSessions.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-text-secondary text-xs font-semibold uppercase tracking-wider">
              Sesiones recientes
            </h2>
            <div className="flex flex-col rounded-lg overflow-hidden border border-border">
              {recentSessions.map((session, i) => (
                <div
                  key={session.id}
                  className={[
                    "flex items-center justify-between px-3 py-2.5",
                    i < recentSessions.length - 1 ? "border-b border-border" : "",
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-text-secondary text-sm">
                      {formatDate(session.fecha_inicio)}
                    </span>
                    {session.tema && (
                      <span className="text-text-secondary text-xs opacity-70">
                        {session.tema}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    {sessionIdsWithNotes.has(session.id) && (
                      <button
                        type="button"
                        title="Ver notas Cornell"
                        onClick={() =>
                          navigate("/cornell", {
                            state: {
                              sessionId: session.id,
                              timing: "after",
                              breakMin: 0,
                              sessionTema: session.tema ?? null,
                            },
                          })
                        }
                        className="text-text-secondary hover:text-accent transition-colors duration-100 text-sm"
                      >
                        📝
                      </button>
                    )}
                    <span className="text-text-secondary text-xs">
                      {session.duracion_minutos != null
                        ? formatDuration(session.duracion_minutos)
                        : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
