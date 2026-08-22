import type { Category, CollectionItemDef } from '@/types'
import { CATALOG, MATERIAL_CATALOG } from './catalog'

/**
 * 퀘스트를 하다 보면 나오는 것들.
 *
 * 보상 계산(EXP·Coin)은 손대지 않는다. 이건 그 위에 얹히는 별개의 굴림이다.
 * 기존 드롭(장비·소모품)도 그대로 돈다 — 여기서 하는 건 재료와 작은 물건뿐이다.
 *
 * 어떤 분야에서 뭐가 나오는지는 아이템 표가 정한다 (Q:분야).
 * 여기에 목록을 또 적지 않는다.
 */

/** 분야별 재료 */
const MATERIAL_BY_CATEGORY: Record<Category, string[]> = (() => {
  const map = {
    LIFE: [] as string[],
    WORK: [],
    BODY: [],
    PLAY: [],
    MIND: [],
    HEART: [],
  } as Record<Category, string[]>

  for (const item of MATERIAL_CATALOG) {
    for (const source of item.acquisitionSources) {
      if (source.kind !== 'QUEST') continue
      if (source.category) map[source.category].push(item.id)
      else for (const key of Object.keys(map) as Category[]) map[key].push(item.id)
    }
  }
  return map
})()

/** 분야별로 퀘스트에서 나올 수 있는 도감 물건 */
const QUEST_ITEMS_BY_CATEGORY: Record<Category, string[]> = (() => {
  const map = {
    LIFE: [] as string[],
    WORK: [],
    BODY: [],
    PLAY: [],
    MIND: [],
    HEART: [],
  } as Record<Category, string[]>

  for (const item of CATALOG) {
    for (const source of item.acquisitionSources) {
      if (source.kind !== 'QUEST') continue
      if (source.category) map[source.category].push(item.id)
      else for (const key of Object.keys(map) as Category[]) map[key].push(item.id)
    }
  }
  return map
})()

function poolFor(kind: 'BOSS' | 'EVENT'): string[] {
  return CATALOG.filter((i) => i.acquisitionSources.some((s) => s.kind === kind)).map((i) => i.id)
}

export const BOSS_POOL = poolFor('BOSS')
export const EVENT_POOL = poolFor('EVENT')

/** 재료가 나올 확률 (%) */
export const MATERIAL_CHANCE = 40
/** 도감 물건이 나올 확률 (%) */
export const ITEM_CHANCE = 6
/** 이벤트가 열린 날 하나 더 굴린다 (%) */
export const EVENT_CHANCE = 8

export interface CollectDropOptions {
  category: Category
  /** 기존 보너스에서 온 드롭 확률 (%p). 새로 계산하지 않고 받아서 쓴다. */
  luckPct?: number
  /** 오늘 도시에 무슨 일이 있는지 */
  eventActive?: boolean
  rng?: () => number
}

function pick(pool: string[], rng: () => number): string | null {
  if (pool.length === 0) return null
  return pool[Math.floor(rng() * pool.length) % pool.length]
}

/**
 * 퀘스트 하나를 끝냈을 때 나오는 것.
 * 재료 하나, 운이 좋으면 물건 하나까지. 한 번에 셋씩 쏟아지지 않는다.
 */
export function rollCollectDrops(options: CollectDropOptions): string[] {
  const { category, luckPct = 0, eventActive = false, rng = Math.random } = options
  const out: string[] = []

  if (rng() * 100 < MATERIAL_CHANCE + luckPct) {
    const id = pick(MATERIAL_BY_CATEGORY[category], rng)
    if (id) out.push(id)
  }

  if (rng() * 100 < ITEM_CHANCE + luckPct / 2) {
    const id = pick(QUEST_ITEMS_BY_CATEGORY[category], rng)
    if (id) out.push(id)
  }

  if (eventActive && rng() * 100 < EVENT_CHANCE) {
    const id = pick(EVENT_POOL, rng)
    if (id) out.push(id)
  }

  return out
}

/** 보스를 넘었을 때. 여기서는 늘 하나 나온다. */
export function rollBossDrop(rng: () => number = Math.random): string | null {
  return pick(BOSS_POOL, rng)
}

export function materialsFor(category: Category): CollectionItemDef[] {
  return MATERIAL_BY_CATEGORY[category]
    .map((id) => MATERIAL_CATALOG.find((m) => m.id === id))
    .filter((m): m is CollectionItemDef => m !== undefined)
}
