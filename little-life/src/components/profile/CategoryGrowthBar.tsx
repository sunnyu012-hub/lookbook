import type { Category } from '@/types'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { categoryStyle } from '@/lib/categories'
import { CATEGORY_BADGE } from '@/lib/assets'

interface CategoryGrowthBarProps {
  category: Category
  exp: number
  /** 여섯 개 중 가장 큰 값. 상대 길이를 여기에 맞춘다. */
  max: number
}

export function CategoryGrowthBar({ category, exp, max }: CategoryGrowthBarProps) {
  const style = categoryStyle(category)

  return (
    <div className="flex items-center gap-2.5">
      <img
        src={CATEGORY_BADGE[category]}
        alt=""
        aria-hidden
        className="h-7 w-7 shrink-0 object-contain"
      />
      <span className={`w-[46px] shrink-0 font-game text-[11px] tracking-[0.04em] ${style.text}`}>
        {category}
      </span>
      <ProgressBar
        className="flex-1"
        value={max > 0 ? exp / max : 0}
        thickness="sm"
        barClassName={style.bar}
        aria-label={`${category} 누적 ${exp} EXP`}
      />
      <span className="w-[52px] shrink-0 text-right font-game text-[11px] text-inkdim">
        {exp} EXP
      </span>
    </div>
  )
}
