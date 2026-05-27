# Exploration: study-companion

## Stack Validation

### Tauri 2 + tauri-plugin-sql — VALIDATED (with critical gotchas)

- SQLite file lands automatically at `~/Library/Application Support/{bundle-id}/{db-name}.db`
- **CRITICAL**: `sql:default` only grants `allow-load`, `allow-select`, `allow-close`. `sql:allow-execute` (INSERT/UPDATE/DELETE) is NOT included — must be added explicitly to `src-tauri/capabilities/default.json`. Missing this causes silent write failures.
- Bare `npm run dev` (Vite only) crashes on any DB call. Always use `npm run tauri dev` for DB-related work.
- Migrations run in one atomic transaction — one failure rolls back all.

### Tailwind CSS v4 — VALIDATED (greenfield = clean)

- No `tailwind.config.js` — config is CSS-first via `@theme {}` in main CSS file
- Replace `@tailwind base/components/utilities` with `@import "tailwindcss"`
- Use `@tailwindcss/vite` Vite plugin — no PostCSS config needed
- Custom tokens: `@theme { --color-bg: #0a0e1a; --color-accent: #c97862; }`
- **Gotcha**: wrong variable names in `@theme` fail silently — test design tokens early.

### React Router — Hash Router required

- `createBrowserRouter` breaks in Tauri production builds (no real HTTP server, `tauri://localhost` protocol)
- `createHashRouter` is the standard approach — must be set from the start

---

## Architecture Decisions

### 1. State Management → Zustand ✅

Timer updates every second. React Context re-renders all subscribers on every tick. Zustand selectors prevent re-renders on unrelated state changes.

Three stores:
- `timerStore` — `{ activeSessionId, elapsed, isPaused, topic, state }`
- `reviewStore` — `{ pendingCards, currentCardIndex, sessionResults }`
- `uiStore` — `{ activeModal, confirmDialogState }`

### 2. Timer Persistence → `tauri-plugin-store` ✅

Ephemeral operational state (`sessionStart`, `elapsed`, `topic`, `isPaused`) lives separately from domain data. On app init: if `sessionStart !== null` and `elapsed < duration`, restore to paused and show "Resume your session?" prompt. Sessions table still written on complete/abandon.

### 3. Spaced Repetition — Simple interval table (no SM-2)

```typescript
const INTERVALS_DAYS = [1, 4, 14, 30, Infinity]

function updateLevel(current: number, result: "sabido" | "fallado"): number {
  if (result === "sabido") return Math.min(current + 1, 4)
  return Math.max(current - 1, 0)
}
```

Due cards query: `WHERE intervalo_actual < 4 AND proxima_revision <= date('now')`

### 4. Font → Self-host Outfit

Offline app — no CDN. Download WOFF2 and serve from `src/assets/fonts/`.

---

## Project Structure

```
src/
  views/
    Home.tsx
    Timer.tsx
    CornellNotes.tsx
    FlashcardReview.tsx
    FlashcardLibrary.tsx
    FlashcardEdit.tsx
  components/
    ui/           # Button, Input, Badge, Modal, EmptyState, ConfirmDialog
    timer/        # TimerRing, TimerControls, SessionProgress
    flashcard/    # FlashcardFace, ReviewResultButtons
    notes/        # CornellLayout, NoteZone
  stores/
    timerStore.ts
    reviewStore.ts
    uiStore.ts
  hooks/
    useTimer.ts         # tick logic, start/pause/stop
    useKeyboard.ts      # global keyboard handler (Space/Esc/1/2)
    useReview.ts        # card fetch, result recording
  lib/
    db/
      sessions.ts
      flashcards.ts
      reviews.ts
      notes.ts
      distractions.ts
    sr/
      algorithm.ts      # pure functions: updateLevel, nextReviewDate
    utils/
      date.ts
      format.ts
  types/
    index.ts
  router.tsx            # createHashRouter — 7 routes
  App.tsx               # shell: PersistentTimerBar + router outlet + global keyboard

src-tauri/
  src/lib.rs
  capabilities/
    default.json        # sql:default + sql:allow-execute + store plugin
  migrations/
    0001_initial.sql    # all 5 tables
```

---

## Risks

1. `sql:allow-execute` omitted → silent write failures on all INSERT/UPDATE/DELETE
2. `createBrowserRouter` instead of hash router → broken production navigation
3. Timer in React Context → 1-second re-render storm on all subscribers
4. Tailwind v4 `@theme` naming → silent color failures
5. `npm run dev` used for DB testing → crashes (use `tauri dev`)
6. Keyboard shortcuts fire while typing in textarea → check `event.target.tagName`
7. Level-4 cards shown in review → query must exclude `intervalo_actual = 4`
8. Outfit from CDN → broken offline
9. Cornell layout on small windows → set `minHeight` in `tauri.conf.json`

---

## Open Questions for Proposal

1. **Cornell notes**: Auto-navigate after pomodoro ends, or require manual action?
2. **Level-4 cards in library**: "Internalized" badge always visible, or hidden by default with toggle?
3. **Timer persistence**: Confirmed `tauri-plugin-store` (recommended) vs SQLite column?
4. **Font**: Confirmed self-hosting Outfit (no CDN)?
