import { cn } from '@/lib/cn'
import { haptic } from '@/hooks/useHaptic'

interface Props {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  onLabel?: string
  offLabel?: string
}

export function Toggle({ label, value, onChange, onLabel = 'YES', offLabel = 'NO' }: Props) {
  return (
    <div className="flex items-center justify-between">
      <span className="klabel">{label}</span>
      <div className="flex gap-1.5">
        {[false, true].map((option) => (
          <button
            key={String(option)}
            type="button"
            aria-pressed={value === option}
            onClick={() => {
              haptic()
              onChange(option)
            }}
            className={cn(
              'press rounded-full px-5 py-2 text-[12px] font-medium tracking-wide transition-colors duration-200',
              value === option
                ? 'bg-paper text-ink'
                : 'border border-line text-faint',
            )}
          >
            {option ? onLabel : offLabel}
          </button>
        ))}
      </div>
    </div>
  )
}
