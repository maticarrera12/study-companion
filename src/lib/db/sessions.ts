import { getDB } from "./index"
import type { Session } from "../../types"

const now = () => Math.floor(Date.now() / 1000)

export async function createSession(tema: string | null): Promise<number> {
  const db = getDB()
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
  const db = getDB()
  await db.execute(
    "UPDATE sessions SET fecha_fin = ?, duracion_minutos = ? WHERE id = ?",
    [fecha_fin, duracion_minutos, id],
  )
}

export async function abandonSession(id: number): Promise<void> {
  const db = getDB()
  await db.execute(
    "UPDATE sessions SET fecha_fin = ?, duracion_minutos = 0 WHERE id = ?",
    [now(), id],
  )
}

export async function getTodaySessions(): Promise<Session[]> {
  const db = getDB()
  const startOfDay = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000)
  return db.select<Session[]>(
    "SELECT * FROM sessions WHERE fecha_inicio >= ? AND fecha_fin IS NOT NULL ORDER BY fecha_inicio DESC",
    [startOfDay],
  )
}

export async function getRecentSessions(limit: number): Promise<Session[]> {
  const db = getDB()
  return db.select<Session[]>(
    "SELECT * FROM sessions WHERE fecha_fin IS NOT NULL ORDER BY fecha_inicio DESC LIMIT ?",
    [limit],
  )
}
