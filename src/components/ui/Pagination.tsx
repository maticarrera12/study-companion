interface PaginationProps {
  page: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}

export function Pagination({ page, totalPages, onPrev, onNext }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-4 py-4">
      <button
        type="button"
        onClick={onPrev}
        disabled={page === 1}
        className="text-sm text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-100"
      >
        ← Anterior
      </button>
      <span className="text-sm text-text-secondary">
        Página {page} de {totalPages}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={page === totalPages}
        className="text-sm text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-100"
      >
        Siguiente →
      </button>
    </div>
  )
}
