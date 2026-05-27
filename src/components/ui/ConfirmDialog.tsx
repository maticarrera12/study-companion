import { useUIStore } from "../../stores/uiStore"
import { Modal } from "./Modal"
import { Button } from "./Button"

export function ConfirmDialog() {
  const { activeModal, confirmOptions, closeModal } = useUIStore()

  const isOpen = activeModal === "confirm"

  function handleConfirm() {
    confirmOptions?.onConfirm()
    closeModal()
  }

  function handleCancel() {
    confirmOptions?.onCancel?.()
    closeModal()
  }

  return (
    <Modal open={isOpen} onClose={handleCancel}>
      <div className="flex flex-col gap-6">
        <p className="text-text-primary text-sm leading-relaxed">
          {confirmOptions?.message}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button variant="danger" size="sm" onClick={handleConfirm}>
            Confirmar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
