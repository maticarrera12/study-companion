export function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

export function normalizeTags(raw: string): string {
  const seen = new Set<string>()
  const unique: string[] = []
  for (const tag of parseTags(raw)) {
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(tag)
  }
  return unique.join(", ")
}

export function collectTagsFromCards(cards: { tag: string }[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const card of cards) {
    for (const tag of parseTags(card.tag)) {
      const key = tag.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      result.push(tag)
    }
  }
  return result.sort((a, b) => a.localeCompare(b, "es"))
}

export function cardHasTag(cardTag: string, tag: string): boolean {
  const needle = tag.toLowerCase()
  return parseTags(cardTag).some((t) => t.toLowerCase() === needle)
}
