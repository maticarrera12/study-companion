import { Button } from "../ui/Button"

interface ReviewResultButtonsProps {
  onSabido: () => void
  onFallado: () => void
  disabled?: boolean
}

export function ReviewResultButtons({
  onSabido,
  onFallado,
  disabled,
}: ReviewResultButtonsProps) {
  return (
    <div className="w-full max-w-lg mx-auto flex gap-3">
      <div className="flex-1 flex flex-col items-center gap-1">
        <Button
          variant="danger"
          size="lg"
          onClick={onFallado}
          disabled={disabled}
          className="w-full"
        >
          Fallé
        </Button>
        <span className="text-text-secondary text-xs opacity-50">(2)</span>
      </div>
      <div className="flex-1 flex flex-col items-center gap-1">
        <Button
          variant="primary"
          size="lg"
          onClick={onSabido}
          disabled={disabled}
          className="w-full"
        >
          Lo sabía
        </Button>
        <span className="text-text-secondary text-xs opacity-50">(1)</span>
      </div>
    </div>
  )
}
