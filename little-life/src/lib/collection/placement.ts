import type { CollectionCategory, CollectionItemDef, PlacementType } from '@/types'

/**
 * 무엇을 어디에 어떻게 놓는가.
 *
 * 카테고리마다 기본값을 정해두고, 아이템 몇 개만 따로 고친다.
 * 240개에 하나하나 적으면 표가 두 배로 길어지고 대부분은 같은 값이다.
 *
 * 여기서 정하는 것:
 *   placementType  바닥인지 벽인지 위에 올리는 것인지
 *   layer          앞뒤 순서 (러그는 늘 밑에 깔린다)
 *   anchor         좌표를 어디에 맞출지
 *   defaultScale   방 너비의 몇 %를 차지하는지
 *   placement      방에 놓을 수 있는지 · 도감에만 있는지 · 재료인지
 */

export type PlacementClass = 'PLACEABLE' | 'DISPLAY_ONLY' | 'MATERIAL_ONLY'

/** 앞뒤 순서. 같은 층 안에서는 아래(y)에 있는 것이 앞에 온다. */
export const LAYER: Record<PlacementType, number> = {
  RUG: 0,
  WALL: 5,
  WINDOW: 5,
  FLOOR: 10,
  SHELF: 15,
  TABLETOP: 20,
  DECOR: 20,
  HANGING: 30,
}

interface CategoryRule {
  type: PlacementType
  /** 방 너비 대비 % */
  width: number
  placement: PlacementClass
  canRotate?: boolean
}

const BY_CATEGORY: Record<CollectionCategory, CategoryRule> = {
  FURNITURE: { type: 'FLOOR', width: 26, placement: 'PLACEABLE' },
  LIGHTING: { type: 'TABLETOP', width: 13, placement: 'PLACEABLE' },
  PLANT: { type: 'TABLETOP', width: 13, placement: 'PLACEABLE' },
  RUG: { type: 'RUG', width: 40, placement: 'PLACEABLE', canRotate: true },
  WALL: { type: 'WALL', width: 16, placement: 'PLACEABLE' },
  LITTLE_THING: { type: 'TABLETOP', width: 10, placement: 'PLACEABLE' },
  KITCHEN: { type: 'TABLETOP', width: 11, placement: 'PLACEABLE' },
  // 먹을 것은 대체로 도감에만 둔다 — 접시·바구니처럼 장식이 되는 것만 따로 연다
  FOOD: { type: 'TABLETOP', width: 10, placement: 'DISPLAY_ONLY' },
  BOOK: { type: 'TABLETOP', width: 11, placement: 'PLACEABLE' },
  HOBBY: { type: 'FLOOR', width: 15, placement: 'PLACEABLE' },
  TECH: { type: 'TABLETOP', width: 15, placement: 'PLACEABLE' },
  OUTDOOR: { type: 'FLOOR', width: 17, placement: 'PLACEABLE' },
  MAGIC: { type: 'DECOR', width: 11, placement: 'DISPLAY_ONLY' },
  TROPHY: { type: 'TABLETOP', width: 13, placement: 'PLACEABLE' },
  MATERIAL: { type: 'DECOR', width: 9, placement: 'MATERIAL_ONLY' },
}

/** 분류 안에서 결이 다른 묶음 */
const BY_SUBCATEGORY: Record<string, Partial<CategoryRule>> = {
  침대: { width: 32 },
  소파: { width: 31 },
  의자: { width: 15 },
  책상: { width: 27 },
  수납: { width: 21 },
  // 담요와 쿠션은 러그처럼 바닥을 다 덮지 않는다. 위에 올려두는 것에 가깝다.
  천: { type: 'DECOR', width: 15, canRotate: true },
}

interface ItemRule extends Partial<CategoryRule> {
  anchor?: CollectionItemDef['anchor']
}

/**
 * 아이템별로 따로 정하는 것.
 * 여기 없는 것은 전부 분류 기본값을 쓴다.
 */
const BY_ITEM: Record<string, ItemRule> = {
  // ── 바닥에 서는 큰 식물 ──
  big_monstera: { type: 'FLOOR', width: 20 },
  olive_tree: { type: 'FLOOR', width: 18 },
  rubber_tree: { type: 'FLOOR', width: 17 },
  small_monstera: { width: 14 },

  // ── 바닥에 서는 조명 ──
  floor_lamp: { type: 'FLOOR', width: 13 },
  green_stand: { type: 'FLOOR', width: 12 },
  star_projector: { type: 'FLOOR', width: 13 },

  // ── 천장에 매다는 것 ──
  cloud_mobile: { type: 'HANGING', width: 14 },
  star_mobile: { type: 'HANGING', width: 14 },
  raindrop_light: { type: 'HANGING', width: 15 },
  paper_lantern: { type: 'HANGING', width: 13 },
  garland: { type: 'WALL', width: 30 },
  fairy_lights: { type: 'WALL', width: 32 },

  // ── 창가 ──
  window_ledge: { type: 'WINDOW', width: 22 },
  window_bench: { type: 'FLOOR', width: 26 },

  // ── 큰 취미 물건은 바닥에 ──
  guitar: { type: 'FLOOR', width: 13 },
  easel: { type: 'FLOOR', width: 16 },
  yoga_mat: { type: 'RUG', width: 26, canRotate: true },
  picnic_mat: { type: 'RUG', width: 32, canRotate: true },
  chalk_bag: { width: 10 },
  sneakers_c: { width: 12 },

  // ── 책상 위에 올리는 기계 ──
  monitor: { width: 17 },
  small_laptop: { width: 15 },
  keyboard: { width: 14 },
  mouse: { width: 7 },
  tablet: { width: 12 },
  controller: { width: 10 },
  handheld: { width: 11 },
  speaker: { width: 9 },
  mini_piano: { type: 'TABLETOP', width: 18 },

  // ── 먹을 것 중 장식이 되는 것 ──
  cookie_plate: { placement: 'PLACEABLE' },
  strawberry_cake: { placement: 'PLACEABLE' },
  cake_slice: { placement: 'PLACEABLE' },
  apple_basket: { placement: 'PLACEABLE', width: 12 },
  tangerine_basket: { placement: 'PLACEABLE', width: 12 },
  strawberry_pack: { placement: 'PLACEABLE' },
  toast_plate: { placement: 'PLACEABLE' },
  flower_plate: { placement: 'PLACEABLE' },

  // ── 보물 중 놓을 수 있는 것 ──
  star_music_box: { placement: 'PLACEABLE', width: 12 },
  moon_ticket_c: { placement: 'DISPLAY_ONLY' },
  night_ticket_c: { placement: 'DISPLAY_ONLY' },
  sleeping_star: { placement: 'PLACEABLE', width: 12 },
  little_moon: { placement: 'PLACEABLE', width: 11 },
  clover_bottle: { placement: 'PLACEABLE' },
  stardust_jar: { placement: 'PLACEABLE' },
  moondust_jar: { placement: 'PLACEABLE' },

  // ── 큰 가구 ──
  cloud_bed: { width: 34 },
  vintage_sofa: { width: 32 },
  persian_rug: { width: 44 },
  full_shelf: { width: 22 },
  glass_cabinet: { width: 20 },
}

export interface Placement {
  placementType: PlacementType
  layer: number
  anchor: NonNullable<CollectionItemDef['anchor']>
  /** 방 너비 대비 비율 (0~1) */
  defaultScale: number
  placement: PlacementClass
  canRotate: boolean
  canFlip: boolean
}

/** 벽에 거는 것과 매다는 것은 가운데를 맞추고, 나머지는 바닥을 맞춘다 */
function anchorFor(type: PlacementType): NonNullable<CollectionItemDef['anchor']> {
  if (type === 'WALL' || type === 'HANGING' || type === 'RUG' || type === 'DECOR') return 'CENTER'
  return 'BOTTOM_CENTER'
}

export function placementFor(
  id: string,
  category: CollectionCategory,
  subcategory: string,
): Placement {
  const rule: CategoryRule = {
    ...BY_CATEGORY[category],
    ...BY_SUBCATEGORY[subcategory],
    ...BY_ITEM[id],
  }
  const item = BY_ITEM[id] ?? {}

  return {
    placementType: rule.type,
    layer: LAYER[rule.type],
    anchor: item.anchor ?? anchorFor(rule.type),
    defaultScale: rule.width / 100,
    placement: rule.placement,
    canRotate: rule.canRotate === true,
    // 좌우 반전은 방향이 있는 것만 의미가 있다. 지금은 전부 허용해두고 쓰는 쪽에서 판단한다.
    canFlip: rule.type !== 'RUG',
  }
}

export const PLACEMENT_LABEL: Record<PlacementType, string> = {
  FLOOR: '바닥',
  WALL: '벽',
  TABLETOP: '위에 올리기',
  HANGING: '매달기',
  RUG: '깔개',
  WINDOW: '창가',
  SHELF: '선반',
  DECOR: '장식',
}
