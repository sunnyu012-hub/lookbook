import type { Category } from './index'
import type { AreaId, Rarity } from './rpg'
import type { NpcId } from './city'

/**
 * 수집 · 방 꾸미기 층.
 *
 * 이 층의 물건은 능력치를 올리려고 모으는 게 아니다.
 * 발견하고, 가지고, 방에 놓고, 나중에 그걸 보고 그때를 기억하려고 모은다.
 * 그래서 여기 있는 어떤 것도 "안 쓰면 손해" 가 되지 않게 만든다.
 *
 * 정의(Def)는 코드에 상수로 있고 저장하지 않는다.
 * 저장되는 건 "내가 무엇을 발견했고 어디에 놓았는지" 뿐이다.
 */

// ── 분류 ────────────────────────────────────────────────
export const COLLECTION_CATEGORIES = [
  'FURNITURE',
  'LIGHTING',
  'PLANT',
  'RUG',
  'WALL',
  'LITTLE_THING',
  'KITCHEN',
  'FOOD',
  'BOOK',
  'HOBBY',
  'TECH',
  'OUTDOOR',
  'MAGIC',
  'TROPHY',
  'MATERIAL',
] as const
export type CollectionCategory = (typeof COLLECTION_CATEGORIES)[number]

/** 기존 등급에 SECRET 한 칸을 더한다. 도감에서 ??? 로 남는 자리다. */
export const COLLECTION_RARITIES = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'SECRET'] as const
export type CollectionRarity = Rarity | 'SECRET'

// ── 상점 ────────────────────────────────────────────────
export const COLLECTION_SHOP_IDS = [
  'HOME_ATELIER',
  'TINY_MARKET',
  'GREEN_HOUSE',
  'PAPER_MOON',
  'HOBBY_CORNER',
  'JUNE_VINTAGE',
  'FLEA_MARKET',
  'MOON_STALL',
] as const
export type CollectionShopId = (typeof COLLECTION_SHOP_IDS)[number]

// ── 방 ──────────────────────────────────────────────────
export const ROOM_IDS = [
  'MY_ROOM',
  'LIVING_ROOM',
  'KITCHEN_ROOM',
  'WORK_ROOM',
  'HOBBY_ROOM',
  'BALCONY',
] as const
export type RoomId = (typeof ROOM_IDS)[number]

/**
 * 방을 여는 조건.
 *
 * 값은 전부 constants 로 두고 코드에 흩뿌리지 않는다.
 * 조건을 만족했는지는 저장하지 않고 매번 상태에서 계산한다 —
 * 저장해두면 나중에 조건을 바꿨을 때 이미 열린 방과 어긋난다.
 */
export type RoomUnlock =
  | { kind: 'DEFAULT' }
  | { kind: 'LEVEL'; level: number }
  | { kind: 'CATEGORY_QUESTS'; category: Category; count: number }
  | { kind: 'COLLECTION'; count: number }

export interface RoomDef {
  id: RoomId
  name: string
  icon: string
  description: string
  unlock: RoomUnlock
  /** 벽·바닥 색. 방마다 조금씩 다른 공기를 준다. */
  wall: string
  floor: string
}

// ── 획득처 ──────────────────────────────────────────────
/**
 * 이 물건을 어디서 만날 수 있는지.
 *
 * 240개가 전부 상점 물건이면 지도를 열 이유가 없어진다.
 * 도감에서 아직 못 찾은 칸에 이 힌트를 보여주는 게 탐험의 동기가 된다.
 */
export type AcquisitionSource =
  | { kind: 'SHOP'; shopId: CollectionShopId }
  | { kind: 'CRAFT' }
  | { kind: 'QUEST'; category: Category | null }
  | { kind: 'NPC'; npcId: NpcId; friendship: number }
  | { kind: 'SET'; setId: string }
  | { kind: 'BOSS' }
  | { kind: 'EVENT' }
  | { kind: 'REPUTATION'; areaId: AreaId; level: number }
  | { kind: 'MILESTONE'; count: number }
  | { kind: 'TROPHY' }
  | { kind: 'SECRET'; hint: string | null }

// ── 아이템 ──────────────────────────────────────────────
export interface Footprint {
  /** 방 너비 대비 % */
  width: number
  /** 방 높이 대비 % */
  height: number
}

// ── 배치 ────────────────────────────────────────────────
export const PLACEMENT_TYPES = [
  'FLOOR',
  'WALL',
  'TABLETOP',
  'HANGING',
  'RUG',
  'WINDOW',
  'SHELF',
  'DECOR',
] as const
export type PlacementType = (typeof PLACEMENT_TYPES)[number]

/** 좌표를 어디에 맞출지 */
export type PlacementAnchor = 'BOTTOM_CENTER' | 'CENTER'

export interface CollectionItemDef {
  id: string
  nameKo: string
  nameEn?: string
  category: CollectionCategory
  subcategory: string
  rarity: CollectionRarity
  /** 한 줄. "분홍색 의자입니다" 같은 설명은 쓰지 않는다. */
  description: string
  /** 상점에 나올 때의 기준 가격. 없으면 살 수 없는 물건이다. */
  price?: number
  sellPrice?: number
  /** 그림 파일. 방과 도감 상세처럼 크게 보는 자리에서 쓴다. */
  assetKey?: string
  /** 같은 그림의 작은 판. 도감 격자처럼 작게 보는 자리에서 쓴다. */
  thumbKey?: string
  /** 이모지 한 글자. 그림이 없을 때만 쓴다 — 지금은 전부 그림이 있다. */
  icon?: string
  /** 방에 놓을 그림이 준비돼 있는지 */
  hasPlaceableAsset: boolean
  /** 애초에 방에 놓는 종류의 물건인지 (재료는 아니다) */
  placeable: boolean
  footprint?: Footprint
  /** 바닥인지 벽인지 위에 올리는 것인지 (lib/collection/placement.ts 에서 붙인다) */
  placementType?: PlacementType
  /** 앞뒤 순서. 러그는 늘 밑에 깔린다. */
  layer?: number
  anchor?: PlacementAnchor
  /** 방 너비 대비 비율 (0~1) */
  defaultScale?: number
  /** 방에 놓을 수 있는지 · 도감에만 있는지 · 재료인지 */
  placement?: 'PLACEABLE' | 'DISPLAY_ONLY' | 'MATERIAL_ONLY'
  canRotate?: boolean
  canFlip?: boolean
  acquisitionSources: AcquisitionSource[]
  collectionSetIds: string[]
  tags: string[]
  /** 여러 개 가질 수 있는지 */
  stackable: boolean
  /** 하나만 가질 수 있는지 (트로피·전설품) */
  unique: boolean
  /** 발견 전에는 이름도 힌트도 숨긴다 */
  hiddenUntilDiscovered?: boolean
  /** 발견 전에는 전체 수에도 넣지 않는다 — "238 / 240 + ?" 를 위한 자리 */
  hiddenFromTotal?: boolean
}

/**
 * 화면에서 다루는 모양.
 * 정의는 그대로 두고, 내가 발견했는지·몇 개 가졌는지만 붙여서 본다.
 */
export interface CollectionItemView extends CollectionItemDef {
  discovered: boolean
  owned: number
  wished: boolean
}

// ── 세트 ────────────────────────────────────────────────
export type SetRewardKind =
  | { kind: 'ROOM_EFFECT'; effectId: HomeEffectId }
  | { kind: 'COIN'; amount: number }
  | { kind: 'RECIPE'; recipeId: string }
  | { kind: 'ITEM'; itemId: string }
  | { kind: 'TITLE'; title: string }

export interface CollectionSetDef {
  id: string
  name: string
  icon: string
  description: string
  /** 정해진 물건을 다 모으면 완성 */
  itemIds: string[]
  /**
   * 물건을 지정하는 대신 "이 분류를 N개" 로 여는 세트.
   * 식물처럼 취향이 갈리는 건 목록을 정해두면 강요가 된다.
   */
  anyOf?: { category: CollectionCategory; count: number }
  rewards: SetRewardKind[]
}

// ── 방 효과 ─────────────────────────────────────────────
export const HOME_EFFECT_IDS = [
  'SOFT_MORNING',
  'RAINY_WINDOW',
  'CAFE_AMBIENCE',
  'GREEN_CORNER',
  'READING_TIME',
  'NIGHT_SKY',
  'GOLDEN_HOUR',
  'FIREFLY',
  'FLOATING_DUST',
] as const
export type HomeEffectId = (typeof HOME_EFFECT_IDS)[number]

export interface HomeEffectDef {
  id: HomeEffectId
  name: string
  description: string
  icon: string
}

// ── 재료 / 제작 ─────────────────────────────────────────
export interface RecipeIngredient {
  itemId: string
  count: number
}

/** 레시피를 어떻게 알게 되는지 */
export type RecipeUnlock =
  | { kind: 'DEFAULT' }
  | { kind: 'NPC'; npcId: NpcId; friendship: number }
  | { kind: 'SET'; setId: string }
  | { kind: 'COLLECTION'; count: number }
  | { kind: 'LEVEL'; level: number }
  | { kind: 'SECRET' }

export interface RecipeDef {
  id: string
  /** 만들어지는 물건 */
  resultItemId: string
  ingredients: RecipeIngredient[]
  unlock: RecipeUnlock
  /** 어떻게 알게 됐는지 한 줄 */
  unlockHint: string
}

// ── 트로피 ──────────────────────────────────────────────
/** 현실에서 쌓은 것을 방에 놓을 수 있는 물건으로 바꾼다 */
export type TrophyCondition =
  | { kind: 'TOTAL_QUESTS'; count: number }
  | { kind: 'CATEGORY_QUESTS'; category: Category; count: number }
  | { kind: 'BOSS_CLEARS'; count: number }
  | { kind: 'COLLECTION'; count: number }
  | { kind: 'SET_COMPLETE'; setId: string }

export interface TrophyDef {
  id: string
  /** 이 트로피가 주는 물건 */
  itemId: string
  name: string
  condition: TrophyCondition
  /** 조건을 어디까지 알려줄지. 비밀 트로피는 감춘다. */
  hint: string | null
}

// ── 상점 정의 ───────────────────────────────────────────
export interface CollectionShopDef {
  id: CollectionShopId
  name: string
  icon: string
  areaId: AreaId
  description: string
  /** 오늘 진열될 수 있는 물건 전체 */
  catalog: string[]
  /** 하루에 몇 개나 깔리는지 */
  minCount: number
  maxCount: number
  /** 밤에만 여는 곳 */
  nightOnly?: boolean
  /** 주말에만 여는 곳 */
  weekendOnly?: boolean
  /** 값이 조금씩 흔들리는 곳 (±20%) */
  hagglePrices?: boolean
  /** 이 지역 평판이 이만큼은 되어야 뒷줄 물건을 보여주는 곳 */
  reputationForRare?: number
}

/** 오늘 이 가게에 깔린 한 칸 */
export interface ShopListing {
  itemId: string
  price: number
  /** 오늘 처음 들어온 물건인지 */
  isNew: boolean
  /** 하나뿐인 물건인지 */
  limited: boolean
  /** 평판이 모자라 아직 못 사는 자리인지 */
  locked: boolean
  /** 내일이면 빠지는 물건인지 */
  lastDay: boolean
  /** 오늘 깎아준 값이면 원래 값. 안 깎았으면 없다. */
  wasPrice?: number
}

// ── 저장되는 것 ─────────────────────────────────────────
/** 방에 놓인 물건 하나. 좌표는 방 크기 대비 %. */
export interface PlacedItem {
  uid: string
  itemId: string
  x: number
  y: number
  /** 0.7 / 1 / 1.3 — 크기를 조금 바꿀 수 있다 */
  scale: number
  flipped: boolean
}

export type RoomLayouts = Record<string, PlacedItem[]>

/**
 * 수집·방과 관련해 저장하는 전부.
 *
 * 열린 방·완성한 세트·트로피·방 효과는 여기 없다.
 * 전부 지금 가진 것에서 계산되기 때문에 저장할 게 없고,
 * 저장하면 조건을 바꿨을 때 어긋난다. (계산은 lib/collection/progress.ts)
 */
export interface CollectionState {
  /** itemId → 처음 발견한 시각 */
  discovered: Record<string, string>
  /** itemId → 가진 개수 */
  owned: Record<string, number>
  wishlist: string[]
  rooms: RoomLayouts
  /** 방마다 걸어둔 공기. 열린 것 중에서 고른다 — 무엇이 열렸는지는 계산한다. */
  roomEffects: Record<string, HomeEffectId | null>
  currentRoomId: RoomId
  /** `${dayKey}:${shopId}:${itemId}` → 오늘 산 개수. 하나뿐인 물건의 품절 표시에 쓴다. */
  purchases: Record<string, number>
  /** 알게 된 레시피 */
  discoveredRecipeIds: string[]
  /** 이미 받은 도감 보상 (발견 수) */
  claimedMilestones: number[]
  /** 이미 받은 세트 보상 */
  claimedSetIds: string[]
  /** 이미 받은 트로피 */
  earnedTrophyIds: string[]
}

/** 처음 발견했을 때 화면에 띄울 것 */
export interface DiscoveryResult {
  itemId: string
  isNew: boolean
  source: string
}
