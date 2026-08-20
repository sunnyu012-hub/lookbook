import type { ReactNode } from 'react'

interface StatCardProps {
  /** 그림 경로. 직접 그린 요소를 쓰고 싶으면 iconNode 를 준다. */
  icon?: string
  iconNode?: ReactNode
  label: string
  value: number
}

/** ME 화면 통계 칸. 그림 + 숫자 + 라벨. */
export function StatCard({ icon, iconNode, label, value }: StatCardProps) {
  return (
    <div className="rounded-card border border-line bg-surface px-2 py-3.5 text-center">
      <div className="flex h-8 items-center justify-center">
        {iconNode ?? <img src={icon} alt="" aria-hidden className="h-8 w-8 object-contain" />}
      </div>
      <p className="mt-1.5 font-game text-[18px] leading-none text-ink">
        {value.toLocaleString('ko-KR')}
      </p>
      <p className="mt-1 text-[10.5px] leading-tight text-inkdim">{label}</p>
    </div>
  )
}
