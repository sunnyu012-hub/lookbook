import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { PixelIcon } from './PixelIcon'
import type { IconName } from '@/lib/sprites.generated'

interface Props {
  /** 라틴 대문자 타이틀 (픽셀 폰트) */
  title?: string
  icon?: IconName
  right?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}

/** RPG 대화창 느낌의 패널. 모든 걸 이 안에 넣지 않는다 — 강조할 블록에만. */
export function PixelPanel({ title, icon, right, className, bodyClassName, children }: Props) {
  return (
    <section className={cn('panel', className)}>
      {title && (
        <header className="flex items-center gap-1.5 border-b-2 border-ink/15 px-3 py-2">
          {icon && <PixelIcon name={icon} size={16} />}
          <h2 className="ptitle flex-1">{title}</h2>
          {right}
        </header>
      )}
      <div className={cn('p-3', bodyClassName)}>{children}</div>
    </section>
  )
}
