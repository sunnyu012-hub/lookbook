import { cn } from '@/lib/cn'

interface Props {
  score: number
  color: string
  segments?: number
  className?: string
}

/** HP 바 — 그라데이션 없이 칸이 딱딱 끊어지는 세그먼트 바. */
export function EnergyBar({ score, color, segments = 10, className }: Props) {
  const filled = Math.round((Math.min(100, Math.max(0, score)) / 100) * segments)

  return (
    <div
      className={cn('flex gap-[3px] rounded-px2 border-2 border-ink bg-creamdeep p-[3px]', className)}
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Energy"
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className="h-3 flex-1 rounded-[1px] transition-colors duration-200"
          style={{ backgroundColor: i < filled ? color : 'rgba(90,75,62,0.12)' }}
        />
      ))}
    </div>
  )
}
