import { initDB } from "./index"
import type { Session, SessionWithNotes } from "../../types"
import { todayStartUnix } from "../utils/date"

const now = () => Math.floor(Date.now() / 1000)

export async function createSession(tema: string | null): Promise<number> {
  const db = await initDB()
  const result = await db.execute(
    "INSERT INTO sessions (fecha_inicio, tema) VALUES (?, ?)",
    [now(), tema],
  )
  if (result.lastInsertId === undefined) {
    throw new Error("createSession: lastInsertId is undefined")
  }
  return result.lastInsertId
}

export async function completeSession(
  id: number,
  fecha_fin: number,
  duracion_minutos: number,
): Promise<void> {
  const db = await initDB()
  await db.execute(
    "UPDATE sessions SET fecha_fin = ?, duracion_minutos = ? WHERE id = ?",
    [fecha_fin, duracion_minutos, id],
  )
}

export async function abandonSession(id: number): Promise<void> {
  const db = await initDB()
  await db.execute(
    "UPDATE sessions SET fecha_fin = ?, duracion_minutos = 0 WHERE id = ?",
    [now(), id],
  )
}

export async function getTodaySessions(): Promise<Session[]> {
  const db = await initDB()
  const startOfDay = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000)
  return db.select<Session[]>(
    "SELECT * FROM sessions WHERE fecha_inicio >= ? AND fecha_fin IS NOT NULL ORDER BY fecha_inicio DESC",
    [startOfDay],
  )
}

export async function getRecentSessions(limit: number): Promise<Session[]> {
  const db = await initDB()
  return db.select<Session[]>(
    "SELECT * FROM sessions WHERE fecha_fin IS NOT NULL ORDER BY fecha_inicio DESC LIMIT ?",
    [limit],
  )
}

export async function getAllSessions(): Promise<Session[]> {
  const db = await initDB()
  return db.select<Session[]>(
    "SELECT * FROM sessions WHERE fecha_fin IS NOT NULL ORDER BY fecha_inicio DESC",
  )
}

export async function updateSessionTema(id: number, tema: string): Promise<void> {
  const db = await initDB()
  await db.execute("UPDATE sessions SET tema = ? WHERE id = ?", [tema, id])
}

export async function getTodaySessionCount(): Promise<number> {
  const db = await initDB()
  const result = await db.select<[{ count: number }]>(
    "SELECT COUNT(*) as count FROM sessions WHERE fecha_inicio >= ? AND fecha_fin IS NOT NULL",
    [todayStartUnix()],
  )
  return result[0]?.count ?? 0
}

// NOTE: SQLite's LOWER() only folds ASCII characters. Non-ASCII accented letters
// (e.g. É vs é) may not match case-insensitively. Acceptable for current use.
export async function searchSessions(
  query: string,
  page: number,
  pageSize: number = 25,
): Promise<SessionWithNotes[]> {
  const db = await initDB()
  const pat = query.trim() === "" ? "%" : `%${query.trim().toLowerCase()}%`
  const offset = (page - 1) * pageSize

  return db.select<SessionWithNotes[]>(
    `SELECT s.*, (cn.id IS NOT NULL) AS has_notes
     FROM sessions s
     LEFT JOIN cornell_notes cn ON cn.session_id = s.id
     WHERE s.fecha_fin IS NOT NULL
       AND (
         LOWER(COALESCE(s.tema, '')) LIKE ? OR
         LOWER(COALESCE(cn.notas_principales, '')) LIKE ? OR
         LOWER(COALESCE(cn.preguntas, '')) LIKE ? OR
         LOWER(COALESCE(cn.resumen, '')) LIKE ?
       )
     ORDER BY s.fecha_inicio DESC
     LIMIT ? OFFSET ?`,
    [pat, pat, pat, pat, pageSize, offset],
  )
}

export async function countSessions(query: string): Promise<number> {
  const db = await initDB()
  const pat = query.trim() === "" ? "%" : `%${query.trim().toLowerCase()}%`

  const result = await db.select<[{ count: number }]>(
    `SELECT COUNT(DISTINCT s.id) as count
     FROM sessions s
     LEFT JOIN cornell_notes cn ON cn.session_id = s.id
     WHERE s.fecha_fin IS NOT NULL
       AND (
         LOWER(COALESCE(s.tema, '')) LIKE ? OR
         LOWER(COALESCE(cn.notas_principales, '')) LIKE ? OR
         LOWER(COALESCE(cn.preguntas, '')) LIKE ? OR
         LOWER(COALESCE(cn.resumen, '')) LIKE ?
       )`,
    [pat, pat, pat, pat],
  )
  return result[0]?.count ?? 0
}
