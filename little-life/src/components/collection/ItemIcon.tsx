import type { CollectionCategory, CollectionItemDef } from '@/types'
import { cn } from '@/components/ui/cn'

/**
 * 물건 하나의 그림.
 *
 * 이모지가 있으면 이모지를, 없으면 분류별 실루엣을 그린다.
 * 240개 데이터가 전부 있다고 해서 그림도 전부 있는 건 아니다.
 * 그림이 없다고 빈 네모나 깨진 글자가 나오면 그건 그냥 버그처럼 보인다.
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
  const shape = SILHOUETTE[item.category]

  if (hidden) {
    return (
      <span
        aria-hidden
        className={cn(
          'flex shrink-0 items-center justify-center rounded-card bg-sunken/70',
          SIZE[size],
          className,
        )}
      >
        <span className="text-inkfaint/45">{shape.glyph}</span>
      </span>
    )
  }

  // 그려둔 그림이 있으면 그걸 쓴다
  if (item.assetKey) {
    return (
      <span
        className={cn('flex shrink-0 items-center justify-center', SIZE[size], className)}
      >
        <img
          src={item.assetKey}
          alt=""
          aria-hidden
          draggable={false}
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
