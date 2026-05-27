import { create } from "zustand"
import type { Flashcard } from "../types"

interface ReviewState {
  cards: Flashcard[]
  currentIndex: number
  isRevealed: boolean
  results: { sabido: number; fallado: number }
  isComplete: boolean
}

interface ReviewActions {
  setCards(cards: Flashcard[]): void
  reveal(): void
  advance(): void
  recordResult(result: "sabido" | "fallado"): void
  reset(): void
}

export const useReviewStore = create<ReviewState & ReviewActions>()((set) => ({
  cards: [],
  currentIndex: 0,
  isRevealed: false,
  results: { sabido: 0, fallado: 0 },
  isComplete: false,

  setCards: (cards) =>
    set({
      cards,
      currentIndex: 0,
      isRevealed: false,
      results: { sabido: 0, fallado: 0 },
      isComplete: false,
    }),
  reveal: () => set({ isRevealed: true }),
  recordResult: (result) =>
    set((s) => ({
      results: {
        sabido: s.results.sabido + (result === "sabido" ? 1 : 0),
        fallado: s.results.fallado + (result === "fallado" ? 1 : 0),
      },
    })),
  advance: () =>
    set((s) => {
      const next = s.currentIndex + 1
      if (next >= s.cards.length) return { isComplete: true, isRevealed: false }
      return { currentIndex: next, isRevealed: false }
    }),
  reset: () =>
    set({
      cards: [],
      currentIndex: 0,
      isRevealed: false,
      results: { sabido: 0, fallado: 0 },
      isComplete: false,
    }),
}))
