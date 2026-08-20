import type { Category } from '@/types'
import { categoryStyle } from '@/lib/categories'
import { cn } from './cn'

interface CategoryBadgeProps {
  category: Category
  className?: string
}

/** 퀘스트 카드에 붙는 카테고리 라벨. 게임 요소라 게임 폰트를 쓴다. */
export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const style = categoryStyle(category)
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-pill px-2.5 font-game text-[11px] tracking-[0.1em]',
        style.chip,
        style.text,
        className,
      )}
    >
      {category}
    </span>
  )
}
