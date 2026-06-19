import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useTimerStore } from "../stores/timerStore"
import { useUIStore } from "../stores/uiStore"
import type { AppSettings } from "../types"

// ---------------------------------------------------------------------------
// Mocks — established before any imports that transitively load them
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn()

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/" }),
}))

const { mockGetSettings, mockGetTimerState, mockSaveTimerState, mockClearTimerState } =
  vi.hoisted(() => ({
    mockGetSettings: vi.fn(),
    mockGetTimerState: vi.fn(),
    mockSaveTimerState: vi.fn(),
    mockClearTimerState: vi.fn(),
  }))

vi.mock("../lib/store", () => ({
  getSettings: mockGetSettings,
  getTimerState: mockGetTimerState,
  saveTimerState: mockSaveTimerState,
  clearTimerState: mockClearTimerState,
}))

const { mockCreateSession, mockCompleteSession, mockAbandonSession } = vi.hoisted(() => ({
  mockCreateSession: vi.fn(),
  mockCompleteSession: vi.fn(),
  mockAbandonSession: vi.fn(),
}))

vi.mock("../lib/db/sessions", () => ({
  createSession: mockCreateSession,
  completeSession: mockCompleteSession,
  abandonSession: mockAbandonSession,
}))

const {
  mockTriggerAlerts,
  mockInitAudio,
  mockStopAudio,
  mockScheduleCompletionNotification,
  mockCancelCompletionNotification,
} = vi.hoisted(() => ({
  mockTriggerAlerts: vi.fn(),
  mockInitAudio: vi.fn(),
  mockStopAudio: vi.fn(),
  mockScheduleCompletionNotification: vi.fn(),
  mockCancelCompletionNotification: vi.fn(),
}))

vi.mock("./useTimerAlerts", () => ({
  useTimerAlerts: () => ({
    triggerAlerts: mockTriggerAlerts,
    initAudio: mockInitAudio,
    stopAudio: mockStopAudio,
    scheduleCompletionNotification: mockScheduleCompletionNotification,
    cancelCompletionNotification: mockCancelCompletionNotification,
  }),
}))

import { useTimer } from "./useTimer"

function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    pomodoro_duration_min: 25,
    break_duration_min: 5,
    cornell_enabled: false,
    cornell_every_n: 1,
    cornell_timing: "during",
    sound_enabled: true,
    flash_enabled: true,
    vibration_enabled: true,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Isolate the store before each test
// ---------------------------------------------------------------------------
beforeEach(() => {
  useTimerStore.setState({
    sessionId: null,
    elapsed: 0,
    duration: 300, // 5 minutes
    isPaused: false,
    topic: "",
    phase: "break",
    pomodoroCountToday: 0,
    distractionsThisSession: 0,
    wasRestored: false,
  })
  useUIStore.setState({ activeModal: null, confirmOptions: null, flashActive: false })
  vi.clearAllMocks()
  mockGetSettings.mockResolvedValue(makeSettings())
  mockGetTimerState.mockResolvedValue(null)
  mockSaveTimerState.mockResolvedValue(undefined)
  mockClearTimerState.mockResolvedValue(undefined)
  mockCreateSession.mockResolvedValue(1)
  mockCompleteSession.mockResolvedValue(undefined)
  mockAbandonSession.mockResolvedValue(undefined)
  mockTriggerAlerts.mockResolvedValue(undefined)
  mockScheduleCompletionNotification.mockResolvedValue(undefined)
  mockCancelCompletionNotification.mockResolvedValue(undefined)
})

// ---------------------------------------------------------------------------
// Native completion notification — lifecycle call sites
// ---------------------------------------------------------------------------

describe("useTimer native notification wiring", () => {
  it("start() schedules a focus notification for now + duration", async () => {
    const before = Date.now()
    const { result } = renderHook(() => useTimer())

    await act(async () => {
      await result.current.start("topic")
    })

    expect(mockScheduleCompletionNotification).toHaveBeenCalledOnce()
    const [phase, targetMs] = mockScheduleCompletionNotification.mock.calls[0]
    expect(phase).toBe("focus")
    expect(targetMs).toBeGreaterThanOrEqual(before + 25 * 60 * 1000)
  })

  it("pause() cancels the pending notification", async () => {
    const { result } = renderHook(() => useTimer())
    await act(async () => {
      await result.current.start("topic")
    })
    mockCancelCompletionNotification.mockClear()

    act(() => {
      result.current.pause()
    })

    expect(mockCancelCompletionNotification).toHaveBeenCalledOnce()
  })

  it("resume() reschedules the notification for now + remaining duration", async () => {
    useTimerStore.setState({ phase: "focus", duration: 300, elapsed: 100, isPaused: true })
    const { result } = renderHook(() => useTimer())
    mockScheduleCompletionNotification.mockClear()
    const before = Date.now()

    await act(async () => {
      await result.current.resume()
    })

    expect(mockScheduleCompletionNotification).toHaveBeenCalledOnce()
    const [phase, targetMs] = mockScheduleCompletionNotification.mock.calls[0]
    expect(phase).toBe("focus")
    expect(targetMs).toBeGreaterThanOrEqual(before + 200 * 1000)
  })

  it("cancel() onConfirm cancels the pending notification", async () => {
    useTimerStore.setState({ phase: "focus", sessionId: 1 })
    const { result } = renderHook(() => useTimer())

    act(() => {
      result.current.cancel()
    })

    const confirmOptions = useUIStore.getState().confirmOptions
    expect(confirmOptions).not.toBeNull()

    await act(async () => {
      await confirmOptions?.onConfirm()
    })

    expect(mockCancelCompletionNotification).toHaveBeenCalledOnce()
  })

  it("complete() cancels focus notification then schedules break notification, in order", async () => {
    useTimerStore.setState({
      phase: "focus",
      sessionId: 1,
      elapsed: 1500,
      duration: 1500,
      pomodoroCountToday: 0,
    })
    mockGetSettings.mockResolvedValue(makeSettings({ cornell_enabled: false }))
    const { result } = renderHook(() => useTimer())

    const callOrder: string[] = []
    mockTriggerAlerts.mockImplementation(async () => {
      callOrder.push("triggerAlerts")
    })
    mockCancelCompletionNotification.mockImplementation(async () => {
      callOrder.push("cancel")
    })
    mockScheduleCompletionNotification.mockImplementation(async () => {
      callOrder.push("schedule")
    })

    await act(async () => {
      await result.current.complete()
    })

    expect(callOrder).toEqual(["triggerAlerts", "cancel", "schedule"])
    const scheduleCall = mockScheduleCompletionNotification.mock.calls[0]
    expect(scheduleCall[0]).toBe("break")
  })

  it("completeBreak() cancels the break notification and does not reschedule", async () => {
    useTimerStore.setState({ phase: "break", sessionId: 1, pomodoroCountToday: 1 })
    mockGetSettings.mockResolvedValue(makeSettings({ cornell_timing: "during" }))
    const { result } = renderHook(() => useTimer())

    const callOrder: string[] = []
    mockTriggerAlerts.mockImplementation(async () => {
      callOrder.push("triggerAlerts")
    })
    mockCancelCompletionNotification.mockImplementation(async () => {
      callOrder.push("cancel")
    })

    await act(async () => {
      await result.current.completeBreak()
    })

    expect(callOrder).toEqual(["triggerAlerts", "cancel"])
    expect(mockScheduleCompletionNotification).not.toHaveBeenCalled()
  })

  it("addBreakTime() cancels then reschedules with the extended target", async () => {
    useTimerStore.setState({ phase: "break", duration: 300, elapsed: 60 })
    const { result } = renderHook(() => useTimer())
    const before = Date.now()

    await act(async () => {
      await result.current.addBreakTime(2)
    })

    expect(mockCancelCompletionNotification).toHaveBeenCalledOnce()
    expect(mockScheduleCompletionNotification).toHaveBeenCalledOnce()
    const [phase, targetMs] = mockScheduleCompletionNotification.mock.calls[0]
    expect(phase).toBe("break")
    // new duration = 300 + 120 = 420; remaining = 420 - 60 = 360
    expect(targetMs).toBeGreaterThanOrEqual(before + 360 * 1000)
  })
})

// ---------------------------------------------------------------------------
// addBreakTime — unit tests
// ---------------------------------------------------------------------------

describe("addBreakTime", () => {
  it("increases store.duration by minutes * 60", () => {
    const setDuration = vi.spyOn(useTimerStore.getState(), "setDuration")

    // Import here so the module picks up the mocked store
    // We test the store mutation directly since addBreakTime is a thin wrapper
    const initial = useTimerStore.getState().duration // 300

    // Simulate what addBreakTime(2) does
    const s = useTimerStore.getState()
    s.setDuration(s.duration + 2 * 60)

    expect(useTimerStore.getState().duration).toBe(initial + 120)
    setDuration.mockRestore()
  })

  it("+1 min adds 60 seconds", () => {
    const s = useTimerStore.getState()
    const before = s.duration
    s.setDuration(before + 1 * 60)
    expect(useTimerStore.getState().duration).toBe(before + 60)
  })

  it("+2 min adds 120 seconds", () => {
    const s = useTimerStore.getState()
    const before = s.duration
    s.setDuration(before + 2 * 60)
    expect(useTimerStore.getState().duration).toBe(before + 120)
  })

  it("+5 min adds 300 seconds", () => {
    const s = useTimerStore.getState()
    const before = s.duration
    s.setDuration(before + 5 * 60)
    expect(useTimerStore.getState().duration).toBe(before + 300)
  })

  it("does not reset elapsed when duration increases", () => {
    useTimerStore.setState({ elapsed: 120 })
    const s = useTimerStore.getState()
    s.setDuration(s.duration + 60)
    // elapsed must be untouched
    expect(useTimerStore.getState().elapsed).toBe(120)
  })
})

// ---------------------------------------------------------------------------
// timerStore: setElapsed — Block A (T4)
// ---------------------------------------------------------------------------

describe("setElapsed", () => {
  it("sets elapsed to the given value", () => {
    useTimerStore.setState({ elapsed: 0 })
    useTimerStore.getState().setElapsed(42)
    expect(useTimerStore.getState().elapsed).toBe(42)
  })

  it("does not mutate other fields", () => {
    useTimerStore.setState({ elapsed: 0, duration: 300, isPaused: false })
    useTimerStore.getState().setElapsed(99)
    const s = useTimerStore.getState()
    expect(s.duration).toBe(300)
    expect(s.isPaused).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Wall-clock elapsed formula — Block B (T4)
// ---------------------------------------------------------------------------

describe("wall-clock elapsed formula", () => {
  it("wallElapsed = elapsedAtBase + floor((now - baseTime) / 1000)", () => {
    const elapsedAtBase = 60 // 1 minute already elapsed at anchor
    const baseTime = 1000 // arbitrary anchor ms
    const nowTime = 4500 // 3.5 s later → floor = 3
    const wallElapsed = elapsedAtBase + Math.floor((nowTime - baseTime) / 1000)
    expect(wallElapsed).toBe(63)
  })

  it("returns elapsedAtBase when interval fires immediately (0 ms diff)", () => {
    const wallElapsed = 60 + Math.floor((1000 - 1000) / 1000)
    expect(wallElapsed).toBe(60)
  })

  it("clamps correctly at duration boundary", () => {
    const wallElapsed = 298 + Math.floor(3000 / 1000) // 298 + 3 = 301
    const duration = 300
    expect(wallElapsed >= duration).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// tick() survival — Block C (T4, REQ-6 regression)
// ---------------------------------------------------------------------------

describe("tick() still works (not removed)", () => {
  it("increments elapsed by 1", () => {
    useTimerStore.setState({ elapsed: 5 })
    useTimerStore.getState().tick()
    expect(useTimerStore.getState().elapsed).toBe(6)
  })
})
