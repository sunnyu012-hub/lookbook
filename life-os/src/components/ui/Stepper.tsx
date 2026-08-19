import { cn } from '@/lib/cn'
import { haptic } from '@/hooks/useHaptic'

interface Props {
  label: string
  hint?: string
  value: number
  min?: number
  max?: number
  /** 각 눈금의 짧은 설명 (min 부터 순서대로) */
  captions?: string[]
  accent?: string
  onChange: (v: number) => void
}

/**
 * 1~5(또는 0~5) 척도 입력. 슬라이더 대신 큰 탭 타깃을 써서 한 손으로 빠르게 찍을 수 있게 한다.
 */
export function Stepper({
  label,
  hint,
  value,
  min = 1,
  max = 5,
  captions,
  accent = '#F2F0EB',
  onChange,
}: Props) {
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i)
  const caption = captions?.[value - min]

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="klabel">{label}</span>
        <span className="text-[11px] text-faint">{caption ?? hint}</span>
      </div>
      <div className="flex gap-1.5">
        {steps.map((step) => {
          const active = step === value
          return (
            <button
              key={step}
              type="button"
              aria-label={`${label} ${step}`}
              aria-pressed={active}
              onClick={() => {
                haptic()
                onChange(step)
              }}
              className={cn(
                'press tnum h-12 flex-1 rounded-xl border text-[15px] transition-colors duration-200',
                active ? 'border-transparent text-ink' : 'border-line text-faint',
              )}
              style={active ? { backgroundColor: accent } : undefined}
            >
              {step}
            </button>
          )
        })}
      </div>
    </div>
  )
}
