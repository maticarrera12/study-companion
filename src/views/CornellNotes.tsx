import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useTimerStore } from "../stores/timerStore"
import { getSettings, clearTimerState } from "../lib/store"
import { saveNote, getNoteBySessionId } from "../lib/db/notes"
import { createFlashcard } from "../lib/db/flashcards"
import { completeSession, updateSessionTema } from "../lib/db/sessions"
import { CornellLayout } from "../components/notes/CornellLayout"
import { Button } from "../components/ui/Button"
import { Input } from "../components/ui/Input"

interface CornellRouteState {
  sessionId: number
  timing: "before" | "during" | "after" | "mid-focus"
  breakMin: number
  sessionTema: string | null
  viewMode?: boolean
}

export default function CornellNotes() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as CornellRouteState | null

  const [notas, setNotas] = useState("")
  const [preguntas, setPreguntas] = useState("")
  const [resumen, setResumen] = useState("")
  const [breakSecondsLeft, setBreakSecondsLeft] = useState<number | undefined>(undefined)
  const [flashcardsMessage, setFlashcardsMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isBlurred, setIsBlurred] = useState(false)
  const [editingTema, setEditingTema] = useState(false)
  const [tema, setTema] = useState(state?.sessionTema ?? "")

  // Redirect if navigated directly without state
  useEffect(() => {
    if (!state || state.sessionId === undefined) {
      navigate("/", { replace: true })
    }
  }, [state, navigate])

  // Crash recovery: load existing note if any
  useEffect(() => {
    if (!state) return
    getNoteBySessionId(state.sessionId)
      .then((note) => {
        if (note) {
          setNotas(note.notas_principales)
          setPreguntas(note.preguntas)
          setResumen(note.resumen)
          if (state.viewMode) setIsBlurred(true)
        }
      })
      .catch(console.error)
  }, [state])

  // Break countdown for "during" mode
  useEffect(() => {
    if (!state || state.timing !== "during") return
    const totalSeconds = state.breakMin * 60
    setBreakSecondsLeft(totalSeconds)

    const interval = setInterval(() => {
      setBreakSecondsLeft((prev) => {
        if (prev === undefined || prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [state])

  if (!state || state.sessionId === undefined) {
    return null
  }

  const { sessionId, timing, viewMode } = state

  const handleTemaBlur = async () => {
    await updateSessionTema(sessionId, tema.trim())
    setEditingTema(false)
  }

  const handleTemaKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      await updateSessionTema(sessionId, tema.trim())
      setEditingTema(false)
    } else if (e.key === "Escape") {
      setTema(state.sessionTema ?? "")
      setEditingTema(false)
    }
  }

  const navigateAfterAction = async () => {
    if (timing === "before") {
      // Start break phase
      const settings = await getSettings()
      const timerStore = useTimerStore.getState()
      timerStore.setDuration(settings.break_duration_min * 60)
      timerStore.restore({ elapsed: 0 })
      timerStore.setPhase("break")
      timerStore.setPaused(false)
      navigate("/timer")
    } else if (timing === "during") {
      // Break is still counting down: start break timer with remaining seconds
      const timerStore = useTimerStore.getState()
      const seconds =
        breakSecondsLeft !== undefined && breakSecondsLeft > 0
          ? breakSecondsLeft
          : state.breakMin * 60
      timerStore.setDuration(seconds)
      timerStore.restore({ elapsed: 0 })
      timerStore.setPhase("break")
      timerStore.setPaused(false)
      navigate("/timer")
    } else if (timing === "mid-focus") {
      // User finished early: complete the session and start break
      const store = useTimerStore.getState()
      const nowSec = Math.floor(Date.now() / 1000)
      const durationMin = Math.floor(store.elapsed / 60)
      if (sessionId !== null) {
        await completeSession(sessionId, nowSec, durationMin)
      }
      store.setPomodoroCount(store.pomodoroCountToday + 1)
      await clearTimerState()
      const settings = await getSettings()
      store.setDuration(settings.break_duration_min * 60)
      store.restore({ elapsed: 0 })
      store.setPhase("break")
      store.setPaused(false)
      navigate("/timer")
    } else {
      // "after": break already ran, go home
      useTimerStore.getState().reset()
      navigate("/")
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await saveNote(sessionId, {
        notas_principales: notas,
        preguntas,
        resumen,
      })
      await navigateAfterAction()
    } catch (err) {
      console.error("Error saving note:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSkip = async () => {
    await navigateAfterAction()
  }

  const handleCreateFlashcards = async () => {
    const lines = preguntas
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    if (lines.length === 0) return

    try {
      await Promise.all(
        lines.map((line) =>
          createFlashcard({
            front: line,
            back: "",
            tag: tema || "",
          }),
        ),
      )
      setFlashcardsMessage(`${lines.length} flashcard${lines.length === 1 ? "" : "s"} creada${lines.length === 1 ? "" : "s"}`)
      setTimeout(() => setFlashcardsMessage(null), 3000)
    } catch (err) {
      console.error("Error creating flashcards:", err)
    }
  }

  const preguntaCount = preguntas
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3">
        <div>
          <h1 className="text-text-primary font-semibold">Notas de sesión</h1>
          {editingTema ? (
            <Input
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              onBlur={handleTemaBlur}
              onKeyDown={handleTemaKeyDown}
              className="mt-1 text-sm py-1"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTema(true)}
              className="flex items-center gap-1 text-text-secondary text-sm hover:text-text-primary transition-colors duration-100 text-left"
            >
              <span>{tema || "Sin tema"}</span>
              <span className="opacity-50 text-xs">✎</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {timing === "mid-focus" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                useTimerStore.getState().setPaused(false)
                navigate("/timer")
              }}
            >
              Volver al timer
            </Button>
          )}
          {viewMode && (
            <button
              type="button"
              onClick={() => setIsBlurred((b) => !b)}
              className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors duration-100"
            >
              <span>{isBlurred ? "Revelar" : "Ocultar"}</span>
            </button>
          )}
          {!viewMode && (
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Omitir
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <CornellLayout
          notas={notas}
          preguntas={preguntas}
          resumen={resumen}
          onNotasChange={setNotas}
          onPreguntasChange={setPreguntas}
          onResumenChange={setResumen}
          breakSecondsLeft={timing === "during" ? breakSecondsLeft : undefined}
          blurred={isBlurred}
        />
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCreateFlashcards}
            disabled={preguntaCount === 0}
          >
            Crear flashcards {preguntaCount > 0 ? `(${preguntaCount})` : ""}
          </Button>
          {flashcardsMessage && (
            <span className="text-text-secondary text-sm">{flashcardsMessage}</span>
          )}
        </div>
        <Button variant="primary" size="md" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Guardando..." : timing === "mid-focus" ? "Guardar y descansar" : "Guardar notas"}
        </Button>
      </footer>
    </div>
  )
}
