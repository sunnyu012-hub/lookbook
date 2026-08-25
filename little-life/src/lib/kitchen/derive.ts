import type {
  AppState,
  KitchenRecipeDef,
  KitchenRecipeView,
  KitchenState,
  KitchenView,
  RecipeCondition,
  RecipeIngredientView,
  RecipeStage,
} from '@/types'
import { addItem, ownedCount, spendItems } from '@/lib/collection/progress'
import { findCollectionItem } from '@/lib/collection/catalog'
import { discoveredCropIds, harvestedTotal, isGardenUnlocked } from '@/lib/garden/derive'
import { KITCHEN_RECIPES, findKitchenRecipe } from './recipes'

/**
 * 부엌의 계산.
 *
 * 무엇을 알고 있는지 저장하지 않는다. 정원 기록에서 매번 다시 센다 —
 * 그래야 조건을 나중에 손봐도 저장된 값과 어긋나지 않고,
 * 이 업데이트를 처음 켜는 사람에게 그동안 거둔 것이 그대로 반영된다.
 *
 * 저장하는 건 "무엇을 몇 번 만들었는지" 와 "무엇에 하트를 눌렀는지" 뿐이다.
 */

export function emptyKitchen(): KitchenState {
  return {
    unlockedAt: null,
    tutorialSeenAt: null,
    cookedRecipeCounts: {},
    favoriteRecipeIds: [],
  }
}

// ── 해금 ────────────────────────────────────────────────

/**
 * 부엌을 여는 조건.
 *
 * 정원을 찾았고, 거둔 것이 어느 정도 쌓였을 때.
 * 재료가 하나도 없는 부엌을 먼저 열어주면 할 수 있는 게 없다.
 */
export const KITCHEN_UNLOCK = {
  /** 서로 다른 작물 */
  cropKinds: 4,
  /** 거둔 횟수 */
  harvests: 8,
}

export function unlockProgress(state: AppState): number {
  if (!isGardenUnlocked(state)) return 0
  const kinds = discoveredCropIds(state.garden).length / KITCHEN_UNLOCK.cropKinds
  const times = harvestedTotal(state.garden) / KITCHEN_UNLOCK.harvests
  // 평균이 아니라 제일 덜 온 것
  return Math.max(0, Math.min(1, Math.min(kinds, times)))
}

export function canUnlockKitchen(state: AppState): boolean {
  return unlockProgress(state) >= 1
}

export function isKitchenUnlocked(state: AppState): boolean {
  return state.kitchen.unlockedAt !== null
}

/** 조건을 채웠으면 부엌을 연다. 여는 것뿐이다 — 안내는 처음 들어갔을 때 한다. */
export function applyKitchenUnlock(
  state: AppState,
  now: Date = new Date(),
): { state: AppState; opened: boolean } {
  if (isKitchenUnlocked(state) || !canUnlockKitchen(state)) return { state, opened: false }
  return {
    state: { ...state, kitchen: { ...state.kitchen, unlockedAt: now.toISOString() } },
    opened: true,
  }
}

// ── 레시피를 알게 되는 정도 ─────────────────────────────

/** 서로 다른 요리를 몇 가지 만들어봤는지 */
export function cookedKinds(kitchen: KitchenState): number {
  return Object.values(kitchen.cookedRecipeCounts).filter((n) => n > 0).length
}

export function totalCooked(kitchen: KitchenState): number {
  return Object.values(kitchen.cookedRecipeCounts).reduce((sum, n) => sum + Math.max(0, n), 0)
}

/** 조건 하나에 지금 얼마나 왔는지 (0~1) */
export function conditionProgress(state: AppState, c: RecipeCondition): number {
  switch (c.kind) {
    case 'DEFAULT':
      return 1
    case 'CROP_HARVESTED':
      return Math.min(1, (state.garden.harvestedCropCounts[c.cropId] ?? 0) / c.count)
    case 'CROPS_DISCOVERED':
      return Math.min(1, discoveredCropIds(state.garden).length / c.count)
    case 'RECIPES_COOKED':
      return Math.min(1, cookedKinds(state.kitchen) / c.count)
  }
}

export function recipeProgress(state: AppState, def: KitchenRecipeDef): number {
  if (def.conditions.length === 0) return 1
  // 평균이 아니라 제일 덜 온 것. 하나만 남아도 아직 모르는 게 맞다.
  return Math.min(...def.conditions.map((c) => conditionProgress(state, c)))
}

export function recipeStage(state: AppState, def: KitchenRecipeDef): RecipeStage {
  // 한 번이라도 만들어봤으면 무슨 일이 있어도 계속 아는 것으로 둔다.
  // 조건을 나중에 올렸다고 이미 만들어본 요리가 ??? 로 돌아가면 안 된다.
  if ((state.kitchen.cookedRecipeCounts[def.id] ?? 0) > 0) return 'DISCOVERED'

  const progress = recipeProgress(state, def)
  if (progress >= 1) return 'DISCOVERED'
  if (progress >= def.hintAt) return 'HINTED'
  return 'UNKNOWN'
}

export function isRecipeDiscovered(state: AppState, id: string): boolean {
  const def = findKitchenRecipe(id)
  return def ? recipeStage(state, def) === 'DISCOVERED' : false
}

export function discoveredRecipes(state: AppState): KitchenRecipeDef[] {
  return KITCHEN_RECIPES.filter((r) => recipeStage(state, r) === 'DISCOVERED')
}

/**
 * 이번에 새로 알게 된 것.
 *
 * 처음부터 아는 넷은 알리지 않는다 — 부엌을 여는 순간 같이 열리는 것들이라,
 * "부엌을 찾았어" 와 "딸기 우유를 알게 됐어" 가 한꺼번에 다섯 장 뜨면
 * 그건 축하가 아니라 사고다. 그 넷은 첫 안내에서 소개한다.
 */
export function newlyDiscovered(state: AppState, alreadyToldKeys: string[]): KitchenRecipeDef[] {
  const told = new Set(alreadyToldKeys)
  return KITCHEN_RECIPES.filter(
    (r) =>
      !r.conditions.some((c) => c.kind === 'DEFAULT') &&
      recipeStage(state, r) === 'DISCOVERED' &&
      !told.has(`recipe:${r.id}`),
  )
}

// ── 화면에서 보는 모양 ──────────────────────────────────

function ingredientViews(state: AppState, def: KitchenRecipeDef): RecipeIngredientView[] {
  return def.ingredients.map((i) => {
    const item = findCollectionItem(i.itemId)
    return {
      itemId: i.itemId,
      name: item?.nameKo ?? '???',
      icon: item?.icon ?? '·',
      need: i.count,
      have: ownedCount(state.collection, i.itemId),
    }
  })
}

export function recipeView(state: AppState, def: KitchenRecipeDef): KitchenRecipeView {
  const ingredients = ingredientViews(state, def)
  const missingKinds = ingredients.filter((i) => i.have < i.need).length
  const stage = recipeStage(state, def)

  return {
    def,
    stage,
    progress: recipeProgress(state, def),
    ingredients,
    // 아직 모르는 것은 재료가 다 있어도 못 만든다
    canCook: stage === 'DISCOVERED' && missingKinds === 0,
    missingKinds,
    cooked: state.kitchen.cookedRecipeCounts[def.id] ?? 0,
    favorite: state.kitchen.favoriteRecipeIds.includes(def.id),
  }
}

/**
 * 목록 순서.
 *
 * "지금 뭘 만들 수 있는지" 를 먼저 보여준다. 하트를 누른 건 그 안에서 위로.
 * 아직 모르는 것은 맨 뒤에 조용히 남는다.
 */
function sortKey(v: KitchenRecipeView): number {
  if (v.stage === 'UNKNOWN') return 900
  if (v.stage === 'HINTED') return 800
  if (v.canCook) return v.favorite ? 0 : 10
  return 100 + v.missingKinds
}

export function kitchenView(state: AppState): KitchenView {
  const recipes = KITCHEN_RECIPES.map((def) => recipeView(state, def)).sort((a, b) => {
    const diff = sortKey(a) - sortKey(b)
    if (diff !== 0) return diff
    // 같은 자리면 아직 안 만들어본 것을 먼저
    return a.cooked - b.cooked
  })

  return {
    unlocked: isKitchenUnlocked(state),
    recipes,
    discovered: recipes.filter((r) => r.stage === 'DISCOVERED').length,
    total: KITCHEN_RECIPES.length,
    totalCooked: totalCooked(state.kitchen),
    suggestion: suggest(recipes),
  }
}

/**
 * 오늘 뭘 만들까.
 *
 * 지금 만들 수 있는 것 중에서 고른다. 아직 한 번도 안 만든 것 →
 * 하트를 누른 것 → 덜 만든 것 순서다. 바깥에 물어보지 않는다.
 */
export function suggest(recipes: KitchenRecipeView[]): KitchenRecipeView | null {
  const cookable = recipes.filter((r) => r.canCook)
  if (cookable.length === 0) return null

  const never = cookable.filter((r) => r.cooked === 0)
  if (never.length > 0) return never[0]

  const hearted = cookable.filter((r) => r.favorite)
  if (hearted.length > 0) return hearted[0]

  return [...cookable].sort((a, b) => a.cooked - b.cooked)[0]
}

// ── 만들기 ──────────────────────────────────────────────

export type CookResult =
  | { ok: true; def: KitchenRecipeDef; isNew: boolean; firstTime: boolean }
  | { ok: false; reason: 'UNKNOWN' | 'LOCKED' | 'MISSING' }

/**
 * 요리한다.
 *
 * 만들기 자체는 작은 작업실과 같은 길이다 — 재료를 빼고 결과를 넣는다.
 * 여기서 EXP·코인을 주지 않는다. 부엌은 보상 계산에 끼어들지 않는다.
 */
export function cookRecipe(
  state: AppState,
  recipeId: string,
  now: Date = new Date(),
): { state: AppState; result: CookResult } {
  const def = findKitchenRecipe(recipeId)
  if (!def) return { state, result: { ok: false, reason: 'UNKNOWN' } }
  if (recipeStage(state, def) !== 'DISCOVERED') {
    return { state, result: { ok: false, reason: 'LOCKED' } }
  }

  const spent = spendItems(state.collection, def.ingredients)
  if (!spent) return { state, result: { ok: false, reason: 'MISSING' } }

  const added = addItem(spent, def.outputItemId, now)
  const before = state.kitchen.cookedRecipeCounts[def.id] ?? 0

  return {
    state: {
      ...state,
      collection: added.collection,
      kitchen: {
        ...state.kitchen,
        cookedRecipeCounts: { ...state.kitchen.cookedRecipeCounts, [def.id]: before + 1 },
      },
    },
    result: { ok: true, def, isNew: added.isNew, firstTime: before === 0 },
  }
}

/** 하트. 보너스는 하나도 없다 — 목록 맨 위로 올라올 뿐이다. */
export function toggleFavorite(state: AppState, recipeId: string): AppState {
  if (!findKitchenRecipe(recipeId)) return state
  const list = state.kitchen.favoriteRecipeIds
  const next = list.includes(recipeId)
    ? list.filter((id) => id !== recipeId)
    : [...list, recipeId]
  return { ...state, kitchen: { ...state.kitchen, favoriteRecipeIds: next } }
}

/** 도감에 보여줄 진행률 */
export function recipeCollectionProgress(state: AppState): { found: number; total: number } {
  return { found: discoveredRecipes(state).length, total: KITCHEN_RECIPES.length }
}
