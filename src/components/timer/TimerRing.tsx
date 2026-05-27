interface TimerRingProps {
  elapsed: number // seconds
  total: number // seconds
  size?: number // default 200
}

function formatMMSS(seconds: number): string {
  const s = Math.max(0, seconds)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
}

export function TimerRing({ elapsed, total, size = 200 }: TimerRingProps) {
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? Math.min(elapsed / total, 1) : 0
  const dashOffset = circumference * (1 - progress)
  const remaining = Math.max(0, total - elapsed)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      {/* Remaining time centered */}
      <span className="absolute text-2xl font-semibold text-text-primary tabular-nums">
        {formatMMSS(remaining)}
      </span>
    </div>
  )
}
