const INTERVALS_DAYS: Record<number, number | null> = {
  0: 2,
  1: 3,
  2: 5,
  3: 7,
  4: null, // internalized
}

export function updateLevel(current: number, result: "sabido" | "fallado"): number {
  if (result === "sabido") return Math.min(current + 1, 4)
  return Math.max(current - 1, 0)
}

export function nextReviewDate(level: number): number | null {
  const days = INTERVALS_DAYS[level]
  if (days === null) return null
  const now = Math.floor(Date.now() / 1000)
  return now + days * 86400
}
