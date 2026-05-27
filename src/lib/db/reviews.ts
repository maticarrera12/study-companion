import { initDB } from "./index"

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
  const midnight = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000)
  const result = await db.select<[{ count: number }]>(
    "SELECT COUNT(DISTINCT flashcard_id) as count FROM reviews WHERE fecha >= ?",
    [midnight],
  )
  return result[0]?.count ?? 0
}
