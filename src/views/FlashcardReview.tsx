import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useReviewStore } from "../stores/reviewStore"
import { useReview } from "../hooks/useReview"
import { FlashcardFace } from "../components/flashcard/FlashcardFace"
import { ReviewResultButtons } from "../components/flashcard/ReviewResultButtons"
import { Button } from "../components/ui/Button"
import { EmptyState } from "../components/ui/EmptyState"

export default function FlashcardReview() {
  const navigate = useNavigate()
  const { cards, currentIndex, isRevealed, results, isComplete } = useReviewStore()
  const reveal = useReviewStore((s) => s.reveal)
  const reset = useReviewStore((s) => s.reset)
  const { loadCards, submitResult } = useReview()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCards().finally(() => setLoading(false))
    return () => reset()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-text-secondary">Cargando…</span>
      </div>
    )
  }

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <div className="text-center flex flex-col gap-2">
          <p className="text-text-primary text-2xl font-semibold">Revisión completada</p>
          <p className="text-text-secondary text-sm">
            {results.sabido} sabida{results.sabido !== 1 ? "s" : ""} ·{" "}
            {results.fallado} fallada{results.fallado !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            reset()
            navigate("/")
          }}
        >
          Volver al inicio
        </Button>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          message="No hay cards para revisar hoy"
          action={{ label: "Volver", onClick: () => navigate("/") }}
        />
      </div>
    )
  }

  const currentCard = cards[currentIndex]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <button
          type="button"
          onClick={() => {
            reset()
            navigate("/")
          }}
          className="text-text-secondary hover:text-text-primary text-sm transition-colors duration-100"
        >
          ← Salir
        </button>
        <span className="text-text-secondary text-sm">
          Card {currentIndex + 1} de {cards.length}
        </span>
      </div>

      {/* Card + actions */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <FlashcardFace
          front={currentCard.front}
          back={currentCard.back}
          isRevealed={isRevealed}
        />

        {!isRevealed ? (
          <Button variant="primary" size="lg" onClick={reveal}>
            Revelar
          </Button>
        ) : (
          <ReviewResultButtons
            onSabido={() => submitResult("sabido")}
            onFallado={() => submitResult("fallado")}
          />
        )}
      </div>
    </div>
  )
}
