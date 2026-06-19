import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook } from "@testing-library/react"
import type { AppSettings } from "../types"

// ---------------------------------------------------------------------------
// Mocks — established before any imports that transitively load them
// ---------------------------------------------------------------------------

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(),
}))

const { mockGetSettings } = vi.hoisted(() => ({
  mockGetSettings: vi.fn(),
}))

vi.mock("../lib/store", () => ({
  getSettings: mockGetSettings,
}))

const {
  mockIsPermissionGranted,
  mockRequestPermission,
  mockSendNotification,
  mockCancelNotifications,
} = vi.hoisted(() => ({
  mockIsPermissionGranted: vi.fn(),
  mockRequestPermission: vi.fn(),
  mockSendNotification: vi.fn(),
  mockCancelNotifications: vi.fn(),
}))

vi.mock("@tauri-apps/plugin-notification", () => ({
  isPermissionGranted: mockIsPermissionGranted,
  requestPermission: mockRequestPermission,
  sendNotification: mockSendNotification,
  cancel: mockCancelNotifications,
  Schedule: {
    at: (date: Date) => ({ at: { date, repeating: false, allowWhileIdle: false } }),
  },
}))

const { mockTriggerFlash } = vi.hoisted(() => ({
  mockTriggerFlash: vi.fn(),
}))

vi.mock("../stores/uiStore", () => ({
  useUIStore: Object.assign(
    vi.fn(() => ({ flashActive: false })),
    {
      getState: vi.fn(() => ({ triggerFlash: mockTriggerFlash })),
    },
  ),
}))

import { useTimerAlerts } from "./useTimerAlerts"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    pomodoro_duration_min: 25,
    break_duration_min: 5,
    cornell_enabled: true,
    cornell_every_n: 1,
    cornell_timing: "during",
    sound_enabled: true,
    flash_enabled: true,
    vibration_enabled: true,
    ...overrides,
  }
}

function buildAudioContextMock() {
  const oscStop = vi.fn()
  const oscStart = vi.fn()
  const oscConnect = vi.fn()
  const gainConnect = vi.fn()
  const setValueAtTime = vi.fn()
  const exponentialRampToValueAtTime = vi.fn()

  const osc = {
    connect: oscConnect,
    type: "sine" as OscillatorType,
    frequency: { value: 0 },
    start: oscStart,
    stop: oscStop,
  }
  const gain = {
    connect: gainConnect,
    gain: { setValueAtTime, exponentialRampToValueAtTime },
  }

  const createOscillator = vi.fn(() => osc)
  const createGain = vi.fn(() => gain)
  let instanceCount = 0

  class AudioContextMock {
    createOscillator = createOscillator
    createGain = createGain
    destination = {}
    currentTime = 0
    constructor() {
      instanceCount++
    }
  }

  return { AudioContextMock, createOscillator, createGain, oscStart, oscStop, getInstanceCount: () => instanceCount }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useTimerAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsPermissionGranted.mockResolvedValue(true)
    mockRequestPermission.mockResolvedValue("granted")
    mockCancelNotifications.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // -------------------------------------------------------------------------
  // Sound
  // -------------------------------------------------------------------------

  it("plays a tone when sound_enabled is true", async () => {
    const { AudioContextMock, oscStart, getInstanceCount } = buildAudioContextMock()
    vi.stubGlobal("AudioContext", AudioContextMock)
    mockGetSettings.mockResolvedValue(makeSettings({ sound_enabled: true }))

    const { result } = renderHook(() => useTimerAlerts())
    await result.current.triggerAlerts("focus")

    expect(getInstanceCount()).toBe(1)
    expect(oscStart).toHaveBeenCalledOnce()
  })

  it("does not create AudioContext when sound_enabled is false", async () => {
    const { AudioContextMock, getInstanceCount } = buildAudioContextMock()
    vi.stubGlobal("AudioContext", AudioContextMock)
    mockGetSettings.mockResolvedValue(makeSettings({ sound_enabled: false }))

    const { result } = renderHook(() => useTimerAlerts())
    await result.current.triggerAlerts("focus")

    expect(getInstanceCount()).toBe(0)
  })

  it("does not throw when AudioContext is unavailable", async () => {
    vi.stubGlobal("AudioContext", undefined)
    mockGetSettings.mockResolvedValue(makeSettings({ sound_enabled: true }))

    const { result } = renderHook(() => useTimerAlerts())
    await expect(result.current.triggerAlerts("focus")).resolves.not.toThrow()
  })

  it("reuses the same AudioContext instance across multiple calls on the same hook", async () => {
    const { AudioContextMock, getInstanceCount } = buildAudioContextMock()
    vi.stubGlobal("AudioContext", AudioContextMock)
    mockGetSettings.mockResolvedValue(makeSettings({ sound_enabled: true }))

    // Same hook instance — triggerAlerts called twice
    const { result } = renderHook(() => useTimerAlerts())
    await result.current.triggerAlerts("focus")
    await result.current.triggerAlerts("break")

    // AudioContext constructed only once (lazy singleton via useRef)
    expect(getInstanceCount()).toBe(1)
  })

  // -------------------------------------------------------------------------
  // Flash
  // -------------------------------------------------------------------------

  it("calls triggerFlash when flash_enabled is true", async () => {
    vi.stubGlobal("AudioContext", undefined)
    mockGetSettings.mockResolvedValue(
      makeSettings({ sound_enabled: false, flash_enabled: true }),
    )

    const { result } = renderHook(() => useTimerAlerts())
    await result.current.triggerAlerts("focus")

    expect(mockTriggerFlash).toHaveBeenCalledOnce()
  })

  it("does not call triggerFlash when flash_enabled is false", async () => {
    vi.stubGlobal("AudioContext", undefined)
    mockGetSettings.mockResolvedValue(
      makeSettings({ sound_enabled: false, flash_enabled: false }),
    )

    const { result } = renderHook(() => useTimerAlerts())
    await result.current.triggerAlerts("focus")

    expect(mockTriggerFlash).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Vibration
  // -------------------------------------------------------------------------

  it("calls navigator.vibrate(200) when vibration_enabled is true", async () => {
    vi.stubGlobal("AudioContext", undefined)
    const vibrateMock = vi.fn()
    vi.stubGlobal("navigator", { vibrate: vibrateMock })
    mockGetSettings.mockResolvedValue(
      makeSettings({ sound_enabled: false, flash_enabled: false, vibration_enabled: true }),
    )

    const { result } = renderHook(() => useTimerAlerts())
    await result.current.triggerAlerts("focus")

    expect(vibrateMock).toHaveBeenCalledWith(200)
  })

  it("does not call navigator.vibrate when vibration_enabled is false", async () => {
    vi.stubGlobal("AudioContext", undefined)
    const vibrateMock = vi.fn()
    vi.stubGlobal("navigator", { vibrate: vibrateMock })
    mockGetSettings.mockResolvedValue(
      makeSettings({ sound_enabled: false, flash_enabled: false, vibration_enabled: false }),
    )

    const { result } = renderHook(() => useTimerAlerts())
    await result.current.triggerAlerts("focus")

    expect(vibrateMock).not.toHaveBeenCalled()
  })

  it("does not throw when navigator.vibrate is not available", async () => {
    vi.stubGlobal("AudioContext", undefined)
    vi.stubGlobal("navigator", {})
    mockGetSettings.mockResolvedValue(
      makeSettings({ sound_enabled: false, flash_enabled: false, vibration_enabled: true }),
    )

    const { result } = renderHook(() => useTimerAlerts())
    await expect(result.current.triggerAlerts("focus")).resolves.not.toThrow()
  })

  // -------------------------------------------------------------------------
  // Native completion notification
  // -------------------------------------------------------------------------

  describe("scheduleCompletionNotification", () => {
    it("schedules a notification at targetMs when sound_enabled is true", async () => {
      mockGetSettings.mockResolvedValue(makeSettings({ sound_enabled: true }))
      const targetMs = Date.now() + 60_000

      const { result } = renderHook(() => useTimerAlerts())
      await result.current.scheduleCompletionNotification("focus", targetMs)

      expect(mockCancelNotifications).toHaveBeenCalledWith([1])
      expect(mockSendNotification).toHaveBeenCalledOnce()
      const call = mockSendNotification.mock.calls[0][0]
      expect(call.id).toBe(1)
      expect(call.schedule.at.date).toEqual(new Date(targetMs))
    })

    it("does not schedule when sound_enabled is false", async () => {
      mockGetSettings.mockResolvedValue(makeSettings({ sound_enabled: false }))

      const { result } = renderHook(() => useTimerAlerts())
      await result.current.scheduleCompletionNotification("focus", Date.now() + 60_000)

      expect(mockSendNotification).not.toHaveBeenCalled()
    })

    it("does not schedule when permission is denied", async () => {
      mockGetSettings.mockResolvedValue(makeSettings({ sound_enabled: true }))
      mockIsPermissionGranted.mockResolvedValue(false)
      mockRequestPermission.mockResolvedValue("denied")

      const { result } = renderHook(() => useTimerAlerts())
      await result.current.scheduleCompletionNotification("focus", Date.now() + 60_000)

      expect(mockRequestPermission).toHaveBeenCalledOnce()
      expect(mockSendNotification).not.toHaveBeenCalled()
    })

    it("requests permission only when not already granted", async () => {
      mockGetSettings.mockResolvedValue(makeSettings({ sound_enabled: true }))
      mockIsPermissionGranted.mockResolvedValue(true)

      const { result } = renderHook(() => useTimerAlerts())
      await result.current.scheduleCompletionNotification("focus", Date.now() + 60_000)

      expect(mockRequestPermission).not.toHaveBeenCalled()
      expect(mockSendNotification).toHaveBeenCalledOnce()
    })

    it("does not reject when the notification plugin throws", async () => {
      // Regression: a failing plugin call must never break the caller's flow
      // (complete/cancel rely on this never throwing — dev/unsigned builds).
      mockGetSettings.mockResolvedValue(makeSettings({ sound_enabled: true }))
      mockCancelNotifications.mockRejectedValue(new Error("notification plugin unavailable"))

      const { result } = renderHook(() => useTimerAlerts())
      await expect(
        result.current.scheduleCompletionNotification("focus", Date.now() + 60_000),
      ).resolves.not.toThrow()
    })
  })

  describe("cancelCompletionNotification", () => {
    it("cancels the fixed notification id", async () => {
      const { result } = renderHook(() => useTimerAlerts())
      await result.current.cancelCompletionNotification()

      expect(mockCancelNotifications).toHaveBeenCalledWith([1])
    })

    it("does not reject when the notification plugin throws", async () => {
      // Regression: cancel is awaited inside complete()/cancel()/pause() —
      // a rejection here previously froze the timer flow (sound played, no nav).
      mockCancelNotifications.mockRejectedValue(new Error("notification plugin unavailable"))

      const { result } = renderHook(() => useTimerAlerts())
      await expect(result.current.cancelCompletionNotification()).resolves.not.toThrow()
    })
  })
})
