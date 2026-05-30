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
import { getAllSessions, searchSessions, countSessions } from "./sessions"
import type { Session, SessionWithNotes } from "../../types"

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

function makeSessionWithNotes(
  overrides: Partial<SessionWithNotes> = {},
): SessionWithNotes {
  return {
    id: 1,
    fecha_inicio: 1_700_000_000,
    fecha_fin: 1_700_003_600,
    duracion_minutos: 25,
    tema: "Matemáticas",
    has_notes: 0,
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
// searchSessions
// ---------------------------------------------------------------------------
describe("searchSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("empty query returns first page of sessions (LIMIT/OFFSET in SQL)", async () => {
    const rows = Array.from({ length: 25 }, (_, i) =>
      makeSessionWithNotes({ id: i + 1, tema: `Tema ${i + 1}` }),
    )
    mockSelect.mockResolvedValue(rows)

    const result = await searchSessions("", 1, 25)

    expect(result).toHaveLength(25)
    const [query, params] = mockSelect.mock.calls[0] as [string, unknown[]]
    expect(query).toContain("LIMIT")
    expect(query).toContain("OFFSET")
    // Empty query uses '%' pattern
    expect(params).toContain("%")
    // Offset for page 1 = 0
    expect(params[params.length - 1]).toBe(0)
  })

  it("uses correct OFFSET for page 2", async () => {
    mockSelect.mockResolvedValue([])

    await searchSessions("", 2, 25)

    const [, params] = mockSelect.mock.calls[0] as [string, unknown[]]
    // LIMIT=25, OFFSET=25
    expect(params[params.length - 2]).toBe(25)
    expect(params[params.length - 1]).toBe(25)
  })

  it("builds LIKE pattern from non-empty query", async () => {
    mockSelect.mockResolvedValue([])

    await searchSessions("fotosíntesis", 1, 25)

    const [, params] = mockSelect.mock.calls[0] as [string, unknown[]]
    expect(params).toContain("%fotosíntesis%")
  })

  it("JOINs cornell_notes and searches notas_principales", async () => {
    mockSelect.mockResolvedValue([])

    await searchSessions("tasa", 1, 25)

    const [query] = mockSelect.mock.calls[0] as [string, unknown[]]
    expect(query).toContain("LEFT JOIN cornell_notes")
    expect(query).toContain("notas_principales")
  })

  it("searches preguntas and resumen fields", async () => {
    mockSelect.mockResolvedValue([])

    await searchSessions("cadena", 1, 25)

    const [query] = mockSelect.mock.calls[0] as [string, unknown[]]
    expect(query).toContain("preguntas")
    expect(query).toContain("resumen")
  })

  it("returns has_notes=1 when cornell row exists", async () => {
    const rows = [makeSessionWithNotes({ id: 5, has_notes: 1 })]
    mockSelect.mockResolvedValue(rows)

    const result = await searchSessions("", 1, 25)

    expect(result[0].has_notes).toBe(1)
  })

  it("returns has_notes=0 when no cornell row exists", async () => {
    const rows = [makeSessionWithNotes({ id: 6, has_notes: 0 })]
    mockSelect.mockResolvedValue(rows)

    const result = await searchSessions("", 1, 25)

    expect(result[0].has_notes).toBe(0)
  })

  it("orders results by fecha_inicio DESC", async () => {
    mockSelect.mockResolvedValue([])

    await searchSessions("", 1)

    const [query] = mockSelect.mock.calls[0] as [string, unknown[]]
    expect(query).toContain("ORDER BY s.fecha_inicio DESC")
  })
})

// ---------------------------------------------------------------------------
// countSessions
// ---------------------------------------------------------------------------
describe("countSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns numeric count from COUNT(DISTINCT s.id)", async () => {
    mockSelect.mockResolvedValue([{ count: 30 }])

    const count = await countSessions("")

    expect(count).toBe(30)
  })

  it("returns 0 when no sessions match", async () => {
    mockSelect.mockResolvedValue([{ count: 0 }])

    const count = await countSessions("nonexistent")

    expect(count).toBe(0)
  })

  it("uses COUNT(DISTINCT s.id) in query", async () => {
    mockSelect.mockResolvedValue([{ count: 5 }])

    await countSessions("test")

    const [query] = mockSelect.mock.calls[0] as [string, unknown[]]
    expect(query).toContain("COUNT(DISTINCT s.id)")
  })

  it("applies same pattern as searchSessions for non-empty query", async () => {
    mockSelect.mockResolvedValue([{ count: 3 }])

    await countSessions("integra")

    const [, params] = mockSelect.mock.calls[0] as [string, unknown[]]
    expect(params).toContain("%integra%")
  })
})
