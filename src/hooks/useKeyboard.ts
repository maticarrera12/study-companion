import { useEffect } from "react"

interface KeyboardActions {
  pauseResume: () => void
  revealCard?: () => void
  sabido?: () => void
  fallado?: () => void
}

export function useKeyboard(actions: KeyboardActions): void {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
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
  }, [actions.pauseResume, actions.revealCard, actions.sabido, actions.fallado])
}
