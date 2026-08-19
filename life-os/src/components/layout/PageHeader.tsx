interface Props {
  eyebrow: string
  title: string
  meta?: string
}

/** 매거진 헤더 — 작은 대문자 라벨 + 큰 세리프 타이틀. */
export function PageHeader({ eyebrow, title, meta }: Props) {
  return (
    <header className="mb-7 flex items-end justify-between">
      <div>
        <p className="label mb-2">{eyebrow}</p>
        <h1 className="font-display text-[34px] leading-none tracking-tight">{title}</h1>
      </div>
      {meta && <p className="label pb-1">{meta}</p>}
    </header>
  )
}
