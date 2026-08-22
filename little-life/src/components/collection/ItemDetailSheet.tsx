import type { AppState, CollectionItemDef } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { ItemIcon } from './ItemIcon'
import { RarityBadge, RARITY_STYLE } from '@/components/rpg/RarityBadge'
import { acquisitionHint, isDiscovered, ownedCount, setProgress } from '@/lib/collection/progress'
import { findSet } from '@/lib/collection/sets'
import { recipeForItem } from '@/lib/collection/recipes'
import { findCollectionShop } from '@/lib/collection/shops'
import { findCollectionItem } from '@/lib/collection/catalog'
import { COLLECTION_CATEGORY_LABEL } from '@/lib/labels'
import { cn } from '@/components/ui/cn'

interface ItemDetailSheetProps {
  item: CollectionItemDef | null
  state: AppState
  onClose: () => void
  onToggleWishlist: (itemId: string) => void
  onPlace: (itemId: string) => void
  onOpenWorkshop: () => void
}

/**
 * 물건 하나를 자세히.
 *
 * 아직 못 만난 물건이면 이름 대신 갈 곳을 알려준다.
 * 비밀 물건은 그마저도 안 알려준다 — 알려주는 순간 숙제가 된다.
 */
export function ItemDetailSheet({
  item,
  state,
  onClose,
  onToggleWishlist,
  onPlace,
  onOpenWorkshop,
}: ItemDetailSheetProps) {
  if (!item) return null

  const collection = state.collection
  const found = isDiscovered(collection, item.id)
  const owned = ownedCount(collection, item.id)
  const wished = collection.wishlist.includes(item.id)
  const secret = item.hiddenUntilDiscovered === true
  const style = RARITY_STYLE[item.rarity]
  const recipe = recipeForItem(item.id)

  const placedCount = Object.values(collection.rooms)
    .flat()
    .filter((p) => p.itemId === item.id).length
  const canPlace = found && item.placeable && item.hasPlaceableAsset && placedCount < owned

  const hint = acquisitionHint(item, (id) => findCollectionShop(id)?.name ?? '어느 가게')

  return (
    <BottomSheet open onClose={onClose} title={found ? item.nameKo : '아직 못 만난 것'}>
      <div className="flex items-start gap-3.5">
        <span
          className={cn(
            'flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-card ring-1 ring-inset',
            found ? style.chip : 'bg-sunken/60',
            found ? style.ring : 'ring-line',
          )}
        >
          <ItemIcon item={item} hidden={!found} size="lg" />
        </span>

        <div className="min-w-0 flex-1 pt-1">
          <h2 className="text-[18px] font-semibold text-ink">
            {found ? item.nameKo : '???'}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {found || !secret ? <RarityBadge rarity={item.rarity} /> : null}
            <span className="rounded-pill bg-sunken px-2 py-0.5 text-[10.5px] text-inkdim">
              {COLLECTION_CATEGORY_LABEL[item.category]}
            </span>
            {owned > 0 && (
              <span className="rounded-pill bg-leaf-soft px-2 py-0.5 text-[10.5px] text-leaf-deep">
                가진 것 {owned}개
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="mt-3.5 rounded-card bg-canvas px-3.5 py-3 text-[13px] leading-relaxed text-inkdim">
        {found ? item.description : secret ? '언제 만나게 될지는 아직 몰라.' : hint}
      </p>

      {/* 세트 */}
      {item.collectionSetIds.length > 0 && (
        <div className="mt-3.5">
          <p className="mb-1.5 text-[12.5px] font-medium text-inkdim">이 물건이 속한 세트</p>
          <ul className="space-y-1.5">
            {item.collectionSetIds.map((setId) => {
              const set = findSet(setId)
              if (!set) return null
              const p = setProgress(set, collection)
              return (
                <li
                  key={setId}
                  className="flex items-center gap-2.5 rounded-card border border-line bg-surface px-3 py-2.5"
                >
                  <span className="text-[17px]">{set.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{set.name}</span>
                  <span className="font-game text-[11.5px] text-inkdim">
                    {p.have}/{p.need}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* 만들 수 있으면 */}
      {recipe && (
        <div className="mt-3.5 rounded-card border border-line bg-surface px-3.5 py-3">
          <p className="text-[12.5px] font-medium text-inkdim">만들 수 있어</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {recipe.ingredients.map((ing) => {
              const def = findCollectionItem(ing.itemId)
              const have = ownedCount(collection, ing.itemId)
              return (
                <li
                  key={ing.itemId}
                  className={cn(
                    'rounded-pill px-2.5 py-1 text-[11.5px]',
                    have >= ing.count ? 'bg-leaf-soft text-leaf-deep' : 'bg-sunken text-inkdim',
                  )}
                >
                  {def?.nameKo ?? ing.itemId} {have}/{ing.count}
                </li>
              )
            })}
          </ul>
          <button
            type="button"
            onClick={onOpenWorkshop}
            className="mt-2.5 w-full rounded-btn bg-sunken py-2.5 text-[12.5px] font-medium text-inkdim"
          >
            작은 작업실 열기
          </button>
        </div>
      )}

      {/* 아직 그림이 없는 물건 */}
      {found && item.placeable && !item.hasPlaceableAsset && (
        <p className="mt-3.5 rounded-card bg-sunken/50 px-3.5 py-3 text-[12.5px] leading-relaxed text-inkdim">
          아직 방에 놓을 수 있는 그림이 없어. 도감에는 그대로 남아 있어.
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onToggleWishlist(item.id)}
          aria-pressed={wished}
          className={cn(
            'min-h-[48px] flex-1 rounded-btn text-[13px] font-medium active:scale-[0.97]',
            wished ? 'bg-coral-soft text-coral-deep' : 'bg-sunken text-inkdim',
          )}
        >
          {wished ? '♥ 찾는 중' : '♡ 찾는 물건'}
        </button>

        {canPlace && (
          <Button size="lg" className="flex-1" onClick={() => onPlace(item.id)}>
            방에 놓기
          </Button>
        )}
      </div>

      {found && placedCount > 0 && (
        <p className="mt-2.5 text-center text-[11.5px] text-inkfaint">
          방에 {placedCount}개 놓여 있어.
        </p>
      )}
    </BottomSheet>
  )
}
