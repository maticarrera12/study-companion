import { useState, useEffect, type ReactNode } from "react"
import { getSettings, saveSettings } from "../../lib/store"
import type { AppSettings } from "../../types"

const timingOptions: { label: string; value: AppSettings["cornell_timing"] }[] = [
  { label: "Antes", value: "before" },
  { label: "Durante", value: "during" },
  { label: "Después", value: "after" },
]

function ClockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-text-secondary"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function CoffeeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-text-secondary"
    >
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
      <line x1="6" x2="6" y1="2" y2="4" />
      <line x1="10" x2="10" y1="2" y2="4" />
      <line x1="14" x2="14" y1="2" y2="4" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-text-secondary"
    >
      <line x1="8" x2="21" y1="6" y2="6" />
      <line x1="8" x2="21" y1="12" y2="12" />
      <line x1="8" x2="21" y1="18" y2="18" />
      <line x1="3" x2="3.01" y1="6" y2="6" />
      <line x1="3" x2="3.01" y1="12" y2="12" />
      <line x1="3" x2="3.01" y1="18" y2="18" />
    </svg>
  )
}

interface DurationCardProps {
  icon: ReactNode
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

function DurationCard({ icon, label, value, min, max, onChange }: DurationCardProps) {
  function handleChange(raw: string) {
    const next = Number(raw)
    if (!Number.isFinite(next)) return
    onChange(Math.min(max, Math.max(min, next)))
  }

  return (
    <div className="relative bg-surface border border-border rounded-lg px-4 py-3 flex items-center justify-center">
      <div className="absolute left-4 top-1/2 -translate-y-1/2">{icon}</div>
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-baseline justify-center gap-0.5">
          <input
            type="number"
            min={min}
            max={max}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            aria-label={`Duración de ${label.toLowerCase()} en minutos`}
            className={[
              "w-10 bg-transparent text-text-primary font-semibold text-lg text-center",
              "focus:outline-none [appearance:textfield]",
              "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            ].join(" ")}
          />
          <span className="text-text-primary font-semibold text-lg">min</span>
        </div>
        <span className="text-text-secondary text-xs">{label}</span>
      </div>
    </div>
  )
}

export function PomodoroSettingsPanel() {
  const [pomodoroDuration, setPomodoroDuration] = useState(25)
  const [breakDuration, setBreakDuration] = useState(5)
  const [cornellEveryN, setCornellEveryN] = useState(1)
  const [cornellTiming, setCornellTiming] = useState<AppSettings["cornell_timing"]>("during")
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getSettings().then((s) => {
      setPomodoroDuration(s.pomodoro_duration_min)
      setBreakDuration(s.break_duration_min)
      setCornellEveryN(s.cornell_every_n)
      setCornellTiming(s.cornell_timing)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    saveSettings({
      pomodoro_duration_min: pomodoroDuration,
      break_duration_min: breakDuration,
      cornell_every_n: cornellEveryN,
      cornell_timing: cornellTiming,
    }).catch(console.error)
  }, [loaded, pomodoroDuration, breakDuration, cornellEveryN, cornellTiming])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <DurationCard
          icon={<ClockIcon />}
          label="Foco"
          value={pomodoroDuration}
          min={1}
          max={120}
          onChange={setPomodoroDuration}
        />
        <DurationCard
          icon={<CoffeeIcon />}
          label="Descanso"
          value={breakDuration}
          min={1}
          max={60}
          onChange={setBreakDuration}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ListIcon />
            <span className="text-sm text-text-secondary">Cornell</span>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-text-secondary">
            Cada
            <input
              type="number"
              min={1}
              max={10}
              value={cornellEveryN}
              onChange={(e) => {
                const next = Number(e.target.value)
                if (!Number.isFinite(next)) return
                setCornellEveryN(Math.min(10, Math.max(1, next)))
              }}
              aria-label="Mostrar Cornell cada N pomodoros"
              className={[
                "w-8 bg-surface border border-border rounded px-1 py-0.5 text-text-primary text-center",
                "focus:outline-none focus:border-accent transition-colors duration-100",
                "[appearance:textfield]",
                "[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              ].join(" ")}
            />
            pom.
          </label>
        </div>

        <div
          className="grid grid-cols-3 rounded-lg border border-border overflow-hidden"
          role="radiogroup"
          aria-label="Cuándo mostrar Cornell"
        >
          {timingOptions.map((opt) => {
            const selected = cornellTiming === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setCornellTiming(opt.value)}
                className={[
                  "py-2 text-sm font-medium transition-colors duration-100 cursor-pointer",
                  selected
                    ? "bg-accent text-white"
                    : "bg-surface text-text-secondary hover:text-text-primary",
                ].join(" ")}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
