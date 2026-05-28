import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { getAllCards } from "../lib/db/flashcards"
import { Badge } from "../components/ui/Badge"
import { Toggle } from "../components/ui/Toggle"
import { Button } from "../components/ui/Button"
import { EmptyState } from "../components/ui/EmptyState"
import { Input } from "../components/ui/Input"
import type { Flashcard } from "../types"

export default function FlashcardLibrary() {
  const navigate = useNavigate()

  const [allCards, setAllCards] = useState<Flashcard[]>([])
  const [search, setSearch] = useState("")
  const [selectedTag, setSelectedTag] = useState<string>("")
  const [showInternalized, setShowInternalized] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAllCards().then((cards) => {
      if (!cancelled) {
        setAllCards(cards)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const availableTags = useMemo(() => {
    const tags = allCards
      .map((c) => c.tag)
      .filter((t) => t && t.trim() !== "")
    return Array.from(new Set(tags)).sort()
  }, [allCards])

  const filteredCards = useMemo(() => {
    return allCards.filter((card) => {
      if (!showInternalized && card.intervalo_actual === 4) return false
      if (selectedTag && card.tag !== selectedTag) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchFront = card.front.toLowerCase().includes(q)
        const matchBack = card.back.toLowerCase().includes(q)
        if (!matchFront && !matchBack) return false
      }
      return true
    })
  }, [allCards, showInternalized, selectedTag, search])

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
      {allCards.length > 0 && (
        <div className="px-6 pt-3 pb-1">
          <span className="text-xs text-text-secondary">
            {filteredCards.length}{" "}
            {filteredCards.length === 1 ? "flashcard" : "flashcards"}
          </span>
        </div>
      )}

      {/* Card list */}
      <div className="flex-1 overflow-y-auto px-6 py-3">
        {allCards.length === 0 ? (
          <EmptyState
            message="Aún no tenés flashcards"
            action={{ label: "Crear primera", onClick: () => navigate("/new-card") }}
          />
        ) : filteredCards.length === 0 ? (
          <EmptyState message="Ninguna card coincide con los filtros" />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredCards.map((card) => (
              <CardItem key={card.id} card={card} onClick={() => navigate(`/library/${card.id}`)} />
            ))}
          </div>
        )}
      </div>
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
      {(card.tag || isInternalized || missingBack) && (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {card.tag && <Badge label={card.tag} variant="default" />}
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
