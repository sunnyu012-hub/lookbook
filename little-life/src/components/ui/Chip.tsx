import type { ReactNode } from 'react'
import { cn } from './cn'

interface ChipProps {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
}

/** 필터·선택지에 쓰는 알약 모양 칩. */
export function Chip({ children, active = false, onClick, className }: ChipProps) {
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-pill px-3.5 font-game text-[12px] tracking-[0.08em]',
        'transition-all duration-150 ease-out',
        onClick && 'active:scale-[0.96]',
        active
          ? 'bg-ink text-milk'
          : 'bg-milk text-inkdim ring-1 ring-inset ring-line hover:text-ink',
        className,
      )}
    >
      {children}
    </Tag>
  )
}
