# Study Companion

A personal Mac desktop app for deep work. Combines Pomodoro timer, Cornell notes, and spaced repetition flashcards — all local, no account, no sync.

Built with Tauri 2 + React 19 + TypeScript + Tailwind CSS v4 + SQLite.

---

## Features

### Pomodoro Timer
- Configurable focus duration (default 25 min) and break duration (default 5 min)
- Optional topic label per session
- Distraction capture during focus — log what broke your concentration without losing flow
- Crash recovery: timer state persists across restarts; on reopen, only interrupted focus sessions are offered for resumption (break state is intentionally discarded)
- Break controls: +1 / +2 / +5 min quick-add and a "Finish" button to end break early without canceling the session
- Screen wake lock via the [Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) — display stays on while the timer is running, released automatically on pause or idle
- Keyboard shortcut: `Space` to pause/resume

### Cornell Notes
- Three-zone layout: main notes (left), questions/cues (right), summary (bottom)
- Configurable trigger: every N pomodoros, you're prompted to take notes (can be disabled entirely)
- Three timing modes: **before** break (notes first, then break), **during** break (break timer runs in the background while you write), **after** break
- Timer keeps running while you write — navigating to the notes page does not pause the focus or break timer. If the timer expires mid-note, the page does not redirect.
- Review mode: when opening a past note, notas and resumen are blurred by default — only questions are visible for self-testing. Toggle to reveal.
- One-click flashcard creation from the questions column

### Spaced Repetition Flashcards
- 2-3-5-7 review intervals (days): level 0 → 2d, 1 → 3d, 2 → 5d, 3 → 7d, 4 → internalized
- Cards marked **internalized** graduate out of the review queue permanently
- Due cards shown on Home with a one-click shortcut to start review
- Full library with search and pagination (see [Search](#search))
- Keyboard shortcuts during review: `Space` to reveal, `1` to mark as known, `2` to mark as missed

### Session History
- Full session log at `/sessions` — accessible via "Ver todas" on the Home screen
- Search across session topic, Cornell notes body, questions, and summary
- Paginated (25 per page)

### Search

Search in both the flashcard library and the session history is handled by SQLite directly — not filtered in JavaScript after loading all rows.

**Why this matters:** SQLite runs in-process inside the Tauri app binary (no network, no IPC round-trip to a separate process). A `LIKE` query over thousands of rows completes in under 1 ms. Pushing filtering to the DB layer also means pagination is exact — a JS post-filter on a LIMIT'd result would silently produce short pages.

Implementation details:
- `LOWER(COALESCE(field, ''))` on both sides of every `LIKE` for case-insensitive matching that handles NULL columns and common Spanish accented characters
- Session search does a `LEFT JOIN cornell_notes` and searches four fields in one query, returning `has_notes` as a `0|1` column — eliminating a second round-trip
- A 300 ms debounce (`useDebounce`) gates DB calls so keystrokes don't trigger a query each

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
  hooks/          # useTimer, useReview, useKeyboard, useWakeLock, useDebounce
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
- The break timer and the Cornell notes countdown are the **same timer**. When Cornell opens in "during" mode, the break phase starts in the store before navigating — the TimerBar reflects real remaining time. No local `setInterval` in the notes view.
- `persist()` in `useTimer` only saves state when `phase === "focus"`. Break and done phases are not persisted — so closing the app during a break opens fresh on next launch, not with a ghost recovery prompt.
- Zustand stores are synchronous only. All async DB work lives in hooks or event handlers.
- The spaced repetition algorithm is a set of pure functions with no side effects — easy to test and swap out.
