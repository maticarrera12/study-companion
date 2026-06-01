import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import type { AppSettings } from "../../types"

// ---------------------------------------------------------------------------
// Mocks — use vi.hoisted() so variables are available inside vi.mock factories
// ---------------------------------------------------------------------------

const { mockGetSettings, mockSaveSettings } = vi.hoisted(() => ({
  mockGetSettings: vi.fn(),
  mockSaveSettings: vi.fn(),
}))

vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(),
}))

vi.mock("../../lib/store", () => ({
  getSettings: mockGetSettings,
  saveSettings: mockSaveSettings,
}))

import { PomodoroSettingsPanel } from "./PomodoroSettings"

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

beforeEach(() => {
  vi.clearAllMocks()
  mockSaveSettings.mockResolvedValue(undefined)
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PomodoroSettingsPanel — Notifications section", () => {
  it("renders Sound, Flash, and Vibration toggles", async () => {
    mockGetSettings.mockResolvedValue(makeSettings())

    render(<PomodoroSettingsPanel />)

    await waitFor(() => {
      expect(screen.getByRole("switch", { name: /sound/i })).toBeInTheDocument()
      expect(screen.getByRole("switch", { name: /flash/i })).toBeInTheDocument()
      expect(screen.getByRole("switch", { name: /vibration/i })).toBeInTheDocument()
    })
  })

  it("vibration toggle label includes '(mobile only)'", async () => {
    mockGetSettings.mockResolvedValue(makeSettings())

    render(<PomodoroSettingsPanel />)

    await waitFor(() => {
      expect(
        screen.getByRole("switch", { name: /vibration \(mobile only\)/i }),
      ).toBeInTheDocument()
    })
  })

  it("reflects current persisted value on open — flash off", async () => {
    mockGetSettings.mockResolvedValue(makeSettings({ flash_enabled: false }))

    render(<PomodoroSettingsPanel />)

    await waitFor(() => {
      const flashToggle = screen.getByRole("switch", { name: /flash/i })
      expect(flashToggle).toHaveAttribute("aria-checked", "false")
    })
  })

  it("reflects current persisted value on open — sound on", async () => {
    mockGetSettings.mockResolvedValue(makeSettings({ sound_enabled: true }))

    render(<PomodoroSettingsPanel />)

    await waitFor(() => {
      const soundToggle = screen.getByRole("switch", { name: /sound/i })
      expect(soundToggle).toHaveAttribute("aria-checked", "true")
    })
  })

  it("persists sound_enabled=false when Sound toggle is turned off", async () => {
    mockGetSettings.mockResolvedValue(makeSettings({ sound_enabled: true }))

    render(<PomodoroSettingsPanel />)

    await waitFor(() =>
      expect(screen.getByRole("switch", { name: /sound/i })).toBeInTheDocument(),
    )

    fireEvent.click(screen.getByRole("switch", { name: /sound/i }))

    await waitFor(() => {
      expect(mockSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ sound_enabled: false }),
      )
    })
  })

  it("persists flash_enabled=true when Flash toggle is turned on", async () => {
    mockGetSettings.mockResolvedValue(makeSettings({ flash_enabled: false }))

    render(<PomodoroSettingsPanel />)

    await waitFor(() =>
      expect(screen.getByRole("switch", { name: /flash/i })).toBeInTheDocument(),
    )

    fireEvent.click(screen.getByRole("switch", { name: /flash/i }))

    await waitFor(() => {
      expect(mockSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ flash_enabled: true }),
      )
    })
  })

  it("does not call saveSettings before settings have loaded", () => {
    // getSettings never resolves in this test — simulates slow async load
    mockGetSettings.mockReturnValue(new Promise(() => {}))

    render(<PomodoroSettingsPanel />)

    // Toggle elements may not even be interactive yet, but even if they are
    // rendered with defaults, no save should have been triggered
    expect(mockSaveSettings).not.toHaveBeenCalled()
  })
})
