interface LevelUpOverlayProps {
  level: number | null
}

/**
 * 레벨업 알림.
 * 화면 전체를 덮는 대신 카드 하나만 떴다가 스스로 사라진다.
 * confetti 는 쓰지 않는다.
 */
export function LevelUpOverlay({ level }: LevelUpOverlayProps) {
  if (level === null) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center px-8"
      role="status"
      aria-live="polite"
    >
      <div className="animate-pop rounded-card border border-line bg-surface px-9 py-7 text-center shadow-lift">
        <p className="font-game text-[13px] tracking-[0.22em] text-butter-deep">LEVEL UP!</p>
        <p className="mt-2.5 font-game text-[34px] leading-none text-ink">LV. {level}</p>
        <p className="mt-3 text-[13px] text-inkdim">오늘도 한 칸 자랐어.</p>
      </div>
    </div>
  )
}
