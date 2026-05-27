import Database from "@tauri-apps/plugin-sql"

let _db: Database | null = null

export async function initDB(): Promise<Database> {
  if (!_db) {
    _db = await Database.load("sqlite:study-companion.db")
  }
  return _db
}

export function getDB(): Database {
  if (!_db) throw new Error("DB not initialized — call initDB() first")
  return _db
}
