import { useMemo } from 'react'
import type { AppState, CollectionItemDef, CollectionShopDef, ShopListing } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ItemIcon } from './ItemIcon'
import { RarityBadge } from '@/components/rpg/RarityBadge'
import { findCollectionItem } from '@/lib/collection/catalog'
import { isCollectionShopOpen, openingLabel, todayListings } from '@/lib/collection/shops'
import { isDiscovered, ownedCount } from '@/lib/collection/progress'
import { todayKey } from '@/lib/date'
import { cn } from '@/components/ui/cn'

interface CollectionShopSheetProps {
  shop: CollectionShopDef | null
  state: AppState
  onClose: () => void
  onBuy: (itemId: string) => void
  onToggleWishlist: (itemId: string) => void
}

interface Row {
  listing: ShopListing
  def: CollectionItemDef
  wished: boolean
  found: boolean
  soldOut: boolean
}

/**
 * 가게.
 *
 * 오늘 깔린 것만 보여준다. 전체 목록을 펼쳐놓으면 그건 카탈로그지 가게가 아니고,
 * "오늘 뭐 들어왔지" 하고 들르는 재미가 사라진다.
 */
export function CollectionShopSheet({
  shop,
  state,
  onClose,
  onBuy,
  onToggleWishlist,
}: CollectionShopSheetProps) {
  const dayKey = todayKey()

  const rows = useMemo<Row[]>(() => {
    if (!shop) return []
    const reputation = state.reputation[shop.areaId] ?? 0

    return todayListings(shop, dayKey, { reputation })
      .map((listing) => {
        const def = findCollectionItem(listing.itemId)
        if (!def) return null
        const bought = state.collection.purchases[`${dayKey}:${shop.id}:${listing.itemId}`] ?? 0
        return {
          listing,
          def,
          wished: state.collection.wishlist.includes(def.id),
          found: isDiscovered(state.collection, def.id),
          soldOut:
            (listing.limited && bought >= 1) ||
            (def.unique && ownedCount(state.collection, def.id) > 0),
        }
      })
      .filter((r): r is Row => r !== null)
  }, [shop, state.collection, state.reputation, dayKey])

  if (!shop) return null

  const open = isCollectionShopOpen(shop)
  const wishRows = rows.filter((r) => r.wished)
  const newRows = rows.filter((r) => !r.wished && r.listing.isNew)
  const rareRows = rows.filter(
    (r) => !r.wished && !r.listing.isNew && (r.def.rarity === 'EPIC' || r.def.rarity === 'LEGENDARY'),
  )
  const restRows = rows.filter(
    (r) =>
      !r.wished &&
      !r.listing.isNew &&
      !(r.def.rarity === 'EPIC' || r.def.rarity === 'LEGENDARY'),
  )

  return (
    <BottomSheet open onClose={onClose} title={shop.name}>
      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card bg-canvas text-[28px]">
          {shop.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[18px] font-semibold text-ink">{shop.name}</h2>
          <p className="mt-0.5 text-[12.5px] leading-snug text-inkdim">{shop.description}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-butter-soft px-3 py-1.5">
          <span className="text-[13px]">🪙</span>
          <span className="font-game text-[12px] leading-none text-butter-deep">
            {state.user.coins.toLocaleString('ko-KR')}
          </span>
        </span>
      </div>

      {!open ? (
        <p className="mt-4 rounded-card bg-canvas px-3.5 py-4 text-center text-[13px] leading-relaxed text-inkdim">
          지금은 닫혀 있어.
          <br />
          <span className="text-inkfaint">{openingLabel(shop) ?? '다음에 다시 와줘.'}</span>
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-4 rounded-card bg-canvas px-3.5 py-4 text-center text-[13px] text-inkdim">
          오늘은 내놓은 게 없대.
        </p>
      ) : (
        <>
          <p className="mt-3 rounded-btn bg-canvas px-3.5 py-2.5 text-[12.5px] text-inkdim">
            오늘 깔린 {rows.length}개. 내일이면 바뀌어.
            {shop.hagglePrices && ' 값도 그날그날 조금 달라.'}
          </p>

          <Section title="♥ 찾던 물건" rows={wishRows} {...{ state, onBuy, onToggleWishlist }} />
          <Section title="오늘 새로 들어온 것" rows={newRows} {...{ state, onBuy, onToggleWishlist }} />
          <Section title="귀한 것" rows={rareRows} {...{ state, onBuy, onToggleWishlist }} />
          <Section title="오늘의 진열" rows={restRows} {...{ state, onBuy, onToggleWishlist }} />
        </>
      )}

      <p className="mt-4 text-center text-[12px] leading-relaxed text-inkfaint">
        천천히 봐도 돼. 아무것도 안 사도 되고.
      </p>
    </BottomSheet>
  )
}

function Section({
  title,
  rows,
  state,
  onBuy,
  onToggleWishlist,
}: {
  title: string
  rows: Row[]
  state: AppState
  onBuy: (itemId: string) => void
  onToggleWishlist: (itemId: string) => void
}) {
  if (rows.length === 0) return null

  return (
    <div className="mt-4">
      <p className="mb-1.5 text-[12.5px] font-medium text-inkdim">{title}</p>
      <ul className="space-y-2">
        {rows.map(({ listing, def, wished, found, soldOut }) => {
          const affordable = state.user.coins >= listing.price
          const disabled = soldOut || listing.locked || !affordable

          return (
            <li key={def.id}>
              <div className="flex items-center gap-3 rounded-card border border-line bg-surface px-3.5 py-3">
                <ItemIcon item={def} size="md" />

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-[14px] font-medium text-ink">{def.nameKo}</span>
                    <RarityBadge rarity={def.rarity} />
                    {listing.isNew && (
                      <span className="rounded-pill bg-coral-soft px-1.5 py-0.5 font-game text-[9px] text-coral-deep">
                        NEW
                      </span>
                    )}
                    {listing.wasPrice !== undefined && (
                      <span className="rounded-pill bg-butter-soft px-1.5 py-0.5 text-[9.5px] font-medium text-butter-deep">
                        오늘 싸게
                      </span>
                    )}
                    {listing.lastDay && !listing.isNew && (
                      <span className="rounded-pill bg-dusty-soft px-1.5 py-0.5 text-[9.5px] text-dusty-deep">
                        오늘까지
                      </span>
                    )}
                    {!found && (
                      <span className="rounded-pill bg-lavender-soft px-1.5 py-0.5 text-[9.5px] text-lavender-deep">
                        처음 보는 것
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-inkdim">
                    {def.description}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => onToggleWishlist(def.id)}
                  aria-label={wished ? '찾는 물건에서 빼기' : '찾는 물건에 넣기'}
                  className={cn(
                    'flex h-9 w-8 shrink-0 items-center justify-center text-[15px]',
                    wished ? 'text-coral-deep' : 'text-inkfaint',
                  )}
                >
                  {wished ? '♥' : '♡'}
                </button>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onBuy(def.id)}
                  className={cn(
                    'inline-flex min-h-[44px] w-[64px] shrink-0 flex-col items-center justify-center rounded-btn px-1',
                    'transition-transform duration-150 ease-out active:scale-[0.96]',
                    'disabled:cursor-not-allowed disabled:active:scale-100',
                    disabled
                      ? 'bg-sunken text-inkfaint'
                      : 'bg-coral text-surface shadow-[0_3px_0_0_rgba(217,108,97,0.5)] active:translate-y-[2px] active:shadow-none',
                  )}
                >
                  {soldOut ? (
                    <span className="font-game text-[10px]">SOLD</span>
                  ) : listing.locked ? (
                    <span className="text-[10px] leading-tight">단골에게만</span>
                  ) : (
                    <>
                      {listing.wasPrice !== undefined && (
                        <span className="font-game text-[9px] leading-none text-inkfaint line-through">
                          {listing.wasPrice}
                        </span>
                      )}
                      <span className="font-game text-[11.5px] leading-none">🪙 {listing.price}</span>
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
    </div>
  )
}
