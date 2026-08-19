import { cn } from '@/lib/cn'
import { haptic } from '@/hooks/useHaptic'
import { PixelIcon } from './PixelIcon'
import type { IconName } from '@/lib/sprites.generated'

export interface IconOption {
  value: number
  icon: IconName
  caption: string
}

interface Props {
  options: IconOption[]
  value: number
  onChange: (value: number) => void
  label: string
}

/** 표정·날씨 같은 아이콘 선택지. 선택하면 2px 떠오르고 캡션이 바뀐다. */
export function IconPicker({ options, value, onChange, label }: Props) {
  return (
    <div>
      <div className="flex gap-1.5" role="group" aria-label={label}>
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              aria-label={`${label} ${option.caption}`}
              aria-pressed={active}
              onClick={() => {
                haptic()
                onChange(option.value)
              }}
              className={cn(
                'flex flex-1 items-center justify-center rounded-px2 border-2 py-2 transition-[transform,background-color] duration-150',
                active
                  ? '-translate-y-[2px] border-ink bg-butter shadow-hard'
                  : 'border-ink/15 bg-cream',
              )}
            >
              <PixelIcon name={option.icon} size={24} className={active ? 'animate-pop' : ''} />
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-center text-[12px] text-inkdim">
        {options.find((o) => o.value === value)?.caption}
      </p>
    </div>
  )
}
