import type { RepeatRule } from '@/types'
import { WEEKDAY_LABELS } from '@/lib/routines'
import { cn } from '@/components/ui/cn'

/** 화면에서 다루는 선택지. null 은 "반복 안 함". */
export type RepeatChoice = RepeatRule | null

interface RepeatSelectorProps {
  value: RepeatChoice
  onChange: (value: RepeatChoice) => void
}

const PRESETS: Array<{ label: string; value: RepeatChoice }> = [
  { label: '안 함', value: null },
  { label: '매일', value: { kind: 'daily' } },
  { label: '평일', value: { kind: 'weekdays' } },
  { label: '요일 선택', value: { kind: 'days', days: [] } },
]

function isSame(a: RepeatChoice, b: RepeatChoice): boolean {
  if (a === null || b === null) return a === b
  return a.kind === b.kind
}

export function RepeatSelector({ value, onChange }: RepeatSelectorProps) {
  const pickedDays = value?.kind === 'days' ? value.days : null

  const toggleDay = (day: number) => {
    if (!pickedDays) return
    const next = pickedDays.includes(day)
      ? pickedDays.filter((d) => d !== day)
      : [...pickedDays, day]
    onChange({ kind: 'days', days: next })
  }

  return (
    <div>
      <p className="mb-2 text-[13px] font-medium text-inkdim">반복</p>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => {
          const active = isSame(value, preset.value)
          return (
            <button
              key={preset.label}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(preset.value)}
              className={cn(
                'inline-flex h-11 items-center rounded-pill px-4 text-[13.5px]',
                'transition-transform duration-150 ease-out active:scale-[0.96]',
                active
                  ? 'bg-coral-soft text-coral-deep ring-[1.5px] ring-inset ring-coral'
                  : 'bg-canvas text-inkdim ring-1 ring-inset ring-line',
              )}
            >
              {preset.label}
            </button>
          )
        })}
      </div>

      {pickedDays && (
        <div className="mt-2.5">
          <div className="flex gap-1.5">
            {WEEKDAY_LABELS.map((label, day) => {
              const active = pickedDays.includes(day)
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${label}요일`}
                  onClick={() => toggleDay(day)}
                  className={cn(
                    'h-11 flex-1 rounded-xl text-[13.5px]',
                    'transition-transform duration-150 ease-out active:scale-[0.94]',
                    active
                      ? 'bg-coral text-surface'
                      : 'bg-canvas text-inkdim ring-1 ring-inset ring-line',
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {pickedDays.length === 0 && (
            <p className="mt-2 text-[12px] text-inkfaint">돌릴 요일을 하나 이상 골라줘.</p>
          )}
        </div>
      )}

      {value !== null && pickedDays?.length !== 0 && (
        <p className="mt-2 text-[12px] text-inkfaint">
          해당하는 날 아침에 알아서 생겨. 빠진 날은 그냥 넘어가.
        </p>
      )}
    </div>
  )
}
