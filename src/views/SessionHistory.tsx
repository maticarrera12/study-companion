import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { searchSessions, countSessions } from "../lib/db/sessions"
import { useDebounce } from "../hooks/useDebounce"
import { Input } from "../components/ui/Input"
import { EmptyState } from "../components/ui/EmptyState"
import { Pagination } from "../components/ui/Pagination"
import { formatDate, formatDuration } from "../lib/utils/date"
import type { SessionWithNotes } from "../types"

const PAGE_SIZE = 25

export default function SessionHistory() {
  const navigate = useNavigate()

  const [sessions, setSessions] = useState<SessionWithNotes[]>([])
  const [totalSessions, setTotalSessions] = useState(0)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const debouncedSearch = useDebounce(search, 300)

  const totalPages = Math.max(1, Math.ceil(totalSessions / PAGE_SIZE))

  // Fetch paginated sessions whenever query or page changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([
      searchSessions(debouncedSearch, page, PAGE_SIZE),
      countSessions(debouncedSearch),
    ]).then(([results, count]) => {
      if (cancelled) return
      setSessions(results)
      setTotalSessions(count)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [debouncedSearch, page])

  // Reset to page 1 when search query changes
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  if (loading && sessions.length === 0) {
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
      {totalSessions > 0 && (
        <div className="px-6 pt-3 pb-1">
          <span className="text-xs text-text-secondary">
            {totalSessions} {totalSessions === 1 ? "sesión" : "sesiones"}
          </span>
        </div>
      )}

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-6 py-3">
        {totalSessions === 0 && !search.trim() && !loading ? (
          <EmptyState message="Aún no tenés sesiones completadas" />
        ) : sessions.length === 0 && !loading ? (
          <EmptyState message="Ninguna sesión coincide con la búsqueda" />
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                hasNotes={!!session.has_notes}
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

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />
    </div>
  )
}

interface SessionCardProps {
  session: SessionWithNotes
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
