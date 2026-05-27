import { getDB } from "./index"
import { nextReviewDate } from "../sr/algorithm"

export async function createFlashcard(data: {
  front: string
  back: string
  tag: string
}): Promise<number> {
  const db = getDB()
  const fecha_creacion = Math.floor(Date.now() / 1000)
  const proxima_revision = nextReviewDate(0)

  const result = await db.execute(
    "INSERT INTO flashcards (front, back, tag, fecha_creacion, intervalo_actual, proxima_revision, veces_revisada) VALUES (?, ?, ?, ?, 0, ?, 0)",
    [data.front, data.back, data.tag, fecha_creacion, proxima_revision],
  )

  if (result.lastInsertId === undefined) {
    throw new Error("createFlashcard: lastInsertId is undefined")
  }
  return result.lastInsertId
}
