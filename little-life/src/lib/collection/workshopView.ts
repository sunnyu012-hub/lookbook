import type {
  AppState,
  CollectionItemDef,
  CraftStage,
  RecipeDef,
} from '@/types'
import { findCollectionItem } from './catalog'
import { RECIPES } from './recipes'
import { canCraft, craftStage, ownedCount, recipeContextOf, recipeProgress } from './progress'

/**
 * 작업실 한 화면 어치.
 *
 * 새 엔진이 아니다 — 이미 있는 레시피 표와 판정(craftStage · canCraft)을
 * 화면이 쓰기 좋은 모양으로 한 번 묶어줄 뿐이다.
 * 부엌(kitchenView)과 같은 얼개라 두 화면이 서로 다르게 굴지 않는다.
 */

export type WorkshopTab = 'FURNITURE' | 'DECOR' | 'SPECIAL'

export interface WorkshopIngredientView {
  itemId: string
  name: string
  icon: string
  have: number
  need: number
}

export interface WorkshopRecipeView {
  def: RecipeDef
  item: CollectionItemDef | null
  stage: CraftStage
  /** 알기까지 얼마나 왔는지 (0~1) */
  progress: number
  tab: WorkshopTab
  ingredients: WorkshopIngredientView[]
  ready: boolean
  owned: number
}

export interface WorkshopView {
  recipes: WorkshopRecipeView[]
  known: number
  total: number
  /** 아직 모르는 것이 몇 개 남았는지 — 목록은 안 보여준다 */
  unknown: number
  /** 지금 바로 만들 수 있는 것 하나. 없으면 줄을 안 만든다. */
  suggestion: WorkshopRecipeView | null
}

/**
 * 어느 칸에 들어가는지.
 *
 * 예전 레시피에는 category 를 안 적어뒀다. 표를 통째로 고치는 대신
 * 만들어지는 물건에서 가져온다 — 같은 사실을 두 군데 안 적으려고.
 */
function tabOf(recipe: RecipeDef, item: CollectionItemDef | null): WorkshopTab {
  if (recipe.category) return recipe.category
  if (!item) return 'DECOR'
  if (item.category === 'FURNITURE' || item.category === 'RUG') return 'FURNITURE'
  if (item.rarity === 'LEGENDARY' || item.rarity === 'SECRET') return 'SPECIAL'
  return 'DECOR'
}

/** 만들 수 있는 것 먼저, 그 다음 아는 것, 낌새, 모르는 것, 아직 못 만드는 것 */
const STAGE_ORDER: Record<CraftStage, number> = {
  KNOWN: 0,
  HINTED: 1,
  UNKNOWN: 2,
  COMING_SOON: 3,
}

export function workshopView(state: AppState): WorkshopView {
  const ctx = recipeContextOf(state)
  const c = state.collection

  const rows: WorkshopRecipeView[] = RECIPES.map((def) => {
    const item = findCollectionItem(def.resultItemId) ?? null
    const stage = craftStage(def, ctx)
    return {
      def,
      item,
      stage,
      progress: recipeProgress(def, ctx),
      tab: tabOf(def, item),
      ingredients: def.ingredients.map((ing) => {
        const idef = findCollectionItem(ing.itemId)
        return {
          itemId: ing.itemId,
          name: idef?.nameKo ?? ing.itemId,
          icon: idef?.icon ?? '·',
          have: ownedCount(c, ing.itemId),
          need: ing.count,
        }
      }),
      ready: stage === 'KNOWN' && canCraft(def, c),
      owned: ownedCount(c, def.resultItemId),
    }
  })

  rows.sort((a, b) => {
    if (a.ready !== b.ready) return a.ready ? -1 : 1
    if (a.stage !== b.stage) return STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage]
    // 같은 단계 안에서는 가까이 온 것부터. 다음에 뭘 하면 되는지가 위로 온다.
    if (a.stage !== 'KNOWN' && a.progress !== b.progress) return b.progress - a.progress
    // 아직 안 만들어본 것을 먼저 보여준다
    if (a.owned !== b.owned) return a.owned - b.owned
    return 0
  })

  const known = rows.filter((r) => r.stage === 'KNOWN').length
  const total = rows.filter((r) => r.stage !== 'COMING_SOON').length

  return {
    recipes: rows,
    known,
    total,
    unknown: total - known,
    suggestion: rows.find((r) => r.ready && r.owned === 0) ?? rows.find((r) => r.ready) ?? null,
  }
}
