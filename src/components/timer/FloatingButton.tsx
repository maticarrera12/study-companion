import { useTimerStore } from "../../stores/timerStore"
import { useUIStore } from "../../stores/uiStore"

export function FloatingButton() {
  const phase = useTimerStore((s) => s.phase)
  const openModal = useUIStore((s) => s.openModal)

  if (phase !== "focus") return null

  return (
    <button
      onClick={() => openModal("distraction")}
      title="Anotar distracción"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent hover:bg-accent-hover text-white flex items-center justify-center transition-colors duration-100 text-2xl font-light"
    >
      +
    </button>
  )
}
