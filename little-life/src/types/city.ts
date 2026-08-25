import type { Category } from './index'
import type { AreaId, Bonuses, Rarity } from './rpg'

/**
 * 살아 있는 도시 층.
 *
 * 여기 있는 것들은 전부 "현실에서 뭔가 해보고 싶게 만드는 장치" 다.
 * NPC 도 상점도 이벤트도, 앱 안에 오래 붙잡아두려고 두는 게 아니다.
 */

// ── NPC ─────────────────────────────────────────────────
export const NPC_IDS = ['MINA', 'HARU', 'LULU', 'JUNE', 'RIO', 'NOA'] as const
export type NpcId = (typeof NPC_IDS)[number]

/** 친밀도 단계. 5단계에서 멈춘다. */
export const FRIENDSHIP_LEVELS = [
  'STRANGER',
  'FAMILIAR',
  'FRIEND',
  'CLOSE_FRIEND',
  'SPECIAL_BOND',
] as const
export type FriendshipLevel = (typeof FRIENDSHIP_LEVELS)[number]

/** NPC 가 어떤 선물을 좋아하는지 — 아이템의 giftTags 와 맞춰본다. */
export type GiftTag =
  | 'coffee'
  | 'book'
  | 'art'
  | 'collectible'
  | 'healthy'
  | 'nature'
  | 'sport'
  | 'moon'
  | 'cozy'
  /** 부엌에서 나온 것들. 기존 물건에는 붙지 않는다 — 순수하게 더하기만 한다. */
  | 'sweet'
  | 'tea'

export interface NpcDialogue {
  /** 아무 때나 나오는 말 */
  text: string
  /** 이 친밀도 이상일 때만 나온다 */
  minLevel?: FriendshipLevel
  /** 이 시간대에만 나온다 */
  band?: import('./rpg').TimeBand
  /** 이 이벤트가 열린 날에만 나온다 */
  eventId?: string
  /**
   * 정원이 이만큼 열렸을 때만 나온다.
   *
   * 1 은 "정원을 찾았을 때", 2·3 은 그만큼 넓어졌을 때다.
   * 아직 못 찾았으면 0 이라, 이 줄들은 아예 후보에도 안 든다 —
   * 있는 줄도 모르는 곳 얘기를 먼저 꺼내면 그건 힌트가 아니라 스포일러다.
   */
  minGardenLevel?: number
}

export interface NpcQuestStepDef {
  title: string
  category: Category
  difficulty: import('./index').Difficulty
}

/** NPC 가 주는 여러 단계짜리 의뢰 */
export interface NpcQuestChainDef {
  id: string
  npcId: NpcId
  name: string
  /** 의뢰를 건네며 하는 말 */
  intro: string
  /** 다 끝냈을 때 하는 말 */
  outro: string
  steps: NpcQuestStepDef[]
  /** 마지막 단계까지 끝내면 주는 것 */
  rewardCoins: number
  rewardFriendship: number
  rewardItemId: string | null
  /** 이 친밀도 이상이어야 열린다 */
  requiresLevel?: FriendshipLevel
}

export interface NpcDef {
  id: NpcId
  name: string
  areaId: AreaId
  role: string
  description: string
  /** 이모지 하나 */
  avatar: string
  dialogues: NpcDialogue[]
  chains: NpcQuestChainDef[]
  shopId: ShopId | null
  /** 좋아하는 선물 */
  likes: GiftTag[]
  /** 이 지역 Reputation 이 이만큼은 되어야 만날 수 있다 */
  requiresReputation?: number
  /** 밤에만 만날 수 있는 사람 */
  nightOnly?: boolean
}

/** 저장되는 NPC 관계. 정의가 아니라 나와 그 사람 사이의 기록이다. */
export interface NpcState {
  friendship: number
  /** 하루 첫 대화를 이미 했는지 (YYYY-MM-DD) */
  lastTalkedOn: string | null
  /** 끝낸 의뢰 */
  clearedChainIds: string[]
}

export type NpcStates = Record<string, NpcState>

// ── 상점 ────────────────────────────────────────────────
export const SHOP_IDS = ['MINA_CAFE', 'JUNE_CLOSET', 'MOVE_STORE', 'NIGHT_MARKET'] as const
export type ShopId = (typeof SHOP_IDS)[number]

export interface ShopEntry {
  itemId: string
  price: number
  /** 이 자리는 매일 바뀐다 */
  rotating?: boolean
}

export interface ShopDef {
  id: ShopId
  name: string
  areaId: AreaId
  npcId: NpcId | null
  icon: string
  description: string
  /** 늘 파는 것 */
  stock: ShopEntry[]
  /** 매일 이 중에서 몇 개만 나온다 */
  rotatingPool?: ShopEntry[]
  rotatingCount?: number
  nightOnly?: boolean
}

// ── 도시 이벤트 ─────────────────────────────────────────
export interface CityEventDef {
  id: string
  name: string
  description: string
  icon: string
  /** null 이면 도시 전체 */
  areaId: AreaId | null
  bonuses: Partial<Bonuses>
  effectLabel: string
  rarity: Rarity
  /** 이 시간대에만 뜬다 */
  band?: import('./rpg').TimeBand
}

/** 오늘 열려 있는 이벤트 — 날짜에서 그대로 계산한다. 저장하지 않는다. */
export interface CityEvent extends CityEventDef {
  dayKey: string
}

// ── 스킬 ────────────────────────────────────────────────
export interface SkillDef {
  id: string
  /** 어느 줄기에 속하는지 */
  tree: Category
  name: string
  effectLabel: string
  cost: number
  /** 먼저 찍어야 하는 스킬 */
  requires: string | null
  bonuses: Partial<Bonuses>
}

// ── 일시적 버프 ─────────────────────────────────────────
/**
 * 마시거나 먹은 것.
 * "다음 WORK 퀘스트" 처럼 한 번 쓰고 사라진다.
 */
export interface ActiveBuff {
  id: string
  itemId: string
  name: string
  icon: string
  /** null 이면 아무 퀘스트에나 걸린다 */
  category: Category | null
  expPct: number
  /** 남은 횟수 */
  uses: number
  startedAt: string
}

// ── 평판 ────────────────────────────────────────────────
export type Reputation = Record<AreaId, number>

export const REPUTATION_LEVELS = [
  'VISITOR',
  'REGULAR',
  'LOCAL',
  'FAVORITE',
  'CITY_LEGEND',
] as const
export type ReputationLevel = (typeof REPUTATION_LEVELS)[number]
