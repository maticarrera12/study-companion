interface BadgeProps {
  label: string
  variant?: "default" | "accent" | "muted" | "internalized"
}

const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-surface text-text-secondary border border-border",
  accent: "bg-accent/20 text-accent border border-accent/30",
  muted: "bg-surface text-text-secondary border border-border",
  internalized: "bg-surface text-text-secondary border border-border line-through opacity-60",
}

export function Badge({ label, variant = "default" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variantClasses[variant],
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {label}
    </span>
  )
}
