import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

type Variant = 'primary' | 'soft' | 'quiet' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: Variant
  size?: Size
}

const VARIANT: Record<Variant, string> = {
  primary: 'bg-ink text-surface',
  soft: 'bg-sunken text-ink',
  quiet: 'bg-transparent text-inkdim',
  danger: 'bg-rose-deep text-surface',
}

// 터치 타겟은 최소 44px 을 지킨다.
const SIZE: Record<Size, string> = {
  sm: 'min-h-[44px] px-4 text-[14px]',
  md: 'min-h-[48px] px-5 text-[15px]',
  lg: 'min-h-[54px] px-6 text-[16px]',
}

/** 눌렀을 때 살짝 들어가는 느낌만 준다. 요란하게 만들지 않는다. */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-btn font-medium',
        'transition-[transform,opacity] duration-150 ease-out',
        'active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
