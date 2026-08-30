import { useMemo } from 'react'
import type { InventoryEntry, ItemDef, ShopDef, ShopEntry } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { NpcFace } from '@/components/city/NpcFace'
import { RarityBadge } from '@/components/rpg/RarityBadge'
import { findItem } from '@/lib/rpg/content'
import { findNpc } from '@/lib/city/npcs'
import { shopStock } from '@/lib/city/shops'
import { cn } from '@/components/ui/cn'

interface ShopSheetProps {
  shop: ShopDef | null
  coins: number
  inventory: InventoryEntry[]
  onClose: () => void
  onBuy: (itemId: string) => void
}

/**
 * 가게.
 *
 * Coin 은 현실에서 뭔가 해야만 생기니까, 여기는 "돈 쓰는 곳" 이 아니라
 * "한 일에 대한 보상을 고르는 곳" 이다. 그래서 재촉하는 문구를 두지 않는다.
 */
export function ShopSheet({ shop, coins, inventory, onClose, onBuy }: ShopSheetProps) {
  const rows = useMemo(() => {
    if (!shop) return []
    return shopStock(shop)
      .map((entry) => ({ entry, def: findItem(entry.itemId) }))
      .filter((r): r is { entry: ShopEntry; def: ItemDef } => r.def !== null)
  }, [shop])

  if (!shop) return null
  const npc = shop.npcId ? findNpc(shop.npcId) : null

  return (
    <BottomSheet open onClose={onClose} title={shop.name}>
      <div className="flex items-center gap-3">
        {npc ? (
          <NpcFace id={npc.id} avatar={npc.avatar} size={56} />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card bg-canvas text-[28px]">
            {shop.icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[19px] font-semibold text-ink">{shop.name}</h2>
          <p className="mt-0.5 truncate text-[12.5px] text-inkdim">{shop.description}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-butter-soft px-3 py-1.5">
          <span className="text-[13px]">🪙</span>
          <span className="font-game text-[12px] leading-none text-butter-deep">
            {coins.toLocaleString('ko-KR')}
          </span>
        </span>
      </div>

      {shop.rotatingPool && (
        <p className="mt-3 rounded-btn bg-canvas px-3.5 py-2.5 text-[12.5px] text-inkdim">
          ✨ 오늘 들어온 물건이 섞여 있어. 내일이면 바뀌어.
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {rows.map(({ entry, def }) => {
          const ownedEntry = inventory.find((e) => e.itemId === def.id)
          const owned = ownedEntry !== undefined && def.type !== 'CONSUMABLE'
          const affordable = coins >= entry.price
          const disabled = owned || !affordable

          return (
            <li key={def.id}>
              <div
                className={cn(
                  'flex items-center gap-3 rounded-card border px-3.5 py-3',
                  entry.rotating ? 'border-line' : 'border-line',
                  owned ? 'bg-sunken/40' : 'bg-surface',
                )}
              >
                <span className={cn('text-[26px] leading-none', owned && 'opacity-50')}>
                  {def.icon}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[14px] font-medium text-ink">{def.name}</span>
                    <RarityBadge rarity={def.rarity} />
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-inkdim">
                    {def.effectLabel}
                  </span>
                  {ownedEntry && def.type === 'CONSUMABLE' && (
                    <span className="mt-0.5 block font-game text-[10px] text-inkfaint">
                      가진 것 {ownedEntry.quantity}개
                    </span>
                  )}
                </span>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onBuy(def.id)}
                  className={cn(
                    'inline-flex min-h-[44px] shrink-0 flex-col items-center justify-center rounded-btn px-3',
                    'transition-transform duration-150 ease-out active:scale-[0.96]',
                    'disabled:cursor-not-allowed disabled:active:scale-100',
                    owned
                      ? 'bg-transparent text-inkfaint'
                      : affordable
                        ? 'bg-coral text-surface shadow-[0_3px_0_0_rgba(217,108,97,0.5)] active:shadow-none active:translate-y-[2px]'
                        : 'bg-sunken text-inkfaint',
                  )}
                >
                  {owned ? (
                    <span className="text-[11px] font-medium">가지고 있음</span>
                  ) : (
                    <>
                      <span className="font-game text-[12px] leading-none">🪙 {entry.price}</span>
                      <span className="mt-0.5 text-[10px] font-medium">
                        {affordable ? '사기' : '모자라'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <p className="mt-4 text-center text-[12px] leading-relaxed text-inkfaint">
        천천히 봐도 돼. 아무것도 안 사도 되고.
      </p>
    </BottomSheet>
  )
}
