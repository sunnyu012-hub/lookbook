import { useMemo } from 'react'
import type { AppState, RecipeDef } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ItemIcon } from './ItemIcon'
import { RarityBadge } from '@/components/rpg/RarityBadge'
import { findCollectionItem, MATERIAL_CATALOG } from '@/lib/collection/catalog'
import { RECIPES } from '@/lib/collection/recipes'
import {
  canCraft,
  completedSetIds,
  discoveredCount,
  isRecipeKnown,
  ownedCount,
} from '@/lib/collection/progress'
import { cn } from '@/components/ui/cn'

interface WorkshopSheetProps {
  open: boolean
  state: AppState
  onClose: () => void
  onCraft: (recipeId: string) => void
}

/**
 * 작은 작업실.
 *
 * 아직 모르는 레시피는 ??? 로 몇 개 남았는지만 알려준다.
 * 전부 펼쳐두면 그건 만드는 게 아니라 재료 모으기 숙제가 된다.
 */
export function WorkshopSheet({ open, state, onClose, onCraft }: WorkshopSheetProps) {
  const collection = state.collection

  const { known, unknownCount } = useMemo(() => {
    const ctx = {
      level: state.user.level,
      discoveredCount: discoveredCount(collection),
      completedSetIds: completedSetIds(collection),
      friendship: Object.fromEntries(
        Object.entries(state.npcs).map(([id, npc]) => [id, npc.friendship]),
      ),
      discoveredRecipeIds: collection.discoveredRecipeIds,
    }
    const list = RECIPES.filter((r) => isRecipeKnown(r, ctx))
    return { known: list, unknownCount: RECIPES.length - list.length }
  }, [state.user.level, state.npcs, collection])

  const materials = MATERIAL_CATALOG.filter((m) => ownedCount(collection, m.id) > 0)

  if (!open) return null

  return (
    <BottomSheet open onClose={onClose} title="작은 작업실">
      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card bg-canvas text-[28px]">
          🧰
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[18px] font-semibold text-ink">작은 작업실</h2>
          <p className="mt-0.5 text-[12.5px] text-inkdim">
            퀘스트를 하다 주운 것들로 하나씩 만든다.
          </p>
        </div>
      </div>

      {/* 가진 재료 */}
      <div className="mt-4">
        <p className="mb-1.5 text-[12.5px] font-medium text-inkdim">가진 재료</p>
        {materials.length === 0 ? (
          <p className="rounded-card bg-canvas px-3.5 py-3 text-[12.5px] text-inkdim">
            아직 없어. 퀘스트를 끝내다 보면 하나씩 나와.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {materials.map((m) => (
              <li
                key={m.id}
                className="inline-flex items-center gap-1.5 rounded-pill bg-sunken px-2.5 py-1.5 text-[12px] text-inkdim"
              >
                <span>{m.icon}</span>
                {m.nameKo}
                <span className="font-game text-[11px] text-ink">{ownedCount(collection, m.id)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 만들 수 있는 것 */}
      <div className="mt-4 space-y-2">
        <p className="text-[12.5px] font-medium text-inkdim">만드는 법</p>
        {known.map((recipe) => (
          <RecipeRow key={recipe.id} recipe={recipe} state={state} onCraft={onCraft} />
        ))}

        {unknownCount > 0 && (
          <div className="flex items-center gap-3 rounded-card border border-dashed border-line bg-sunken/30 px-3.5 py-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-sunken/70 text-[18px] text-inkfaint">
              ?
            </span>
            <p className="text-[12.5px] leading-relaxed text-inkdim">
              아직 모르는 만드는 법이 {unknownCount}가지 있어.
              <br />
              <span className="text-inkfaint">살다 보면 하나씩 알게 돼.</span>
            </p>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

function RecipeRow({
  recipe,
  state,
  onCraft,
}: {
  recipe: RecipeDef
  state: AppState
  onCraft: (recipeId: string) => void
}) {
  const result = findCollectionItem(recipe.resultItemId)
  if (!result) return null

  const ready = canCraft(recipe, state.collection)
  const owned = ownedCount(state.collection, result.id)

  return (
    <div className="rounded-card border border-line bg-surface px-3.5 py-3">
      <div className="flex items-center gap-3">
        <ItemIcon item={result} size="md" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[14px] font-medium text-ink">{result.nameKo}</span>
            <RarityBadge rarity={result.rarity} />
          </span>
          <span className="mt-0.5 block truncate text-[11.5px] text-inkdim">
            {result.description}
          </span>
        </span>
        <button
          type="button"
          disabled={!ready}
          onClick={() => onCraft(recipe.id)}
          className={cn(
            'min-h-[44px] shrink-0 rounded-btn px-3.5 text-[12.5px] font-medium',
            'transition-transform duration-150 ease-out active:scale-[0.96]',
            'disabled:cursor-not-allowed disabled:active:scale-100',
            ready ? 'bg-coral text-surface' : 'bg-sunken text-inkfaint',
          )}
        >
          {ready ? '만들기' : '재료 부족'}
        </button>
      </div>

      <ul className="mt-2 flex flex-wrap gap-1.5">
        {recipe.ingredients.map((ing) => {
          const def = findCollectionItem(ing.itemId)
          const have = ownedCount(state.collection, ing.itemId)
          return (
            <li
              key={ing.itemId}
              className={cn(
                'rounded-pill px-2.5 py-1 text-[11.5px]',
                have >= ing.count ? 'bg-leaf-soft text-leaf-deep' : 'bg-sunken text-inkdim',
              )}
            >
              {def?.icon ?? ''} {def?.nameKo ?? ing.itemId} {have}/{ing.count}
            </li>
          )
        })}
        {owned > 0 && (
          <li className="rounded-pill bg-canvas px-2.5 py-1 text-[11.5px] text-inkfaint">
            이미 {owned}개 있어
          </li>
        )}
      </ul>
    </div>
  )
}
