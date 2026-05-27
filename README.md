# Study Companion

A personal Mac desktop app for deep work. Combines Pomodoro timer, Cornell notes, and spaced repetition flashcards — all local, no account, no sync.

Built with Tauri 2 + React 19 + TypeScript + Tailwind CSS v4 + SQLite.

---

## Features

### Pomodoro Timer
- Configurable focus duration (default 25 min) and break duration (default 5 min)
- Optional topic label per session
- Distraction capture during focus — log what broke your concentration without losing flow
- Persistent across restarts (timer state survives app close)
- Keyboard shortcut: `Space` to pause/resume

### Cornell Notes
- Three-zone layout: main notes (left), questions/cues (right), summary (bottom)
- Configurable trigger: every N pomodoros, you're prompted to take notes
- Three timing modes: **before** break (notes first, then break), **during** break (notes while countdown runs), **after** break
- Review mode: when opening a past note, notas and resumen are blurred by default — only questions are visible for self-testing. Toggle to reveal.
- One-click flashcard creation from the questions column

### Spaced Repetition Flashcards
- 2-3-5-7 review intervals (days): level 0 → 2d, 1 → 3d, 2 → 5d, 3 → 7d, 4 → internalized
- Cards marked **internalized** graduate out of the review queue permanently
- Due cards shown on Home with a one-click shortcut to start review
- Full library with edit and delete
- Keyboard shortcuts during review: `Space` to reveal, `1` to mark as known, `2` to mark as missed

### Daily Stats
Home screen shows today's pomodoros, cards created, cards reviewed, and distractions logged.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Desktop shell | Tauri 2 |
| Frontend | React 19 + TypeScript |
| Routing | React Router v7 (`createHashRouter`) |
| Styling | Tailwind CSS v4 (CSS-first, no config file) |
| State | Zustand 5 (selector-based, sync only) |
| Database | SQLite via `tauri-plugin-sql` |
| Persistence | `tauri-plugin-store` for timer state |
| Build | Vite 7 |

---

## Project Structure

```
src/
  views/          # Page-level components (Home, Timer, CornellNotes, FlashcardReview, ...)
  components/
    flashcard/    # FlashcardFace
    notes/        # CornellLayout, NoteZone
    settings/     # PomodoroSettings panel
    timer/        # TimerBar, TimerRing, FloatingButton
    ui/           # Button, Input, shared primitives
  contexts/       # TimerContext (distributes timer actions to child routes)
  hooks/          # useTimer, useReview, useKeyboard
  stores/         # timerStore, reviewStore, uiStore (Zustand)
  lib/
    db/           # SQLite access layer (sessions, notes, flashcards, reviews, distractions)
    sr/           # Spaced repetition algorithm (pure functions)
    utils/        # date, format helpers
    store.ts      # tauri-plugin-store wrappers

src-tauri/
  migrations/     # 0001_initial.sql — all 5 tables in one atomic migration
  capabilities/   # default.json — Tauri permission grants
  src/            # Rust entry point (minimal, plugins only)
```

---

## Database Schema

Five tables, all in a single atomic migration:

- **sessions** — pomodoro sessions (start, end, duration, topic)
- **distractions** — per-session distraction log
- **cornell_notes** — one note per session (unique constraint)
- **flashcards** — cards with SR state (level, next review date, review count)
- **reviews** — individual review events (`sabido` / `fallado`)

All timestamps are Unix seconds. All foreign keys use `ON DELETE CASCADE`.

---

## Getting Started

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)
- [Node.js](https://nodejs.org/) 20+
- [Tauri CLI v2](https://tauri.app/start/prerequisites/)

### Run in development

```bash
pnpm install
pnpm run tauri dev
```

### Build for production

```bash
pnpm run tauri build
```

The `.dmg` and `.app` are output to `src-tauri/target/release/bundle/`.

---

## Architecture Notes

- `createHashRouter` is required (not `createBrowserRouter`) — Tauri's `tauri://localhost` origin breaks history-based routing in production.
- `initDB()` is idempotent and used everywhere. Never call the synchronous `getDB()` from async flows.
- `useTimer()` is called exactly once in `App.tsx`. `TimerContext` distributes the returned actions to child routes — calling `useTimer()` a second time would spawn a second interval.
- Break countdown in Cornell notes is local state (`useState` + `useEffect`), not in the timer store. The timer store only tracks the pomodoro/break timer.
- Zustand stores are synchronous only. All async DB work lives in hooks or event handlers.
- The spaced repetition algorithm is a set of pure functions with no side effects — easy to test and swap out.
