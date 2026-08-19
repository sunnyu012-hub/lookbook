import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { haptic } from '@/hooks/useHaptic'

type Variant = 'primary' | 'ghost' | 'outline'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  full?: boolean
  children: ReactNode
}

const styles: Record<Variant, string> = {
  primary: 'bg-paper text-ink hover:bg-white',
  ghost: 'bg-elevated text-paper',
  outline: 'border border-line text-paper',
}

export function Button({ variant = 'primary', full, className, children, onClick, ...rest }: Props) {
  return (
    <button
      {...rest}
      onClick={(e) => {
        haptic()
        onClick?.(e)
      }}
      className={cn(
        'press rounded-full px-6 py-4 text-[15px] font-medium tracking-tight disabled:opacity-40',
        styles[variant],
        full && 'w-full',
        className,
      )}
    >
      {children}
    </button>
  )
}
