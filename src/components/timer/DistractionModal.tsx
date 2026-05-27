import { useState } from "react"
import { useUIStore } from "../../stores/uiStore"
import { useTimerStore } from "../../stores/timerStore"
import { addDistraction } from "../../lib/db/distractions"
import { Modal } from "../ui/Modal"
import { Button } from "../ui/Button"
import { Input } from "../ui/Input"

export function DistractionModal() {
  const { activeModal, closeModal } = useUIStore()
  const sessionId = useTimerStore((s) => s.sessionId)
  const [text, setText] = useState("")
  const [saving, setSaving] = useState(false)

  const isOpen = activeModal === "distraction"

  async function handleSave() {
    if (!text.trim() || !sessionId || saving) return
    setSaving(true)
    try {
      await addDistraction(sessionId, text.trim())
      setText("")
      closeModal()
    } catch (err) {
      console.error("Failed to save distraction:", err)
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setText("")
    closeModal()
  }

  return (
    <Modal open={isOpen} onClose={handleClose} title="Anotar distracción">
      <div className="flex flex-col gap-4">
        <p className="text-text-secondary text-sm">Anotá rápido y volvé al foco.</p>
        <Input
          placeholder="¿Qué te distrajo?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
          }}
          maxLength={200}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!text.trim() || saving}
          >
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
