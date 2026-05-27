import { initDB } from "./index"
import type { Distraction } from "../../types"

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
