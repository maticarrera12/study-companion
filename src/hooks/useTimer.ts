import { useEffect, useRef, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useTimerStore } from "../stores/timerStore"
import { useUIStore } from "../stores/uiStore"
import { getSettings, getTimerState, saveTimerState, clearTimerState } from "../lib/store"
import { createSession, completeSession, abandonSession } from "../lib/db/sessions"
import { useTimerAlerts } from "./useTimerAlerts"

export function useTimer() {
  const store = useTimerStore()
  const { showConfirm } = useUIStore()
  const navigate = useNavigate()
  const location = useLocation()
  const {
    triggerAlerts,
    initAudio,
    stopAudio,
    scheduleCompletionNotification,
    cancelCompletionNotification,
  } = useTimerAlerts()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Keep a stable ref to complete() so the interval callback always has the latest version
  const completeRef = useRef<() => Promise<void>>(async () => {})
  const completeBreakRef = useRef<() => Promise<void>>(async () => {})
  const tickBaseTimeRef = useRef<number>(0)
  const elapsedAtBaseRef = useRef<number>(0)

  const persist = useCallback(() => {
    const s = useTimerStore.getState()
    if (s.phase !== "focus") return
    saveTimerState({
      sessionId: s.sessionId,
      startedAt: Math.floor(Date.now() / 1000) - s.elapsed,
      elapsedSeconds: s.elapsed,
      isPaused: s.isPaused,
      topic: s.topic,
      pomodoroCountToday: s.pomodoroCountToday,
    }).catch(console.error)
  }, [])

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startInterval = useCallback(() => {
    stopInterval()
    tickBaseTimeRef.current = Date.now()
    elapsedAtBaseRef.current = useTimerStore.getState().elapsed
    intervalRef.current = setInterval(() => {
      const s = useTimerStore.getState()
      if (s.isPaused || s.phase === "idle" || s.phase === "done") return

      const wallElapsed =
        elapsedAtBaseRef.current + Math.floor((Date.now() - tickBaseTimeRef.current) / 1000)

      if (wallElapsed >= s.duration) {
        // Use the ref so we always call the current version of complete/completeBreak
        if (s.phase === "focus") {
          completeRef.current().catch(console.error)
        } else if (s.phase === "break") {
          completeBreakRef.current().catch(console.error)
        }
      } else {
        useTimerStore.getState().setElapsed(wallElapsed)
        persist()
      }
    }, 1000)
  }, [stopInterval, persist])

  // Restore timer on app launch
  useEffect(() => {
    getTimerState()
      .then((saved) => {
        if (!saved || saved.sessionId === null) return
        store.restore({
          sessionId: saved.sessionId,
          elapsed: saved.elapsedSeconds,
          isPaused: true, // always restore as paused — user must resume
          topic: saved.topic,
          phase: "focus",
          pomodoroCountToday: saved.pomodoroCountToday,
          wasRestored: true,
        })
      })
      .catch(console.error)

    return () => {
      stopInterval()
      stopAudio()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Manage interval based on paused/phase state
  useEffect(() => {
    const { phase, isPaused } = useTimerStore.getState()
    if (phase !== "idle" && phase !== "done" && !isPaused) {
      startInterval()
    } else {
      stopInterval()
    }
  }, [store.phase, store.isPaused, startInterval, stopInterval])

  // --- Public actions ---

  const complete = useCallback(async () => {
    stopInterval()
    await triggerAlerts("focus")
    await cancelCompletionNotification()
    const s = useTimerStore.getState()
    const settings = await getSettings()
    const now = Math.floor(Date.now() / 1000)
    const durationMin = Math.floor(s.elapsed / 60)

    if (s.sessionId !== null) {
      await completeSession(s.sessionId, now, durationMin)
    }

    const newCount = s.pomodoroCountToday + 1
    store.setPomodoroCount(newCount)
    store.setPhase("done")
    await clearTimerState()

    const shouldShowCornell = settings.cornell_enabled && newCount % settings.cornell_every_n === 0

    if (shouldShowCornell) {
      if (settings.cornell_timing === "before") {
        if (location.pathname !== "/cornell") {
          navigate("/cornell", {
            state: {
              sessionId: s.sessionId,
              timing: settings.cornell_timing,
              breakMin: settings.break_duration_min,
              sessionTema: s.topic || null,
            },
          })
        }
      } else if (settings.cornell_timing === "during") {
        // Start break before navigating so the global store owns the countdown
        store.setDuration(settings.break_duration_min * 60)
        store.restore({ elapsed: 0 })
        store.setPhase("break")
        store.setPaused(false)
        await scheduleCompletionNotification(
          "break",
          Date.now() + settings.break_duration_min * 60 * 1000,
        )
        if (location.pathname !== "/cornell") {
          navigate("/cornell", {
            state: {
              sessionId: s.sessionId,
              timing: settings.cornell_timing,
              breakMin: settings.break_duration_min,
              sessionTema: s.topic || null,
            },
          })
        }
      } else {
        // "after": start break first, cornell after break
        store.setDuration(settings.break_duration_min * 60)
        store.restore({ elapsed: 0 })
        store.setPhase("break")
        store.setPaused(false)
        await scheduleCompletionNotification(
          "break",
          Date.now() + settings.break_duration_min * 60 * 1000,
        )
      }
    } else {
      // No cornell: go straight to break
      store.setDuration(settings.break_duration_min * 60)
      store.restore({ elapsed: 0 })
      store.setPhase("break")
      store.setPaused(false)
      await scheduleCompletionNotification(
        "break",
        Date.now() + settings.break_duration_min * 60 * 1000,
      )
    }
  }, [
    store,
    stopInterval,
    navigate,
    location.pathname,
    triggerAlerts,
    cancelCompletionNotification,
    scheduleCompletionNotification,
  ])

  const completeBreak = useCallback(async () => {
    stopInterval()
    await triggerAlerts("break")
    await cancelCompletionNotification()
    await clearTimerState()
    const s = useTimerStore.getState()
    const settings = await getSettings()
    const newCount = s.pomodoroCountToday
    const shouldShowCornell =
      newCount % settings.cornell_every_n === 0 && settings.cornell_timing === "after"
    store.reset()
    if (location.pathname !== "/cornell") {
      if (shouldShowCornell) {
        navigate("/cornell", {
          state: {
            sessionId: s.sessionId,
            timing: "after",
            breakMin: settings.break_duration_min,
            sessionTema: s.topic || null,
          },
        })
      } else {
        navigate("/")
      }
    }
  }, [store, stopInterval, navigate, location.pathname, triggerAlerts, cancelCompletionNotification])

  // Keep refs current
  useEffect(() => {
    completeRef.current = complete
  }, [complete])

  useEffect(() => {
    completeBreakRef.current = completeBreak
  }, [completeBreak])

  const start = useCallback(
    async (topic: string) => {
      initAudio()
      const settings = await getSettings()
      const durationSec = settings.pomodoro_duration_min * 60
      const sessionId = await createSession(topic || null)
      store.setSessionId(sessionId)
      store.setTopic(topic)
      store.setDuration(durationSec)
      store.restore({ elapsed: 0, wasRestored: false })
      store.setPhase("focus")
      store.setPaused(false)
      await scheduleCompletionNotification("focus", Date.now() + durationSec * 1000)
    },
    [store, initAudio, scheduleCompletionNotification],
  )

  const pause = useCallback(() => {
    store.setPaused(true)
    persist()
    cancelCompletionNotification().catch(console.error)
  }, [store, persist, cancelCompletionNotification])

  const resume = useCallback(() => {
    initAudio()
    store.setPaused(false)
    const s = useTimerStore.getState()
    const targetMs = Date.now() + (s.duration - s.elapsed) * 1000
    scheduleCompletionNotification(s.phase === "break" ? "break" : "focus", targetMs).catch(
      console.error,
    )
  }, [store, initAudio, scheduleCompletionNotification])

  const cancel = useCallback(() => {
    showConfirm({
      message: "¿Cancelás el pomodoro? Se perderá el progreso.",
      onConfirm: async () => {
        const s = useTimerStore.getState()
        await cancelCompletionNotification()
        if (s.sessionId !== null) await abandonSession(s.sessionId)
        await clearTimerState()
        stopInterval()
        stopAudio()
        store.reset()
        navigate("/")
      },
    })
  }, [showConfirm, stopInterval, stopAudio, store, navigate, cancelCompletionNotification])

  const addBreakTime = useCallback(
    async (minutes: number) => {
      await cancelCompletionNotification()
      const s = useTimerStore.getState()
      const newDuration = s.duration + minutes * 60
      s.setDuration(newDuration)
      const targetMs = Date.now() + (newDuration - s.elapsed) * 1000
      await scheduleCompletionNotification("break", targetMs)
    },
    [cancelCompletionNotification, scheduleCompletionNotification],
  )

  return { start, pause, resume, cancel, complete, completeBreak, addBreakTime }
}
