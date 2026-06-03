import { useRef, useCallback } from "react"
import { getSettings } from "../lib/store"
import { useUIStore } from "../stores/uiStore"

export function useTimerAlerts(): {
  triggerAlerts: (phase: "focus" | "break") => Promise<void>
  initAudio: () => void
  stopAudio: () => void
} {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopAudio = useCallback((): void => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current)
      keepAliveRef.current = null
    }
  }, [])

  const initAudio = useCallback((): void => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new AudioContext()
      }
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {})
      }

      // Prevent WKWebView from suspending the AudioContext during a long session
      stopAudio()
      keepAliveRef.current = setInterval(() => {
        const ctx = audioCtxRef.current
        if (!ctx || ctx.state === "closed") return
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {})
          return
        }
        const buf = ctx.createBuffer(1, 1, ctx.sampleRate)
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.connect(ctx.destination)
        src.start()
      }, 20_000)
    } catch {
      // Web Audio API unavailable
    }
  }, [stopAudio])

  async function triggerAlerts(_phase: "focus" | "break"): Promise<void> {
    const settings = await getSettings()

    if (settings.sound_enabled) {
      try {
        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
          audioCtxRef.current = new AudioContext()
        }
        const ctx = audioCtxRef.current
        if (ctx.state === "suspended") {
          await ctx.resume()
        }
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = "sine"
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.3)
      } catch {
        // Web Audio API unavailable — degrade silently
      }
    }

    if (settings.flash_enabled) {
      useUIStore.getState().triggerFlash()
    }

    if (settings.vibration_enabled) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(200)
      }
    }
  }

  return { triggerAlerts, initAudio, stopAudio }
}
