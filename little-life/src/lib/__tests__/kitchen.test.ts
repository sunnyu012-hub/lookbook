import { describe, expect, it } from 'vitest'
import type { AppState } from '@/types'
import { createDefaultState } from '@/store/defaultState'
import { sanitizeState } from '@/store/localStorage'
import { sanitizeKitchen, STATE_VERSION } from '@/store/migrate'
import { CATALOG, catalogTotal, findCollectionItem } from '@/lib/collection/catalog'
import {
  addItem,
  isDiscovered,
  ownedCount,
  setProgress,
  unclaimedSets,
} from '@/lib/collection/progress'
import { COLLECTION_SETS } from '@/lib/collection/sets'
import { emptyGarden } from '@/lib/garden/derive'
import { CROPS } from '@/lib/garden/crops'
import {
  KITCHEN_UNLOCK,
  applyKitchenUnlock,
  canUnlockKitchen,
  cookRecipe,
  cookedKinds,
  discoveredRecipes,
  emptyKitchen,
  isKitchenUnlocked,
  kitchenView,
  recipeStage,
  suggest,
  toggleFavorite,
  totalCooked,
  unlockProgress,
} from '@/lib/kitchen/derive'
import {
  DEFAULT_RECIPE_IDS,
  KITCHEN_RECIPES,
  findKitchenRecipe,
  recipeForFood,
  recipesUsing,
} from '@/lib/kitchen/recipes'
import { applyDevKitchen } from '@/lib/kitchen/dev'
import { foodGiftLines } from '@/lib/kitchen/gifts'
import { memoriesOf, unlockedMemories } from '@/lib/discovery/companions'

/**
 * 작은 부엌.
 *
 * 제일 중요한 검사는 "한 번 만든 요리는 사라지지 않는다" 와
 * "만들기 계산이 한 벌뿐이다" 다.
 */

function base(): AppState {
  return createDefaultState()
}

/** 정원을 열고 작물을 거둔 것으로 친다 */
function withHarvest(counts: Record<string, number>): AppState {
  const s = base()
  return {
    ...s,
    garden: {
      ...emptyGarden(),
      unlockedAt: '2026-01-01T00:00:00.000Z',
      harvestedCropCounts: counts,
    },
  }
}

function opened(counts: Record<string, number> = { strawberry: 3, potato: 3, basil: 2, carrot: 2 }): AppState {
  const s = withHarvest(counts)
  return { ...s, kitchen: { ...emptyKitchen(), unlockedAt: '2026-01-02T00:00:00.000Z' } }
}

/** 재료를 쥐어준다 */
function withItems(state: AppState, itemId: string, n: number): AppState {
  let collection = state.collection
  for (let i = 0; i < n; i += 1) collection = addItem(collection, itemId).collection
  return { ...state, collection }
}

// ── A. 이관 ─────────────────────────────────────────────

describe('A. 기존 저장이 다치지 않는다', () => {
  it('부엌이 없던 저장에도 빈 부엌이 생긴다', () => {
    const old = { version: 12, user: { name: '유리', level: 4 }, quests: [] }
    const state = sanitizeState(old)!
    expect(state.kitchen.unlockedAt).toBeNull()
    expect(state.kitchen.cookedRecipeCounts).toEqual({})
    expect(state.version).toBe(STATE_VERSION)
    expect(state.user.name).toBe('유리')
    // 정원도 그대로 있다
    expect(state.garden.plots).toHaveLength(8)
  })

  it('만든 횟수는 다시 읽어도 그대로다', () => {
    const saved = {
      unlockedAt: '2026-01-01T00:00:00.000Z',
      tutorialSeenAt: '2026-01-01T00:00:00.000Z',
      cookedRecipeCounts: { strawberry_milk: 4, 없는레시피: 9 },
      favoriteRecipeIds: ['carrot_soup', '없는레시피'],
    }
    const kitchen = sanitizeKitchen(saved)
    expect(kitchen.cookedRecipeCounts).toEqual({ strawberry_milk: 4 })
    expect(kitchen.favoriteRecipeIds).toEqual(['carrot_soup'])
    expect(kitchen.unlockedAt).toBe(saved.unlockedAt)
  })

  it('도감 240칸은 그대로다 — 요리가 총계를 늘리지 않는다', () => {
    expect(CATALOG).toHaveLength(240)
    expect(catalogTotal({})).toBe(240)
    // 음식도 이름으로는 찾힌다 (안 그러면 손에 넣을 수가 없다)
    for (const recipe of KITCHEN_RECIPES) {
      expect(findCollectionItem(recipe.outputItemId)).not.toBeNull()
    }
  })

  it('레시피 세트 셋이 실제로 세트 목록에 들어 있다', () => {
    // 한 번 잘못 넣어서 목록 밖에 붙은 적이 있다. 그러면 조용히 아무 일도 안 일어난다.
    const ids = COLLECTION_SETS.map((s) => s.id)
    expect(ids).toContain('cozy_soup')
    expect(ids).toContain('sweet_afternoon')
    expect(ids).toContain('little_picnic')
  })

  it('요리 세트를 다 가지면 완성으로 센다', () => {
    const set = COLLECTION_SETS.find((s) => s.id === 'cozy_soup')!
    let state = opened()
    for (const id of set.itemIds) state = withItems(state, id, 1)
    expect(setProgress(set, state.collection).complete).toBe(true)
    expect(unclaimedSets(state.collection).map((s) => s.id)).toContain('cozy_soup')
  })

  it('세트 보상으로 주는 물건이 전부 존재한다', () => {
    for (const set of COLLECTION_SETS) {
      for (const reward of set.rewards) {
        if (reward.kind === 'ITEM') expect(findCollectionItem(reward.itemId)).not.toBeNull()
      }
      for (const id of set.itemIds) expect(findCollectionItem(id)).not.toBeNull()
    }
  })
})

// ── B. 해금 ─────────────────────────────────────────────

describe('B. 부엌을 여는 조건', () => {
  it('정원을 못 찾았으면 아예 0 이다', () => {
    expect(unlockProgress(base())).toBe(0)
    expect(canUnlockKitchen(base())).toBe(false)
  })

  it('하나만 채우면 아직이다', () => {
    // 한 가지만 잔뜩 거둔 경우 — 가짓수가 모자라다
    const one = withHarvest({ strawberry: 20 })
    expect(canUnlockKitchen(one)).toBe(false)
  })

  it('가짓수와 횟수를 둘 다 채우면 열린다', () => {
    const ready = withHarvest({ strawberry: 2, potato: 2, basil: 2, carrot: 2 })
    expect(canUnlockKitchen(ready)).toBe(true)
    const result = applyKitchenUnlock(ready)
    expect(result.opened).toBe(true)
    expect(isKitchenUnlocked(result.state)).toBe(true)
  })

  it('두 번 열리지 않는다', () => {
    expect(applyKitchenUnlock(opened()).opened).toBe(false)
  })

  it('조건은 되돌아가지 않는 값만 본다', () => {
    expect(KITCHEN_UNLOCK.cropKinds).toBeGreaterThan(0)
    expect(KITCHEN_UNLOCK.harvests).toBeGreaterThan(0)
  })
})

// ── C. 레시피를 알게 되는 정도 ──────────────────────────

describe('C. ??? 에서 발견까지', () => {
  it('처음부터 아는 넷이 있다', () => {
    expect(DEFAULT_RECIPE_IDS).toHaveLength(4)
    const state = opened()
    for (const id of DEFAULT_RECIPE_IDS) {
      expect(recipeStage(state, findKitchenRecipe(id)!)).toBe('DISCOVERED')
    }
  })

  it('거둔 게 없으면 나머지는 ??? 다', () => {
    const state = opened({ strawberry: 1, potato: 1, basil: 1, carrot: 1 })
    expect(recipeStage(state, findKitchenRecipe('pumpkin_tart')!)).toBe('UNKNOWN')
  })

  it('조금 거두면 낌새가 온다', () => {
    const state = opened({ strawberry: 2, potato: 2, basil: 2, carrot: 2, pumpkin: 1 })
    expect(recipeStage(state, findKitchenRecipe('pumpkin_tart')!)).toBe('HINTED')
  })

  it('더 거두면 알게 된다', () => {
    const state = opened({ strawberry: 2, potato: 2, basil: 2, carrot: 2, pumpkin: 3 })
    expect(recipeStage(state, findKitchenRecipe('pumpkin_tart')!)).toBe('DISCOVERED')
  })

  it('한 번 만들어본 요리는 조건이 바뀌어도 ??? 로 안 돌아간다', () => {
    const state: AppState = {
      ...opened({ strawberry: 1, potato: 1, basil: 1, carrot: 1 }),
      kitchen: { ...emptyKitchen(), unlockedAt: 'x', cookedRecipeCounts: { pumpkin_tart: 1 } },
    }
    expect(recipeStage(state, findKitchenRecipe('pumpkin_tart')!)).toBe('DISCOVERED')
  })

  it('여러 가지를 만들어보면 도시락이 열린다', () => {
    const before = opened()
    expect(recipeStage(before, findKitchenRecipe('picnic_lunchbox')!)).not.toBe('DISCOVERED')

    const after: AppState = {
      ...before,
      kitchen: {
        ...before.kitchen,
        cookedRecipeCounts: {
          strawberry_milk: 1,
          herb_potato_soup: 1,
          tomato_pasta: 1,
          carrot_soup: 1,
        },
      },
    }
    expect(cookedKinds(after.kitchen)).toBe(4)
    expect(recipeStage(after, findKitchenRecipe('picnic_lunchbox')!)).toBe('DISCOVERED')
  })
})

// ── D. 요리하기 ─────────────────────────────────────────

describe('D. 만든다', () => {
  it('재료가 없으면 못 만든다', () => {
    const { state, result } = cookRecipe(opened(), 'strawberry_milk')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('MISSING')
    expect(state.kitchen.cookedRecipeCounts).toEqual({})
  })

  it('아직 모르는 요리는 재료가 다 있어도 못 만든다', () => {
    let state = opened({ strawberry: 1, potato: 1, basil: 1, carrot: 1 })
    state = withItems(state, 'crop_pumpkin', 5)
    const { result } = cookRecipe(state, 'pumpkin_tart')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('LOCKED')
  })

  it('만들면 재료가 빠지고 음식이 손에 들어온다', () => {
    const before = withItems(opened(), 'crop_strawberry', 3)
    const { state, result } = cookRecipe(before, 'strawberry_milk')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.firstTime).toBe(true)
    expect(result.isNew).toBe(true)

    // 딸기 두 개가 빠졌다
    expect(ownedCount(state.collection, 'crop_strawberry')).toBe(1)
    expect(ownedCount(state.collection, 'food_strawberry_milk')).toBe(1)
    expect(isDiscovered(state.collection, 'food_strawberry_milk')).toBe(true)
    expect(state.kitchen.cookedRecipeCounts.strawberry_milk).toBe(1)
    expect(totalCooked(state.kitchen)).toBe(1)
  })

  it('두 번째부터는 처음이 아니다', () => {
    let state = withItems(opened(), 'crop_strawberry', 4)
    state = cookRecipe(state, 'strawberry_milk').state
    const { state: twice, result } = cookRecipe(state, 'strawberry_milk')
    expect(result.ok && result.firstTime).toBe(false)
    expect(twice.kitchen.cookedRecipeCounts.strawberry_milk).toBe(2)
    expect(ownedCount(twice.collection, 'food_strawberry_milk')).toBe(2)
  })

  it('음식을 다 써도 만들어본 기록은 남는다', () => {
    let state = withItems(opened(), 'crop_strawberry', 2)
    state = cookRecipe(state, 'strawberry_milk').state
    // 먹거나 줘서 없어진 셈으로 친다
    state = { ...state, collection: { ...state.collection, owned: { ...state.collection.owned, food_strawberry_milk: 0 } } }
    expect(recipeStage(state, findKitchenRecipe('strawberry_milk')!)).toBe('DISCOVERED')
    expect(discoveredRecipes(state).some((r) => r.id === 'strawberry_milk')).toBe(true)
  })

  it('여러 재료를 쓰는 요리도 정확히 빠진다', () => {
    let state = opened()
    state = withItems(state, 'crop_potato', 3)
    state = withItems(state, 'crop_basil', 2)
    const { state: next, result } = cookRecipe(state, 'herb_potato_soup')

    expect(result.ok).toBe(true)
    expect(ownedCount(next.collection, 'crop_potato')).toBe(1)
    expect(ownedCount(next.collection, 'crop_basil')).toBe(1)
  })
})

// ── E. 화면에 보이는 것 ─────────────────────────────────

describe('E. 무엇을 만들 수 있는지 먼저 보여준다', () => {
  it('만들 수 있는 것이 맨 위로 온다', () => {
    const state = withItems(opened(), 'crop_carrot', 2)
    const view = kitchenView(state)
    expect(view.recipes[0].def.id).toBe('carrot_soup')
    expect(view.recipes[0].canCook).toBe(true)
  })

  it('추천은 아직 안 만들어본 것 중에서 고른다', () => {
    let state = withItems(opened(), 'crop_carrot', 4)
    state = withItems(state, 'crop_strawberry', 4)

    const first = kitchenView(state).suggestion
    expect(first).not.toBeNull()
    expect(first!.cooked).toBe(0)

    // 하나 만들고 나면 다른 걸 권한다
    state = cookRecipe(state, first!.def.id).state
    const second = kitchenView(state).suggestion
    expect(second!.def.id).not.toBe(first!.def.id)
  })

  it('만들 수 있는 게 없으면 추천도 없다', () => {
    expect(kitchenView(opened()).suggestion).toBeNull()
    expect(suggest([])).toBeNull()
  })

  it('모자란 재료 가짓수를 센다', () => {
    const state = withItems(opened(), 'crop_potato', 2)
    const soup = kitchenView(state).recipes.find((r) => r.def.id === 'herb_potato_soup')!
    expect(soup.canCook).toBe(false)
    // 감자는 있고 바질이 없다
    expect(soup.missingKinds).toBe(1)
    expect(soup.ingredients.find((i) => i.itemId === 'crop_potato')!.have).toBe(2)
  })

  it('하트는 보너스가 없고 순서만 바꾼다', () => {
    let state = withItems(opened(), 'crop_carrot', 2)
    state = withItems(state, 'crop_strawberry', 2)
    const before = kitchenView(state).recipes.find((r) => r.def.id === 'strawberry_milk')!

    const after = toggleFavorite(state, 'strawberry_milk')
    const view = kitchenView(after)
    expect(view.recipes[0].def.id).toBe('strawberry_milk')
    expect(view.recipes[0].favorite).toBe(true)
    // 코인도 EXP도 재료도 그대로다
    expect(after.user.coins).toBe(state.user.coins)
    expect(after.user.totalExp).toBe(state.user.totalExp)
    expect(before.ingredients).toEqual(view.recipes[0].ingredients)

    // 다시 누르면 꺼진다
    expect(toggleFavorite(after, 'strawberry_milk').kitchen.favoriteRecipeIds).toEqual([])
  })
})

// ── F. 재료와 요리가 이어져 있다 ────────────────────────

describe('F. 정원과 이어져 있다', () => {
  it('모든 재료가 실제로 존재하는 작물이다', () => {
    const cropItems = new Set(CROPS.map((c) => c.harvestItemId))
    for (const recipe of KITCHEN_RECIPES) {
      for (const ing of recipe.ingredients) {
        expect(cropItems.has(ing.itemId)).toBe(true)
      }
    }
  })

  it('딸기를 쓰는 요리를 거꾸로 찾을 수 있다', () => {
    const ids = recipesUsing('crop_strawberry').map((r) => r.id)
    expect(ids).toContain('strawberry_milk')
    expect(ids).toContain('strawberry_toast')
    expect(ids).toContain('picnic_lunchbox')
  })

  it('음식에서 레시피를 거꾸로 찾을 수 있다', () => {
    expect(recipeForFood('food_carrot_soup')?.id).toBe('carrot_soup')
    expect(recipeForFood('없는것')).toBeNull()
  })
})

// ── G. 사람과 동료 ──────────────────────────────────────

describe('G. 준다 · 같이 있는다', () => {
  it('그 사람다운 조합에만 대사가 붙는다', () => {
    expect(foodGiftLines('MINA', 'strawberry_milk').length).toBeGreaterThan(0)
    expect(foodGiftLines('HARU', 'herb_potato_soup').length).toBeGreaterThan(0)
    // 대사가 없어도 선물 자체는 된다
    expect(foodGiftLines('RIO', 'strawberry_milk')).toEqual([])
  })

  it('요리가 걸린 기억은 만들어봐야 열린다', () => {
    const withRecipe = memoriesOf('BORI').filter((m) => m.needsRecipeId)
    expect(withRecipe.length).toBeGreaterThan(0)

    const id = withRecipe[0].needsRecipeId!
    expect(unlockedMemories('BORI', 99).some((m) => m.needsRecipeId === id)).toBe(false)
    expect(unlockedMemories('BORI', 99, [id]).some((m) => m.needsRecipeId === id)).toBe(true)
  })

  it('기억이 가리키는 레시피가 실제로 있다', () => {
    for (const companion of ['BORI', 'MOCHI', 'BEAN', 'LUNA'] as const) {
      for (const memory of memoriesOf(companion)) {
        if (memory.needsRecipeId) {
          expect(findKitchenRecipe(memory.needsRecipeId)).not.toBeNull()
        }
      }
    }
  })
})

// ── H. 개발용 ───────────────────────────────────────────

describe('H. 개발용 도구', () => {
  it('부엌을 열면 정원도 같이 열어준다', () => {
    const after = applyDevKitchen(base(), { kind: 'UNLOCK' })
    expect(isKitchenUnlocked(after)).toBe(true)
    expect(after.garden.unlockedAt).not.toBeNull()
  })

  it('전부 발견은 거둔 기록을 채우는 것이다', () => {
    let state = applyDevKitchen(base(), { kind: 'UNLOCK' })
    state = applyDevKitchen(state, { kind: 'DISCOVER_ALL' })
    expect(discoveredRecipes(state)).toHaveLength(KITCHEN_RECIPES.length)
  })

  it('부엌만 초기화해도 도감과 정원은 남는다', () => {
    let state = applyDevKitchen(base(), { kind: 'UNLOCK' })
    state = applyDevKitchen(state, { kind: 'INGREDIENTS' })
    state = applyDevKitchen(state, { kind: 'COOK', recipeId: 'carrot_soup' })
    expect(state.kitchen.cookedRecipeCounts.carrot_soup).toBe(1)

    const reset = applyDevKitchen(state, { kind: 'RESET' })
    expect(reset.kitchen.cookedRecipeCounts).toEqual({})
    expect(reset.garden.unlockedAt).not.toBeNull()
    expect(isDiscovered(reset.collection, 'food_carrot_soup')).toBe(true)
  })
})
