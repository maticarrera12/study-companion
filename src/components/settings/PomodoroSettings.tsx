import { useState, useEffect, useRef, type ReactNode } from "react"
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

interface NumericInputProps {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  "aria-label": string
  className?: string
}

function NumericInput({ value, min, max, onChange, "aria-label": ariaLabel, className }: NumericInputProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const draftRef = useRef<string | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const display = draft ?? String(value)

  function commit(raw: string) {
    setDraft(null)
    draftRef.current = null
    const next = raw === "" ? min : Number(raw)
    if (!Number.isFinite(next)) return
    onChangeRef.current(Math.min(max, Math.max(min, next)))
  }

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    return () => {
      if (draftRef.current !== null) {
        commit(draftRef.current)
      }
    }
  }, [min, max])

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onFocus={(e) => {
        setDraft(String(value))
        e.currentTarget.select()
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/\D/g, "")
        setDraft(raw)
        draftRef.current = raw
      }}
      onBlur={(e) => commit(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit(e.currentTarget.value)
          e.currentTarget.blur()
        }
      }}
      aria-label={ariaLabel}
      className={className}
    />
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
  return (
    <div className="relative bg-surface border border-border rounded-lg px-4 py-3 flex items-center justify-center">
      <div className="absolute left-4 top-1/2 -translate-y-1/2">{icon}</div>
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-baseline justify-center gap-0.5">
          <NumericInput
            value={value}
            min={min}
            max={max}
            onChange={onChange}
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
  const loadedRef = useRef(false)

  function persistSettings(partial: Partial<AppSettings>) {
    if (!loadedRef.current) return
    saveSettings(partial).catch(console.error)
  }

  function updatePomodoroDuration(value: number) {
    setPomodoroDuration(value)
    persistSettings({ pomodoro_duration_min: value })
  }

  function updateBreakDuration(value: number) {
    setBreakDuration(value)
    persistSettings({ break_duration_min: value })
  }

  function updateCornellEveryN(value: number) {
    setCornellEveryN(value)
    persistSettings({ cornell_every_n: value })
  }

  function updateCornellTiming(value: AppSettings["cornell_timing"]) {
    setCornellTiming(value)
    persistSettings({ cornell_timing: value })
  }

  useEffect(() => {
    let cancelled = false
    getSettings().then((s) => {
      if (cancelled) return
      setPomodoroDuration(s.pomodoro_duration_min)
      setBreakDuration(s.break_duration_min)
      setCornellEveryN(s.cornell_every_n)
      setCornellTiming(s.cornell_timing)
      loadedRef.current = true
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <DurationCard
          icon={<ClockIcon />}
          label="Foco"
          value={pomodoroDuration}
          min={1}
          max={120}
          onChange={updatePomodoroDuration}
        />
        <DurationCard
          icon={<CoffeeIcon />}
          label="Descanso"
          value={breakDuration}
          min={1}
          max={60}
          onChange={updateBreakDuration}
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
            <NumericInput
              value={cornellEveryN}
              min={1}
              max={10}
              onChange={updateCornellEveryN}
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
                onClick={() => updateCornellTiming(opt.value)}
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
