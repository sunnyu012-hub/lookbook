import { cn } from '@/components/ui/cn'

interface LevelBadgeProps {
  level: number
  className?: string
  size?: 'xs' | 'sm' | 'md'
}

const SIZE = {
  /** 장면 아래 정보 줄에 이름과 나란히 놓는 크기 */
  xs: { box: 'h-9 w-9', label: 'text-[7px]', value: 'text-[12px]' },
  sm: { box: 'h-12 w-12', label: 'text-[9px]', value: 'text-[16px]' },
  md: { box: 'h-[58px] w-[58px]', label: 'text-[10px]', value: 'text-[19px]' },
}

/** 목업의 동그란 분홍 레벨 배지. */
export function LevelBadge({ level, className, size = 'md' }: LevelBadgeProps) {
  const s = SIZE[size]
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-full bg-coral text-surface',
        'shadow-[0_3px_0_0_rgba(217,108,97,0.55)] ring-[3px] ring-surface',
        s.box,
        className,
      )}
    >
      <span className={cn('font-game leading-none tracking-[0.08em] opacity-90', s.label)}>LV.</span>
      <span className={cn('font-game font-medium leading-none', s.value)}>{level}</span>
    </div>
  )
}
