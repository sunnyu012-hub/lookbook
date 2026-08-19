import { cn } from '@/lib/cn'
import { haptic } from '@/hooks/useHaptic'

interface Props {
  options: string[]
  value: string | null | undefined
  onChange: (v: string | null) => void
}

/** 한 번 더 누르면 선택 해제되는 가벼운 태그 선택 */
export function ChipGroup({ options, value, onChange }: Props) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5">
      {options.map((option) => {
        const active = value === option
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => {
              haptic()
              onChange(active ? null : option)
            }}
            className={cn(
              'press shrink-0 rounded-full px-4 py-2 text-[13px] transition-colors duration-200',
              active ? 'bg-paper text-ink' : 'border border-line text-muted',
            )}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
