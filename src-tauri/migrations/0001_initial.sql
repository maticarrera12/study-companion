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
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  texto      TEXT NOT NULL,
  timestamp  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cornell_notes (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id         INTEGER NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
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
  flashcard_id INTEGER NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
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
