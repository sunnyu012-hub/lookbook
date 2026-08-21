import type { EquipSlot, EquippedItems } from '@/types'
import { EQUIP_SLOTS } from '@/types'
import { findItem } from '@/lib/rpg/content'
import { cn } from '@/components/ui/cn'

const SLOT_HINT: Record<EquipSlot, string> = {
  HEAD: '🧢',
  TOP: '🧥',
  BOTTOM: '🩳',
  SHOES: '👟',
  ACCESSORY: '⌚',
  CHARM: '🔑',
}

interface EquipSlotGridProps {
  equipped: EquippedItems
  /** 눌러서 BAG 으로 넘어간다 */
  onOpenBag: () => void
}

/** 여섯 칸의 장비. 비어 있어도 흐릿한 밑그림으로 뭘 끼는 자리인지 알려준다. */
export function EquipSlotGrid({ equipped, onOpenBag }: EquipSlotGridProps) {
  return (
    <ul className="grid grid-cols-3 gap-2">
      {EQUIP_SLOTS.map((slot) => {
        const def = equipped[slot] ? findItem(equipped[slot]!) : null
        return (
          <li key={slot}>
            <button
              type="button"
              onClick={onOpenBag}
              className={cn(
                'flex w-full flex-col items-center rounded-card border px-2 py-3',
                'transition-transform duration-150 ease-out active:scale-[0.96]',
                def ? 'border-coral/50 bg-surface shadow-soft' : 'border-dashed border-line bg-surface/60',
              )}
            >
              <span className={cn('text-[22px] leading-none', !def && 'opacity-25')}>
                {def ? def.icon : SLOT_HINT[slot]}
              </span>
              <span className="mt-1.5 font-game text-[9px] tracking-[0.06em] text-inkfaint">
                {slot}
              </span>
              <span
                className={cn(
                  'mt-0.5 w-full truncate text-center text-[10.5px]',
                  def ? 'text-ink' : 'text-inkfaint',
                )}
              >
                {def ? def.name : '비어 있음'}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
