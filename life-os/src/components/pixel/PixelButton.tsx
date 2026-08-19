import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { haptic } from '@/hooks/useHaptic'
import type { PixelAsset } from '@/lib/pixelAssets'
import { PixelImage } from './PixelImage'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: PixelAsset
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
        'press inline-flex items-center justify-center gap-2 rounded-px4 border-[1.5px] px-4 py-3 font-pixel text-[12px] uppercase tracking-[0.04em] disabled:opacity-50',
        tone === 'primary'
          ? 'border-pinkdeep bg-pink text-white shadow-hardpink'
          : 'border-border bg-ivory text-ink shadow-hard',
        full && 'w-full',
        className,
      )}
    >
      {icon && <PixelImage asset={icon} height={18} />}
      {children}
    </button>
  )
}
