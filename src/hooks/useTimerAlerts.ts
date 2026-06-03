import { useRef } from "react"
import { getSettings } from "../lib/store"
import { useUIStore } from "../stores/uiStore"

export function useTimerAlerts(): {
  triggerAlerts: (phase: "focus" | "break") => Promise<void>
} {
  const audioCtxRef = useRef<AudioContext | null>(null)

  async function triggerAlerts(_phase: "focus" | "break"): Promise<void> {
    const settings = await getSettings()

    if (settings.sound_enabled) {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContext()
        }
        const ctx = audioCtxRef.current
        await ctx.resume()
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

  return { triggerAlerts }
}
