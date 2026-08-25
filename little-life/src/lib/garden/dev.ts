import type { AppState, GardenState } from '@/types'
import { addItem } from '@/lib/collection/progress'
import { CROPS, PLANTABLE_CROPS } from './crops'
import { GARDEN_LEVELS, XP_BY_RARITY, emptyGarden, gardenLevel, gardenXp } from './derive'

/**
 * 개발용 정원 도구.
 *
 * 네 시간을 실제로 기다려보지 않고도 자라는 것 · 거두는 것 · 넓어지는 것을
 * 확인하려고 둔다. 화면 어디에도 부르는 길이 없다 (?dev=garden 에서만).
 */

export type DevGardenAction =
  | { kind: 'UNLOCK' }
  | { kind: 'SEEDS' }
  | { kind: 'GROW_ALL' }
  | { kind: 'HARVEST_ALL_CROPS' }
  | { kind: 'SET_XP'; xp: number }
  | { kind: 'RESET' }

const DEV_SEEDS = 10

export function applyDevGarden(
  state: AppState,
  action: DevGardenAction,
  now: Date = new Date(),
): AppState {
  switch (action.kind) {
    case 'UNLOCK':
      return {
        ...state,
        garden: { ...state.garden, unlockedAt: state.garden.unlockedAt ?? now.toISOString() },
      }

    case 'SEEDS': {
      let collection = state.collection
      for (const crop of PLANTABLE_CROPS) {
        for (let i = 0; i < DEV_SEEDS; i += 1) {
          collection = addItem(collection, crop.seedItemId, now).collection
        }
      }
      return { ...state, collection }
    }

    // 심어둔 것을 전부 다 자란 것으로 만든다 (readyAt 을 지금으로 당긴다)
    case 'GROW_ALL':
      return {
        ...state,
        garden: {
          ...state.garden,
          plots: state.garden.plots.map((p) =>
            p.cropId && p.plantedAt ? { ...p, readyAt: now.toISOString() } : p,
          ),
        },
      }

    // 열두 가지를 전부 한 번씩 거둔 것으로 친다 — 도감 칸을 보려고
    case 'HARVEST_ALL_CROPS': {
      let collection = state.collection
      const counts: Record<string, number> = { ...state.garden.harvestedCropCounts }
      for (const crop of CROPS) {
        collection = addItem(collection, crop.harvestItemId, now).collection
        counts[crop.id] = Math.max(1, counts[crop.id] ?? 0)
      }
      return { ...state, collection, garden: { ...state.garden, harvestedCropCounts: counts } }
    }

    /**
     * 경험치는 저장되는 값이 아니라 거둔 기록에서 나온다.
     * 그래서 "경험치를 바꾼다" 는 곧 "거둔 횟수를 바꾼다" 다 —
     * 제일 흔한 작물(경험치 1)의 횟수로 맞춘다.
     */
    case 'SET_XP': {
      const common = CROPS.find((c) => XP_BY_RARITY[c.rarity] === 1) ?? CROPS[0]
      const counts = { ...state.garden.harvestedCropCounts }
      delete counts[common.id]

      const rest = gardenXp({ ...state.garden, harvestedCropCounts: counts } as GardenState)
      const need = Math.max(0, Math.ceil((action.xp - rest) / XP_BY_RARITY[common.rarity]))
      if (need > 0) counts[common.id] = need

      return { ...state, garden: { ...state.garden, harvestedCropCounts: counts } }
    }

    // 정원만 처음으로 되돌린다. 도감·코인·퀘스트는 건드리지 않는다.
    case 'RESET':
      return { ...state, garden: emptyGarden() }
  }
}

/** 개발용 표시 — 지금 몇 단계이고 다음 단계까지 얼마나 남았는지 */
export function devGardenSummary(state: AppState): string {
  const xp = gardenXp(state.garden)
  const level = gardenLevel(xp)
  const next = GARDEN_LEVELS.find((d) => d.level === level + 1)
  return next ? `Lv.${level} · ${xp}xp · 다음 ${next.needXp}xp` : `Lv.${level} · ${xp}xp · 마지막`
}
