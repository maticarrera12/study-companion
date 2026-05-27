import { initDB } from "./index"
import { todayStartUnix } from "../utils/date"

export async function recordReview(
  flashcard_id: number,
  resultado: "sabido" | "fallado",
): Promise<void> {
  const db = await initDB()
  const fecha = Math.floor(Date.now() / 1000)
  await db.execute(
    "INSERT INTO reviews (flashcard_id, fecha, resultado) VALUES (?, ?, ?)",
    [flashcard_id, fecha, resultado],
  )
}

export async function getTodayReviewCount(): Promise<number> {
  const db = await initDB()
  const result = await db.select<[{ count: number }]>(
    "SELECT COUNT(DISTINCT flashcard_id) as count FROM reviews WHERE fecha >= ?",
    [todayStartUnix()],
  )
  return result[0]?.count ?? 0
}
