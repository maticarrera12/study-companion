import { useUIStore } from "../../stores/uiStore"

export function FlashOverlay() {
  const flashActive = useUIStore((s) => s.flashActive)

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9999]"
      style={
        flashActive
          ? { animation: "flash-pulse 400ms ease-out forwards" }
          : { opacity: 0 }
      }
      aria-hidden="true"
    />
  )
}
