import { useEffect } from "react"

interface KeyboardActions {
  pauseResume: () => void
}

export function useKeyboard(actions: KeyboardActions): void {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return

      if (e.code === "Space") {
        e.preventDefault()
        actions.pauseResume()
      }
    }

    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [actions.pauseResume])
}
