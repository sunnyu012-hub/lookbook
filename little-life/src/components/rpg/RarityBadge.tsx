import type { Rarity } from '@/types'
import { RARITY_LABEL } from '@/lib/labels'
import { cn } from '@/components/ui/cn'

/**
 * 등급 표시.
 * 색만으로 구분하지 않고 글자를 늘 같이 보여준다. 번쩍이는 연출은 쓰지 않는다.
 */
export const RARITY_STYLE: Record<Rarity, { chip: string; text: string; ring: string }> = {
  COMMON: { chip: 'bg-sunken', text: 'text-inkdim', ring: 'ring-line' },
  RARE: { chip: 'bg-dusty-soft', text: 'text-dusty-deep', ring: 'ring-dusty-deep/30' },
  EPIC: { chip: 'bg-lavender-soft', text: 'text-lavender-deep', ring: 'ring-lavender-deep/30' },
  LEGENDARY: { chip: 'bg-butter-soft', text: 'text-butter-deep', ring: 'ring-butter-deep/35' },
}

export function RarityBadge({ rarity, className }: { rarity: Rarity; className?: string }) {
  const style = RARITY_STYLE[rarity]
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-pill px-2 text-[10px] font-medium',
        style.chip,
        style.text,
        className,
      )}
    >
      {RARITY_LABEL[rarity]}
    </span>
  )
}
