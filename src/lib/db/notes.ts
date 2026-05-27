import { initDB } from "./index"
import type { CornellNote } from "../../types"

export async function saveNote(
  session_id: number,
  data: { notas_principales: string; preguntas: string; resumen: string },
): Promise<void> {
  const db = await initDB()
  await db.execute(
    "INSERT OR REPLACE INTO cornell_notes (session_id, notas_principales, preguntas, resumen) VALUES (?, ?, ?, ?)",
    [session_id, data.notas_principales, data.preguntas, data.resumen],
  )
}

export async function getNoteBySessionId(session_id: number): Promise<CornellNote | null> {
  const db = await initDB()
  const rows = await db.select<CornellNote[]>(
    "SELECT * FROM cornell_notes WHERE session_id = ? LIMIT 1",
    [session_id],
  )
  return rows.length > 0 ? rows[0] : null
}

export async function getSessionIdsWithNotes(session_ids: number[]): Promise<number[]> {
  if (session_ids.length === 0) return []
  const db = await initDB()
  const placeholders = session_ids.map(() => "?").join(", ")
  const rows = await db.select<{ session_id: number }[]>(
    `SELECT session_id FROM cornell_notes WHERE session_id IN (${placeholders})`,
    session_ids,
  )
  return rows.map((r) => r.session_id)
}
