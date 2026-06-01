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
})
