# Design: study-companion

## Overview

The study-companion app is a greenfield Tauri 2 + React + TypeScript desktop application for macOS. The architecture uses a strict layered approach: a SQLite persistence layer (all SQL isolated in `src/lib/db/`), three Zustand stores (timer, review, ui) as the single source of truth for runtime state, a thin hooks layer that bridges stores to components, and hash-based routing required by Tauri's `tauri://localhost` protocol. No raw SQL escapes the `db/` layer, no timer state lives in React Context, and no component talks to the DB directly.

---

## 1. Project Scaffold

### Exact commands

```bash
cd /Users/mcarrera
npm create tauri-app@latest study-companion -- --template react-ts
cd study-companion
npm install
npm run tauri add sql
npm run tauri add store
```

After scaffold, install front-end dependencies:

```bash
npm install zustand react-router-dom
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/user-event
```

### Configuration changes after scaffold

**`src-tauri/tauri.conf.json`** — replace the generated content with:

```json
{
  "productName": "Study Companion",
  "identifier": "com.mcarrera.study-companion",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420"
  },
  "app": {
    "windows": [
      {
        "title": "Study Companion",
        "width": 900,
        "height": 700,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true
      }
    ]
  }
}
```

**`src-tauri/capabilities/default.json`** — full content:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capability for Study Companion",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "sql:default",
    "sql:allow-execute",
    "sql:allow-select",
    "sql:allow-load",
    "store:default",
    "store:allow-load",
    "store:allow-set",
    "store:allow-get",
    "store:allow-delete"
  ]
}
```

**`src-tauri/src/lib.rs`** — register both plugins and configure migrations:

```rust
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "initial schema",
        sql: include_str!("../migrations/0001_initial.sql"),
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:study-companion.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
```

---

## 2. Data Layer (`src/lib/db/`)

### Architecture decisions

| Decision | Choice | Rejected | Rationale |
|----------|--------|----------|-----------|
| SQL isolation | All SQL in `src/lib/db/` modules | Raw SQL in stores/hooks | Components change more often than schema; isolation lets us change queries without touching UI |
| Singleton DB | Module-level `_db` variable, opened once | Open on each call | `tauri-plugin-sql` has a small but real connection overhead; single open also ensures migration runs exactly once |
| Timestamps | Unix seconds (`Math.floor(Date.now() / 1000)`) | ISO strings, Date objects | SQLite stores integers natively; arithmetic comparisons (`<=`, `-`) are trivial on integers; no timezone ambiguity |

### `src/lib/db/index.ts`

```typescript
import Database from "@tauri-apps/plugin-sql"

let _db: Database | null = null

export async function initDB(): Promise<Database> {
  if (!_db) {
    _db = await Database.load("sqlite:study-companion.db")
  }
  return _db
}

export function getDB(): Database {
  if (!_db) throw new Error("DB not initialized — call initDB() first")
  return _db
}
```

`initDB()` is called once in `App.tsx` on mount, before any route renders. All db modules call `getDB()` (sync — throws if called before init).

### `src/lib/db/sessions.ts`

```typescript
import { getDB } from "./index"
import type { Session } from "../../types"

const now = () => Math.floor(Date.now() / 1000)

export async function createSession(tema: string, duracion_minutos: number): Promise<number> {
  const db = getDB()
  const result = await db.execute(
    "INSERT INTO sessions (fecha_inicio, tema, duracion_minutos) VALUES (?, ?, ?)",
    [now(), tema, duracion_minutos]
  )
  return result.lastInsertId
}

export async function completeSession(id: number, duracion_minutos: number): Promise<void> {
  const db = getDB()
  await db.execute(
    "UPDATE sessions SET fecha_fin = ?, duracion_minutos = ? WHERE id = ?",
    [now(), duracion_minutos, id]
  )
}

export async function getTodaySessions(): Promise<Session[]> {
  const db = getDB()
  const startOfDay = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000)
  return db.select<Session[]>(
    "SELECT * FROM sessions WHERE fecha_inicio >= ? ORDER BY fecha_inicio DESC",
    [startOfDay]
  )
}

export async function getRecentSessions(limit: number): Promise<Session[]> {
  const db = getDB()
  return db.select<Session[]>(
    "SELECT * FROM sessions ORDER BY fecha_inicio DESC LIMIT ?",
    [limit]
  )
}
```

### `src/lib/db/flashcards.ts`

```typescript
import { getDB } from "./index"
import type { Flashcard } from "../../types"

const now = () => Math.floor(Date.now() / 1000)

export async function createFlashcard(front: string, back: string, tag: string): Promise<number> {
  const db = getDB()
  const result = await db.execute(
    "INSERT INTO flashcards (front, back, tag, fecha_creacion, intervalo_actual, proxima_revision, veces_revisada) VALUES (?, ?, ?, ?, 0, ?, 0)",
    [front, back, tag, now(), now()]  // proxima_revision defaults to now (due immediately)
  )
  return result.lastInsertId
}

export async function updateFlashcard(id: number, front: string, back: string, tag: string): Promise<void> {
  const db = getDB()
  await db.execute(
    "UPDATE flashcards SET front = ?, back = ?, tag = ? WHERE id = ?",
    [front, back, tag, id]
  )
}

export async function deleteFlashcard(id: number): Promise<void> {
  const db = getDB()
  await db.execute("DELETE FROM flashcards WHERE id = ?", [id])
}

export async function getDueCards(): Promise<Flashcard[]> {
  const db = getDB()
  const nowTs = now()
  return db.select<Flashcard[]>(
    "SELECT * FROM flashcards WHERE intervalo_actual < 4 AND proxima_revision <= ? ORDER BY proxima_revision ASC",
    [nowTs]
  )
}

export async function getAllCards(): Promise<Flashcard[]> {
  const db = getDB()
  return db.select<Flashcard[]>("SELECT * FROM flashcards ORDER BY fecha_creacion DESC")
}

export async function getCardById(id: number): Promise<Flashcard | null> {
  const db = getDB()
  const rows = await db.select<Flashcard[]>("SELECT * FROM flashcards WHERE id = ?", [id])
  return rows[0] ?? null
}
```

### `src/lib/db/reviews.ts`

```typescript
import { getDB } from "./index"
import type { Review } from "../../types"

const now = () => Math.floor(Date.now() / 1000)

export async function recordReview(
  flashcard_id: number,
  resultado: "sabido" | "fallado",
  newLevel: number,
  proxima_revision: number | null
): Promise<void> {
  const db = getDB()
  await db.execute(
    "INSERT INTO reviews (flashcard_id, fecha, resultado) VALUES (?, ?, ?)",
    [flashcard_id, now(), resultado]
  )
  await db.execute(
    "UPDATE flashcards SET intervalo_actual = ?, proxima_revision = ?, veces_revisada = veces_revisada + 1 WHERE id = ?",
    [newLevel, proxima_revision, flashcard_id]
  )
}

export async function getTodayReviews(): Promise<Review[]> {
  const db = getDB()
  const startOfDay = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000)
  return db.select<Review[]>(
    "SELECT * FROM reviews WHERE fecha >= ?",
    [startOfDay]
  )
}
```

### `src/lib/db/notes.ts`

```typescript
import { getDB } from "./index"
import type { CornellNote } from "../../types"

export async function saveNote(
  session_id: number,
  notas_principales: string,
  preguntas: string,
  resumen: string
): Promise<void> {
  const db = getDB()
  // Upsert: one note per session
  await db.execute(
    `INSERT INTO cornell_notes (session_id, notas_principales, preguntas, resumen)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(session_id) DO UPDATE SET
       notas_principales = excluded.notas_principales,
       preguntas = excluded.preguntas,
       resumen = excluded.resumen`,
    [session_id, notas_principales, preguntas, resumen]
  )
}

export async function getNoteBySessionId(session_id: number): Promise<CornellNote | null> {
  const db = getDB()
  const rows = await db.select<CornellNote[]>(
    "SELECT * FROM cornell_notes WHERE session_id = ?",
    [session_id]
  )
  return rows[0] ?? null
}
```

Note: `ON CONFLICT(session_id)` requires a UNIQUE constraint on `session_id` in the migration.

### `src/lib/db/distractions.ts`

```typescript
import { getDB } from "./index"
import type { Distraction } from "../../types"

const now = () => Math.floor(Date.now() / 1000)

export async function addDistraction(session_id: number, texto: string): Promise<void> {
  const db = getDB()
  await db.execute(
    "INSERT INTO distractions (session_id, texto, timestamp) VALUES (?, ?, ?)",
    [session_id, texto, now()]
  )
}

export async function getDistractionsForSession(session_id: number): Promise<Distraction[]> {
  const db = getDB()
  return db.select<Distraction[]>(
    "SELECT * FROM distractions WHERE session_id = ? ORDER BY timestamp ASC",
    [session_id]
  )
}
```

---

## 3. Spaced Repetition Algorithm (`src/lib/sr/algorithm.ts`)

Pure functions, no imports, no side effects. Vitest-testable without any Tauri setup.

```typescript
const INTERVALS_DAYS: Record<number, number | null> = {
  0: 2,
  1: 3,
  2: 5,
  3: 7,
  4: null  // internalized
}

export function updateLevel(current: number, result: "sabido" | "fallado"): number {
  if (result === "sabido") return Math.min(current + 1, 4)
  return Math.max(current - 1, 0)
}

export function nextReviewDate(level: number): number | null {
  const days = INTERVALS_DAYS[level]
  if (days === null) return null
  const now = Math.floor(Date.now() / 1000)
  return now + days * 86400
}
```

**Architecture decision — pure functions over class:**
A class with state would make unit testing require instantiation and mock setup. These two functions cover the entire SR contract; a class would add zero value and create coupling risk.

---

## 4. TypeScript Types (`src/types/index.ts`)

```typescript
export interface Session {
  id: number
  fecha_inicio: number
  fecha_fin: number | null
  duracion_minutos: number | null
  tema: string | null
}

export interface Distraction {
  id: number
  session_id: number
  texto: string
  timestamp: number
}

export interface CornellNote {
  id: number
  session_id: number
  notas_principales: string
  preguntas: string
  resumen: string
}

export interface Flashcard {
  id: number
  front: string
  back: string
  tag: string
  fecha_creacion: number
  intervalo_actual: number   // 0–4
  proxima_revision: number | null
  veces_revisada: number
}

export interface Review {
  id: number
  flashcard_id: number
  fecha: number
  resultado: "sabido" | "fallado"
}

export interface AppSettings {
  pomodoro_duration_min: number          // default: 25
  break_duration_min: number             // default: 5
  cornell_every_n: number                // default: 1
  cornell_timing: "before" | "during" | "after"  // default: "during"
}

export interface PersistedTimerState {
  sessionId: number | null
  startedAt: number | null              // Unix seconds
  elapsedSeconds: number
  isPaused: boolean
  topic: string
  pomodoroCountToday: number
}
```

---

## 5. Zustand Stores (`src/stores/`)

### Architecture decision — Zustand selectors vs. React Context

| Option | Re-renders on timer tick | Setup |
|--------|--------------------------|-------|
| React Context | Every subscriber on every tick | Simple |
| Zustand (no selectors) | Same as Context | Simple |
| Zustand + selectors | Only subscribers of changed slice | Medium |

**Choice: Zustand with selectors.** The timer ticks every second; without selectors, `TimerBar`, `TimerRing`, `TimerControls`, and any stats component would all re-render simultaneously. Selectors eliminate this completely.

### `src/stores/timerStore.ts`

```typescript
import { create } from "zustand"

type Phase = "idle" | "focus" | "break" | "done"

interface TimerState {
  sessionId: number | null
  elapsed: number                 // seconds since start
  duration: number                // total session duration in seconds
  isPaused: boolean
  topic: string
  phase: Phase
  pomodoroCountToday: number
  distractionsThisSession: number
}

interface TimerActions {
  start(topic: string, durationMin: number): Promise<void>
  pause(): void
  resume(): void
  cancel(): Promise<void>         // shows confirm dialog via uiStore, then cleans up
  complete(): Promise<void>       // writes to DB, bumps pomodoroCountToday, transitions to "done"
  tick(): void                    // called by setInterval every 1000ms
  restore(saved: PersistedTimerState): void
  incrementDistractions(): void
}

export const useTimerStore = create<TimerState & TimerActions>((set, get) => ({
  sessionId: null,
  elapsed: 0,
  duration: 0,
  isPaused: false,
  topic: "",
  phase: "idle",
  pomodoroCountToday: 0,
  distractionsThisSession: 0,

  start: async (topic, durationMin) => { /* createSession in DB, set sessionId, phase: "focus" */ },
  pause: () => set({ isPaused: true }),
  resume: () => set({ isPaused: false }),
  cancel: async () => { /* uiStore.showConfirm → on confirm: clear DB session, reset state */ },
  complete: async () => { /* completeSession in DB, pomodoroCountToday++, phase: "done" */ },
  tick: () => {
    const { elapsed, duration, isPaused, phase } = get()
    if (isPaused || phase !== "focus") return
    if (elapsed + 1 >= duration) {
      get().complete()
    } else {
      set({ elapsed: elapsed + 1 })
    }
  },
  restore: (saved) => set({
    sessionId: saved.sessionId,
    elapsed: saved.elapsedSeconds,
    isPaused: true,               // always restore to paused
    topic: saved.topic,
    pomodoroCountToday: saved.pomodoroCountToday,
    phase: "focus",
  }),
  incrementDistractions: () => set((s) => ({ distractionsThisSession: s.distractionsThisSession + 1 })),
}))
```

### `src/stores/reviewStore.ts`

```typescript
import { create } from "zustand"
import type { Flashcard } from "../types"

interface ReviewState {
  cards: Flashcard[]
  currentIndex: number
  isRevealed: boolean
  results: { sabido: number; fallado: number }
  isComplete: boolean
}

interface ReviewActions {
  loadCards(): Promise<void>
  reveal(): void
  recordResult(result: "sabido" | "fallado"): Promise<void>
  reset(): void
}

export const useReviewStore = create<ReviewState & ReviewActions>((set, get) => ({
  cards: [],
  currentIndex: 0,
  isRevealed: false,
  results: { sabido: 0, fallado: 0 },
  isComplete: false,

  loadCards: async () => { /* getDueCards() → set cards, reset index */ },
  reveal: () => set({ isRevealed: true }),
  recordResult: async (result) => {
    const { cards, currentIndex, results } = get()
    const card = cards[currentIndex]
    const newLevel = updateLevel(card.intervalo_actual, result)
    const nextDate = nextReviewDate(newLevel)
    await recordReview(card.id, result, newLevel, nextDate)
    const nextIndex = currentIndex + 1
    set({
      results: { ...results, [result]: results[result] + 1 },
      currentIndex: nextIndex,
      isRevealed: false,
      isComplete: nextIndex >= cards.length,
    })
  },
  reset: () => set({ cards: [], currentIndex: 0, isRevealed: false, results: { sabido: 0, fallado: 0 }, isComplete: false }),
}))
```

### `src/stores/uiStore.ts`

```typescript
import { create } from "zustand"

interface ConfirmDialog {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

interface UIState {
  activeModal: "distraction" | "confirm" | "settings" | null
  confirmDialog: ConfirmDialog | null
}

interface UIActions {
  openModal(modal: UIState["activeModal"]): void
  closeModal(): void
  showConfirm(message: string, onConfirm: () => void, onCancel?: () => void): void
}

export const useUIStore = create<UIState & UIActions>((set) => ({
  activeModal: null,
  confirmDialog: null,

  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null, confirmDialog: null }),
  showConfirm: (message, onConfirm, onCancel = () => {}) => set({
    activeModal: "confirm",
    confirmDialog: { message, onConfirm, onCancel },
  }),
}))
```

---

## 6. Settings Storage (`src/lib/store.ts`)

```typescript
import { load, type Store } from "@tauri-apps/plugin-store"
import type { AppSettings, PersistedTimerState } from "../types"

let _store: Store | null = null

const DEFAULT_SETTINGS: AppSettings = {
  pomodoro_duration_min: 25,
  break_duration_min: 5,
  cornell_every_n: 1,
  cornell_timing: "during",
}

export async function getStore(): Promise<Store> {
  if (!_store) _store = await load("app-data.json", { autoSave: true })
  return _store
}

export async function getSettings(): Promise<AppSettings> {
  const store = await getStore()
  const saved = await store.get<AppSettings>("app-settings")
  return { ...DEFAULT_SETTINGS, ...saved }
}

export async function saveSettings(partial: Partial<AppSettings>): Promise<void> {
  const store = await getStore()
  const current = await getSettings()
  await store.set("app-settings", { ...current, ...partial })
}

export async function getTimerState(): Promise<PersistedTimerState | null> {
  const store = await getStore()
  return store.get<PersistedTimerState>("timer-state")
}

export async function saveTimerState(t: PersistedTimerState): Promise<void> {
  const store = await getStore()
  await store.set("timer-state", t)
}

export async function clearTimerState(): Promise<void> {
  const store = await getStore()
  await store.delete("timer-state")
}
```

---

## 7. Hooks (`src/hooks/`)

### `src/hooks/useTimer.ts`

Manages the `setInterval` lifecycle and writes to `tauri-plugin-store` on every tick.

```typescript
import { useEffect } from "react"
import { useTimerStore } from "../stores/timerStore"
import { saveTimerState, getTimerState, clearTimerState } from "../lib/store"

export function useTimer() {
  const store = useTimerStore()

  // Restore from crash on mount
  useEffect(() => {
    getTimerState().then((saved) => {
      if (saved?.sessionId !== null && saved?.sessionId !== undefined) {
        store.restore(saved)
      }
    })
  }, [])

  // setInterval tick
  useEffect(() => {
    if (store.phase !== "focus") return
    const id = setInterval(() => {
      store.tick()
      // Persist on every tick
      saveTimerState({
        sessionId: store.sessionId,
        startedAt: null,           // not needed — we track elapsed directly
        elapsedSeconds: store.elapsed,
        isPaused: store.isPaused,
        topic: store.topic,
        pomodoroCountToday: store.pomodoroCountToday,
      })
    }, 1000)
    return () => clearInterval(id)
  }, [store.phase, store.isPaused])

  // Clear persisted state on complete or cancel
  useEffect(() => {
    if (store.phase === "idle" || store.phase === "done") {
      clearTimerState()
    }
  }, [store.phase])

  return store
}
```

### `src/hooks/useKeyboard.ts`

Single document-level listener, registered once in `App.tsx`. Returns `void` — side effects only.

```typescript
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useTimerStore } from "../stores/timerStore"
import { useReviewStore } from "../stores/reviewStore"
import { useUIStore } from "../stores/uiStore"

const INPUT_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"])

export function useKeyboard(): void {
  const navigate = useNavigate()
  const timer = useTimerStore()
  const review = useReviewStore()
  const ui = useUIStore()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isTyping = INPUT_TAGS.has((e.target as HTMLElement).tagName)

      if (e.key === "Escape") {
        // Esc always fires — closes modal or goes back
        if (ui.activeModal) {
          ui.closeModal()
        } else {
          navigate(-1)
        }
        return
      }

      if (isTyping) return  // Guard for all other keys

      if (e.key === " " && review.cards.length > 0) {
        e.preventDefault()
        if (!review.isRevealed) review.reveal()
        return
      }

      if (e.key === "1" && review.isRevealed) {
        review.recordResult("sabido")
        return
      }

      if (e.key === "2" && review.isRevealed) {
        review.recordResult("fallado")
        return
      }
    }

    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [ui.activeModal, review.cards.length, review.isRevealed])
}
```

### `src/hooks/useReview.ts`

Thin selector wrapper over `reviewStore`.

```typescript
import { useReviewStore } from "../stores/reviewStore"

export function useReview() {
  return useReviewStore()
}
```

---

## 8. Routing (`src/router.tsx`)

```typescript
import { createHashRouter } from "react-router-dom"
import App from "./App"
import Home from "./views/Home"
import FlashcardReview from "./views/FlashcardReview"
import FlashcardLibrary from "./views/FlashcardLibrary"
import FlashcardEdit from "./views/FlashcardEdit"
import CornellNotes from "./views/CornellNotes"
import Timer from "./views/Timer"

// IMPORTANT: createHashRouter is required for Tauri production.
// createBrowserRouter will break when served from tauri://localhost.
// Do not change this without updating routing across the entire app.

export const router = createHashRouter([
  {
    path: "/",
    element: <App />,     // Shell: TimerBar + Outlet + useKeyboard()
    children: [
      { index: true, element: <Home /> },
      { path: "review", element: <FlashcardReview /> },
      { path: "library", element: <FlashcardLibrary /> },
      { path: "library/:id", element: <FlashcardEdit /> },
      { path: "new-card", element: <FlashcardEdit /> },    // no :id = create mode
      { path: "cornell", element: <CornellNotes /> },
      { path: "timer", element: <Timer /> },
    ],
  },
])
```

**`src/App.tsx`** shell structure:

```typescript
import { Outlet } from "react-router-dom"
import { useEffect } from "react"
import TimerBar from "./components/timer/TimerBar"
import { useKeyboard } from "./hooks/useKeyboard"
import { initDB } from "./lib/db"

export default function App() {
  useKeyboard()  // single global listener

  useEffect(() => {
    initDB()     // opens DB and runs migrations exactly once
  }, [])

  return (
    <div className="flex flex-col h-screen bg-[--color-bg] text-[--color-text-primary]">
      <TimerBar />      {/* conditional — renders null when phase === "idle" */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
```

---

## 9. Component Catalogue

### `TimerBar` (`src/components/timer/TimerBar.tsx`)

```typescript
interface Props {}  // no props — reads from timerStore directly

// Renders null when timerStore.phase === "idle"
// Fixed top bar: h-12 (48px)
// Layout: flex items-center justify-between px-4
//   Left:  CircleIcon + elapsed formatted as MM:SS
//   Center: topic truncated to 20 chars
//   Right: pause/resume IconButton
// onClick on bar area → navigate("/timer")
// Uses selectors: useTimerStore((s) => s.elapsed), useTimerStore((s) => s.phase)
```

### `TimerRing` (`src/components/timer/TimerRing.tsx`)

```typescript
interface Props {
  elapsed: number   // seconds elapsed
  total: number     // total session duration in seconds
}

// SVG circle ring
// Uses CSS stroke-dashoffset for progress — no JS animation
// progress = elapsed / total  (clamped 0-1)
// stroke-dasharray = circumference (2 * PI * r)
// stroke-dashoffset = circumference * (1 - progress)
```

### `CornellLayout` (`src/components/notes/CornellLayout.tsx`)

```typescript
interface Props {
  sessionId: number
  showBreakTimer?: boolean   // true when cornell_timing === "during"
}

// CSS Grid: grid-cols-[65%_35%] grid-rows-[1fr_auto]
// Cell [0,0]: NoteZone for notas_principales (main area, left 65%)
// Cell [0,1]: NoteZone for preguntas (right column)
// Cell [1,0+1]: NoteZone for resumen (footer, spans both columns)
// When showBreakTimer: break countdown positioned absolute top-right corner
// Save button: writes all three zones via saveNote()
// Skip button: navigates away without saving
```

### `NoteZone` (`src/components/notes/NoteZone.tsx`)

```typescript
interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

// Labeled textarea that fills its grid cell
// No markdown rendering — plain text only
```

### `FlashcardFace` (`src/components/flashcard/FlashcardFace.tsx`)

```typescript
interface Props {
  front: string
  back: string
  isRevealed: boolean
}

// Not revealed: front centered, large text (text-2xl), nothing else visible
// Revealed: front (smaller, muted) + horizontal separator + back (text-xl, primary)
// No flip animation — matches "no decorative animations" principle
```

### `EmptyState` (`src/components/ui/EmptyState.tsx`)

```typescript
interface Props {
  message: string
  action?: {
    label: string
    onClick: () => void
  }
}

// Centered in parent container
// Muted text (text-[--color-text-secondary])
// Optional CTA Button below the message
```

### `ReviewResultButtons` (`src/components/flashcard/ReviewResultButtons.tsx`)

```typescript
interface Props {
  onSabido: () => void
  onFallado: () => void
  disabled?: boolean
}

// Two buttons: "Sabido (1)" and "Fallado (2)"
// Keyboard hints shown in button label
// Disabled until card is revealed
```

---

## 10. Cornell Navigation Flow

```
Pomodoro timer reaches duration
  │
  ▼
timerStore.complete()
  ├── completeSession(sessionId, durationMin)  → DB write
  ├── pomodoroCountToday++
  └── phase = "done"
  │
  ▼
Check: pomodoroCountToday % settings.cornell_every_n === 0?
  │
  NO ──→ navigate("/")  (back to home)
  │
  YES ──→ check settings.cornell_timing:
          │
          ├── "before" ──→ navigate("/cornell")
          │                 CornellNotes screen shows, break does NOT start yet
          │                 User saves or clicks Skip
          │                 → start break countdown → navigate("/")
          │
          ├── "during" ──→ navigate("/cornell")
          │                 CornellNotes screen shows WITH break countdown in corner
          │                 Break timer and Cornell run simultaneously
          │                 User saves or Skip → navigate("/") when done (or when break ends)
          │
          └── "after"  ──→ start break countdown on current screen (or /timer)
                            break ends → navigate("/cornell")
                            User saves or Skip → navigate("/")
```

---

## 11. Database Migration (`src-tauri/migrations/0001_initial.sql`)

```sql
-- All tables in a single migration. Atomic: if any statement fails, all roll back.
-- CREATE TABLE IF NOT EXISTS makes re-runs safe during development.

CREATE TABLE IF NOT EXISTS sessions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha_inicio     INTEGER NOT NULL,
  fecha_fin        INTEGER,
  duracion_minutos INTEGER,
  tema             TEXT
);

CREATE TABLE IF NOT EXISTS distractions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  texto      TEXT NOT NULL,
  timestamp  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cornell_notes (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id         INTEGER NOT NULL UNIQUE REFERENCES sessions(id),
  notas_principales  TEXT NOT NULL DEFAULT '',
  preguntas          TEXT NOT NULL DEFAULT '',
  resumen            TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS flashcards (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  front            TEXT NOT NULL,
  back             TEXT NOT NULL DEFAULT '',
  tag              TEXT NOT NULL DEFAULT '',
  fecha_creacion   INTEGER NOT NULL,
  intervalo_actual INTEGER NOT NULL DEFAULT 0,
  proxima_revision INTEGER,
  veces_revisada   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reviews (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  flashcard_id INTEGER NOT NULL REFERENCES flashcards(id),
  fecha        INTEGER NOT NULL,
  resultado    TEXT NOT NULL CHECK(resultado IN ('sabido', 'fallado'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_flashcards_due
  ON flashcards(proxima_revision, intervalo_actual);

CREATE INDEX IF NOT EXISTS idx_reviews_fecha
  ON reviews(fecha);

CREATE INDEX IF NOT EXISTS idx_distractions_session
  ON distractions(session_id);
```

**Note:** `cornell_notes.session_id` has a `UNIQUE` constraint — this is required for the `ON CONFLICT` upsert in `notes.ts`. The original proposal schema omitted this; it must be added here.

---

## 12. Data Flow

```
User action (button / keyboard)
        │
        ▼
   Hook / View
        │
        ├──→ Zustand Store (state update — sync)
        │         │
        │         └──→ Component re-renders via selector
        │
        └──→ src/lib/db/*.ts (async DB write)
                  │
                  └──→ tauri-plugin-sql → SQLite file

Timer tick (setInterval, every 1000ms):
  useTimer → timerStore.tick() → timerStore state
                               → src/lib/store.ts → tauri-plugin-store (crash recovery)

App init:
  App.tsx → initDB() → migrations run → DB ready
          → getTimerState() → if sessionId present → timerStore.restore()
          → getSettings() → passed to components via props or read directly
```

---

## 13. Implementation Order

Each phase depends on everything before it. Do not start phase N+1 until phase N is verified.

| Phase | What to build first | Verification gate |
|-------|--------------------|--------------------|
| 1 | Scaffold + config + migration + `initDB()` + all type definitions | DB opens, 5 tables exist, `sql:allow-execute` present — smoke-test one INSERT/SELECT |
| 2 | `timerStore` + `useTimer` + crash recovery + `TimerBar` + `TimerRing` + `TimerControls` | Timer starts, ticks, pauses, resumes, completes — survives app restart |
| 3 | Distraction capture: floating button + modal + `distractions.ts` | Distraction saved to DB and visible in DevTools |
| 4 | Cornell notes: `CornellLayout` + `NoteZone` + `notes.ts` + navigation flow | All three timing modes navigate correctly after pomodoro |
| 5 | `algorithm.ts` + `flashcards.ts` + `FlashcardEdit` + `FlashcardLibrary` | CRUD round-trips; level-4 filtered from library by default |
| 6 | `reviewStore` + `useReview` + `FlashcardReview` + `ReviewResultButtons` + keyboard | Review advances one card at a time; results recorded; level-4 never appears |
| 7 | `Home.tsx` + dashboard stats queries | Stats reflect real DB data; empty states render correctly |

**Hard constraints:**
- Phase 1 (`initDB`) must complete before ANY other phase — all DB modules depend on `getDB()`
- `createHashRouter` must be set at scaffold time — retrofitting breaks navigation history
- `sql:allow-execute` must be in `capabilities/default.json` before any INSERT/UPDATE/DELETE — absence causes silent failures in tauri-plugin-sql
- Tailwind v4 `@theme` tokens must be verified rendering in Phase 1 before building components on top of them
- `useKeyboard` registered once in `App.tsx` — never register it inside views (duplicate listeners)

---

## 14. Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `algorithm.ts` (`updateLevel`, `nextReviewDate`) | Vitest — no Tauri, no DOM needed |
| Unit | Zustand store actions (pure logic paths) | Vitest with `create` + direct action calls |
| Integration | DB module functions | Vitest with `@tauri-apps/plugin-sql` mocked (return controlled fixtures) |
| Integration | Cornell navigation flow | React Testing Library — render `App`, trigger `complete()`, assert navigate called |
| E2E | Full timer → cornell → flashcard round-trip | Manual on macOS (no E2E framework in scope for Phase 1) |

Vitest config target: `jsdom` environment for all React tests. Pure function tests (`algorithm.ts`) need no environment.

---

## 15. Open Questions

- [ ] `saveNote` uses `ON CONFLICT(session_id)` upsert — verify `tauri-plugin-sql` passes the full SQL string including `ON CONFLICT` without stripping it (some SQL plugins sanitize statements)
- [ ] Break countdown during "during" mode: does it run in `timerStore` as a second timer, or as a separate local state in `CornellNotes.tsx`? Recommendation: local `useState` + `useEffect` in `CornellNotes.tsx` to avoid polluting `timerStore` with break-specific state
- [ ] "Create flashcards from questions" shortcut on Cornell screen: out of scope per proposal, but the `preguntas` field is available — confirm before closing Phase 4
