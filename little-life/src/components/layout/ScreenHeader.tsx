import type { ReactNode } from 'react'

interface ScreenHeaderProps {
  title: string
  /** 우측에 놓는 작은 요소 (카운터 등) */
  trailing?: ReactNode
}

/** 목업의 화면 상단 — 왼쪽에 큰 제목, 오른쪽에 작은 정보. */
export function ScreenHeader({ title, trailing }: ScreenHeaderProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="text-[22px] font-bold tracking-[0.02em] text-ink">{title}</h1>
      {trailing}
    </div>
  )
}

interface SectionHeaderProps {
  title: string
  trailing?: ReactNode
}

/**
 * 섹션 제목.
 *
 * 여기에 배지 그림을 작게 넣어봤는데, 그림이 촘촘해서 20px 에서는 뭉개지고
 * 제목만 어수선해졌다. 그림은 충분히 크게 보여줄 수 있는 곳에만 쓴다.
 */
export function SectionHeader({ title, trailing }: SectionHeaderProps) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
      <div className="ml-auto">{trailing}</div>
    </div>
  )
}

/** 섹션 제목 옆의 작은 개수 표시. */
export function CountPill({ value, tone = 'neutral' }: { value: number; tone?: 'neutral' | 'leaf' }) {
  return (
    <span
      className={
        'inline-flex h-6 min-w-[24px] items-center justify-center rounded-pill px-2 font-game text-[11px] leading-none ' +
        (tone === 'leaf' ? 'bg-leaf-soft text-leaf-deep' : 'bg-sunken text-inkdim')
      }
    >
      {value}
    </span>
  )
}
