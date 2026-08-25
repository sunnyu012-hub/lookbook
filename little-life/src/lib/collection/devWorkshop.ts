import type { AppState } from '@/types'
import { addItem, spendItems } from './progress'
import { MATERIAL_CATALOG } from './catalog'
import { CROPS } from '@/lib/garden/crops'
import { RECIPES } from './recipes'
import { KITCHEN_RECIPES } from '@/lib/kitchen/recipes'
import { workshopView } from './workshopView'

/**
 * 개발용 작업실 도구.
 *
 * 주소에 ?dev=workshop 을 붙였을 때만. 화면 어디에도 들어가는 길은 없다.
 * 딸기를 서른 번 거둬보지 않고도 레시피 열둘을 확인하려고 둔다.
 */

export type DevWorkshopAction =
  | { kind: 'MATERIALS' }
  | { kind: 'KNOW_ALL' }
  | { kind: 'CRAFT'; recipeId: string }
  | { kind: 'CRAFT_ALL' }
  | { kind: 'RESET_CRAFTED' }

const DEV_COUNT = 99

export function applyDevWorkshop(
  state: AppState,
  action: DevWorkshopAction,
  now: Date = new Date(),
): AppState {
  switch (action.kind) {
    /** 재료와 작물을 한 아름 */
    case 'MATERIALS': {
      let collection = state.collection
      for (const m of MATERIAL_CATALOG) {
        for (let i = 0; i < DEV_COUNT; i += 1) {
          collection = addItem(collection, m.id, now).collection
        }
      }
      for (const crop of CROPS) {
        for (let i = 0; i < DEV_COUNT; i += 1) {
          collection = addItem(collection, crop.harvestItemId, now).collection
        }
      }
      return { ...state, collection }
    }

    /**
     * 전부 알게 만든다.
     *
     * 아는지는 저장하지 않고 기록에서 센다 — 그러니 여기서도 플래그를
     * 세우는 게 아니라 조건이 되는 기록을 채운다. 실제로 쓰는 길과
     * 같은 길로 가야 검수가 검수답다.
     */
    case 'KNOW_ALL': {
      const counts: Record<string, number> = { ...state.garden.harvestedCropCounts }
      for (const crop of CROPS) counts[crop.id] = Math.max(counts[crop.id] ?? 0, 30)

      const cooked: Record<string, number> = { ...state.kitchen.cookedRecipeCounts }
      // RECIPES_COOKED 를 보는 레시피가 있다. 가짓수만 채우면 된다.
      // 이름을 손으로 적지 않는다 — 표에서 가져와야 표가 바뀌어도 안 어긋난다.
      for (const r of KITCHEN_RECIPES) cooked[r.id] = Math.max(cooked[r.id] ?? 0, 1)

      return {
        ...state,
        garden: {
          ...state.garden,
          unlockedAt: state.garden.unlockedAt ?? now.toISOString(),
          harvestedCropCounts: counts,
        },
        kitchen: {
          ...state.kitchen,
          unlockedAt: state.kitchen.unlockedAt ?? now.toISOString(),
          cookedRecipeCounts: cooked,
        },
      }
    }

    /** 만들어본 것으로 친다 (재료는 쓴다 — 실제 길과 같게) */
    case 'CRAFT': {
      const recipe = RECIPES.find((r) => r.id === action.recipeId)
      if (!recipe) return state
      const spent = spendItems(state.collection, recipe.ingredients)
      if (!spent) return state
      return { ...state, collection: addItem(spent, recipe.resultItemId, now).collection }
    }

    /**
     * 만들 수 있는 것을 전부 한 번씩.
     *
     * 지름길이 아니다 — CRAFT 와 같은 길(spendItems → addItem)을 돈다.
     * 재료가 모자라면 그 줄은 그냥 넘어간다.
     */
    case 'CRAFT_ALL': {
      let next = state
      for (const recipe of RECIPES) {
        next = applyDevWorkshop(next, { kind: 'CRAFT', recipeId: recipe.id }, now)
      }
      return next
    }

    /**
     * 만든 것만 되돌린다.
     *
     * 만들어본 가짓수는 발견 기록에서 세니까, 되돌리려면 발견 기록에서
     * 지워야 한다. 다른 발견은 손대지 않는다.
     */
    case 'RESET_CRAFTED': {
      const discovered = { ...state.collection.discovered }
      const owned = { ...state.collection.owned }
      for (const r of RECIPES) {
        delete discovered[r.resultItemId]
        delete owned[r.resultItemId]
      }
      return { ...state, collection: { ...state.collection, discovered, owned } }
    }
  }
}

/** 검수판에 띄울 요약 */
export function devWorkshopSummary(state: AppState): string {
  const view = workshopView(state)
  const stages = view.recipes.reduce<Record<string, number>>((acc, r) => {
    acc[r.stage] = (acc[r.stage] ?? 0) + 1
    return acc
  }, {})
  return Object.entries(stages)
    .map(([k, n]) => `${k} ${n}`)
    .join(' · ')
}
