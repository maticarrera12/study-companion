import { load, type Store } from "@tauri-apps/plugin-store"
import type { AppSettings, PersistedTimerState } from "../types"

let _store: Store | null = null
let _settingsSaveQueue: Promise<void> = Promise.resolve()

const DEFAULT_SETTINGS: AppSettings = {
  pomodoro_duration_min: 25,
  break_duration_min: 5,
  cornell_enabled: true,
  cornell_every_n: 1,
  cornell_timing: "during",
  sound_enabled: true,
  flash_enabled: true,
  vibration_enabled: true,
}

export { DEFAULT_SETTINGS }

export async function getStore(): Promise<Store> {
  if (!_store) {
    _store = await load("app-data.json", {
      defaults: {},
      autoSave: true,
    })
  }
  return _store
}

export async function getSettings(): Promise<AppSettings> {
  const store = await getStore()
  const saved = await store.get<AppSettings>("app-settings")
  return { ...DEFAULT_SETTINGS, ...(saved ?? {}) }
}

export async function saveSettings(partial: Partial<AppSettings>): Promise<void> {
  _settingsSaveQueue = _settingsSaveQueue.then(async () => {
    const store = await getStore()
    const saved = await store.get<Partial<AppSettings>>("app-settings")
    await store.set("app-settings", { ...DEFAULT_SETTINGS, ...(saved ?? {}), ...partial })
  })
  return _settingsSaveQueue
}

export async function getTimerState(): Promise<PersistedTimerState | null> {
  const store = await getStore()
  const value = await store.get<PersistedTimerState>("timer-state")
  return value ?? null
}

export async function saveTimerState(t: PersistedTimerState): Promise<void> {
  const store = await getStore()
  await store.set("timer-state", t)
}

export async function clearTimerState(): Promise<void> {
  const store = await getStore()
  await store.delete("timer-state")
}
