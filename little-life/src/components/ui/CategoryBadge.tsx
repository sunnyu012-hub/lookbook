import type { Category } from '@/types'
import { categoryStyle } from '@/lib/categories'
import { CATEGORY_LABEL } from '@/lib/labels'
import { CATEGORY_BADGE } from '@/lib/assets'
import { cn } from './cn'

interface CategoryBadgeProps {
  category: Category
  className?: string
}

/** 그림 배지 + 글자. 색만으로 구분하지 않도록 라벨을 항상 같이 둔다. */
export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const style = categoryStyle(category)
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-pill py-0.5 pl-1 pr-2.5',
        style.chip,
        style.text,
        className,
      )}
    >
      <img src={CATEGORY_BADGE[category]} alt="" aria-hidden className="h-5 w-5 object-contain" />
      <span className="text-[11px] font-medium leading-none">{CATEGORY_LABEL[category]}</span>
    </span>
  )
}

interface CategoryThumbProps {
  category: Category
  className?: string
}

/** 퀘스트 카드 왼쪽에 놓는 정사각 썸네일. 목업의 퀘스트 행 스타일. */
export function CategoryThumb({ category, className }: CategoryThumbProps) {
  const style = categoryStyle(category)
  return (
    <span
      className={cn(
        'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
        style.chip,
        className,
      )}
    >
      <img
        src={CATEGORY_BADGE[category]}
        alt=""
        aria-hidden
        className="h-9 w-9 object-contain"
      />
    </span>
  )
}
