import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { useTimerStore } from "../stores/timerStore"
import type { AppSettings } from "../types"

// ---------------------------------------------------------------------------
// Mocks — established before any imports that transitively load them
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn()
let mockLocationState: unknown = null

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/cornell", state: mockLocationState }),
}))

const { mockGetSettings, mockClearTimerState } = vi.hoisted(() => ({
  mockGetSettings: vi.fn(),
  mockClearTimerState: vi.fn(),
}))

vi.mock("../lib/store", () => ({
  getSettings: mockGetSettings,
  clearTimerState: mockClearTimerState,
}))

const { mockSaveNote, mockGetNoteBySessionId } = vi.hoisted(() => ({
  mockSaveNote: vi.fn(),
  mockGetNoteBySessionId: vi.fn(),
}))

vi.mock("../lib/db/notes", () => ({
  saveNote: mockSaveNote,
  getNoteBySessionId: mockGetNoteBySessionId,
}))

const { mockCreateFlashcard } = vi.hoisted(() => ({
  mockCreateFlashcard: vi.fn(),
}))

vi.mock("../lib/db/flashcards", () => ({
  createFlashcard: mockCreateFlashcard,
}))

const { mockCompleteSession, mockUpdateSessionTema } = vi.hoisted(() => ({
  mockCompleteSession: vi.fn(),
  mockUpdateSessionTema: vi.fn(),
}))

vi.mock("../lib/db/sessions", () => ({
  completeSession: mockCompleteSession,
  updateSessionTema: mockUpdateSessionTema,
}))

const { mockScheduleCompletionNotification, mockCancelCompletionNotification } = vi.hoisted(
  () => ({
    mockScheduleCompletionNotification: vi.fn(),
    mockCancelCompletionNotification: vi.fn(),
  }),
)

vi.mock("../hooks/useTimerAlerts", () => ({
  useTimerAlerts: () => ({
    triggerAlerts: vi.fn(),
    initAudio: vi.fn(),
    stopAudio: vi.fn(),
    scheduleCompletionNotification: mockScheduleCompletionNotification,
    cancelCompletionNotification: mockCancelCompletionNotification,
  }),
}))

import CornellNotes from "./CornellNotes"

function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    pomodoro_duration_min: 25,
    break_duration_min: 5,
    cornell_enabled: true,
    cornell_every_n: 1,
    cornell_timing: "before",
    sound_enabled: true,
    flash_enabled: true,
    vibration_enabled: true,
    ...overrides,
  }
}

beforeEach(() => {
  useTimerStore.setState({
    sessionId: 1,
    elapsed: 0,
    duration: 1500,
    isPaused: false,
    topic: "",
    phase: "focus",
    pomodoroCountToday: 0,
    distractionsThisSession: 0,
    wasRestored: false,
  })
  vi.clearAllMocks()
  mockGetSettings.mockResolvedValue(makeSettings())
  mockClearTimerState.mockResolvedValue(undefined)
  mockSaveNote.mockResolvedValue(undefined)
  mockGetNoteBySessionId.mockResolvedValue(null)
  mockCreateFlashcard.mockResolvedValue(1)
  mockCompleteSession.mockResolvedValue(undefined)
  mockUpdateSessionTema.mockResolvedValue(undefined)
  mockScheduleCompletionNotification.mockResolvedValue(undefined)
  mockCancelCompletionNotification.mockResolvedValue(undefined)
})

describe("CornellNotes native notification wiring", () => {
  it('schedules a break notification when starting the break phase via the "before" timing branch', async () => {
    mockLocationState = {
      sessionId: 1,
      timing: "before",
      breakMin: 5,
      sessionTema: null,
    }

    render(<CornellNotes />)

    const skipButton = await screen.findByText("Omitir")
    fireEvent.click(skipButton)

    await waitFor(() => {
      expect(mockScheduleCompletionNotification).toHaveBeenCalledOnce()
    })
    const [phase, targetMs] = mockScheduleCompletionNotification.mock.calls[0]
    expect(phase).toBe("break")
    expect(targetMs).toBeGreaterThanOrEqual(Date.now() + 5 * 60 * 1000 - 1000)
  })

  it('schedules a break notification when starting the break phase via the "mid-focus" timing branch', async () => {
    mockLocationState = {
      sessionId: 1,
      timing: "mid-focus",
      breakMin: 5,
      sessionTema: null,
    }
    useTimerStore.setState({ elapsed: 600 })

    render(<CornellNotes />)

    const skipButton = await screen.findByText("Omitir")
    fireEvent.click(skipButton)

    await waitFor(() => {
      expect(mockScheduleCompletionNotification).toHaveBeenCalledOnce()
    })
    const [phase, targetMs] = mockScheduleCompletionNotification.mock.calls[0]
    expect(phase).toBe("break")
    expect(targetMs).toBeGreaterThanOrEqual(Date.now() + 5 * 60 * 1000 - 1000)
  })

  it('does NOT schedule a duplicate notification on the "during" timing branch (already scheduled by useTimer.complete())', async () => {
    mockLocationState = {
      sessionId: 1,
      timing: "during",
      breakMin: 5,
      sessionTema: null,
    }

    render(<CornellNotes />)

    const skipButton = await screen.findByText("Omitir")
    fireEvent.click(skipButton)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/timer")
    })
    expect(mockScheduleCompletionNotification).not.toHaveBeenCalled()
  })
})
