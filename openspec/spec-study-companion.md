# Specification: study-companion

## Overview

This specification covers all 7 implementation phases of study-companion — a macOS offline app integrating Pomodoro timer, distraction capture, Cornell notes, and spaced-repetition flashcards. All requirements apply to the greenfield implementation. There are no MODIFIED or REMOVED sections; every requirement is ADDED.

---

## FR: Functional Requirements

### Phase 1 — Setup + DB Init

**FR-001** The application MUST be scaffolded as a Tauri 2 project using Vite, React, and TypeScript.

**FR-002** `tauri-plugin-sql` MUST be registered with migration support; migrations MUST run automatically on app launch before any UI renders.

**FR-003** `tauri-plugin-store` MUST be registered and available from app init.

**FR-004** The Tauri capability file MUST explicitly include `sql:allow-execute` so INSERT, UPDATE, and DELETE commands succeed.

**FR-005** Migration `0001_initial.sql` MUST create all 5 tables: `sessions`, `distractions`, `cornell_notes`, `flashcards`, `reviews`, with the exact schema defined in the proposal (column names, types, constraints, and foreign keys).

**FR-006** All timestamp columns MUST store Unix epoch integers in **seconds** (not milliseconds).

**FR-007** The Outfit font MUST be self-hosted as WOFF2 in `src/assets/fonts/` and loaded without any external CDN dependency.

**FR-008** Tailwind CSS v4 MUST be configured via `@theme` with at minimum these tokens: `--color-bg: #0a0e1a`, `--color-text-primary: #f0ece4`, `--color-text-secondary: #c9c3b8`, `--color-accent: #c97862`.

**FR-009** The router MUST use `createHashRouter` with 7 routes registered at scaffold time.

**FR-010** The application MUST launch fully offline — correct fonts and design-system colors visible without network access.

---

### Phase 2 — Pomodoro Timer

**FR-011** The timer MUST support configurable focus duration (default 25 min) and break duration (default 5 min), sourced from `app-settings` store.

**FR-012** The timer MUST follow a strict state machine: `idle → running → paused → done`. No other state transitions are permitted.

**FR-013** `TimerBar` MUST be rendered at the top of every route while timer state is `running` or `paused`. It MUST display elapsed time, the session topic, and a pause/resume button.

**FR-014** Starting a timer MAY accept an optional topic/tag string; if omitted, the session's `tema` column MUST be stored as empty string or NULL (not missing).

**FR-015** The user MUST be able to pause, resume, and cancel an active timer. Cancel MUST show a confirmation dialog before terminating the session.

**FR-016** On pomodoro completion, the system MUST INSERT a row into `sessions` with `fecha_fin` and `duracion_minutos` set, then navigate based on Cornell timing config.

**FR-017** On app launch, the system MUST check the `timer-state` store key. If `session_id` is non-null and the session row has `fecha_fin IS NULL`, the system MUST restore state to `paused` and display a banner: "¿Continuás tu sesión de {topic}?".

**FR-018** The home dashboard MUST display the count of pomodoros completed today.

**FR-019** The Space key MUST start or pause the timer from any screen, UNLESS the focused element is an INPUT, TEXTAREA, or SELECT.

---

### Phase 3 — Distraction Capture

**FR-020** A floating capture button MUST be visible in the bottom-right corner ONLY when timer state is `running` or `paused`.

**FR-021** Clicking the floating button MUST open a quick-input modal. Pressing Esc MUST close it without saving.

**FR-022** The modal MUST contain a text input (max 200 characters) and a "Guardar" button.

**FR-023** On save, the system MUST INSERT a row into `distractions` with the current `session_id` (from `timerStore`) and the current Unix timestamp in seconds.

**FR-024** The modal MUST auto-close immediately after a successful save.

**FR-025** Distractions captured during a session MUST be shown in the post-session summary screen.

---

### Phase 4 — Cornell Notes

**FR-026** After a pomodoro completes, the system MUST automatically navigate to the Cornell notes view without prompting the user.

**FR-027** Cornell notes MUST only be shown every N pomodoros, where N is the `cornell_every_n` setting (default 1). The pomodoro count used for this calculation MUST reset at midnight (local time). If `cornell_every_n = 2`, notes appear after pomodoros 2, 4, 6, etc.

**FR-028** Cornell timing MUST follow the `cornell_timing` setting:
- `"before"`: Cornell opens immediately when pomodoro ends; break timer starts only after the user saves or skips.
- `"during"`: Cornell opens with a break countdown timer visible in a corner; both run simultaneously.
- `"after"`: Full-screen break runs first; Cornell opens automatically when the break ends.

**FR-029** The Cornell layout MUST present 3 zones as scrollable/resizable text areas:
- Main notes (`notas_principales`): approximately 65% width, labelled "Notas y conceptos"
- Cue questions (`preguntas`): approximately 25% width, labelled "Preguntas para repasar"
- Summary footer (`resumen`): approximately 10% height, labelled "Resumen en una frase"

**FR-030** Clicking "Guardar notas" MUST INSERT a row into `cornell_notes` linked to the completed `session_id`. Empty text areas are valid — an all-empty save MUST succeed.

**FR-031** Clicking "Crear flashcards de preguntas" MUST split the `preguntas` field by newline, create one flashcard per non-empty line with `front = line`, `back = ''`, and `tag = session.tema`.

**FR-032** Clicking "Omitir" MUST skip Cornell notes and navigate to the break screen or home, depending on `cornell_timing`.

---

### Phase 5 — Flashcard System

**FR-033** The user MUST be able to create a flashcard with: `front` (required), `back` (optional), `tag` (optional).

**FR-034** On creation, new flashcards MUST have: `intervalo_actual = 0`, `fecha_creacion = now (Unix seconds)`, `proxima_revision = now + 2 days (Unix seconds)`, `veces_revisada = 0`.

**FR-035** The user MUST be able to edit a flashcard's `front`, `back`, and `tag` fields.

**FR-036** The user MUST be able to delete a flashcard. Deletion MUST show a confirmation dialog and MUST cascade-delete associated `reviews` rows.

**FR-037** The spaced-repetition algorithm MUST be implemented as pure functions in `lib/sr/algorithm.ts`:
- `updateLevel(current: 0-4, result: "sabido" | "fallado"): number`
  - `"sabido"` → `min(current + 1, 4)`
  - `"fallado"` → `max(current - 1, 0)`
- `nextReviewDate(level: number): number | null`
  - 0 → now + 2 days, 1 → now + 3 days, 2 → now + 5 days, 3 → now + 7 days, 4 → `null` (internalized)

**FR-038** The flashcard library view MUST show all cards EXCEPT level-4 by default.

**FR-039** A "Mostrar internalizadas" toggle MUST reveal level-4 cards with an "Internalizada" badge when enabled.

**FR-040** The library MUST support case-insensitive search across `front` and `back` text (SQL `LIKE`).

**FR-041** The library MUST support filtering by `tag` via a dropdown and by state ("Activa" for levels 0-3, "Internalizada" for level 4).

**FR-042** Clicking a flashcard in the library MUST navigate to the `FlashcardEdit` view.

---

### Phase 6 — Review Mode

**FR-043** Review mode MUST be entered from the Home dashboard via a "X cards para revisar" button.

**FR-044** On entering review mode, the system MUST load all flashcards WHERE `intervalo_actual < 4 AND proxima_revision <= now (Unix seconds)`.

**FR-045** If no cards are due, the system MUST display a friendly empty state message ("No hay cards para revisar hoy") instead of entering the review loop.

**FR-046** Review MUST present one card at a time showing only the `front`. The back MUST be hidden until the user taps/clicks the card or presses Space.

**FR-047** After the back is revealed, "Lo sabía" and "Fallé" buttons MUST appear. The 1 and 2 keyboard keys MUST trigger these respectively, but ONLY when the back is revealed and the card is not animating.

**FR-048** On recording a result, the system MUST:
1. INSERT a row into `reviews` (`flashcard_id`, `fecha = now`, `resultado`)
2. UPDATE the flashcard: `intervalo_actual = updateLevel(...)`, `veces_revisada += 1`, `proxima_revision = nextReviewDate(newLevel)`
3. Advance to the next card.

**FR-049** On completing all due cards, the system MUST display a summary screen showing: total cards reviewed, count of "sabido", count of "fallado".

---

### Phase 7 — Home Dashboard

**FR-050** The Home view MUST display a Pomodoro timer widget at the top. If idle: show start button and configured duration. If active (running or paused): redirect to the full timer view on click.

**FR-051** The Home view MUST display today's stats using UTC midnight as the day boundary:
- Pomodoros completados: `COUNT sessions WHERE fecha_fin >= today_start_unix`
- Cards creadas: `COUNT flashcards WHERE fecha_creacion >= today_start_unix`
- Cards revisadas: `COUNT DISTINCT flashcard_id FROM reviews WHERE fecha >= today_start_unix`
- Distracciones capturadas: `COUNT distractions WHERE timestamp >= today_start_unix`

**FR-052** The "Hoy para revisar" section MUST show the count of cards WHERE `intervalo_actual < 4 AND proxima_revision <= now`. If count > 0: display count and a "Revisar ahora" button. If count = 0: display "Todo al día ✓".

**FR-053** The dashboard MUST list the last 5 completed sessions (`fecha_fin IS NOT NULL`), showing date, `duracion_minutos`, and `tema`.

**FR-054** Every section MUST have a friendly empty state — no blank screens, no raw zeros, no unhandled "no data" states.

---

### Settings

**FR-055** The settings panel MUST be accessible from the Home view via a gear icon.

**FR-056** Settings MUST expose these controls:
- `pomodoro_duration_min`: number input, range 1-120, default 25
- `break_duration_min`: number input, range 1-60, default 5
- `cornell_every_n`: number input, range 1-10, default 1
- `cornell_timing`: radio group — "Antes del descanso" / "Durante el descanso" / "Después del descanso"

**FR-057** Settings MUST persist to `tauri-plugin-store` under key `"app-settings"` after each change.

**FR-058** Setting changes MUST take effect on the next pomodoro, not mid-session.

---

## NFR: Non-Functional Requirements

**NFR-001** Route transitions MUST use a 150ms opacity fade implemented in CSS only — no JavaScript animation libraries.

**NFR-002** Modal open and close MUST animate at 100ms.

**NFR-003** The timer tick interval MUST not trigger re-renders outside `timerStore` subscribers. Zustand selectors MUST be used — no React Context for timer state.

**NFR-004** The application MUST function fully offline. No network requests are permitted at runtime.

**NFR-005** All timestamps stored in SQLite MUST be Unix epoch integers in seconds. Milliseconds MUST NOT be used.

**NFR-006** The `updateLevel` and `nextReviewDate` functions MUST be pure (no side effects, no external state). They MUST be independently unit-testable.

**NFR-007** The keyboard shortcut handler (`useKeyboard.ts`) MUST suppress Space and number keys when `event.target.tagName` is `INPUT`, `TEXTAREA`, or `SELECT`. Esc MUST fire regardless of focus.

**NFR-008** A confirmation dialog MUST appear before: canceling an active pomodoro, deleting a flashcard.

**NFR-009** The app MUST launch and be interactive within a reasonable time on macOS — no blocking splash screens or loading states beyond DB initialization.

**NFR-010** The SQLite `reviews` table MUST cascade-delete when the parent `flashcard` is deleted (enforced via schema or application-level delete order).

**NFR-011** Level-4 flashcards MUST NEVER appear in the review queue. The due-cards SQL query MUST filter `intervalo_actual < 4`.

**NFR-012** The `timer-state` store MUST be written on every timer tick so crash recovery loses at most 1 second of elapsed time.

**NFR-013** All user-visible text MUST be in Spanish (Rioplatense register where natural). No English strings in the UI layer.

**NFR-014** The Outfit WOFF2 font MUST be bundled in the binary — verified by running the app in airplane mode.

---

## Scenarios

### Phase 1 — Setup + DB Init

#### Scenario: App launches offline with correct design tokens

- GIVEN the app binary is built with self-hosted Outfit WOFF2 and Tailwind `@theme` tokens
- WHEN the user launches the app with no network connection
- THEN the background renders as `#0a0e1a`, primary text as `#f0ece4`, accent as `#c97862`
- AND the Outfit typeface is applied to all text without a flash of unstyled content

#### Scenario: Migration creates all 5 tables on first launch

- GIVEN the SQLite database file does not yet exist
- WHEN the app launches for the first time
- THEN `0001_initial.sql` runs and creates `sessions`, `distractions`, `cornell_notes`, `flashcards`, and `reviews`
- AND a test INSERT into each table succeeds without error

---

### Phase 2 — Pomodoro Timer

#### Scenario: Timer completes and creates a session row

- GIVEN the timer is running with topic "JavaScript Closures" and duration 25 min
- WHEN the 25 minutes elapse
- THEN a row is inserted into `sessions` with `fecha_fin` set and `duracion_minutos = 25`
- AND the system navigates to Cornell notes or break per the `cornell_timing` setting

#### Scenario: Crash recovery restores paused session

- GIVEN a timer was running with topic "Promises" and the app was force-quit mid-session
- WHEN the user relaunches the app
- THEN the timer restores to `paused` state with the elapsed time preserved
- AND a banner reads "¿Continuás tu sesión de Promises?"

#### Scenario: Space key is suppressed inside text input

- GIVEN the Cornell notes view is open and the user's cursor is inside the `notas_principales` textarea
- WHEN the user presses Space
- THEN the space character is inserted into the textarea
- AND the timer state does NOT change

#### Scenario: Cancel timer requires confirmation

- GIVEN the timer is in `running` state
- WHEN the user clicks the cancel button
- THEN a confirmation dialog appears asking to confirm cancellation
- AND the timer continues running until the user confirms

---

### Phase 3 — Distraction Capture

#### Scenario: Distraction is saved and modal closes

- GIVEN the timer is running and the floating capture button is visible
- WHEN the user clicks the button, types "Revisé Twitter", and clicks "Guardar"
- THEN a row is inserted into `distractions` with `session_id = current session id` and the correct Unix timestamp
- AND the modal closes automatically

#### Scenario: Esc closes modal without saving

- GIVEN the distraction modal is open with text "algo escrito"
- WHEN the user presses Esc
- THEN the modal closes
- AND no row is inserted into `distractions`

#### Scenario: Floating button hidden when timer is idle

- GIVEN the timer state is `idle`
- WHEN the Home view is rendered
- THEN the floating distraction capture button is NOT visible

---

### Phase 4 — Cornell Notes

#### Scenario: Cornell every_n skips on odd pomodoros

- GIVEN `cornell_every_n = 2` and the user has completed 1 pomodoro today
- WHEN the second pomodoro completes
- THEN the Cornell notes view appears automatically

- GIVEN the same setting and 2 pomodoros completed
- WHEN the third pomodoro completes
- THEN Cornell notes is NOT shown; the app navigates to break or home instead

#### Scenario: "during" timing runs Cornell and break simultaneously

- GIVEN `cornell_timing = "during"` and a pomodoro completes
- WHEN the Cornell notes view opens
- THEN a break countdown timer is visible in the corner
- AND the user can fill notes while the break timer runs down

#### Scenario: Saving empty notes is valid

- GIVEN the Cornell notes view is open and all three text areas are empty
- WHEN the user clicks "Guardar notas"
- THEN a row is inserted into `cornell_notes` with empty strings for all three fields
- AND no validation error is shown

#### Scenario: "Crear flashcards de preguntas" creates one card per line

- GIVEN the `preguntas` textarea contains "¿Qué es un closure?\n¿Cómo funciona el event loop?" and session `tema = "JS"`
- WHEN the user clicks "Crear flashcards de preguntas"
- THEN 2 flashcards are created: front="¿Qué es un closure?", tag="JS" and front="¿Cómo funciona el event loop?", tag="JS"
- AND both cards have `back = ''`, `intervalo_actual = 0`, `proxima_revision = now + 2 days`

---

### Phase 5 — Flashcard System

#### Scenario: New flashcard gets correct default SR metadata

- GIVEN the user creates a flashcard with front="¿Qué es una promesa?" and no back
- WHEN the create action is confirmed
- THEN the card is inserted with `intervalo_actual = 0`, `veces_revisada = 0`, `proxima_revision = now + 2 days (Unix seconds)`

#### Scenario: Deleting a flashcard cascades to reviews

- GIVEN a flashcard with id=5 has 3 associated rows in `reviews`
- WHEN the user confirms deletion of flashcard id=5
- THEN the flashcard row is deleted
- AND all 3 associated `reviews` rows are also deleted
- AND no orphaned review rows remain

#### Scenario: Level-4 cards hidden by default in library

- GIVEN the library contains 3 active cards (levels 0-3) and 2 internalized cards (level 4)
- WHEN the library view loads with the default toggle state
- THEN only the 3 active cards are displayed
- AND the "Mostrar internalizadas" toggle is off

#### Scenario: Search filters by front and back text

- GIVEN the library contains cards with fronts "closure", "promise", and "event loop"
- WHEN the user types "clos" in the search input
- THEN only the card with front "closure" is shown (case-insensitive match)

---

### Phase 6 — Review Mode

#### Scenario: Due cards load and review advances correctly

- GIVEN 3 cards are due (`intervalo_actual < 4 AND proxima_revision <= now`)
- WHEN the user enters review mode
- THEN the first card front is shown
- WHEN the user presses Space (or clicks the card)
- THEN the back is revealed and "Lo sabía" / "Fallé" buttons appear
- WHEN the user presses 1 ("Lo sabía")
- THEN a review row is inserted, the card's level increases by 1, and the next card is shown

#### Scenario: No due cards shows empty state

- GIVEN no cards satisfy `intervalo_actual < 4 AND proxima_revision <= now`
- WHEN the user clicks "Revisar ahora" from Home
- THEN the empty state "No hay cards para revisar hoy" is displayed
- AND no review session is started

#### Scenario: 1/2 keys suppressed before back is revealed

- GIVEN a review card is showing only the front
- WHEN the user presses 1 or 2
- THEN nothing happens (no result is recorded, no navigation occurs)

#### Scenario: Completing all cards shows summary

- GIVEN 5 cards are due and the user reviews all of them (3 sabido, 2 fallado)
- WHEN the last card result is recorded
- THEN the summary screen shows: "5 cards revisadas", "3 sabidas", "2 falladas"

---

### Phase 7 — Home Dashboard

#### Scenario: Today stats reflect real DB counts

- GIVEN today (UTC) there are 2 completed sessions, 4 new flashcards, 6 distinct reviewed flashcards, and 3 distractions
- WHEN the Home view renders
- THEN the stats widget shows: "2 pomodoros", "4 cards creadas", "6 cards revisadas", "3 distracciones"

#### Scenario: "Hoy para revisar" section shows correct count and CTA

- GIVEN 7 flashcards have `intervalo_actual < 4 AND proxima_revision <= now`
- WHEN the Home view renders
- THEN the section shows "7 cards para revisar" and a "Revisar ahora" button

#### Scenario: Empty recent sessions shows friendly message

- GIVEN no sessions exist in the DB
- WHEN the Home view renders
- THEN the recent sessions section shows a friendly empty-state message
- AND no blank space or raw "null" text is rendered

---

### Settings

#### Scenario: Settings persist across app restarts

- GIVEN the user sets `pomodoro_duration_min = 45` and closes the settings panel
- WHEN the app is relaunched
- THEN the settings panel still shows `pomodoro_duration_min = 45`
- AND the timer widget on Home shows "45 min"

#### Scenario: Mid-session settings change does not affect running timer

- GIVEN a 25-minute timer is running
- WHEN the user opens settings and changes `pomodoro_duration_min` to 50
- THEN the running timer continues to completion at 25 minutes
- AND only the next timer start uses the new 50-minute duration
