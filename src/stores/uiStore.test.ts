import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { useUIStore } from "./uiStore"

beforeEach(() => {
  vi.useFakeTimers()
  useUIStore.setState({ flashActive: false })
})

afterEach(() => {
  vi.useRealTimers()
})

describe("triggerFlash", () => {
  it("sets flashActive to true immediately", () => {
    useUIStore.getState().triggerFlash()
    expect(useUIStore.getState().flashActive).toBe(true)
  })

  it("resets flashActive to false after 600ms", () => {
    useUIStore.getState().triggerFlash()
    expect(useUIStore.getState().flashActive).toBe(true)

    vi.advanceTimersByTime(600)

    expect(useUIStore.getState().flashActive).toBe(false)
  })

  it("does not reset before 600ms have elapsed", () => {
    useUIStore.getState().triggerFlash()
    vi.advanceTimersByTime(599)
    expect(useUIStore.getState().flashActive).toBe(true)
  })
})
