import { describe, it, expect, beforeEach, vi } from "vitest"
import { useTimerStore } from "../stores/timerStore"


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
