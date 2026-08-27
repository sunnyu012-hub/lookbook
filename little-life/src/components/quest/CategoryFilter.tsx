import type { Category } from '@/types'
import { CATEGORIES } from '@/types'
import { categoryStyle } from '@/lib/categories'
import { CATEGORY_LABEL } from '@/lib/labels'
import { CATEGORY_BADGE } from '@/lib/assets'
import { cn } from '@/components/ui/cn'

export type CategoryFilterValue = 'ALL' | Category

const OPTIONS: CategoryFilterValue[] = ['ALL', ...CATEGORIES]

interface CategoryFilterProps {
  value: CategoryFilterValue
  onChange: (value: CategoryFilterValue) => void
  /**
   * 이 분야들만 칩으로 만든다. 안 주면 전부 만든다.
   *
   * 몬스터 목록처럼 애초에 없는 분야가 있는 곳에 쓴다 — 눌러도 빈 목록이 나오는
   * 칩은 고르는 걸 돕는 게 아니라 한 번 헛걸음시키는 것뿐이다.
   */
  only?: Category[]
}

/** 목업처럼 두 줄로 접히는 칩. 선택된 칩만 파스텔로 채운다. */
export function CategoryFilter({ value, onChange, only }: CategoryFilterProps) {
  const options = only ? OPTIONS.filter((o) => o === 'ALL' || only.includes(o)) : OPTIONS

  return (
    <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="카테고리 필터">
      {options.map((option) => {
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
            <span className="text-[12px] font-medium leading-none">
              {option === 'ALL' ? '전체' : CATEGORY_LABEL[option]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
