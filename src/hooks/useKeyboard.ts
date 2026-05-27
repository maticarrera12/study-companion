import { useEffect } from "react"

interface KeyboardActions {
  pauseResume: () => void
  revealCard?: () => void
  sabido?: () => void
  fallado?: () => void
  closeModal?: () => void
}

export function useKeyboard(actions: KeyboardActions): void {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Esc closes any active modal — fires regardless of focused element
      if (e.key === "Escape") {
        actions.closeModal?.()
        return
      }

      const tag = (e.target as HTMLElement).tagName
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return

      if (e.code === "Space") {
        e.preventDefault()
        if (actions.revealCard) {
          actions.revealCard()
        } else {
          actions.pauseResume()
        }
        return
      }

      if (e.key === "1" && actions.sabido) {
        actions.sabido()
        return
      }

      if (e.key === "2" && actions.fallado) {
        actions.fallado()
        return
      }
    }

    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [
    actions.pauseResume,
    actions.revealCard,
    actions.sabido,
    actions.fallado,
    actions.closeModal,
  ])
}
