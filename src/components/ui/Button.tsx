import type { ButtonHTMLAttributes } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed",
  ghost:
    "bg-transparent text-text-secondary border border-border hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed",
  danger:
    "bg-transparent text-red-400 hover:bg-red-400/10 disabled:opacity-50 disabled:cursor-not-allowed",
}

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "text-sm px-3 py-1.5",
  md: "text-sm px-4 py-2",
  lg: "text-base px-6 py-3",
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "rounded-lg transition-colors duration-100 font-medium cursor-pointer",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </button>
  )
}
