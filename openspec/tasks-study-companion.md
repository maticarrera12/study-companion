# Tasks: study-companion

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~3,200–3,800 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Phase 1-2 → Phase 3-4 → Phase 5-6 → Phase 7 |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Scaffold + DB + types + router + shared UI primitives | PR 1 | Foundation; all other units depend on this |
| 2 | Pomodoro timer + distraction capture | PR 2 | Depends on PR 1; timerStore, useTimer, TimerBar, DistractionModal |
| 3 | Cornell notes + flashcard CRUD + SR algorithm | PR 3 | Depends on PR 2; cornell flow, FlashcardEdit, FlashcardLibrary |
| 4 | Review mode + Home dashboard + settings + polish | PR 4 | Depends on PR 3; reviewStore, stats queries, final keyboard wiring |

---

## Phase 1: Project Scaffold + DB Init

- [x] TASK-001: Scaffold Tauri app — run `npm create tauri-app@latest study-companion -- --template react-ts`, then `npm run tauri add sql` and `npm run tauri add store`
- [x] TASK-002: Install front-end deps — `npm install zustand react-router-dom` and `npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/user-event`
- [x] TASK-003: Configure `src-tauri/tauri.conf.json` — set identifier=`com.mcarrera.study-companion`, title, minWidth=800, minHeight=600, width=900, height=700
- [x] TASK-004: Write `src-tauri/capabilities/default.json` — include `sql:default`, `sql:allow-execute`, `sql:allow-select`, `sql:allow-load`, `store:default`, `store:allow-load`, `store:allow-set`, `store:allow-get`, `store:allow-delete`
- [x] TASK-005: Write `src-tauri/src/lib.rs` — register `tauri_plugin_sql` with migration vector pointing to `0001_initial.sql` via `include_str!`, register `tauri_plugin_store`
- [x] TASK-006: Write `src-tauri/migrations/0001_initial.sql` — all 5 tables with `ON DELETE CASCADE` on FK columns (distractions, cornell_notes, reviews), `UNIQUE` on `cornell_notes.session_id`, indexes on `flashcards(proxima_revision, intervalo_actual)`, `reviews(fecha)`, `distractions(session_id)`
- [x] TASK-007: Add Outfit WOFF2 font — Google Fonts @import as dev fallback (TODO comment to self-host WOFF2)
- [x] TASK-008: Configure Tailwind v4 in `src/index.css` — `@import "tailwindcss"`, `@theme` block with `--color-bg: #0a0e1a`, `--color-text-primary: #f0ece4`, `--color-text-secondary: #c9c3b8`, `--color-accent: #c97862`
- [x] TASK-009: Write `src/types/index.ts` — 7 interfaces: `Session`, `Distraction`, `CornellNote`, `Flashcard`, `Review`, `AppSettings`, `PersistedTimerState`
- [x] TASK-010: Write `src/lib/db/index.ts` — `initDB()` singleton using module-level `_db`, `getDB()` throws if called before init
- [x] TASK-011: Write `src/lib/store.ts` — `getStore()`, `getSettings()`, `saveSettings()`, `getTimerState()`, `saveTimerState()`, `clearTimerState()` with `DEFAULT_SETTINGS`
- [x] TASK-012: Write `src/router.tsx` — `createHashRouter` with 7 routes: `/`, `/review`, `/library`, `/library/:id`, `/new-card`, `/cornell`, `/timer`; all pointing to placeholder view components
- [x] TASK-013: Write placeholder view files — `src/views/Home.tsx`, `CornellNotes.tsx`, `FlashcardReview.tsx`, `FlashcardLibrary.tsx`, `FlashcardEdit.tsx`, `Timer.tsx` (each returns a `<div>` with view name)
- [x] TASK-014: Write `src/App.tsx` shell — `useEffect` calling `initDB()`, `<Outlet />`
- [x] TASK-015: Write `src/main.tsx` — wrap with `RouterProvider` using the exported `router`
- [ ] TASK-016: Smoke test Phase 1 — verify DB opens, all 5 tables exist, INSERT + SELECT on `sessions` returns correct row

---

## Phase 2: Pomodoro Timer

- [x] TASK-017: Write `src/stores/uiStore.ts` — `activeModal`, `confirmDialog`, `openModal()`, `closeModal()`, `showConfirm()` per design spec
- [x] TASK-018: Write `src/stores/timerStore.ts` — full shape: `sessionId`, `elapsed`, `duration`, `isPaused`, `topic`, `phase`, `pomodoroCountToday`, `distractionsThisSession` + all action stubs (`start`, `pause`, `resume`, `cancel`, `complete`, `tick`, `restore`, `incrementDistractions`)
- [x] TASK-019: Implement `timerStore.start()` — calls `createSession()`, sets `sessionId`, `duration`, `topic`, `phase: "focus"`; reads `durationMin` from caller (sourced from settings)
- [x] TASK-020: Implement `timerStore.tick()` — if paused or phase !== "focus" return early; if `elapsed + 1 >= duration` call `complete()`, else increment `elapsed`
- [x] TASK-021: Implement `timerStore.complete()` — calls `completeSession()`, increments `pomodoroCountToday`, sets `phase: "done"`, reads `cornell_every_n` + `cornell_timing` from settings and triggers navigation via passed `navigate` callback
- [x] TASK-022: Implement `timerStore.cancel()` — calls `uiStore.showConfirm`, on confirm clears timer state from store and calls `clearTimerState()`
- [x] TASK-023: Write `src/lib/db/sessions.ts` — `createSession()`, `completeSession()`, `getTodaySessions()`, `getRecentSessions(limit)` per design spec
- [x] TASK-024: Write `src/hooks/useTimer.ts` — crash recovery on mount (`getTimerState` → `store.restore`), `setInterval` tick loop, persist on every tick via `saveTimerState`, clear on idle/done phase
- [x] TASK-025: Write `src/components/ui/Button.tsx` — variant prop (`primary` | `ghost`), disabled state, className passthrough
- [x] TASK-026: Write `src/components/ui/Input.tsx` — label, value, onChange, maxLength, placeholder props; forwards ref
- [x] TASK-027: Write `src/components/ui/Modal.tsx` — backdrop blur, 100ms open/close animation (CSS only), Esc closes via `onClose` prop
- [x] TASK-028: Write `src/components/ui/EmptyState.tsx` — centered message + optional CTA Button per design spec
- [x] TASK-029: Write `src/components/ui/ConfirmDialog.tsx` — reads `uiStore.confirmDialog`, renders inside `Modal`, "Confirmar" / "Cancelar" buttons
- [x] TASK-030: Write `src/components/ui/RecoveryBanner.tsx` — reads `timerStore.topic`, shows "¿Continuás tu sesión de {topic}?" with Resume / Discard buttons; visible when `phase === "focus" && isPaused && sessionId != null` (restored state)
- [x] TASK-031: Write `src/components/timer/TimerRing.tsx` — SVG ring, `stroke-dashoffset` progress from `elapsed/total` props, no JS animation
- [x] TASK-032: Write `src/components/timer/TimerBar.tsx` — fixed top bar 48px, elapsed MM:SS, topic (truncated 20 chars), pause/resume icon button; renders null when `phase === "idle"`; click navigates to `/timer`
- [x] TASK-033: Write `src/hooks/useKeyboard.ts` — Space → start/pause timer (guarded by INPUT/TEXTAREA/SELECT check); Esc → close modal or navigate back; 1/2 keys stubbed (implemented in Phase 6)
- [x] TASK-034: Update `src/App.tsx` — register `useKeyboard()`, mount `TimerBar`, mount `ConfirmDialog`, mount `RecoveryBanner`
- [x] TASK-035: Update `src/views/Home.tsx` — timer widget: topic input + start button (idle state); reads `pomodoro_duration_min` from settings via `getSettings()`
- [ ] TASK-036: Smoke test Phase 2 — full pomodoro cycle: start → tick to completion → verify `sessions` row has `fecha_fin` set and `duracion_minutos` correct

---

## Phase 3: Distraction Capture

- [ ] TASK-037: Write `src/lib/db/distractions.ts` — `addDistraction(session_id, texto)`, `getDistractionsForSession(session_id)` per design spec
- [ ] TASK-038: Write `src/components/ui/FloatingButton.tsx` — fixed bottom-right, `z-50`, visible only when `timerStore.phase === "focus" || "paused"`
- [ ] TASK-039: Write `src/components/timer/DistractionModal.tsx` — text `Input` (max 200 chars), "Guardar" `Button`, Esc closes; on save calls `addDistraction(timerStore.sessionId, texto)` then `timerStore.incrementDistractions()` then closes
- [ ] TASK-040: Wire `FloatingButton` + `DistractionModal` into `src/App.tsx` — mount both unconditionally; `FloatingButton` self-hides via phase check; `DistractionModal` opens via `uiStore.openModal("distraction")`
- [ ] TASK-041: Smoke test Phase 3 — add distraction during active session, verify `distractions` row has correct `session_id` and Unix-seconds `timestamp`

---

## Phase 4: Cornell Notes

- [ ] TASK-042: Write `src/lib/db/notes.ts` — `saveNote(session_id, notas_principales, preguntas, resumen)` with `INSERT OR REPLACE ON CONFLICT(session_id)` upsert, `getNoteBySessionId(session_id)` per design spec
- [ ] TASK-043: Write `src/lib/utils/date.ts` — `todayStartLocal(): number` (Unix seconds of local midnight using `new Date().setHours(0,0,0,0)`), `formatMMSS(seconds): string`, `formatDate(unixTs): string`
- [ ] TASK-044: Write `src/components/notes/NoteZone.tsx` — labeled textarea that fills its grid cell; props: `label`, `value`, `onChange`, `placeholder`
- [ ] TASK-045: Write `src/components/notes/CornellLayout.tsx` — CSS Grid `grid-cols-[65%_35%]` + footer row; 3 `NoteZone` slots; accepts `showBreakTimer?: boolean`; when true renders local break countdown in corner (local `useState` + `useEffect` setInterval, initialized from `break_duration_min` setting)
- [ ] TASK-046: Write `src/views/CornellNotes.tsx`:
  - Reads `session_id` from router location state
  - Loads existing note on mount via `getNoteBySessionId`
  - Renders `CornellLayout` with correct `showBreakTimer` prop (true when `cornell_timing === "during"`)
  - "Guardar notas" calls `saveNote` then navigates (home or break per timing)
  - "Crear flashcards de preguntas" splits `preguntas` by newline, calls `createFlashcard` per non-empty line (front=line, back='', tag=session.tema)
  - "Omitir" navigates without saving
- [ ] TASK-047: Update `timerStore.complete()` — after DB write, read `settings.cornell_every_n` and `pomodoroCountToday`, compare `pomodoroCountToday % cornell_every_n === 0` using `todayStartLocal()` for local midnight reset; navigate to `/cornell` (passing session state) or `/` accordingly; handle all 3 `cornell_timing` cases
- [ ] TASK-048: Smoke test Phase 4 — complete pomodoro → auto-navigate to Cornell → save notes → verify `cornell_notes` row linked to correct `session_id`; test "Crear flashcards" creates correct rows

---

## Phase 5: Flashcard System

- [ ] TASK-049: Write `src/lib/sr/algorithm.ts` — pure functions `updateLevel(current, result)` and `nextReviewDate(level)` with 2-3-5-7 day intervals; `level 4 → null`
- [ ] TASK-050: Write `src/lib/db/flashcards.ts` — `createFlashcard`, `updateFlashcard`, `deleteFlashcard`, `getDueCards` (filters `intervalo_actual < 4 AND proxima_revision <= now`), `getAllCards`, `getCardById` per design spec
- [ ] TASK-051: Write unit tests for `src/lib/sr/algorithm.ts` — Vitest: `updateLevel` increments/decrements/clamps; `nextReviewDate` returns correct day offsets for levels 0-4; level 4 returns null
- [ ] TASK-052: Write `src/components/ui/Badge.tsx` — small pill label; variant prop (`default` | `internalizada`)
- [ ] TASK-053: Write `src/components/ui/Toggle.tsx` — controlled boolean toggle with label
- [ ] TASK-054: Write `src/views/FlashcardEdit.tsx`:
  - Create mode when route is `/new-card` (no `:id`); edit mode when `/library/:id`
  - Form fields: front (required), back (optional), tag (optional)
  - Save: calls `createFlashcard` or `updateFlashcard`; navigates back on success
  - Delete button (edit mode only): `uiStore.showConfirm` → calls `deleteFlashcard` → navigates to `/library`
- [ ] TASK-055: Write `src/views/FlashcardLibrary.tsx`:
  - Fetches all cards via `getAllCards()` on mount
  - Hides level-4 cards by default
  - Search input: filters by front OR back (case-insensitive `String.toLowerCase()` client-side or SQL LIKE)
  - Tag dropdown filter
  - "Mostrar internalizadas" `Toggle` → reveals level-4 cards with `Badge` "Internalizada"
  - Card list: click navigates to `/library/:id`
  - `EmptyState` when no cards match
- [ ] TASK-056: Add navigation links — "Nueva card" button → `/new-card`; "Biblioteca" link from Home or nav; "Revisar ahora" stub (wired in Phase 6)
- [ ] TASK-057: Smoke test Phase 5 — create card → verify SR defaults (`intervalo_actual=0`, `proxima_revision=now+2days`); edit card; delete card → verify `reviews` cascade delete; level-4 card hidden in library by default

---

## Phase 6: Review Mode

- [ ] TASK-058: Write `src/stores/reviewStore.ts` — full shape: `cards`, `currentIndex`, `isRevealed`, `results`, `isComplete` + actions `loadCards()`, `reveal()`, `recordResult()`, `reset()` per design spec
- [ ] TASK-059: Write `src/hooks/useReview.ts` — thin selector wrapper over `useReviewStore()`
- [ ] TASK-060: Write `src/lib/db/reviews.ts` — `recordReview(flashcard_id, resultado, newLevel, proxima_revision)` (INSERT review + UPDATE flashcard in sequence), `getTodayReviews()` per design spec
- [ ] TASK-061: Implement `reviewStore.loadCards()` — calls `getDueCards()`, sets `cards`, resets index and results
- [ ] TASK-062: Implement `reviewStore.recordResult()` — calls `updateLevel` + `nextReviewDate`, calls `recordReview()`, advances `currentIndex`, updates `results`, sets `isComplete` when last card done
- [ ] TASK-063: Write `src/components/flashcard/FlashcardFace.tsx` — front always visible (large text), back visible when `isRevealed` (separator line + smaller text); no flip animation
- [ ] TASK-064: Write `src/components/flashcard/ReviewResultButtons.tsx` — "Lo sabía (1)" and "Fallé (2)" buttons; only rendered when `isRevealed`; calls `onSabido`/`onFallado` props
- [ ] TASK-065: Write `src/views/FlashcardReview.tsx`:
  - On mount calls `reviewStore.loadCards()`
  - `EmptyState` if no due cards ("No hay cards para revisar hoy")
  - Renders `FlashcardFace` + (when revealed) `ReviewResultButtons`
  - Progress indicator "Card {n} de {total}"
  - Completion screen: "Revisión completada" + stats (sabidas/falladas counts)
- [ ] TASK-066: Update `src/hooks/useKeyboard.ts` — add Space to reveal card (when `review.cards.length > 0 && !review.isRevealed`); add 1 → `review.recordResult("sabido")` (guard: `isRevealed` must be true); add 2 → `review.recordResult("fallado")` (same guard)
- [ ] TASK-067: Update `src/views/Home.tsx` — add "X cards para revisar" section: count from `getDueCards().length`; if > 0 show count + "Revisar ahora" button navigating to `/review`; if 0 show "Todo al día ✓"
- [ ] TASK-068: Smoke test Phase 6 — full review cycle with 3 due cards: verify review rows inserted, card levels updated, level-4 card never appears in due queue

---

## Phase 7: Home Dashboard + Polish

- [ ] TASK-069: Write `src/lib/utils/format.ts` — `truncate(text, maxLen): string`, `formatDuration(seconds): string` (returns "Xm" or "Xh Ym")
- [ ] TASK-070: Complete `src/lib/db/sessions.ts` — add `getSessionStats(sinceUnix: number)` returning count of completed sessions; verify `getTodaySessions` uses `todayStartLocal()` for local midnight
- [ ] TASK-071: Complete `src/views/Home.tsx` — stats section: pomodoros completados (completed sessions today), cards creadas (`COUNT flashcards WHERE fecha_creacion >= today`), cards revisadas (`COUNT DISTINCT flashcard_id FROM reviews WHERE fecha >= today`), distracciones (`COUNT distractions WHERE timestamp >= today`); all queries use `todayStartLocal()` for day boundary
- [ ] TASK-072: Complete `src/views/Home.tsx` — recent sessions section: last 5 sessions via `getRecentSessions(5)`, each showing date, `duracion_minutos`, `tema`; `EmptyState` when no sessions
- [ ] TASK-073: Write `src/components/settings/PomodoroSettings.tsx` — modal with 4 controls: `pomodoro_duration_min` (number input 1-120), `break_duration_min` (number input 1-60), `cornell_every_n` (number input 1-10), `cornell_timing` (radio group "Antes" / "Durante" / "Después del descanso"); reads from `getSettings()` on open, writes via `saveSettings()` on save
- [ ] TASK-074: Add gear icon to Home.tsx — opens `PomodoroSettings` modal via `uiStore.openModal("settings")`; wire `PomodoroSettings` into `App.tsx` modal layer
- [ ] TASK-075: Final `src/hooks/useKeyboard.ts` polish — verify Esc fires regardless of focus target; verify Space + 1/2 guard correctly checks `event.target.tagName` against `INPUT`, `TEXTAREA`, `SELECT`
- [ ] TASK-076: Empty state audit — verify every view has a `EmptyState`: `FlashcardLibrary` (no cards / no results), `FlashcardReview` (no due cards), Home (no sessions), Home recent sessions (no sessions)
- [ ] TASK-077: Add 150ms CSS opacity fade for route transitions — add `transition-opacity duration-150` to the `<main>` wrapper in `App.tsx` or via a route wrapper component
- [ ] TASK-078: Offline audit — verify Outfit WOFF2 loads without network (font in `src/assets/fonts/`, `@font-face` in CSS, no CDN URL anywhere in codebase)
- [ ] TASK-079: Final smoke test — full end-to-end: start pomodoro → complete → Cornell notes → "Crear flashcards" → review those cards → verify Home stats reflect all activity

---

## Review Workload Forecast
- Estimated phases: 7
- Estimated total changed lines: ~3,200–3,800
- Largest single phase: Phase 2 (~700 lines — timerStore, useTimer, crash recovery, TimerBar, TimerRing, shared UI primitives, Home timer widget)
- 400-line budget risk: High
- Chained PRs recommended: Yes
- Decision needed before apply: Yes (delivery strategy = ask-on-risk — orchestrator will ask before first apply batch)
