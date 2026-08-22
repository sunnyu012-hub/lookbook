import type { Category } from './index'

/**
 * 현대 생활 판타지 RPG 층.
 *
 * 현실의 할 일이 Quest, 미뤄둔 일이 Monster, 큰 목표가 Boss,
 * 현실 공간이 Area, 현실 물건이 Equipment 다.
 * 검·갑옷·성이 아니라 머그컵·헤드폰·운동화·카페·공원으로 표현한다.
 */

// ── 지역 ────────────────────────────────────────────────
export const AREA_IDS = [
  'HOME_BASE',
  'CAFE_STREET',
  'GREEN_PARK',
  'CREATIVE_DISTRICT',
  'TRAINING_ZONE',
  'NIGHT_TOWN',
] as const
export type AreaId = (typeof AREA_IDS)[number]

// ── 직업 ────────────────────────────────────────────────
export const CLASS_IDS = ['PLANNER', 'MAKER', 'EXPLORER', 'CARETAKER', 'MOVER'] as const
export type ClassId = (typeof CLASS_IDS)[number]

// ── 스탯 ────────────────────────────────────────────────
export const STAT_KEYS = [
  'ENERGY',
  'FOCUS',
  'VITALITY',
  'CREATIVITY',
  'CONNECTION',
  'LUCK',
] as const
export type StatKey = (typeof STAT_KEYS)[number]
export type Stats = Record<StatKey, number>

// ── 아이템 ──────────────────────────────────────────────
export const RARITIES = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'] as const
export type Rarity = (typeof RARITIES)[number]

export const ITEM_TYPES = ['EQUIPMENT', 'CONSUMABLE', 'MATERIAL', 'COLLECTIBLE'] as const
export type ItemType = (typeof ITEM_TYPES)[number]

export const EQUIP_SLOTS = ['HEAD', 'TOP', 'BOTTOM', 'SHOES', 'ACCESSORY', 'CHARM'] as const
export type EquipSlot = (typeof EQUIP_SLOTS)[number]

/**
 * 장비·직업·지역이 모두 같은 모양의 보너스를 내놓는다.
 * 보상 계산이 출처를 구분하지 않아도 되게 하려는 것이다.
 */
export interface Bonuses {
  /** 카테고리별 EXP 증가 (%) */
  expPctByCategory: Partial<Record<Category, number>>
  /** Hard 퀘스트 EXP 증가 (%) */
  hardExpPct: number
  /** 카테고리별 보상 증가 (%) — EXP 와 Coin 둘 다 */
  rewardPctByCategory: Partial<Record<Category, number>>
  /** 모든 등급 드롭 확률에 더하는 값 (%p) */
  dropChancePct: number
  /** RARE 이상 드롭 확률에 더하는 값 (%p) */
  rareDropChancePct: number
  /** 모든 Coin 보상 증가 (%) */
  coinPct: number
  /** 표시용 행운 */
  luck: number
  /** NPC 친밀도 획득 증가 (%) */
  friendshipPct: number
  /** 하루 첫 대화에 더 붙는 친밀도 */
  dailyTalkBonus: number
}

/** 아이템 원본 정의. 코드에 상수로 들고 있고 저장하지 않는다. */
export interface ItemDef {
  id: string
  name: string
  description: string
  type: ItemType
  rarity: Rarity
  /** 이모지 하나. 현대 생활 오브젝트로 고른다. */
  icon: string
  equipSlot: EquipSlot | null
  /** 화면에 보여줄 효과 문구 */
  effectLabel: string
  bonuses: Partial<Bonuses>
  /** 마셔서 쓰는 것이면 어떤 버프가 걸리는지 */
  consumable?: {
    /** null 이면 아무 퀘스트에나 걸린다 */
    category: Category | null
    expPct: number
    /** 몇 번 쓰고 사라지는지 */
    uses: number
  }
  /** 선물할 수 있는 것이면 어떤 결의 물건인지 */
  giftTags?: import('./city').GiftTag[]
}

/** 실제로 가지고 있는 것. 저장된다. */
export interface InventoryEntry {
  itemId: string
  quantity: number
  obtainedAt: string
  /** 어디서 얻었는지 */
  source: string
}

export type EquippedItems = Record<EquipSlot, string | null>

// ── 몬스터 / 보스 ───────────────────────────────────────
export type BattleKind = 'MONSTER' | 'BOSS'

export interface BattleActionDef {
  label: string
  damage: number
}

export interface BattleDef {
  id: string
  kind: BattleKind
  name: string
  description: string
  category: Category
  icon: string
  maxHp: number
  actions: BattleActionDef[]
  rewardExp: number
  rewardCoins: number
  /** 클리어했을 때 최소 보장 등급 */
  guaranteedRarity: Rarity
  /** 추가로 굴려보는 등급 */
  bonusRarity?: Rarity
}

export interface BattleAction {
  id: string
  label: string
  damage: number
  doneAt: string | null
}

/** 진행 중인 몬스터·보스. 저장된다. */
export interface Battle {
  id: string
  defId: string
  kind: BattleKind
  name: string
  description: string
  category: Category
  icon: string
  hp: number
  maxHp: number
  actions: BattleAction[]
  rewardExp: number
  rewardCoins: number
  guaranteedRarity: Rarity
  bonusRarity?: Rarity
  status: 'ACTIVE' | 'CLEARED'
  createdAt: string
  clearedAt: string | null
}

// ── 지역 / 직업 정의 ────────────────────────────────────
export interface AreaDef {
  id: AreaId
  name: string
  icon: string
  description: string
  /** 이 지역이 밀어주는 카테고리 */
  categories: Category[]
  buffName: string
  buffLabel: string
  bonuses: Partial<Bonuses>
  /** 21시 이후에만 문을 여는 곳 */
  nightOnly?: boolean
}

export interface ClassDef {
  id: ClassId
  name: string
  icon: string
  description: string
  passiveName: string
  passiveLabel: string
  bonuses: Partial<Bonuses>
}

// ── 시간대 ──────────────────────────────────────────────
export const TIME_BANDS = ['MORNING', 'DAY', 'EVENING', 'NIGHT'] as const
export type TimeBand = (typeof TIME_BANDS)[number]

// ── 보상 결과 ───────────────────────────────────────────
export interface RewardBreakdown {
  baseExp: number
  baseCoins: number
  exp: number
  coins: number
  /** 어디서 얼마나 붙었는지 — 화면에서 설명할 때 쓴다 */
  bonusExp: number
  bonusCoins: number
}

export interface DropResult {
  itemId: string
  rarity: Rarity
}
