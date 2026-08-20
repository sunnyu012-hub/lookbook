import { cn } from '@/components/ui/cn'

interface LevelBadgeProps {
  level: number
  className?: string
}

/** LV. 숫자 pill. 게임 요소라 게임 폰트를 쓴다. */
export function LevelBadge({ level, className }: LevelBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center rounded-pill bg-ink px-3 font-game text-[13px] leading-none tracking-[0.06em] text-surface',
        className,
      )}
    >
      LV. {level}
    </span>
  )
}
