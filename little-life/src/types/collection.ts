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
  /** 작은 정원에서 거둔다 */
  | { kind: 'GARDEN' }
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
  /**
   * 아직 이 판에 없는 것.
   *
   * 다음 업데이트 예고로 목록에 자리만 남긴 물건이다.
   * 만들 수도 없고 방에 놓을 수도 없다 — 어떤 길로도 손에 들어오지 않는다.
   */
  comingSoon?: boolean
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
   * 다 모으기 전에 한 번 주는 자리.
   *
   * 다섯 개짜리 세트에서 다섯 번째가 귀한 것이면, 넷을 모아도 손에
   * 남는 게 없다. 중간에 한 번 쥐여주면 거기까지 온 게 헛되지 않다.
   *
   * 받았는지는 claimedSetIds 에 `${id}:partial` 로 적는다 —
   * 저장 구조를 새로 늘리지 않으려고 그렇게 했다.
   */
  partialAt?: number
  partialRewards?: SetRewardKind[]
  /** 조건을 채우기 전에는 도감에서 감춘다 */
  hiddenUntil?: { kind: 'CROP_FOUND'; cropIds: string[] }
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
  /** 이 작물을 이만큼 거두면 */
  | { kind: 'CROP_HARVESTED'; cropId: string; count: number }
  /** 서로 다른 요리를 이만큼 만들어보면 */
  | { kind: 'RECIPES_COOKED'; count: number }
  /**
   * 아직 만들 수 없다.
   *
   * 감춰두는 대신 자리를 남긴다 — 다음에 무엇이 올지 알려주는 건
   * 잠긴 문이 아니라 열쇠구멍이다.
   */
  | { kind: 'COMING_SOON' }

export interface RecipeDef {
  id: string
  /** 만들어지는 물건 */
  resultItemId: string
  ingredients: RecipeIngredient[]
  unlock: RecipeUnlock
  /** 어떻게 알게 됐는지 한 줄 */
  unlockHint: string
  /** 작업실 목록에서 어느 칸에 들어가는지 */
  category?: 'FURNITURE' | 'DECOR' | 'SPECIAL'
  /**
   * 이 비율만큼 왔으면 낌새를 흘린다 (0~1).
   *
   * 없으면 낌새 단계가 없다 — 예전부터 있던 레시피는 알거나 모르거나 둘 중 하나다.
   */
  hintAt?: number
  /** 알기 전에 흘리는 말 */
  hint?: string
}

/** 이 레시피가 나에게 어디까지 왔는지 */
export type CraftStage = 'UNKNOWN' | 'HINTED' | 'KNOWN' | 'COMING_SOON'

// ── 트로피 ──────────────────────────────────────────────
/** 현실에서 쌓은 것을 방에 놓을 수 있는 물건으로 바꾼다 */
export type TrophyCondition =
  | { kind: 'TOTAL_QUESTS'; count: number }
  | { kind: 'CATEGORY_QUESTS'; category: Category; count: number }
  | { kind: 'BOSS_CLEARS'; count: number }
  | { kind: 'COLLECTION'; count: number }
  | { kind: 'SET_COMPLETE'; setId: string }
  /** 정원이 이만큼 넓어지면 */
  | { kind: 'GARDEN_LEVEL'; level: number }
  /** 만들기로만 얻는 것을 이만큼 만들어보면 */
  | { kind: 'CRAFTED_KINDS'; count: number }

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
  /** 흔한 것만 깔리는 날이 없도록, 매일 이만큼은 RARE 이상으로 채우는 곳 */
  guaranteedRare?: number
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
  /** 오늘 이 가게에 들어온 개수 */
  stock: number
  /** 그중 아직 남은 개수. 0 이면 품절. */
  remaining: number
  /** 오늘 이 가게에서 제일 귀한 한 칸인지 */
  rareFind: boolean
}

/** 가게 위에 한 줄로 얹는 오늘의 입고 요약 */
export interface TodaysStock {
  /** 오늘 진열된 칸 수 */
  total: number
  /** 어제 없던 것 */
  fresh: number
  /** 찾는 물건 목록에 있던 것 */
  wished: number
  /** RARE 이상 */
  rare: number
  /** 아직 도감에 없는 것 */
  unseen: number
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
  /** `${dayKey}:${shopId}:${itemId}` → 오늘 산 개수. 남은 재고를 여기서 뺀다. */
  purchases: Record<string, number>
  /**
   * itemId → 가게에서 처음 본 시각.
   *
   * 본 것과 가진 것은 다르다. 진열대에서 봤으면 이름과 그림은 알지만
   * 도감의 발견 수에는 넣지 않는다 — 그건 손에 넣은 것만 센다.
   */
  seen: Record<string, string>
  /** shopId → 마지막으로 들른 날. 오늘 아직 안 간 가게에 표시를 붙인다. */
  shopVisits: Record<string, string>
  /** 이미 받은 특별 배송 (dayKey). 두 번 주지 않으려고 남긴다. */
  claimedDeliveries: string[]
  /** 알게 된 레시피 */
  discoveredRecipeIds: string[]
  /** 이미 받은 도감 보상 (발견 수) */
  claimedMilestones: number[]
  /** 이미 받은 세트 보상 */
  claimedSetIds: string[]
  /** 이미 받은 트로피 */
  earnedTrophyIds: string[]
}

/**
 * 물건을 아는 정도.
 *
 * UNKNOWN  — 도감에 ??? 로 남는다
 * SEEN     — 가게에서 봤다. 이름과 그림은 보이지만 발견 수에는 안 들어간다.
 * DISCOVERED — 손에 넣었다. 도감에 들어간다.
 */
export type ItemKnowledge = 'UNKNOWN' | 'SEEN' | 'DISCOVERED'

/** 처음 발견했을 때 화면에 띄울 것 */
export interface DiscoveryResult {
  itemId: string
  isNew: boolean
  source: string
}
