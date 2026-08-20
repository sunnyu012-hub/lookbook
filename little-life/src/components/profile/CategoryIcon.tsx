import type { ReactNode } from 'react'
import type { Category } from '@/types'
import { categoryStyle } from '@/lib/categories'
import { cn } from '@/components/ui/cn'

/** 카테고리마다 아주 단순한 선 아이콘 하나씩. */
const GLYPH: Record<Category, ReactNode> = {
  LIFE: <path d="M4 10 L12 4 L20 10 V20 H4 Z" />,
  WORK: (
    <>
      <rect x="3.5" y="7.5" width="17" height="12" rx="2.5" />
      <path d="M9 7.5 V5.5 H15 V7.5" />
    </>
  ),
  BODY: (
    <>
      <path d="M6.5 9 V15" />
      <path d="M17.5 9 V15" />
      <path d="M4 10.5 V13.5" />
      <path d="M20 10.5 V13.5" />
      <path d="M6.5 12 H17.5" />
    </>
  ),
  PLAY: <path d="M12 4 L14.4 9.4 L20 10.1 L15.9 14 L17 19.6 L12 16.8 L7 19.6 L8.1 14 L4 10.1 L9.6 9.4 Z" />,
  MIND: (
    <>
      <path d="M5 5.5 H10 A2.5 2.5 0 0 1 12 8 V19 A2.5 2.5 0 0 0 10 17 H5 Z" />
      <path d="M19 5.5 H14 A2.5 2.5 0 0 0 12 8 V19 A2.5 2.5 0 0 1 14 17 H19 Z" />
    </>
  ),
  HEART: <path d="M12 19.5 C6 15.5 3.5 12.6 3.5 9.6 A4.1 4.1 0 0 1 12 7.4 A4.1 4.1 0 0 1 20.5 9.6 C20.5 12.6 18 15.5 12 19.5 Z" />,
}

interface CategoryIconProps {
  category: Category
  className?: string
}

export function CategoryIcon({ category, className }: CategoryIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('h-4 w-4', categoryStyle(category).text, className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {GLYPH[category]}
    </svg>
  )
}
