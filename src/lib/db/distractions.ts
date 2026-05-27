import { initDB } from "./index"
import type { Distraction } from "../../types"
import { todayStartUnix } from "../utils/date"

export async function addDistraction(session_id: number, texto: string): Promise<void> {
  const db = await initDB()
  const timestamp = Math.floor(Date.now() / 1000)
  await db.execute(
    "INSERT INTO distractions (session_id, texto, timestamp) VALUES (?, ?, ?)",
    [session_id, texto, timestamp],
  )
}

export async function getDistractionsForSession(session_id: number): Promise<Distraction[]> {
  const db = await initDB()
  return db.select<Distraction[]>(
    "SELECT * FROM distractions WHERE session_id = ? ORDER BY timestamp ASC",
    [session_id],
  )
}

export async function getTodayDistractionsCount(): Promise<number> {
  const db = await initDB()
  const result = await db.select<[{ count: number }]>(
    `SELECT COUNT(*) as count FROM distractions
     JOIN sessions ON distractions.session_id = sessions.id
     WHERE distractions.timestamp >= ?`,
    [todayStartUnix()],
  )
  return result[0]?.count ?? 0
}
