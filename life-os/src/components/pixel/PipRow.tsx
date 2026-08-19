import { PixelIcon } from './PixelIcon'
import type { IconName } from '@/lib/sprites.generated'
import { cn } from '@/lib/cn'
import { haptic } from '@/hooks/useHaptic'

interface Props {
  on: IconName
  off: IconName
  value: number
  max?: number
  size?: 16 | 24
  /** 넘기면 선택 가능한 입력이 된다 */
  onChange?: (value: number) => void
  label?: string
}

/** ♥♥♥♡♡ 같은 RPG 스탯 표시. onChange 를 주면 그대로 입력 위젯이 된다. */
export function PipRow({ on, off, value, max = 5, size = 16, onChange, label }: Props) {
  const pips = Array.from({ length: max }, (_, i) => i + 1)

  if (!onChange) {
    return (
      <span className="inline-flex gap-1" aria-label={label ? `${label} ${value}/${max}` : undefined}>
        {pips.map((n) => (
          <PixelIcon key={n} name={n <= value ? on : off} size={size} />
        ))}
      </span>
    )
  }

  return (
    <div className="inline-flex gap-1.5" role="group" aria-label={label}>
      {pips.map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${label ?? ''} ${n}`}
          aria-pressed={n <= value}
          onClick={() => {
            haptic()
            onChange(n)
          }}
          className={cn(
            'rounded-px2 p-1 transition-transform duration-150',
            n <= value ? '-translate-y-[2px]' : 'translate-y-0 opacity-80',
          )}
        >
          <PixelIcon name={n <= value ? on : off} size={size} />
        </button>
      ))}
    </div>
  )
}
