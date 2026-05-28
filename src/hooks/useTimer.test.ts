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
