import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mock @tauri-apps/plugin-sql so tests run outside Tauri
// ---------------------------------------------------------------------------
vi.mock("@tauri-apps/plugin-sql", () => ({
  default: {
    load: vi.fn(),
  },
}))

// Mock the DB index so initDB returns a controllable fake database
const mockSelect = vi.fn()
const mockDb = { select: mockSelect, execute: vi.fn() }

vi.mock("./index", () => ({
  initDB: vi.fn(() => Promise.resolve(mockDb)),
}))

// Import AFTER mocks are established
import { getAllSessions } from "./sessions"
import type { Session } from "../../types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 1,
    fecha_inicio: 1_700_000_000,
    fecha_fin: 1_700_003_600,
    duracion_minutos: 25,
    tema: "Matemáticas",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// getAllSessions
// ---------------------------------------------------------------------------
describe("getAllSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("queries sessions ordered by fecha_inicio DESC without LIMIT", async () => {
    mockSelect.mockResolvedValue([])

    await getAllSessions()

    expect(mockSelect).toHaveBeenCalledOnce()
    const [query] = mockSelect.mock.calls[0] as [string, unknown[]?]
    expect(query).toContain("fecha_fin IS NOT NULL")
    expect(query).toContain("ORDER BY fecha_inicio DESC")
    expect(query).not.toContain("LIMIT")
  })

  it("returns the rows returned by the DB driver", async () => {
    const rows = [
      makeSession({ id: 2, fecha_inicio: 1_700_005_000 }),
      makeSession({ id: 1, fecha_inicio: 1_700_000_000 }),
    ]
    mockSelect.mockResolvedValue(rows)

    const result = await getAllSessions()

    expect(result).toEqual(rows)
  })

  it("returns an empty array when there are no completed sessions", async () => {
    mockSelect.mockResolvedValue([])

    const result = await getAllSessions()

    expect(result).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Filter logic (mirrors SessionHistory useMemo — plain function extraction)
// These tests validate the search algorithm used in the view, decoupled from
// React rendering so they run fast as pure unit tests.
// ---------------------------------------------------------------------------
function filterSessions(sessions: Session[], search: string): Session[] {
  if (!search.trim()) return sessions
  const q = search.trim().toLowerCase()
  return sessions.filter((s) => (s.tema ?? "").toLowerCase().includes(q))
}

describe("SessionHistory filter logic", () => {
  const sessions: Session[] = [
    makeSession({ id: 1, tema: "Matemáticas" }),
    makeSession({ id: 2, tema: "Biología celular" }),
    makeSession({ id: 3, tema: "física" }),
    makeSession({ id: 4, tema: null }),
  ]

  it("returns all sessions when search is empty", () => {
    expect(filterSessions(sessions, "")).toHaveLength(4)
  })

  it("returns all sessions when search is only whitespace", () => {
    expect(filterSessions(sessions, "   ")).toHaveLength(4)
  })

  it("matches partial string (case-sensitive input, lower tema)", () => {
    const result = filterSessions(sessions, "mate")
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it("matches case-insensitively (uppercase query)", () => {
    const result = filterSessions(sessions, "MATE")
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it("matches partial string across multiple results", () => {
    // "iol" appears in "Biología celular" and "fisiología" — use "bio" which hits id:2
    // Use a query that matches both id:1 and id:2
    const result = filterSessions(sessions, "a")
    const ids = result.map((s) => s.id)
    // "Matemáticas", "Biología celular", and "física" all contain "a"
    expect(ids).toContain(1)
    expect(ids).toContain(2)
    expect(ids).toContain(3)
  })

  it("returns empty array when no session matches", () => {
    const result = filterSessions(sessions, "química")
    expect(result).toHaveLength(0)
  })

  it("does not match sessions with null tema when query is non-empty", () => {
    const result = filterSessions(sessions, "algo")
    const ids = result.map((s) => s.id)
    expect(ids).not.toContain(4)
  })

  it("trims leading/trailing whitespace from query", () => {
    const result = filterSessions(sessions, "  mate  ")
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })
})
