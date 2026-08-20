import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

type Variant = 'primary' | 'soft' | 'ghost'
type Size = 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: Variant
  size?: Size
}

const VARIANT: Record<Variant, string> = {
  primary: 'bg-ink text-milk hover:bg-ink/90',
  soft: 'bg-ivorydeep text-ink hover:bg-line',
  ghost: 'bg-transparent text-inkdim hover:text-ink',
}

const SIZE: Record<Size, string> = {
  md: 'h-11 px-4 text-[15px]',
  lg: 'h-14 px-5 text-base',
}

/** 눌렀을 때 살짝 들어가는 느낌만 준다. 요란하게 만들지 않는다. */
export function Button({ children, variant = 'primary', size = 'md', className, ...rest }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-pill font-medium',
        'transition-[transform,background-color,opacity] duration-150 ease-out',
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
