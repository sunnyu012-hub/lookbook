import type { ReactNode } from 'react'
import { cn } from './cn'

interface CardProps {
  children: ReactNode
  className?: string
}

/** 앱 전체에서 쓰는 기본 카드. 둥근 모서리 + 아주 옅은 그림자. */
export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-line/70 bg-milk px-5 py-4 shadow-soft',
        className,
      )}
    >
      {children}
    </div>
  )
}
