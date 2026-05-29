import { useEffect, useRef } from "react"
import { useTimerStore } from "../stores/timerStore"

export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const phase = useTimerStore((s) => s.phase)
  const isPaused = useTimerStore((s) => s.isPaused)
  const active = (phase === "focus" || phase === "break") && !isPaused

  useEffect(() => {
    if (!("wakeLock" in navigator)) return

    if (active) {
      navigator.wakeLock
        .request("screen")
        .then((lock) => {
          wakeLockRef.current = lock
        })
        .catch(console.error)
    } else {
      wakeLockRef.current?.release().catch(console.error)
      wakeLockRef.current = null
    }

    return () => {
      wakeLockRef.current?.release().catch(console.error)
      wakeLockRef.current = null
    }
  }, [active])

  // Wake lock is released automatically when the window loses focus.
  // Re-acquire it when the window comes back to the foreground.
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible" && active) {
        navigator.wakeLock
          ?.request("screen")
          .then((lock) => {
            wakeLockRef.current = lock
          })
          .catch(console.error)
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => document.removeEventListener("visibilitychange", onVisibilityChange)
  }, [active])
}
