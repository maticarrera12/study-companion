import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useTimerStore } from "../stores/timerStore"
import { getSettings } from "../lib/store"
import { saveNote, getNoteBySessionId } from "../lib/db/notes"
import { createFlashcard } from "../lib/db/flashcards"
import { CornellLayout } from "../components/notes/CornellLayout"
import { Button } from "../components/ui/Button"

interface CornellRouteState {
  sessionId: number
  timing: "before" | "during" | "after"
  breakMin: number
  sessionTema: string | null
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

  const { sessionId, timing, breakMin, sessionTema } = state

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
    } else {
      // "during" or "after": break already ran (or running), go home
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
            tag: sessionTema || "",
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
      <header className="flex items-center justify-between px-6 py-3 border-b border-border">
        <div>
          <h1 className="text-text-primary font-semibold">Notas de sesión</h1>
          {sessionTema && (
            <p className="text-text-secondary text-sm">{sessionTema}</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={handleSkip}>
          Omitir
        </Button>
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
        />
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between px-6 py-4 border-t border-border">
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
          {isSaving ? "Guardando..." : "Guardar notas"}
        </Button>
      </footer>
    </div>
  )
}
