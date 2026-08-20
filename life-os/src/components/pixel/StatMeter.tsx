import { cn } from '@/lib/cn'

export type MeterShape = 'heart' | 'diamond' | 'bar' | 'dot'

interface Props {
  value: number
  max?: number
  shape: MeterShape
  color: string
}

/**
 * RPG 스탯 표시기.
 * 스탯을 나타내는 픽셀 아이콘은 왼쪽에 하나만 두고, 값은 이 작은 도형으로만 표현한다
 * (같은 에셋을 다섯 번 늘어놓지 않기 위해).
 */
export function StatMeter({ value, max = 5, shape, color }: Props) {
  const pips = Array.from({ length: max }, (_, i) => i + 1)
  const dim = 'rgba(107, 74, 61, 0.14)'

  return (
    <span className="inline-flex items-center gap-[3px]" aria-label={`${value} / ${max}`}>
      {pips.map((n) => {
        const on = n <= value
        const fill = on ? color : dim

        if (shape === 'heart') {
          return (
            <span
              key={n}
              aria-hidden
              className={cn('block h-[9px] w-[10px] transition-colors duration-200')}
              style={{
                backgroundColor: fill,
                // 픽셀 하트: 위쪽 두 덩이 + 아래 삼각형
                clipPath:
                  'polygon(20% 0, 40% 0, 40% 20%, 60% 20%, 60% 0, 80% 0, 100% 20%, 100% 50%, 50% 100%, 0 50%, 0 20%)',
              }}
            />
          )
        }

        if (shape === 'diamond') {
          return (
            <span
              key={n}
              aria-hidden
              className="block h-[8px] w-[8px] rotate-45 rounded-[1px] transition-colors duration-200"
              style={{ backgroundColor: fill }}
            />
          )
        }

        if (shape === 'dot') {
          return (
            <span
              key={n}
              aria-hidden
              className="block h-[8px] w-[8px] rounded-full transition-colors duration-200"
              style={{ backgroundColor: fill }}
            />
          )
        }

        return (
          <span
            key={n}
            aria-hidden
            className="block h-[9px] w-[13px] rounded-[1px] transition-colors duration-200"
            style={{ backgroundColor: fill }}
          />
        )
      })}
    </span>
  )
}
