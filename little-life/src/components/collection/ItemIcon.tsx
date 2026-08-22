import { useState } from 'react'
import type { CollectionCategory, CollectionItemDef } from '@/types'
import { cn } from '@/components/ui/cn'

/**
 * 물건 하나의 그림.
 *
 * 작게 보이는 자리(sm·md·lg)에서는 작은 판을 쓴다. 도감 한 칸은 32~56px 인데
 * 240칸에 320px 짜리를 다 받게 하면 필요 없는 데이터를 몇 배로 받는다.
 * 크게 보이는 자리(xl)는 원본을 쓴다.
 *
 * 그림이 없으면 이모지, 그것도 없으면 분류별 실루엣으로 내려간다.
 * 지금은 240개 전부 그림이 있지만, 없다고 빈 네모가 나오면 그건 버그처럼 보인다.
 */

/** 그림이 아직 없는 물건을 위한 분류별 모양 */
const SILHOUETTE: Record<CollectionCategory, { glyph: string; tint: string }> = {
  FURNITURE: { glyph: '▭', tint: 'bg-sunken text-inkfaint' },
  LIGHTING: { glyph: '◠', tint: 'bg-butter-soft text-butter-deep/50' },
  PLANT: { glyph: '❦', tint: 'bg-sage-soft text-sage-deep/45' },
  RUG: { glyph: '▬', tint: 'bg-pink-soft text-pink-deep/40' },
  WALL: { glyph: '▢', tint: 'bg-dusty-soft text-dusty-deep/40' },
  LITTLE_THING: { glyph: '◌', tint: 'bg-sunken text-inkfaint' },
  KITCHEN: { glyph: '◡', tint: 'bg-sunken text-inkfaint' },
  FOOD: { glyph: '◔', tint: 'bg-butter-soft text-butter-deep/50' },
  BOOK: { glyph: '▤', tint: 'bg-dusty-soft text-dusty-deep/40' },
  HOBBY: { glyph: '◈', tint: 'bg-rose-soft text-rose-deep/40' },
  TECH: { glyph: '▣', tint: 'bg-dusty-soft text-dusty-deep/40' },
  OUTDOOR: { glyph: '◮', tint: 'bg-sage-soft text-sage-deep/45' },
  MAGIC: { glyph: '✧', tint: 'bg-lavender-soft text-lavender-deep/45' },
  TROPHY: { glyph: '♛', tint: 'bg-butter-soft text-butter-deep/50' },
  MATERIAL: { glyph: '◇', tint: 'bg-sunken text-inkfaint' },
}

interface ItemIconProps {
  item: CollectionItemDef
  /** 아직 못 만난 물건은 그림자만 보여준다 */
  hidden?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const SIZE = {
  sm: 'h-8 w-8 text-[18px]',
  md: 'h-11 w-11 text-[24px]',
  lg: 'h-14 w-14 text-[30px]',
  xl: 'h-20 w-20 text-[44px]',
}

export function ItemIcon({ item, hidden = false, size = 'md', className }: ItemIconProps) {
  const [broken, setBroken] = useState(false)
  const shape = SILHOUETTE[item.category]
  const src = size === 'xl' ? item.assetKey : (item.thumbKey ?? item.assetKey)

  if (hidden) {
    // 그림이 있으면 그 물건의 실루엣을 보여준다. 모양이 보여야 궁금해진다.
    // 다만 비밀 물건은 모양까지 감춘다 — 알아보면 그건 이미 비밀이 아니다.
    const shadow = item.assetKey && !item.hiddenUntilDiscovered

    return (
      <span
        aria-hidden
        className={cn(
          'flex shrink-0 items-center justify-center rounded-card bg-sunken/70',
          SIZE[size],
          className,
        )}
      >
        {shadow ? (
          <img
            src={src}
            alt=""
            draggable={false}
            loading="lazy"
            className="h-full w-full select-none object-contain opacity-30 brightness-0 saturate-0"
          />
        ) : (
          <span className="text-inkfaint/45">{shape.glyph}</span>
        )}
      </span>
    )
  }

  // 그려둔 그림이 있으면 그걸 쓴다
  if (item.assetKey && !broken) {
    return (
      <span
        className={cn('flex shrink-0 items-center justify-center', SIZE[size], className)}
      >
        <img
          src={src}
          alt=""
          aria-hidden
          draggable={false}
          loading="lazy"
          // 파일이 없거나 못 받아도 깨진 그림 아이콘을 보여주지 않는다
          onError={() => setBroken(true)}
          className="h-full w-full select-none object-contain"
        />
      </span>
    )
  }

  if (!item.icon) {
    return (
      <span
        aria-hidden
        className={cn(
          'flex shrink-0 items-center justify-center rounded-card',
          shape.tint,
          SIZE[size],
          className,
        )}
      >
        {shape.glyph}
      </span>
    )
  }

  return (
    <span
      aria-hidden
      className={cn('flex shrink-0 items-center justify-center leading-none', SIZE[size], className)}
    >
      {item.icon}
    </span>
  )
}
