import { useCallback } from "react"
import { useReviewStore } from "../stores/reviewStore"
import { getDueCards, updateFlashcardProgress } from "../lib/db/flashcards"
import { recordReview } from "../lib/db/reviews"
import { updateLevel, nextReviewDate } from "../lib/sr/algorithm"

export function useReview() {
  const store = useReviewStore()

  const loadCards = useCallback(async () => {
    const cards = await getDueCards()
    store.setCards(cards)
  }, [store])

  const submitResult = useCallback(
    async (result: "sabido" | "fallado") => {
      const { cards, currentIndex } = useReviewStore.getState()
      const card = cards[currentIndex]
      if (!card) return

      const newLevel = updateLevel(card.intervalo_actual, result)
      const newProximaRevision = nextReviewDate(newLevel)

      await recordReview(card.id, result)
      await updateFlashcardProgress(card.id, {
        intervalo_actual: newLevel,
        proxima_revision: newProximaRevision,
        veces_revisada: card.veces_revisada + 1,
      })

      store.recordResult(result)
      store.advance()
    },
    [store],
  )

  return { loadCards, submitResult }
}
