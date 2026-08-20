import type { Category } from '@/types'
import { CATEGORIES } from '@/types'
import { categoryStyle } from '@/lib/categories'
import { cn } from '@/components/ui/cn'

export type CategoryFilterValue = 'ALL' | Category

const OPTIONS: CategoryFilterValue[] = ['ALL', ...CATEGORIES]

interface CategoryFilterProps {
  value: CategoryFilterValue
  onChange: (value: CategoryFilterValue) => void
}

/** 한 줄 가로 스크롤 필터. 선택된 칩만 파스텔로 채운다. */
export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <div
      className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="카테고리 필터"
    >
      <div className="flex w-max gap-2 py-0.5">
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
                'inline-flex h-10 shrink-0 items-center justify-center rounded-pill px-4 font-game text-[12px] tracking-[0.1em]',
                'transition-transform duration-150 ease-out active:scale-[0.96]',
                active
                  ? style
                    ? cn(style.chip, style.text, 'ring-[1.5px] ring-inset', style.ring)
                    : 'bg-ink text-surface'
                  : 'bg-surface text-inkdim ring-1 ring-inset ring-line',
              )}
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}
