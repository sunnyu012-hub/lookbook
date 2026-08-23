import { useEffect, useMemo } from 'react'
import type { AppState, CollectionItemDef, CollectionShopDef, ShopListing } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ItemIcon } from './ItemIcon'
import { RarityBadge } from '@/components/rpg/RarityBadge'
import { findCollectionItem } from '@/lib/collection/catalog'
import {
  isCollectionShopOpen,
  openingLabel,
  shopDiscovery,
  todayListings,
} from '@/lib/collection/shops'
import { hasFreshStock, isDiscovered } from '@/lib/collection/progress'
import { todayKey } from '@/lib/date'
import { cn } from '@/components/ui/cn'

interface CollectionShopSheetProps {
  shop: CollectionShopDef | null
  state: AppState
  onClose: () => void
  onBuy: (itemId: string) => void
  onToggleWishlist: (itemId: string) => void
  /** 들어온 것을 적어둔다 (본 것 · 오늘 들렀음) */
  onVisit: (itemIds: string[]) => void
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
  onVisit,
}: CollectionShopSheetProps) {
  const dayKey = todayKey()
  const open = shop !== null && isCollectionShopOpen(shop)
  // 들어오기 전에 이미 오늘 왔었는지 붙잡아둔다.
  // onVisit 이 이 값을 바꾸기 때문에, 렌더 중에 읽으면 토스트가 바로 사라진다.
  const restocked = useMemo(
    () => (shop ? open && hasFreshStock(state.collection, shop.id, dayKey) : false),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shop?.id, open, dayKey],
  )

  const rows = useMemo<Row[]>(() => {
    if (!shop) return []

    return todayListings(shop, dayKey, {
      reputation: state.reputation[shop.areaId] ?? 0,
      playerLevel: state.user.level,
      collection: state.collection,
    })
      .map((listing) => {
        const def = findCollectionItem(listing.itemId)
        if (!def) return null
        return {
          listing,
          def,
          wished: state.collection.wishlist.includes(def.id),
          found: isDiscovered(state.collection, def.id),
          soldOut: listing.remaining <= 0,
        }
      })
      .filter((r): r is Row => r !== null)
  }, [shop, state.collection, state.reputation, state.user.level, dayKey])

  // 들어온 순간 오늘 진열을 본 것으로 적는다.
  useEffect(() => {
    if (!shop || !open || rows.length === 0) return
    onVisit(rows.map((r) => r.def.id))
    // 가게가 바뀔 때만 한 번. rows 를 넣으면 적은 뒤 다시 그려지면서 무한히 돈다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id, open])

  if (!shop) return null

  const wishRows = rows.filter((r) => r.wished)
  const newRows = rows.filter((r) => !r.wished && r.listing.isNew)
  const restRows = rows.filter((r) => !r.wished && !r.listing.isNew)
  const found = shopDiscovery(shop, state.collection)

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
          <TodaysStockLine rows={rows} restocked={restocked} haggles={shop.hagglePrices === true} />

          <Section title="♥ 찾던 물건" rows={wishRows} {...{ state, onBuy, onToggleWishlist }} />
          <Section title="오늘 새로 들어온 것" rows={newRows} {...{ state, onBuy, onToggleWishlist }} />
          <Section title="오늘의 진열" rows={restRows} {...{ state, onBuy, onToggleWishlist }} />

          {/* 이 가게에서 얼마나 모았는지. 목록을 펼치지는 않는다 —
              남은 것을 다 보여주면 그건 발견이 아니라 숙제 목록이 된다. */}
          <p className="mt-4 rounded-btn bg-canvas px-3.5 py-2.5 text-center text-[12px] text-inkdim">
            이 가게 물건 {found.total}개 중 {found.found}개를 도감에 넣었어.
          </p>
        </>
      )}

      <p className="mt-4 text-center text-[12px] leading-relaxed text-inkfaint">
        천천히 봐도 돼. 아무것도 안 사도 되고.
      </p>
    </BottomSheet>
  )
}

/**
 * 오늘의 입고 한 줄.
 *
 * 새로 들어온 게 없으면 그렇다고 말한다. 없는데 있는 척하면
 * 다음부터 이 줄을 안 읽게 된다.
 */
function TodaysStockLine({
  rows,
  restocked,
  haggles,
}: {
  rows: Row[]
  restocked: boolean
  haggles: boolean
}) {
  const fresh = rows.filter((r) => r.listing.isNew).length
  const wished = rows.filter((r) => r.wished).length
  const unseen = rows.filter((r) => !r.found).length

  const parts: string[] = []
  if (fresh > 0) parts.push(`새로 들어온 것 ${fresh}개`)
  if (wished > 0) parts.push(`찾던 물건 ${wished}개`)
  if (unseen > 0) parts.push(`처음 보는 것 ${unseen}개`)

  return (
    <div className="mt-3 rounded-btn bg-canvas px-3.5 py-2.5">
      <p className="flex items-center gap-1.5 text-[12.5px] text-inkdim">
        {restocked && (
          <span className="rounded-pill bg-sage-soft px-1.5 py-0.5 font-game text-[9px] text-sage-deep">
            RESTOCKED ✦
          </span>
        )}
        <span>{parts.length > 0 ? parts.join(' · ') : `오늘 깔린 ${rows.length}개`}</span>
      </p>
      <p className="mt-0.5 text-[11.5px] text-inkfaint">
        내일이면 바뀌어.{haggles && ' 값도 그날그날 조금 달라.'}
      </p>
    </div>
  )
}

/**
 * 이 칸에 붙일 딱지 하나.
 *
 * 순서대로 하나만 고른다. 여러 개가 참일 때 다 붙이면
 * 눈에 들어오는 건 아무것도 없다.
 */
function StatusBadge({ listing, found }: { listing: ShopListing; found: boolean }) {
  if (listing.rareFind) {
    return (
      <span className="rounded-pill bg-butter-soft px-1.5 py-0.5 font-game text-[9px] text-butter-deep">
        오늘의 발견
      </span>
    )
  }
  if (listing.wasPrice !== undefined) {
    return (
      <span className="rounded-pill bg-butter-soft px-1.5 py-0.5 text-[9.5px] font-medium text-butter-deep">
        오늘 싸게
      </span>
    )
  }
  if (listing.lastDay && !listing.isNew) {
    return (
      <span className="rounded-pill bg-dusty-soft px-1.5 py-0.5 text-[9.5px] text-dusty-deep">
        오늘까지
      </span>
    )
  }
  if (!found) {
    return (
      <span className="rounded-pill bg-lavender-soft px-1.5 py-0.5 text-[9.5px] text-lavender-deep">
        처음 보는 것
      </span>
    )
  }
  if (listing.isNew) {
    return (
      <span className="rounded-pill bg-coral-soft px-1.5 py-0.5 font-game text-[9px] text-coral-deep">
        NEW
      </span>
    )
  }
  return null
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
              <div
                className={cn(
                  'flex items-center gap-3 rounded-card border border-line bg-surface px-3.5 py-3',
                  // 나간 물건은 자리를 남기되 한 발 물러난다. 지우면 아침에 있던 게
                  // 어디 갔는지 알 수가 없다.
                  soldOut && 'opacity-55',
                  // 오늘 제일 귀한 것에만 아주 옅은 테두리. 번쩍이지 않는다.
                  listing.rareFind && !soldOut && 'border-butter-deep/40 bg-butter-soft/30',
                )}
              >
                <ItemIcon item={def} size="md" />

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-[14px] font-medium text-ink">{def.nameKo}</span>
                    <RarityBadge rarity={def.rarity} />
                    {/* 딱지는 등급 말고 하나만 붙인다.
                        NEW · 오늘 싸게 · 오늘까지 · 처음 보는 것을 다 붙였더니
                        한 줄에 네 개가 되어 정작 물건 이름이 안 읽혔다. */}
                    <StatusBadge listing={listing} found={found} />
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-inkdim">
                    {/* 남은 수는 누가 이미 사 갔을 때만 말한다.
                        아침부터 "하나뿐이야" 가 붙어 있으면 그건 재촉이지 정보가 아니다. */}
                    {!soldOut && listing.remaining < listing.stock
                      ? `${listing.remaining}개 남았어`
                      : def.description}
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
