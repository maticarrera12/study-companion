interface NoteZoneProps {
  label: string
  placeholder: string
  value: string
  onChange: (val: string) => void
  className?: string
  rows?: number
}

export function NoteZone({ label, placeholder, value, onChange, className = "", rows }: NoteZoneProps) {
  return (
    <div className={["flex flex-col", className].filter(Boolean).join(" ")}>
      <span className="text-xs uppercase tracking-wider text-text-secondary mb-1 font-medium">
        {label}
      </span>
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="flex-1 w-full bg-transparent border border-border rounded-lg p-3 text-text-primary resize-none focus:outline-none focus:border-accent transition-colors duration-100"
      />
    </div>
  )
}
