import { create } from "zustand"

interface ConfirmOptions {
  message: string
  onConfirm: () => void
  onCancel?: () => void
}

interface UIState {
  activeModal: "distraction" | "confirm" | "settings" | null
  confirmOptions: ConfirmOptions | null
  flashActive: boolean
}

interface UIActions {
  openModal(modal: UIState["activeModal"]): void
  closeModal(): void
  showConfirm(options: ConfirmOptions): void
  triggerFlash(): void
}

export const useUIStore = create<UIState & UIActions>()((set) => ({
  activeModal: null,
  confirmOptions: null,
  flashActive: false,
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null, confirmOptions: null }),
  showConfirm: (options) => set({ activeModal: "confirm", confirmOptions: options }),
  triggerFlash: () => {
    set({ flashActive: true })
    setTimeout(() => set({ flashActive: false }), 600)
  },
}))
