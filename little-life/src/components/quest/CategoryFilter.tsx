import type { Category } from '@/types'
import { CATEGORIES } from '@/types'
import { categoryStyle } from '@/lib/categories'
import { CATEGORY_BADGE } from '@/lib/assets'
import { cn } from '@/components/ui/cn'

export type CategoryFilterValue = 'ALL' | Category

const OPTIONS: CategoryFilterValue[] = ['ALL', ...CATEGORIES]

interface CategoryFilterProps {
  value: CategoryFilterValue
  onChange: (value: CategoryFilterValue) => void
}

/** 목업처럼 두 줄로 접히는 칩. 선택된 칩만 파스텔로 채운다. */
export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="카테고리 필터">
      {OPTIONS.map((option) => {
        const active = option === value
        const style = option === 'ALL' ? null : categoryStyle(option)

        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option)}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1 rounded-pill pl-1.5 pr-3',
              'transition-transform duration-150 ease-out active:scale-[0.96]',
              active
                ? style
                  ? cn(style.chip, style.text, 'ring-[1.5px] ring-inset', style.ring)
                  : 'bg-coral pl-3 text-surface'
                : 'bg-surface text-inkdim ring-1 ring-inset ring-line',
            )}
          >
            {option !== 'ALL' && (
              <img
                src={CATEGORY_BADGE[option]}
                alt=""
                aria-hidden
                className={cn('h-6 w-6 object-contain', !active && 'opacity-70')}
              />
            )}
            <span className="font-game text-[11px] leading-none tracking-[0.06em]">{option}</span>
          </button>
        )
      })}
    </div>
  )
}
