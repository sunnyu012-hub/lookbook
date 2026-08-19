import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { haptic } from '@/hooks/useHaptic'
import { PixelIcon } from './PixelIcon'
import type { IconName } from '@/lib/sprites.generated'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: IconName
  tone?: 'primary' | 'plain'
  full?: boolean
  children: ReactNode
}

export function PixelButton({
  icon,
  tone = 'primary',
  full,
  className,
  children,
  onClick,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      onClick={(e) => {
        haptic()
        onClick?.(e)
      }}
      className={cn(
        'press inline-flex items-center justify-center gap-2 rounded-px3 border-2 border-ink px-4 py-3 font-pixel text-[12px] uppercase tracking-[0.06em] disabled:opacity-50',
        tone === 'primary' ? 'bg-butter text-ink' : 'bg-ivory text-ink',
        full && 'w-full',
        className,
      )}
    >
      {icon && <PixelIcon name={icon} size={16} />}
      {children}
    </button>
  )
}
