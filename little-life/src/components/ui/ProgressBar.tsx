import { cn } from './cn'

interface ProgressBarProps {
  /** 0 ~ 1 */
  value: number
  className?: string
  /**
   * 채움 색. 기본값과 합쳐 쓰지 않고 통째로 갈아끼운다 —
   * `bg-ink` 와 `bg-clay` 를 같이 넘기면 어느 쪽이 이길지 CSS 순서에 달려서 색이 뒤집힌다.
   */
  barClassName?: string
  /** 트랙 두께 */
  thickness?: 'sm' | 'md'
}

const THICKNESS = { sm: 'h-1.5', md: 'h-2.5' }

/** EXP 바. width 트랜지션만으로 부드럽게 차오른다. */
export function ProgressBar({
  value,
  className,
  barClassName = 'bg-ink',
  thickness = 'md',
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value * 100))
  return (
    <div
      className={cn('w-full overflow-hidden rounded-pill bg-ivorydeep', THICKNESS[thickness], className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div
        className={cn('h-full rounded-pill transition-[width] duration-700 ease-out', barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
