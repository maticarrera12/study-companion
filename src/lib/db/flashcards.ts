import { initDB } from "./index"
import { nextReviewDate } from "../sr/algorithm"
import type { Flashcard } from "../../types"

export async function createFlashcard(data: {
  front: string
  back: string
  tag: string
}): Promise<number> {
  const db = await initDB()
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

export async function updateFlashcard(
  id: number,
  data: { front: string; back: string; tag: string },
): Promise<void> {
  const db = await initDB()
  await db.execute("UPDATE flashcards SET front = ?, back = ?, tag = ? WHERE id = ?", [
    data.front,
    data.back,
    data.tag,
    id,
  ])
}

export async function deleteFlashcard(id: number): Promise<void> {
  const db = await initDB()
  await db.execute("DELETE FROM flashcards WHERE id = ?", [id])
}

export async function getCardById(id: number): Promise<Flashcard | null> {
  const db = await initDB()
  const result = await db.select<Flashcard[]>(
    "SELECT * FROM flashcards WHERE id = ? LIMIT 1",
    [id],
  )
  return result[0] ?? null
}

export async function getAllCards(): Promise<Flashcard[]> {
  const db = await initDB()
  return db.select<Flashcard[]>("SELECT * FROM flashcards ORDER BY fecha_creacion DESC")
}

export async function getDueCards(): Promise<Flashcard[]> {
  const db = await initDB()
  const now = Math.floor(Date.now() / 1000)
  return db.select<Flashcard[]>(
    "SELECT * FROM flashcards WHERE intervalo_actual < 4 AND proxima_revision <= ? ORDER BY proxima_revision ASC",
    [now],
  )
}
