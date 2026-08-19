import type { ReactNode } from 'react'

interface Props {
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-line px-6 py-14 text-center">
      <p className="font-display text-2xl">{title}</p>
      <p className="max-w-[260px] text-[13px] leading-relaxed text-muted">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
