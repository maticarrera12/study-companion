import { create } from "zustand"

interface ConfirmOptions {
  message: string
  onConfirm: () => void
  onCancel?: () => void
}

interface UIState {
  activeModal: "distraction" | "confirm" | "settings" | null
  confirmOptions: ConfirmOptions | null
}

interface UIActions {
  openModal(modal: UIState["activeModal"]): void
  closeModal(): void
  showConfirm(options: ConfirmOptions): void
}

export const useUIStore = create<UIState & UIActions>()((set) => ({
  activeModal: null,
  confirmOptions: null,
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null, confirmOptions: null }),
  showConfirm: (options) => set({ activeModal: "confirm", confirmOptions: options }),
}))
