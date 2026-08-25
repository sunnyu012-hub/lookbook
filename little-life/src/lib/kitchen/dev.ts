import type { AppState } from '@/types'
import { addItem } from '@/lib/collection/progress'
import { CROPS } from '@/lib/garden/crops'
import { KITCHEN_RECIPES } from './recipes'
import { emptyKitchen } from './derive'

/**
 * 개발용 부엌 도구.
 *
 * 주소에 ?dev=kitchen 을 붙였을 때만. 화면 어디에도 들어가는 길은 없다.
 * 정원에서 열두 가지를 다 거둬보지 않고도 레시피 열둘을 확인하려고 둔다.
 */

export type DevKitchenAction =
  | { kind: 'UNLOCK' }
  | { kind: 'INGREDIENTS' }
  | { kind: 'DISCOVER_ALL' }
  | { kind: 'COOK'; recipeId: string }
  | { kind: 'RESET' }

const DEV_COUNT = 10

export function applyDevKitchen(
  state: AppState,
  action: DevKitchenAction,
  now: Date = new Date(),
): AppState {
  switch (action.kind) {
    /**
     * 부엌은 정원을 찾은 다음에 열린다.
     * 그래서 정원도 같이 열어준다 — 안 그러면 열자마자 조건이 안 맞아 보인다.
     */
    case 'UNLOCK':
      return {
        ...state,
        garden: { ...state.garden, unlockedAt: state.garden.unlockedAt ?? now.toISOString() },
        kitchen: { ...state.kitchen, unlockedAt: state.kitchen.unlockedAt ?? now.toISOString() },
      }

    case 'INGREDIENTS': {
      let collection = state.collection
      for (const crop of CROPS) {
        for (let i = 0; i < DEV_COUNT; i += 1) {
          collection = addItem(collection, crop.harvestItemId, now).collection
        }
      }
      return { ...state, collection }
    }

    /**
     * 레시피를 안다는 건 저장되는 값이 아니라 정원 기록에서 나온다.
     * 그래서 "전부 발견" 은 곧 "열두 가지를 다 거둔 것으로 친다" 다.
     */
    case 'DISCOVER_ALL': {
      const counts: Record<string, number> = { ...state.garden.harvestedCropCounts }
      for (const crop of CROPS) counts[crop.id] = Math.max(3, counts[crop.id] ?? 0)
      return { ...state, garden: { ...state.garden, harvestedCropCounts: counts } }
    }

    case 'COOK': {
      const def = KITCHEN_RECIPES.find((r) => r.id === action.recipeId)
      if (!def) return state
      const added = addItem(state.collection, def.outputItemId, now)
      return {
        ...state,
        collection: added.collection,
        kitchen: {
          ...state.kitchen,
          cookedRecipeCounts: {
            ...state.kitchen.cookedRecipeCounts,
            [def.id]: (state.kitchen.cookedRecipeCounts[def.id] ?? 0) + 1,
          },
        },
      }
    }

    // 부엌만 처음으로. 정원도 도감도 건드리지 않는다.
    case 'RESET':
      return { ...state, kitchen: emptyKitchen() }
  }
}
