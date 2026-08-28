import type { KitchenRecipeDef } from '@/types'
import { findCollectionItem } from '@/lib/collection/catalog'
import { ItemIcon } from '@/components/collection/ItemIcon'
import { cn } from '@/components/ui/cn'

interface DishIconProps {
  def: KitchenRecipeDef
  /** 아직 못 알아낸 레시피 — 그림 대신 그림자만 */
  hidden?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

/**
 * 만든 음식 한 그릇.
 *
 * 부엌 화면 전체가 recipe.icon(이모지)을 그리고 있었다. 그런데 열두 접시
 * 그림은 진작 들어와 있었고(public/assets/items/food/), 도감·가방·방은
 * 이미 그 그림을 쓰고 있었다. 부엌만 이모지를 그려서, 만들고 나면
 * 도감에서 본 그림과 다른 게 나왔다.
 *
 * 레시피에는 그림이 없다. 그림은 **만들어진 음식**(outputItemId)에 붙어 있다.
 * 그래서 여기서 한 번만 갈아끼우고, 나머지는 도감이 쓰는 ItemIcon 을 그대로 쓴다 —
 * 그림이 없으면 이모지로, 그것도 없으면 분류 실루엣으로 내려가는 것까지 같다.
 */
export function DishIcon({ def, hidden = false, size = 'md', className }: DishIconProps) {
  const item = findCollectionItem(def.outputItemId)

  // 도감에 없는 음식은 없지만, 있어도 화면이 비지 않게 이모지로 받아둔다
  if (!item) {
    const px = { sm: 'text-[18px]', md: 'text-[24px]', lg: 'text-[30px]', xl: 'text-[44px]' }
    return (
      <span aria-hidden className={cn('leading-none', px[size], className)}>
        {def.icon}
      </span>
    )
  }

  return <ItemIcon item={item} hidden={hidden} size={size} className={className} />
}
