import { describe, it, expect, vi } from "vitest"

// Mock @tauri-apps/plugin-store so tests run outside Tauri
vi.mock("@tauri-apps/plugin-store", () => ({
  load: vi.fn(),
}))

import { DEFAULT_SETTINGS } from "./store"

describe("DEFAULT_SETTINGS", () => {
  it("has sound_enabled = true", () => {
    expect(DEFAULT_SETTINGS.sound_enabled).toBe(true)
  })

  it("has flash_enabled = true", () => {
    expect(DEFAULT_SETTINGS.flash_enabled).toBe(true)
  })

  it("has vibration_enabled = true", () => {
    expect(DEFAULT_SETTINGS.vibration_enabled).toBe(true)
  })
})
