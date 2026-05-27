import { Button } from "./Button"

interface EmptyStateProps {
  message: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-text-secondary text-sm max-w-xs">{message}</p>
      {action && (
        <Button variant="ghost" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
