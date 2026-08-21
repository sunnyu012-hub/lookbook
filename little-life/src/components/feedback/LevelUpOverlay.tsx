import { UI } from '@/lib/assets'

interface LevelUpOverlayProps {
  level: number | null
}

/**
 * 레벨업 알림.
 * 화면 전체를 덮는 대신 카드 하나만 떴다가 스스로 사라진다. confetti 는 쓰지 않는다.
 */
export function LevelUpOverlay({ level }: LevelUpOverlayProps) {
  if (level === null) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center px-8"
      role="status"
      aria-live="polite"
    >
      <div className="animate-pop rounded-card border border-line bg-surface px-9 pb-6 pt-4 text-center shadow-lift">
        <img src={UI.levelUp} alt="LEVEL UP!" className="mx-auto h-[86px] object-contain" />
        <p className="mt-1 font-game text-[30px] leading-none text-ink">LV. {level}</p>
        <p className="mt-2.5 text-[13px] text-inkdim">오늘도 한 칸 자랐어.</p>
      </div>
    </div>
  )
}
