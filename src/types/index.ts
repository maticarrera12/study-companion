export interface Session {
  id: number
  fecha_inicio: number
  fecha_fin: number | null
  duracion_minutos: number | null
  tema: string | null
}

export interface SessionWithNotes extends Session {
  has_notes: 0 | 1 // SQLite integer — coerce with !!session.has_notes in views
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
  intervalo_actual: number // 0–4
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
  pomodoro_duration_min: number // default: 25
  break_duration_min: number // default: 5
  cornell_enabled: boolean // default: true
  cornell_every_n: number // default: 1
  cornell_timing: "before" | "during" | "after" // default: "during"
}

export interface PersistedTimerState {
  sessionId: number | null
  startedAt: number | null // Unix seconds
  elapsedSeconds: number
  isPaused: boolean
  topic: string
  pomodoroCountToday: number
}
