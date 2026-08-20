import type { Category } from '@/types'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { categoryStyle } from '@/lib/categories'
import { CategoryIcon } from './CategoryIcon'

interface CategoryGrowthBarProps {
  category: Category
  exp: number
  /** 여섯 개 중 가장 큰 값. 상대 길이를 여기에 맞춘다. */
  max: number
}

export function CategoryGrowthBar({ category, exp, max }: CategoryGrowthBarProps) {
  const style = categoryStyle(category)

  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <CategoryIcon category={category} />
        <span className={`font-game text-[11px] tracking-[0.1em] ${style.text}`}>{category}</span>
        <span className="ml-auto font-game text-[11px] tracking-[0.04em] text-inkdim">
          {exp} EXP
        </span>
      </div>
      <ProgressBar
        value={max > 0 ? exp / max : 0}
        thickness="sm"
        barClassName={style.bar}
        aria-label={`${category} 누적 ${exp} EXP`}
      />
    </div>
  )
}
