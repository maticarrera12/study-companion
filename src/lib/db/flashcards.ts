import { initDB } from "./index"
import { nextReviewDate } from "../sr/algorithm"
import type { Flashcard } from "../../types"
import { todayStartUnix } from "../utils/date"

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

export async function updateFlashcardProgress(
  id: number,
  data: {
    intervalo_actual: number
    proxima_revision: number | null
    veces_revisada: number
  },
): Promise<void> {
  const db = await initDB()
  await db.execute(
    "UPDATE flashcards SET intervalo_actual = ?, proxima_revision = ?, veces_revisada = ? WHERE id = ?",
    [data.intervalo_actual, data.proxima_revision, data.veces_revisada, id],
  )
}

export async function getDueCards(): Promise<Flashcard[]> {
  const db = await initDB()
  const now = Math.floor(Date.now() / 1000)
  return db.select<Flashcard[]>(
    "SELECT * FROM flashcards WHERE intervalo_actual < 4 AND proxima_revision <= ? ORDER BY proxima_revision ASC",
    [now],
  )
}

export async function getTodayCreatedCount(): Promise<number> {
  const db = await initDB()
  const result = await db.select<[{ count: number }]>(
    "SELECT COUNT(*) as count FROM flashcards WHERE fecha_creacion >= ?",
    [todayStartUnix()],
  )
  return result[0]?.count ?? 0
}

// NOTE: SQLite's LOWER() only folds ASCII characters. Non-ASCII accented letters
// (e.g. É vs é) may not match case-insensitively. Acceptable for current use.
export async function searchCards(
  query: string,
  tag: string,
  showInternalized: boolean,
  page: number,
  pageSize: number = 20,
): Promise<Flashcard[]> {
  const db = await initDB()
  const pat = query.trim() === "" ? "%" : `%${query.trim().toLowerCase()}%`
  const tagPat = tag.trim() === "" ? "%" : `%${tag.trim().toLowerCase()}%`
  const offset = (page - 1) * pageSize

  return db.select<Flashcard[]>(
    `SELECT * FROM flashcards
     WHERE (LOWER(front) LIKE ? OR LOWER(back) LIKE ? OR LOWER(tag) LIKE ?)
       AND (? = 1 OR intervalo_actual != 4)
       AND LOWER(tag) LIKE ?
     ORDER BY proxima_revision ASC
     LIMIT ? OFFSET ?`,
    [pat, pat, pat, showInternalized ? 1 : 0, tagPat, pageSize, offset],
  )
}

export async function countCards(
  query: string,
  tag: string,
  showInternalized: boolean,
): Promise<number> {
  const db = await initDB()
  const pat = query.trim() === "" ? "%" : `%${query.trim().toLowerCase()}%`
  const tagPat = tag.trim() === "" ? "%" : `%${tag.trim().toLowerCase()}%`

  const result = await db.select<[{ count: number }]>(
    `SELECT COUNT(*) as count FROM flashcards
     WHERE (LOWER(front) LIKE ? OR LOWER(back) LIKE ? OR LOWER(tag) LIKE ?)
       AND (? = 1 OR intervalo_actual != 4)
       AND LOWER(tag) LIKE ?`,
    [pat, pat, pat, showInternalized ? 1 : 0, tagPat],
  )
  return result[0]?.count ?? 0
}
