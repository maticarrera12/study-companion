import { useState, useEffect } from "react"
import { getSettings, saveSettings } from "../../lib/store"
import { Modal } from "../ui/Modal"
import { Button } from "../ui/Button"
import type { AppSettings } from "../../types"

interface PomodoroSettingsProps {
  open: boolean
  onClose: () => void
}

export function PomodoroSettings({ open, onClose }: PomodoroSettingsProps) {
  const [pomodoroDuration, setPomodoroDuration] = useState(25)
  const [breakDuration, setBreakDuration] = useState(5)
  const [cornellEveryN, setCornellEveryN] = useState(1)
  const [cornellTiming, setCornellTiming] = useState<AppSettings["cornell_timing"]>("during")

  useEffect(() => {
    if (!open) return
    getSettings().then((s) => {
      setPomodoroDuration(s.pomodoro_duration_min)
      setBreakDuration(s.break_duration_min)
      setCornellEveryN(s.cornell_every_n)
      setCornellTiming(s.cornell_timing)
    })
  }, [open])

  async function handleSave() {
    await saveSettings({
      pomodoro_duration_min: pomodoroDuration,
      break_duration_min: breakDuration,
      cornell_every_n: cornellEveryN,
      cornell_timing: cornellTiming,
    })
    onClose()
  }

  const timingOptions: { label: string; value: AppSettings["cornell_timing"] }[] = [
    { label: "Antes del descanso", value: "before" },
    { label: "Durante el descanso", value: "during" },
    { label: "Después del descanso", value: "after" },
  ]

  return (
    <Modal open={open} onClose={onClose} title="Ajustes del pomodoro">
      <div className="flex flex-col gap-5">
        {/* Pomodoro duration */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary">
            Duración del foco (min)
          </label>
          <input
            type="number"
            min={1}
            max={120}
            value={pomodoroDuration}
            onChange={(e) => setPomodoroDuration(Number(e.target.value))}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-text-primary text-sm w-full focus:outline-none focus:border-accent transition-colors duration-100"
          />
        </div>

        {/* Break duration */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary">
            Duración del descanso (min)
          </label>
          <input
            type="number"
            min={1}
            max={60}
            value={breakDuration}
            onChange={(e) => setBreakDuration(Number(e.target.value))}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-text-primary text-sm w-full focus:outline-none focus:border-accent transition-colors duration-100"
          />
        </div>

        {/* Cornell every N */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-text-secondary">
            Notas Cornell cada N pomodoros
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={cornellEveryN}
            onChange={(e) => setCornellEveryN(Number(e.target.value))}
            className="bg-surface border border-border rounded-lg px-3 py-2 text-text-primary text-sm w-full focus:outline-none focus:border-accent transition-colors duration-100"
          />
        </div>

        {/* Cornell timing */}
        <div className="flex flex-col gap-2">
          <span className="text-sm text-text-secondary">
            Cuándo mostrar Cornell
          </span>
          <div className="flex flex-col gap-2">
            {timingOptions.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div
                  className={[
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors duration-100",
                    cornellTiming === opt.value
                      ? "border-accent"
                      : "border-border group-hover:border-text-secondary",
                  ].join(" ")}
                  onClick={() => setCornellTiming(opt.value)}
                >
                  {cornellTiming === opt.value && (
                    <div className="w-2 h-2 rounded-full bg-accent" />
                  )}
                </div>
                <span
                  className={[
                    "text-sm transition-colors duration-100",
                    cornellTiming === opt.value
                      ? "text-text-primary"
                      : "text-text-secondary group-hover:text-text-primary",
                  ].join(" ")}
                  onClick={() => setCornellTiming(opt.value)}
                >
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" className="flex-1" onClick={handleSave}>
            Guardar
          </Button>
        </div>

        <p className="text-xs text-text-secondary text-center -mt-2">
          Los cambios aplican desde el próximo pomodoro.
        </p>
      </div>
    </Modal>
  )
}
