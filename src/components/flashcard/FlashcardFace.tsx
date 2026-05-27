interface FlashcardFaceProps {
  front: string
  back: string
  isRevealed: boolean
}

export function FlashcardFace({ front, back, isRevealed }: FlashcardFaceProps) {
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-surface rounded-xl p-8 flex flex-col gap-4">
        <p className="text-2xl font-medium text-text-primary text-center leading-relaxed">
          {front}
        </p>
        {isRevealed && (
          <>
            <div className="border-t border-border" />
            <p className="text-lg text-text-secondary text-center leading-relaxed">
              {back || (
                <span className="italic opacity-50">Sin reverso definido</span>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
