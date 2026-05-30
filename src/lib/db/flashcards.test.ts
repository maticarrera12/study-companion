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
import { searchCards, countCards } from "./flashcards"
import type { Flashcard } from "../../types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeCard(overrides: Partial<Flashcard> = {}): Flashcard {
  return {
    id: 1,
    front: "What is 2+2?",
    back: "4",
    tag: "math",
    fecha_creacion: 1_700_000_000,
    intervalo_actual: 0,
    proxima_revision: null,
    veces_revisada: 0,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// searchCards
// ---------------------------------------------------------------------------
describe("searchCards", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("empty query returns all cards on first page", async () => {
    const rows = Array.from({ length: 20 }, (_, i) => makeCard({ id: i + 1 }))
    mockSelect.mockResolvedValue(rows)

    const result = await searchCards("", "", true, 1, 20)

    expect(result).toHaveLength(20)
    const [, params] = mockSelect.mock.calls[0] as [string, unknown[]]
    // Empty query → '%' pattern
    expect(params).toContain("%")
    // Page 1 → offset 0
    expect(params[params.length - 1]).toBe(0)
  })

  it("builds correct LIKE pattern for non-empty query", async () => {
    mockSelect.mockResolvedValue([])

    await searchCards("pyth", "", true, 1)

    const [, params] = mockSelect.mock.calls[0] as [string, unknown[]]
    expect(params).toContain("%pyth%")
  })

  it("matches on front column (LOWER(front) LIKE)", async () => {
    mockSelect.mockResolvedValue([])

    await searchCards("theorem", "", true, 1)

    const [query] = mockSelect.mock.calls[0] as [string, unknown[]]
    expect(query).toContain("LOWER(front)")
  })

  it("matches on back column (LOWER(back) LIKE)", async () => {
    mockSelect.mockResolvedValue([])

    await searchCards("resultado", "", true, 1)

    const [query] = mockSelect.mock.calls[0] as [string, unknown[]]
    expect(query).toContain("LOWER(back)")
  })

  it("matches on tag column (LOWER(tag) LIKE)", async () => {
    mockSelect.mockResolvedValue([])

    await searchCards("matica", "", true, 1)

    const [query] = mockSelect.mock.calls[0] as [string, unknown[]]
    expect(query).toContain("LOWER(tag)")
  })

  it("applies tag filter when selectedTag is non-empty", async () => {
    mockSelect.mockResolvedValue([])

    await searchCards("", "física", true, 1)

    const [, params] = mockSelect.mock.calls[0] as [string, unknown[]]
    expect(params).toContain("%física%")
  })

  it("tag filter uses '%' when selectedTag is empty", async () => {
    mockSelect.mockResolvedValue([])

    await searchCards("velocidad", "", true, 1)

    const [, params] = mockSelect.mock.calls[0] as [string, unknown[]]
    // tag pattern should be '%' (match all tags)
    const percentCount = (params as unknown[]).filter((p) => p === "%").length
    expect(percentCount).toBeGreaterThanOrEqual(1)
  })

  it("excludes internalized cards when showInternalized is false", async () => {
    mockSelect.mockResolvedValue([])

    await searchCards("ley", "", false, 1)

    const [query, params] = mockSelect.mock.calls[0] as [string, unknown[]]
    expect(query).toContain("intervalo_actual")
    // showInternalized=false → passes 0
    expect(params).toContain(0)
  })

  it("includes internalized cards when showInternalized is true", async () => {
    mockSelect.mockResolvedValue([])

    await searchCards("ley", "", true, 1)

    const [, params] = mockSelect.mock.calls[0] as [string, unknown[]]
    // showInternalized=true → passes 1
    expect(params).toContain(1)
  })

  it("uses correct LIMIT and OFFSET for page 2", async () => {
    mockSelect.mockResolvedValue([])

    await searchCards("", "", true, 2, 20)

    const [, params] = mockSelect.mock.calls[0] as [string, unknown[]]
    // LIMIT=20, OFFSET=20
    expect(params[params.length - 2]).toBe(20)
    expect(params[params.length - 1]).toBe(20)
  })

  it("orders by proxima_revision ASC", async () => {
    mockSelect.mockResolvedValue([])

    await searchCards("", "", true, 1)

    const [query] = mockSelect.mock.calls[0] as [string, unknown[]]
    expect(query).toContain("ORDER BY proxima_revision ASC")
  })

  it("returns cards from DB driver", async () => {
    const rows = [makeCard({ id: 42, front: "Pythagorean theorem" })]
    mockSelect.mockResolvedValue(rows)

    const result = await searchCards("pyth", "", true, 1)

    expect(result).toEqual(rows)
  })
})

// ---------------------------------------------------------------------------
// countCards
// ---------------------------------------------------------------------------
describe("countCards", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns numeric count from COUNT(*) row", async () => {
    mockSelect.mockResolvedValue([{ count: 45 }])

    const count = await countCards("", "", true)

    expect(count).toBe(45)
  })

  it("returns 0 when no cards match", async () => {
    mockSelect.mockResolvedValue([{ count: 0 }])

    const count = await countCards("nonexistent", "", true)

    expect(count).toBe(0)
  })

  it("applies same filters as searchCards", async () => {
    mockSelect.mockResolvedValue([{ count: 5 }])

    await countCards("ley", "física", false)

    const [, params] = mockSelect.mock.calls[0] as [string, unknown[]]
    expect(params).toContain("%ley%")
    expect(params).toContain("%física%")
    expect(params).toContain(0) // showInternalized=false
  })

  it("does not include LIMIT or OFFSET (count query has no pagination)", async () => {
    mockSelect.mockResolvedValue([{ count: 10 }])

    await countCards("test", "", true)

    const [query] = mockSelect.mock.calls[0] as [string, unknown[]]
    expect(query).not.toContain("LIMIT")
    expect(query).not.toContain("OFFSET")
  })
})
