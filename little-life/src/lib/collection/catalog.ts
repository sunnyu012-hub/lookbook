import type { CollectionCategory, CollectionItemDef, CollectionRarity } from '@/types'
import { CATALOG_ROWS, MATERIALS } from './items'
import { artPath, thumbPath } from './assets'
import { placementFor } from './placement'
import { TROPHY_ITEMS } from './trophies'
import { CRAFTABLE_ITEM_IDS } from './recipes'
import { setsForItem } from './sets'
import { CROP_ITEMS, GARDEN_ITEMS } from '@/lib/garden/items'
import { FOOD_ITEMS, KITCHEN_ITEMS } from '@/lib/kitchen/items'
import { WORKSHOP_ITEMS } from './workshop'
import { MINERAL_ITEMS } from '@/lib/quarry/minerals'
import { CREATURE_ITEMS, DUNGEON_FINDS, STORY_ITEMS } from '@/lib/dungeon/items'
import { GARDEN_DECOR } from '@/lib/garden/items'
import { KITCHEN_DECOR } from '@/lib/kitchen/items'

/**
 * 완성된 아이템 표.
 *
 * 세트 소속과 "만들 수 있는지" 는 아이템 표에 손으로 적지 않는다.
 * 세트 파일과 레시피 파일에서 여기서 한 번에 붙인다 —
 * 같은 사실을 두 군데 적어두면 언젠가 반드시 어긋난다.
 */
function finish(item: CollectionItemDef): CollectionItemDef {
  const sources = [...item.acquisitionSources]
  // 아직 이 판에 없는 것에는 "만들어서 얻는다" 를 붙이지 않는다.
  // 표에 줄은 있지만(예고용) 실제로는 못 만든다 — 얻는 길이라고 적으면 거짓말이 된다.
  if (
    !item.comingSoon &&
    CRAFTABLE_ITEM_IDS.has(item.id) &&
    !sources.some((s) => s.kind === 'CRAFT')
  ) {
    sources.push({ kind: 'CRAFT' })
  }

  // 그림이 들어왔는지도 여기서 붙인다. 아이템 표에는 파일 경로를 적지 않는다 —
  // 그림은 나중에 하나씩 채워지는 것이라, 표와 폴더가 어긋나기 십상이다.
  const art = artPath(item.id, item.category)
  const thumb = thumbPath(item.id, item.category)
  const place = placementFor(item.id, item.category, item.subcategory)
  const placeable = place.placement === 'PLACEABLE'

  return {
    ...item,
    acquisitionSources: sources,
    collectionSetIds: setsForItem(item.id),
    ...(art ? { assetKey: art } : {}),
    ...(thumb ? { thumbKey: thumb } : {}),
    placementType: place.placementType,
    layer: place.layer,
    anchor: place.anchor,
    defaultScale: place.defaultScale,
    placement: place.placement,
    canRotate: place.canRotate,
    canFlip: place.canFlip,
    // 방에 놓을 수 있는 종류인지 (재료·먹을 것 대부분은 아니다)
    placeable,
    // 그림이 있으면 이모지가 없어도 방에 놓을 수 있다
    hasPlaceableAsset: placeable && (art !== undefined || item.icon !== undefined),
  }
}

/** 도감에 세는 240개 */
export const CATALOG: CollectionItemDef[] = CATALOG_ROWS.map(finish)

/** 트로피 (도감의 별도 칸) */
export const TROPHY_CATALOG: CollectionItemDef[] = TROPHY_ITEMS.map(finish)

/** 재료 (도감에는 세지 않는다. 가방에서 본다) */
export const MATERIAL_CATALOG: CollectionItemDef[] = MATERIALS.map(finish)

/**
 * 정원의 것들 — 씨앗 · 거둔 작물 · 이슬.
 *
 * 240칸에도 재료 목록에도 들어가지 않는다.
 * 재료 목록(MATERIAL_CATALOG)은 퀘스트 드롭 풀이기도 해서,
 * 여기 섞으면 기존 재료가 나올 확률이 조용히 낮아진다.
 * 씨앗은 자기 굴림을 따로 가진다 (lib/garden/derive.ts).
 */
export const GARDEN_CATALOG: CollectionItemDef[] = GARDEN_ITEMS.map(finish)

/** 도감의 CROPS 칸에 들어가는 작물 (거둔 것) */
export const CROP_CATALOG: CollectionItemDef[] = CROP_ITEMS.map(finish)

/** 부엌의 것들 — 만든 음식과 세트를 채우면 남는 것. 240칸에는 안 들어간다. */
export const KITCHEN_CATALOG: CollectionItemDef[] = KITCHEN_ITEMS.map(finish)

/** 도감의 RECIPES 칸에 들어가는 음식 */
export const FOOD_CATALOG: CollectionItemDef[] = FOOD_ITEMS.map(finish)

/** 작업실에서 만든 것들. 240칸에는 안 들어가고 방에는 놓을 수 있다. */
export const WORKSHOP_CATALOG: CollectionItemDef[] = WORKSHOP_ITEMS.map(finish)

/**
 * 채석장에서 캐는 것들.
 *
 * 재료 목록(MATERIAL_CATALOG)에 섞지 않는다 — 그 목록은 퀘스트에서
 * 무엇이 떨어질지 고르는 풀이기도 해서, 여기 스물두 개를 섞으면
 * 기존 재료가 나올 확률이 조용히 낮아진다. 작물을 따로 둔 이유와 같다.
 */
export const MINERAL_CATALOG: CollectionItemDef[] = MINERAL_ITEMS.map(finish)

/**
 * 잠든 돌문에서 나오는 것들.
 *
 * 광물과 같은 이유로 재료 목록에 안 섞는다 — 그 목록은 퀘스트 드롭 풀이라,
 * 여기 다섯을 넣으면 기존 재료가 나올 확률이 조용히 낮아진다.
 */
export const DUNGEON_CATALOG: CollectionItemDef[] = DUNGEON_FINDS.map(finish)

/**
 * 이야기가 지나간 자리에 남는 것.
 *
 * 지금은 오래된 열쇠 하나뿐이다. 재료도 아니고 방에 놓는 것도 아니라서
 * 어느 목록에도 안 들어간다 — 도감에서 이름으로 찾을 수만 있으면 된다.
 */
export const STORY_CATALOG: CollectionItemDef[] = STORY_ITEMS.map(finish)

/**
 * 잠든 돌문에 사는 것들 — 도감의 "생명체" 칸.
 *
 * 광물·발견물과 같은 칸에 두지 않는다. 저건 주워 온 물건이고
 * 이건 만난 상대다. 카드에 적히는 것도 다르다 — 물건은 설명 한 줄이
 * 끝까지 그대로지만, 생명체는 지나온 걸음마다 한 줄씩 늘어난다
 * (creatureDescription, lib/dungeon/creatureDerive.ts).
 *
 * 240 분모는 그대로다. 작물·요리·만든 것과 같은 방식이다.
 */
export const CREATURE_CATALOG: CollectionItemDef[] = CREATURE_ITEMS.map(finish)

/** 이름으로 찾을 수 있는 것 전부 */
export const ALL_COLLECTION_ITEMS: CollectionItemDef[] = [
  ...CATALOG,
  ...TROPHY_CATALOG,
  ...MATERIAL_CATALOG,
  ...GARDEN_CATALOG,
  ...KITCHEN_CATALOG,
  ...WORKSHOP_CATALOG,
  ...MINERAL_CATALOG,
  ...DUNGEON_CATALOG,
  ...STORY_CATALOG,
  ...CREATURE_CATALOG,
]

/**
 * 손으로 만들어서 얻는 것 — 도감의 "만든 것" 칸.
 *
 * 작업실에서 만든 열둘, 정원 세트를 채우면 남는 여섯, 부엌 세트의 넷.
 * 셋 다 240칸 밖에 있어서 그동안 도감 어디에도 안 보였다.
 * 만들어놓고 볼 데가 없으면 그건 모은 게 아니다.
 *
 * 작물(CROP_CATALOG) · 요리(FOOD_CATALOG) 와 같은 방식이다 —
 * 자기 칸을 따로 가지고 240 분모는 건드리지 않는다.
 */
export const CRAFTED_CATALOG: CollectionItemDef[] = [
  ...WORKSHOP_CATALOG,
  ...GARDEN_DECOR.map(finish),
  ...KITCHEN_DECOR.map(finish),
]

/**
 * 밖에서 주워 온 것 — 도감의 "탐험" 칸.
 *
 * 채석장 광물 열하나와 잠든 돌문에서 나온 다섯.
 * 둘 다 240칸 밖이라 그동안 가방 재료 칸에만 있었다.
 * 주워놓고 볼 데가 없으면 그건 모은 게 아니다 — "만든 것" 칸과 같은 이유다.
 *
 * 오래된 열쇠는 여기 안 넣는다. 그건 주워 온 물건이 아니라
 * 이야기가 지나간 자리라, 개수에 섞이면 "16개 중 하나" 가 된다.
 */
export const EXPLORED_CATALOG: CollectionItemDef[] = [...MINERAL_CATALOG, ...DUNGEON_CATALOG]

/**
 * 방에 놓을 수 있는 것 전부.
 *
 * 240칸(CATALOG)만 보면 안 된다 — 정원·부엌·작업실에서 나온 것은
 * 도감 수를 안 늘리려고 일부러 240칸 밖에 뒀다. 그것들도 방에는 놓인다.
 * 만들어놓고 놓을 수가 없으면 그건 만든 게 아니다.
 *
 * 재료와 씨앗·음식은 여기 안 들어온다 — placement 가 MATERIAL_ONLY 라서
 * 따로 걸러낼 필요가 없다.
 */
export const PLACEABLE_CATALOG: CollectionItemDef[] = ALL_COLLECTION_ITEMS.filter(
  // 아직 이 판에 없는 것(다음 업데이트 예고)은 놓을 수 있는 것에도 안 든다.
  (i) => i.placement === 'PLACEABLE' && !i.comingSoon,
)

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
