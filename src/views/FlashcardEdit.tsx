import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  getCardById,
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
} from "../lib/db/flashcards"
import { Input } from "../components/ui/Input"
import { Button } from "../components/ui/Button"
import { useUIStore } from "../stores/uiStore"
import { normalizeTags } from "../lib/utils/tags"

export default function FlashcardEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const showConfirm = useUIStore((s) => s.showConfirm)

  const isEditMode = id !== undefined
  const cardId = isEditMode ? Number(id) : null

  const [front, setFront] = useState("")
  const [back, setBack] = useState("")
  const [tag, setTag] = useState("")
  const [loading, setLoading] = useState(isEditMode)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isEditMode || cardId === null) return
    let cancelled = false
    setLoading(true)
    getCardById(cardId).then((card) => {
      if (cancelled) return
      if (card) {
        setFront(card.front)
        setBack(card.back)
        setTag(card.tag)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [cardId, isEditMode])

  async function handleSave() {
    if (!front.trim() || saving) return
    setSaving(true)
    try {
      const normalizedTag = normalizeTags(tag)
      if (isEditMode && cardId !== null) {
        await updateFlashcard(cardId, {
          front: front.trim(),
          back: back.trim(),
          tag: normalizedTag,
        })
      } else {
        await createFlashcard({
          front: front.trim(),
          back: back.trim(),
          tag: normalizedTag,
        })
      }
      navigate(-1)
    } catch (err) {
      console.error("Failed to save flashcard:", err)
    } finally {
      setSaving(false)
    }
  }

  function handleDelete() {
    if (cardId === null) return
    showConfirm({
      message: "¿Eliminar esta flashcard? Esta acción no se puede deshacer.",
      onConfirm: async () => {
        await deleteFlashcard(cardId)
        navigate("/library")
      },
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-text-secondary text-sm">Cargando…</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-text-secondary hover:text-text-primary transition-colors duration-100 text-sm"
        >
          ← Volver
        </button>
        <h1 className="text-text-primary font-semibold">
          {isEditMode ? "Editar flashcard" : "Nueva flashcard"}
        </h1>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col items-center">
        <div className="w-full max-w-lg flex flex-col gap-5">
          {/* Front */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-text-secondary">
              Frente <span className="text-accent">*</span>
            </label>
            <textarea
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Pregunta o concepto…"
              rows={3}
              className={[
                "bg-surface border border-border rounded-lg px-3 py-2 min-h-[80px]",
                "text-text-primary placeholder:text-text-secondary/60 text-center",
                "focus:outline-none focus:border-accent",
                "transition-colors duration-100 resize-y",
              ].join(" ")}
            />
          </div>

          {/* Back */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-text-secondary">Reverso (opcional)</label>
            <textarea
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Respuesta o explicación…"
              rows={4}
              className={[
                "bg-surface border border-border rounded-lg px-3 py-2 min-h-[120px]",
                "text-text-primary placeholder:text-text-secondary/60 text-center",
                "focus:outline-none focus:border-accent",
                "transition-colors duration-100 resize-y",
              ].join(" ")}
            />
          </div>

          {/* Tag */}
          <Input
            label="Etiquetas (opcional)"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="Ej: matemática, historia, examen…"
            maxLength={120}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-border">
        <div>
          {isEditMode && (
            <Button variant="danger" size="sm" onClick={handleDelete}>
              Eliminar
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!front.trim() || saving}
          >
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  )
}
