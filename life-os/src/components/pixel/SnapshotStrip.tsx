import type { ReactNode } from 'react'
import type { PixelAsset } from '@/lib/pixelAssets'
import { PixelImage } from './PixelImage'
import { cn } from '@/lib/cn'

export interface SnapshotItem {
  key: string
  icon: PixelAsset
  /** 위쪽 라틴 라벨 */
  label: string
  /** 큰 값 */
  value: string
  /** 아래 한 줄 */
  sub?: string
  tint?: string
  onClick?: () => void
}

/**
 * Life Snapshot — 오늘의 삶을 한 줄로.
 * 카드를 크게 만들지 않는다. 옆으로 흘려 보고 넘어가는 띠에 가깝다.
 */
export function SnapshotStrip({ items }: { items: SnapshotItem[] }) {
  if (items.length === 0) return null

  return (
    <div className="no-scrollbar bleed flex gap-2 overflow-x-auto px-4 py-0.5">
      {items.map((item) => (
        <Cell key={item.key} item={item} />
      ))}
      <span className="w-1 shrink-0" aria-hidden />
    </div>
  )
}

function Cell({ item }: { item: SnapshotItem }) {
  const inner: ReactNode = (
    <>
      <span className="flex items-center gap-1">
        <PixelImage asset={item.icon} height={14} />
        <span className="plabel truncate">{item.label}</span>
      </span>
      <span className="mt-1.5 block font-pixel text-[15px] leading-none tabular-nums text-ink">
        {item.value}
      </span>
      {item.sub && (
        <span className="mt-1 block truncate text-[10.5px] leading-tight text-inkdim">
          {item.sub}
        </span>
      )}
    </>
  )

  const className = cn(
    'w-[104px] shrink-0 rounded-px4 px-2.5 py-2 text-left',
    item.onClick && 'press',
  )
  const style = { backgroundColor: item.tint ?? 'rgba(107, 74, 61, 0.05)' }

  return item.onClick ? (
    <button type="button" onClick={item.onClick} className={className} style={style}>
      {inner}
    </button>
  ) : (
    <div className={className} style={style}>
      {inner}
    </div>
  )
}
