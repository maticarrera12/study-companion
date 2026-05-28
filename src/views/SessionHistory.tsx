import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { getAllSessions } from "../lib/db/sessions"
import { getSessionIdsWithNotes } from "../lib/db/notes"
import { Input } from "../components/ui/Input"
import { EmptyState } from "../components/ui/EmptyState"
import { formatDate, formatDuration } from "../lib/utils/date"
import type { Session } from "../types"

export default function SessionHistory() {
  const navigate = useNavigate()

  const [allSessions, setAllSessions] = useState<Session[]>([])
  const [sessionIdsWithNotes, setSessionIdsWithNotes] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAllSessions()
      .then((sessions) => {
        if (cancelled) return
        setAllSessions(sessions)
        const ids = sessions.map((s) => s.id)
        return getSessionIdsWithNotes(ids)
      })
      .then((ids) => {
        if (cancelled) return
        setSessionIdsWithNotes(new Set(ids ?? []))
        setLoading(false)
      })
      .catch((err) => {
        console.error("SessionHistory load error:", err)
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filteredSessions = useMemo(() => {
    if (!search.trim()) return allSessions
    const q = search.trim().toLowerCase()
    return allSessions.filter((s) => (s.tema ?? "").toLowerCase().includes(q))
  }, [allSessions, search])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-text-secondary text-sm">Cargando…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-text-secondary hover:text-text-primary transition-colors duration-100 text-sm"
        >
          ← Volver
        </button>
        <h1 className="text-text-primary font-semibold text-lg">Historial</h1>
      </div>

      {/* Search bar */}
      <div className="px-6 py-3 border-b border-border">
        <Input
          placeholder="Buscar por tema…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Count */}
      {allSessions.length > 0 && (
        <div className="px-6 pt-3 pb-1">
          <span className="text-xs text-text-secondary">
            {filteredSessions.length}{" "}
            {filteredSessions.length === 1 ? "sesión" : "sesiones"}
          </span>
        </div>
      )}

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-6 py-3">
        {allSessions.length === 0 ? (
          <EmptyState message="Aún no tenés sesiones completadas" />
        ) : filteredSessions.length === 0 ? (
          <EmptyState message="Ninguna sesión coincide con la búsqueda" />
        ) : (
          <div className="flex flex-col gap-2">
            {filteredSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                hasNotes={sessionIdsWithNotes.has(session.id)}
                onNotesClick={() =>
                  navigate("/cornell", {
                    state: {
                      sessionId: session.id,
                      timing: "after",
                      breakMin: 0,
                      sessionTema: session.tema ?? null,
                      viewMode: true,
                    },
                  })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface SessionCardProps {
  session: Session
  hasNotes: boolean
  onNotesClick: () => void
}

function SessionCard({ session, hasNotes, onNotesClick }: SessionCardProps) {
  return (
    <div className="w-full text-left bg-surface rounded-lg p-4 border border-transparent hover:border-accent/30 transition-colors duration-100">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-text-secondary text-sm">
            {formatDate(session.fecha_inicio)}
          </span>
          <span className="text-text-secondary text-xs opacity-70 truncate">
            {session.tema || "Sin tema"}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasNotes && (
            <button
              type="button"
              title="Ver notas Cornell"
              onClick={onNotesClick}
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
    </div>
  )
}
