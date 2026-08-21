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
  // 목업의 분홍 버튼 — 아래쪽에 한 겹 두께를 줘서 살짝 눌리는 느낌
  primary: 'bg-coral text-surface shadow-[0_3px_0_0_rgba(217,108,97,0.5)] active:shadow-none active:translate-y-[2px]',
  soft: 'bg-sunken text-ink',
  quiet: 'bg-transparent text-inkdim',
  danger: 'bg-coral-deep text-surface',
}

// 터치 타겟은 최소 44px 을 지킨다.
const SIZE: Record<Size, string> = {
  sm: 'min-h-[44px] px-4 text-[14px]',
  md: 'min-h-[48px] px-5 text-[15px]',
  lg: 'min-h-[52px] px-6 text-[15.5px]',
}

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
        'transition-[transform,opacity,box-shadow] duration-150 ease-out',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0',
        variant !== 'primary' && 'active:scale-[0.97]',
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
