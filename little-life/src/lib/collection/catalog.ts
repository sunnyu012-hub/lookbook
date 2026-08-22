import type { CollectionCategory, CollectionItemDef, CollectionRarity } from '@/types'
import { CATALOG_ROWS, MATERIALS } from './items'
import { artFor } from './assets'
import { TROPHY_ITEMS } from './trophies'
import { CRAFTABLE_ITEM_IDS } from './recipes'
import { setsForItem } from './sets'

/**
 * 완성된 아이템 표.
 *
 * 세트 소속과 "만들 수 있는지" 는 아이템 표에 손으로 적지 않는다.
 * 세트 파일과 레시피 파일에서 여기서 한 번에 붙인다 —
 * 같은 사실을 두 군데 적어두면 언젠가 반드시 어긋난다.
 */
function finish(item: CollectionItemDef): CollectionItemDef {
  const sources = [...item.acquisitionSources]
  if (CRAFTABLE_ITEM_IDS.has(item.id) && !sources.some((s) => s.kind === 'CRAFT')) {
    sources.push({ kind: 'CRAFT' })
  }

  // 그림이 들어왔는지도 여기서 붙인다. 아이템 표에는 파일 경로를 적지 않는다 —
  // 그림은 나중에 하나씩 채워지는 것이라, 표와 폴더가 어긋나기 십상이다.
  const art = artFor(item.id)

  return {
    ...item,
    acquisitionSources: sources,
    collectionSetIds: setsForItem(item.id),
    ...(art ? { assetKey: art } : {}),
    // 그림이 있으면 이모지가 없어도 방에 놓을 수 있다
    hasPlaceableAsset: item.placeable && (art !== undefined || item.icon !== undefined),
  }
}

/** 도감에 세는 240개 */
export const CATALOG: CollectionItemDef[] = CATALOG_ROWS.map(finish)

/** 트로피 (도감의 별도 칸) */
export const TROPHY_CATALOG: CollectionItemDef[] = TROPHY_ITEMS.map(finish)

/** 재료 (도감에는 세지 않는다. 가방에서 본다) */
export const MATERIAL_CATALOG: CollectionItemDef[] = MATERIALS.map(finish)

/** 이름으로 찾을 수 있는 것 전부 */
export const ALL_COLLECTION_ITEMS: CollectionItemDef[] = [
  ...CATALOG,
  ...TROPHY_CATALOG,
  ...MATERIAL_CATALOG,
]

const BY_ID = new Map(ALL_COLLECTION_ITEMS.map((i) => [i.id, i]))

export function findCollectionItem(id: string): CollectionItemDef | null {
  return BY_ID.get(id) ?? null
}

export function isCollectionItem(id: string): boolean {
  return BY_ID.has(id)
}

/**
 * 도감의 전체 칸 수.
 *
 * 발견 전에는 총 수에도 안 들어가는 물건이 있을 수 있다 (hiddenFromTotal).
 * 그런 게 남아 있으면 화면에는 "236 / 240 + ?" 처럼 물음표가 붙는다.
 */
export function catalogTotal(discovered: Record<string, string>): number {
  return CATALOG.filter((i) => !i.hiddenFromTotal || discovered[i.id] !== undefined).length
}

export function hasHiddenLeft(discovered: Record<string, string>): boolean {
  return CATALOG.some((i) => i.hiddenFromTotal && discovered[i.id] === undefined)
}

export function itemsInCategory(category: CollectionCategory): CollectionItemDef[] {
  return CATALOG.filter((i) => i.category === category)
}

/** 도감에 보여줄 분류 순서 */
export const CATALOG_CATEGORIES: CollectionCategory[] = [
  'FURNITURE',
  'LITTLE_THING',
  'PLANT',
  'LIGHTING',
  'RUG',
  'KITCHEN',
  'FOOD',
  'BOOK',
  'HOBBY',
  'TECH',
  'WALL',
  'MAGIC',
]

export const RARITY_ORDER: Record<CollectionRarity, number> = {
  COMMON: 0,
  RARE: 1,
  EPIC: 2,
  LEGENDARY: 3,
  SECRET: 4,
}
