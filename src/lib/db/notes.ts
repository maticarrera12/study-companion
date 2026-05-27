import { getDB } from "./index"
import type { CornellNote } from "../../types"

export async function saveNote(
  session_id: number,
  data: { notas_principales: string; preguntas: string; resumen: string },
): Promise<void> {
  const db = getDB()
  await db.execute(
    "INSERT OR REPLACE INTO cornell_notes (session_id, notas_principales, preguntas, resumen) VALUES (?, ?, ?, ?)",
    [session_id, data.notas_principales, data.preguntas, data.resumen],
  )
}

export async function getNoteBySessionId(session_id: number): Promise<CornellNote | null> {
  const db = getDB()
  const rows = await db.select<CornellNote[]>(
    "SELECT * FROM cornell_notes WHERE session_id = ? LIMIT 1",
    [session_id],
  )
  return rows.length > 0 ? rows[0] : null
}
