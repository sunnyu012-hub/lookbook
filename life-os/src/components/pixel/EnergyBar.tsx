import { cn } from '@/lib/cn'

interface Props {
  score: number
  /** 채워진 칸 색 */
  color: string
  segments?: number
  className?: string
  /** 낮은 값에서 앞쪽 칸을 진하게 — 게임 HP 바 느낌 */
  height?: number
}

/**
 * 세그먼트 픽셀 바. 그라데이션을 쓰지 않고 칸이 또렷하게 끊어지게 만든다.
 */
export function EnergyBar({ score, color, segments = 10, className, height = 14 }: Props) {
  const clamped = Math.min(100, Math.max(0, score))
  const filled = Math.round((clamped / 100) * segments)

  return (
    <div
      className={cn(
        'flex gap-[3px] rounded-px2 border-[1.5px] border-borderdeep bg-creamdeep p-[3px]',
        className,
      )}
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Energy"
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className="flex-1 rounded-[1px] transition-colors duration-200"
          style={{
            height,
            backgroundColor: i < filled ? color : 'rgba(107, 74, 61, 0.10)',
          }}
        />
      ))}
    </div>
  )
}
