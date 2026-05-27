import { NoteZone } from "./NoteZone"

interface CornellLayoutProps {
  notas: string
  preguntas: string
  resumen: string
  onNotasChange: (v: string) => void
  onPreguntasChange: (v: string) => void
  onResumenChange: (v: string) => void
  breakSecondsLeft?: number
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")
  const s = (seconds % 60).toString().padStart(2, "0")
  return `${m}:${s}`
}

export function CornellLayout({
  notas,
  preguntas,
  resumen,
  onNotasChange,
  onPreguntasChange,
  onResumenChange,
  breakSecondsLeft,
}: CornellLayoutProps) {
  return (
    <div className="relative grid grid-cols-[65fr_30fr] grid-rows-[1fr_auto] h-full">
      {/* Main zone — Notas y conceptos */}
      <div className="col-span-1 row-span-1 p-2 flex flex-col">
        <NoteZone
          label="Notas y conceptos"
          placeholder="Escribí tus notas principales, conceptos clave, definiciones..."
          value={notas}
          onChange={onNotasChange}
          className="flex-1"
        />
      </div>

      {/* Cue zone — Preguntas */}
      <div className="col-span-1 row-span-1 p-2 border-l border-border flex flex-col">
        <NoteZone
          label="Preguntas"
          placeholder="¿Qué preguntas surgen? Una por línea..."
          value={preguntas}
          onChange={onPreguntasChange}
          className="flex-1"
        />
      </div>

      {/* Summary zone — full width, limited height */}
      <div className="col-span-2 p-2 border-t border-border h-28">
        <NoteZone
          label="Resumen en una frase"
          placeholder="¿Cuál es la idea central de esta sesión?"
          value={resumen}
          onChange={onResumenChange}
          className="h-full"
        />
      </div>

      {/* Break countdown */}
      {breakSecondsLeft !== undefined && (
        <div className="absolute top-2 right-2 text-text-secondary text-sm">
          Descanso: {formatCountdown(breakSecondsLeft)}
        </div>
      )}
    </div>
  )
}
