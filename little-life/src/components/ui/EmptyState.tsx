import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  hint?: string
  action?: ReactNode
}

/**
 * 비어 있을 때 보여주는 자리.
 *
 * 오류처럼 보이지 않고 "지금은 조용한 상태" 로 읽히게 한다.
 * "왜 안 했냐" 대신 "하나 해볼까" 쪽으로 말한다.
 */
export function EmptyState({ title, hint, action }: EmptyStateProps) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface/60 px-5 py-9 text-center">
      <p className="text-[15px] text-ink">{title}</p>
      {hint && <p className="mt-1.5 text-[13px] leading-relaxed text-inkdim">{hint}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
