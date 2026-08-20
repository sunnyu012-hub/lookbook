import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { PixelAsset } from '@/lib/pixelAssets'
import { PixelImage } from './PixelImage'
import { PixelSparkle } from './PixelSparkle'

interface Props {
  title?: string
  icon?: PixelAsset
  right?: ReactNode
  /** 제목 옆에 아주 작은 반짝임 하나 */
  sparkle?: boolean
  className?: string
  bodyClassName?: string
  children: ReactNode
}

/** 가볍게 만든 RPG 창. 모든 걸 이 안에 넣지 않는다. */
export function PixelPanel({
  title,
  icon,
  right,
  sparkle,
  className,
  bodyClassName,
  children,
}: Props) {
  return (
    <section className={cn('panel', className)}>
      {title && (
        <header className="flex items-center gap-1.5 border-b border-dashed border-border px-3 py-2">
          {icon && <PixelImage asset={icon} height={18} />}
          <h2 className="ptitle flex-1">{title}</h2>
          {sparkle && <PixelSparkle size={11} />}
          {right}
        </header>
      )}
      <div className={cn('p-3', bodyClassName)}>{children}</div>
    </section>
  )
}
