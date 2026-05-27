# Proposal: study-companion

## Summary

A personal Mac desktop app for deep JavaScript study that integrates a Pomodoro timer, distraction capture, Cornell notes, and spaced-repetition flashcards into one focused workflow. All stack and design decisions are final — this proposal is the authoritative contract for spec and design phases.

---

## Scope

### In Scope

- Pomodoro timer with configurable duration and break length
- Distraction capture (floating button + quick-input modal) during active sessions
- Cornell notes (auto-navigated after each pomodoro with configurable timing)
- Flashcard CRUD with tag support
- Spaced repetition review mode — keyboard-driven, 2-3-5-7 interval method
- Flashcard library with search, filters, and level-4 toggle
- Home dashboard — daily stats, due cards count, recent sessions
- State restoration on crash/relaunch via `tauri-plugin-store`
- Global keyboard shortcuts with focus guard (Space, Esc, 1, 2)
- Persistent TimerBar visible on all screens while a session is active
- macOS only, offline, no auth

### Out of Scope

- Cloud sync or multi-device support
- Authentication or user accounts
- Custom themes beyond the single design system
- Notifications or system tray integration
- Import/export of flashcards
- Markdown rendering in notes
- Analytics beyond the basic dashboard stats
- Windows or Linux support

---

## Stack & Tooling

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Shell | Tauri 2 (latest stable) | Native macOS binary, small bundle, SQLite plugin |
| UI | React + TypeScript + Vite | Standard, excellent Tauri DX |
| Styling | Tailwind CSS v4 (CSS-first) | `@theme` tokens, no PostCSS config, zero config greenfield |
| Database | SQLite via `tauri-plugin-sql` | Local persistence, simple migrations |
| State | Zustand (3 stores) | Selector-based — prevents 1s timer re-render storm |
| Routing | `createHashRouter` | Required for Tauri production (`tauri://localhost` protocol) |
| Timer persistence | `tauri-plugin-store` | Crash-safe ephemeral state, separate from domain data |
| Font | Outfit WOFF2, self-hosted | Offline app — no CDN |

---

## Architecture Overview

### Zustand Store Boundaries

- `timerStore` — `{ activeSessionId, elapsed, isPaused, topic, state }` — updates every second; all timer UI subscribes with selectors
- `reviewStore` — `{ pendingCards, currentCardIndex, sessionResults }` — loaded once at review start
- `uiStore` — `{ activeModal, confirmDialogState }` — lightweight UI coordination

### Hash Router

7 routes via `createHashRouter`. `createBrowserRouter` breaks in production because Tauri serves from `tauri://localhost`, not a real HTTP origin. Hash router is set from project scaffold — not retrofittable.

### Timer Persistence (Crash Recovery)

On every tick, `timerStore` writes to `tauri-plugin-store` key `timer-state`. On app init, if `timer-state.session_id !== null` and session is incomplete, restore to paused and show a "¿Continuás tu sesión de {topic}?" banner. Domain data (sessions table) is written only on complete or abandon.

### Spaced Repetition — 2-3-5-7 Method

```
Level 0 → 2 days  |  Level 1 → 3 days  |  Level 2 → 5 days
Level 3 → 7 days  |  Level 4 → internalized (never scheduled)
```

- "Sabido" → level +1 (max 4)
- "Fallado" → level -1 (min 0)
- Due cards query: `WHERE intervalo_actual < 4 AND proxima_revision <= date('now')`
- `algorithm.ts` — pure functions `updateLevel()` and `nextReviewDate()`, no side effects

### Cornell Notes Auto-Navigation

After a pomodoro ends, the app navigates to Cornell notes automatically (no user prompt). Behavior is driven by two settings:

- `cornell_every_n` — show Cornell every N pomodoros (default: 1)
- `cornell_timing`:
  - `"before"` — Cornell opens immediately, break starts after user saves/skips
  - `"during"` — Cornell opens with a break countdown visible in the corner
  - `"after"` — break runs first, Cornell opens when break ends

A "Skip" button is always available on the Cornell screen.

### Keyboard Guard

`useKeyboard.ts` listens on `document`. Before acting on Space or number keys, checks `event.target.tagName` — suppresses if `INPUT | TEXTAREA | SELECT`. Esc always fires regardless of focus.

---

## Database Schema

```sql
-- src-tauri/migrations/0001_initial.sql

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha_inicio INTEGER NOT NULL,   -- Unix timestamp
  fecha_fin INTEGER,               -- NULL while active
  duracion_minutos INTEGER,        -- set on complete
  tema TEXT                        -- optional session topic/tag
);

CREATE TABLE IF NOT EXISTS distractions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  texto TEXT NOT NULL,
  timestamp INTEGER NOT NULL       -- Unix timestamp
);

CREATE TABLE IF NOT EXISTS cornell_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  notas_principales TEXT DEFAULT '',
  preguntas TEXT DEFAULT '',
  resumen TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS flashcards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  front TEXT NOT NULL,
  back TEXT DEFAULT '',
  tag TEXT DEFAULT '',
  fecha_creacion INTEGER NOT NULL,
  intervalo_actual INTEGER NOT NULL DEFAULT 0,   -- 0..4
  proxima_revision INTEGER,                       -- Unix timestamp, NULL for level 4
  veces_revisada INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flashcard_id INTEGER NOT NULL REFERENCES flashcards(id),
  fecha INTEGER NOT NULL,          -- Unix timestamp
  resultado TEXT NOT NULL CHECK(resultado IN ('sabido', 'fallado'))
);
```

---

## Settings Persistence

```typescript
// tauri-plugin-store key: "app-settings"
interface AppSettings {
  pomodoro_duration_min: number      // default 25
  break_duration_min: number         // default 5
  cornell_every_n: number            // default 1
  cornell_timing: "before" | "during" | "after"  // default "during"
}

// tauri-plugin-store key: "timer-state" (ephemeral — crash recovery)
interface TimerState {
  session_id: number | null
  started_at: number | null          // Unix timestamp
  elapsed_seconds: number
  is_paused: boolean
  topic: string
  pomodoro_count_today: number
}
```

---

## Implementation Phases

Implementation follows a strict dependency order — each phase is independently deployable and testable before moving on.

| Phase | Feature | Key Deliverables |
|-------|---------|-----------------|
| 1 | Setup + DB Init | Tauri scaffold, plugin config, `0001_initial.sql` migration, `sql:allow-execute` in capabilities, CRUD smoke tests |
| 2 | Pomodoro Timer | `useTimer` hook, `timerStore`, `TimerBar` (persistent top bar), `TimerRing`, start/pause/cancel/complete flow, crash recovery |
| 3 | Distraction Capture | Floating button during session, quick-input modal, save to `distractions` table, dismiss on Esc |
| 4 | Cornell Notes | Auto-navigate after pomodoro (respecting `cornell_every_n` and `cornell_timing`), 3-zone layout (`NoteZone`), save to `cornell_notes`, "Create flashcards from questions" shortcut, Skip button |
| 5 | Flashcard System | Create/edit/delete cards, `algorithm.ts` (`updateLevel`, `nextReviewDate`), library view with search + tag filter + level-4 toggle |
| 6 | Review Mode | Keyboard-driven (Space / 1 / 2), one card at a time, result recording to `reviews`, completion screen with session summary |
| 7 | Home Dashboard | Stats (pomodoros today, cards created/reviewed, distractions logged), "X cards to review" section, recent sessions list, empty states |

---

## Design System

### Tokens

```css
@theme {
  --color-bg: #0a0e1a;
  --color-text-primary: #f0ece4;
  --color-text-secondary: #c9c3b8;
  --color-accent: #c97862;
}
```

### Typography

- Font: Outfit (WOFF2, self-hosted at `src/assets/fonts/`)
- No system font fallback needed — Tauri bundles the font with the binary

### Principles

- No gradients, no heavy shadows, no decorative animations
- Generous whitespace — calm, focused aesthetic
- Transitions: route changes 150ms fade, modal open/close 100ms, nothing else
- Every view has a friendly empty state — no blank screens, no raw errors
- Level-4 flashcards show "Internalizada" badge; hidden by default in library (toggle to reveal)

---

## Project Structure

```
src/
  views/
    Home.tsx
    CornellNotes.tsx
    FlashcardReview.tsx
    FlashcardLibrary.tsx
    FlashcardEdit.tsx
  components/
    ui/           # Button, Input, Badge, Modal, EmptyState, ConfirmDialog, Toggle
    timer/        # TimerBar, TimerRing, TimerControls
    flashcard/    # FlashcardFace, ReviewResultButtons
    notes/        # CornellLayout, NoteZone
    settings/     # PomodoroSettings (modal)
  stores/
    timerStore.ts
    reviewStore.ts
    uiStore.ts
  hooks/
    useTimer.ts
    useKeyboard.ts
    useReview.ts
  lib/
    db/
      index.ts          # initDB(), runMigrations()
      sessions.ts
      flashcards.ts
      reviews.ts
      notes.ts
      distractions.ts
    sr/
      algorithm.ts      # updateLevel(), nextReviewDate() — pure functions
    utils/
      date.ts
      format.ts
  types/
    index.ts
  router.tsx            # createHashRouter — 7 routes
  App.tsx               # shell: TimerBar + <Outlet> + global keyboard listener

src-tauri/
  capabilities/
    default.json        # sql:default + sql:allow-execute + store plugin
  migrations/
    0001_initial.sql
```

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `sql:allow-execute` missing from capabilities → silent write failures on all INSERT/UPDATE/DELETE | High (easy to miss) | Add explicitly in Phase 1; smoke-test INSERT before any feature work |
| `createBrowserRouter` used by mistake → broken production navigation | Medium | Set `createHashRouter` in scaffold; document in router.tsx comment |
| Timer in React Context → 1s re-render storm across all subscribers | Medium | Zustand selectors from the start; never use Context for timer state |
| Tailwind v4 `@theme` variable names wrong → silent color failures | Medium | Test all design tokens render in Phase 1 before building components |
| `npm run dev` (Vite-only) used for DB testing → crashes | High (muscle memory) | Add a `dev` script alias that warns; document in README |
| Keyboard shortcuts fire while user is typing | High | `useKeyboard.ts` checks `event.target.tagName` before acting on Space/1/2 |
| Level-4 cards appear in review queue → invalid reviews | Low | SQL query explicitly filters `intervalo_actual < 4`; enforced in `reviewStore` |
| Outfit font served from CDN → broken offline | Low | Self-host WOFF2 from scaffold; verified at Phase 1 |
| Cornell layout breaks on small windows | Low | Set `minHeight` and `minWidth` in `tauri.conf.json` at scaffold time |

---

## Capabilities

### New Capabilities

- `pomodoro-timer`: Full timer workflow — start, pause, resume, cancel, complete, crash recovery
- `distraction-capture`: Quick-capture modal during active sessions, stored per-session
- `cornell-notes`: Auto-navigated post-pomodoro 3-zone notes with configurable timing
- `flashcard-management`: CRUD for flashcards with tags and spaced repetition metadata
- `flashcard-review`: Keyboard-driven review mode with SR algorithm and result recording
- `flashcard-library`: Searchable/filterable card library with level-4 toggle
- `home-dashboard`: Daily stats, due cards count, recent sessions list

### Modified Capabilities

None — this is a greenfield project.

---

## Rollback Plan

This is a greenfield personal project with no production users. Rollback is:

1. `git revert` or branch deletion for any phase
2. Drop and recreate the SQLite DB (no migrations to undo — `0001_initial.sql` is additive)
3. Clear `tauri-plugin-store` via DevTools or by deleting `~/Library/Application Support/{bundle-id}/`

No user data migration is needed until the app ships.

---

## Success Criteria

- [ ] All 5 database tables created and readable on first launch
- [ ] Timer starts, pauses, resumes, and completes — elapsed time persists across app restarts
- [ ] Distraction modal opens via floating button and saves to DB without blocking the timer
- [ ] Cornell notes auto-navigate after pomodoro with all three timing modes working correctly
- [ ] Flashcard create/edit/delete round-trips through the DB correctly
- [ ] Due-cards query returns correct results based on `proxima_revision` and `intervalo_actual`
- [ ] Review mode advances one card at a time and records results correctly
- [ ] Level-4 cards never appear in the review queue
- [ ] Keyboard shortcuts (Space, Esc, 1, 2) work globally and are suppressed inside inputs
- [ ] Home dashboard stats reflect real data from the DB
- [ ] App launches offline with all fonts and styles intact
