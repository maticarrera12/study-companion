import { useEffect, type ReactNode } from "react"

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}

export function Modal({ open, onClose, children, title }: ModalProps) {
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-100"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-xl p-6 w-full max-w-md shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 className="text-text-primary font-semibold text-lg mb-4">{title}</h2>
        )}
        {children}
      </div>
    </div>
  )
}
