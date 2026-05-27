export function todayStartUnix(): number {
  return Math.floor(new Date().setHours(0, 0, 0, 0) / 1000)
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "< 1 min"
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

export function formatDate(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000)
  const now = new Date()

  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  const hh = String(date.getHours()).padStart(2, "0")
  const mm = String(date.getMinutes()).padStart(2, "0")
  const time = `${hh}:${mm}`

  if (date >= todayStart) return `Hoy ${time}`
  if (date >= yesterdayStart) return `Ayer ${time}`

  const dd = String(date.getDate()).padStart(2, "0")
  const mo = String(date.getMonth() + 1).padStart(2, "0")
  return `${dd}/${mo} ${time}`
}
