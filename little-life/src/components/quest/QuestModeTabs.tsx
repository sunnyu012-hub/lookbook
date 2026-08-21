import { cn } from '@/components/ui/cn'

export type QuestMode = 'DAILY' | 'MONSTER' | 'BOSS'

const OPTIONS: Array<{ value: QuestMode; label: string; count?: number }> = [
  { value: 'DAILY', label: 'DAILY' },
  { value: 'MONSTER', label: 'MONSTER' },
  { value: 'BOSS', label: 'BOSS' },
]

interface QuestModeTabsProps {
  value: QuestMode
  onChange: (value: QuestMode) => void
  /** 진행 중인 개수 — 탭에 작은 점으로만 표시한다 */
  activeCounts?: Partial<Record<QuestMode, number>>
}

/** 오늘 할 일 / 미뤄둔 일 / 큰 목표를 나누는 세그먼트. */
export function QuestModeTabs({ value, onChange, activeCounts }: QuestModeTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="퀘스트 종류"
      className="mb-3 flex gap-1 rounded-pill bg-sunken p-1"
    >
      {OPTIONS.map((option) => {
        const active = option.value === value
        const count = activeCounts?.[option.value] ?? 0

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex min-h-[38px] flex-1 items-center justify-center gap-1 rounded-pill',
              'font-game text-[10px] tracking-[0.08em]',
              'transition-[background-color,color] duration-200 ease-out active:scale-[0.97]',
              active ? 'bg-surface text-ink shadow-soft' : 'bg-transparent text-inkdim',
            )}
          >
            {option.label}
            {count > 0 && (
              <span
                className={cn(
                  'inline-flex h-4 min-w-[16px] items-center justify-center rounded-pill px-1 text-[9px] leading-none',
                  active ? 'bg-coral text-surface' : 'bg-surface text-inkdim',
                )}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
