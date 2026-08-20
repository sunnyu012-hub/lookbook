interface EmptyStateProps {
  title: string
  hint?: string
}

/**
 * 비어 있을 때 보여주는 문구.
 * "왜 안 했냐" 대신 "하나 해볼까" 쪽으로 말한다.
 */
export function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div className="rounded-card border border-dashed border-line bg-milk/60 px-5 py-8 text-center">
      <p className="text-[15px] text-inkdim">{title}</p>
      {hint && <p className="mt-1.5 text-[13px] text-inkfaint">{hint}</p>}
    </div>
  )
}
