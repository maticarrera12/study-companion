import { forwardRef, type InputHTMLAttributes } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-")
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            "bg-surface border border-border rounded-lg px-3 py-2",
            "text-text-primary placeholder:text-text-secondary/60",
            "focus:outline-none focus:border-accent",
            "transition-colors duration-100",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />
      </div>
    )
  },
)

Input.displayName = "Input"
