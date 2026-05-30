import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { getAllCards, searchCards, countCards } from "../lib/db/flashcards"
import { collectTagsFromCards, parseTags } from "../lib/utils/tags"
import { useDebounce } from "../hooks/useDebounce"
import { Badge } from "../components/ui/Badge"
import { Toggle } from "../components/ui/Toggle"
import { Button } from "../components/ui/Button"
import { EmptyState } from "../components/ui/EmptyState"
import { Input } from "../components/ui/Input"
import { Pagination } from "../components/ui/Pagination"
import type { Flashcard } from "../types"

const PAGE_SIZE = 20

export default function FlashcardLibrary() {
  const navigate = useNavigate()

  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [cards, setCards] = useState<Flashcard[]>([])
  const [totalCards, setTotalCards] = useState(0)
  const [search, setSearch] = useState("")
  const [selectedTag, setSelectedTag] = useState<string>("")
  const [showInternalized, setShowInternalized] = useState(false)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const debouncedSearch = useDebounce(search, 300)

  const totalPages = Math.max(1, Math.ceil(totalCards / PAGE_SIZE))

  // Populate tag dropdown once on mount
  useEffect(() => {
    getAllCards().then((all) => {
      setAvailableTags(collectTagsFromCards(all))
    })
  }, [])

  // Fetch paginated results whenever filters or page change
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([
      searchCards(debouncedSearch, selectedTag, showInternalized, page, PAGE_SIZE),
      countCards(debouncedSearch, selectedTag, showInternalized),
    ]).then(([results, count]) => {
      if (cancelled) return
      setCards(results)
      setTotalCards(count)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [debouncedSearch, selectedTag, showInternalized, page])

  // Reset to page 1 when filters change (but not when page itself changes)
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, selectedTag, showInternalized])

  if (loading && cards.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-text-secondary text-sm">Cargando…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-text-secondary hover:text-text-primary transition-colors duration-100 text-sm"
          >
            ← Volver
          </button>
          <h1 className="text-text-primary font-semibold text-lg">Flashcards</h1>
        </div>
        <Button variant="primary" size="sm" onClick={() => navigate("/new-card")}>
          + Nueva
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border flex-wrap">
        <div className="flex-1 min-w-[160px]">
          <Input
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {availableTags.length > 0 && (
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className={[
              "bg-surface border border-border rounded-lg px-3 py-2 text-sm",
              "text-text-primary focus:outline-none focus:border-accent",
              "transition-colors duration-100 cursor-pointer",
            ].join(" ")}
          >
            <option value="">Todas las etiquetas</option>
            {availableTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}

        <Toggle
          checked={showInternalized}
          onChange={setShowInternalized}
          label="Internalizadas"
        />
      </div>

      {/* Count */}
      {totalCards > 0 && (
        <div className="px-6 pt-3 pb-1">
          <span className="text-xs text-text-secondary">
            {totalCards} {totalCards === 1 ? "flashcard" : "flashcards"}
          </span>
        </div>
      )}

      {/* Card list */}
      <div className="flex-1 overflow-y-auto px-6 py-3">
        {totalCards === 0 && !search.trim() && !selectedTag && !loading ? (
          <EmptyState
            message="Aún no tenés flashcards"
            action={{ label: "Crear primera", onClick: () => navigate("/new-card") }}
          />
        ) : cards.length === 0 && !loading ? (
          <EmptyState message="Ninguna card coincide con los filtros" />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {cards.map((card) => (
              <CardItem key={card.id} card={card} onClick={() => navigate(`/library/${card.id}`)} />
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

interface CardItemProps {
  card: Flashcard
  onClick: () => void
}

function CardItem({ card, onClick }: CardItemProps) {
  const isInternalized = card.intervalo_actual === 4
  const missingBack = !card.back || card.back.trim() === ""
  const tags = parseTags(card.tag)

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full text-left bg-surface rounded-lg p-4 cursor-pointer min-h-[80px]",
        "border border-transparent hover:border-accent/30",
        "transition-colors duration-100",
      ].join(" ")}
    >
      <p className="text-text-primary font-medium truncate">{card.front}</p>
      {(tags.length > 0 || isInternalized || missingBack) && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {tags.map((t) => (
            <Badge key={t} label={t} variant="default" />
          ))}
          {isInternalized && <Badge label="Internalizada" variant="internalized" />}
          {missingBack && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-400/20 text-amber-500 border border-amber-400/30">
              Sin respuesta
            </span>
          )}
        </div>
      )}
    </button>
  )
}
