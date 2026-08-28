import type { Category } from './index'
import type { AreaId, Bonuses, Rarity } from './rpg'

/**
 * 살아 있는 도시 층.
 *
 * 여기 있는 것들은 전부 "현실에서 뭔가 해보고 싶게 만드는 장치" 다.
 * NPC 도 상점도 이벤트도, 앱 안에 오래 붙잡아두려고 두는 게 아니다.
 */

// ── NPC ─────────────────────────────────────────────────
//
// id 는 처음 만든 그대로다. 사람은 캐릭터 바이블 쪽으로 바뀌었다 —
// MINA=윤하루 · HARU=윤태오 · LULU=오미래 · JUNE=서이안 · RIO=한도윤 · NOA=차세라.
// 저장이 친밀도 · 읽은 이야기 · 비밀 장소 · 던전 입구를 전부 이 id 로 붙잡고
// 있어서 이름을 따라 바꾸면 하던 사람들이 그걸 잃는다. 이름은 `city/npcs.ts` 에 있다.
//
// 뒤의 열여덟은 처음부터 이름이 확정돼 있어서 id 에 이름을 그대로 썼다.
export const NPC_IDS = [
  'MINA',
  'HARU',
  'LULU',
  'JUNE',
  'RIO',
  'NOA',
  // 카페 거리
  'EUNCHAE',
  'MINJI',
  'JUN',
  'HYUNWOO',
  'HARIN',
  // 창작 골목
  'JAEHUI',
  'RAON',
  'JIHO',
  // 초록 공원
  'WOOSIK',
  'HAEIN',
  'SUA',
  'SUNJAE',
  'YEONJU',
  // 운동 구역
  'YUNA',
  // 밤의 거리
  'SIWOO',
  'SORA',
  'JEONGWON',
  'YUHYEON',
] as const
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

// ── 하루 동선 ───────────────────────────────────────────

/**
 * 지금 있을 만한 자리.
 *
 * `OFFSCREEN` 은 도시 어디에도 안 보인다는 뜻이다. 집에 있든 일하러 갔든
 * 그건 우리가 알 바 아니고, 화면에 없다는 것만 참이다.
 */
export type RoutineSpot = AreaId | 'OFFSCREEN'

/** 자리 하나와 그 자리가 뽑힐 무게 */
export interface WeightedSpot {
  spot: RoutineSpot
  weight: number
}

/**
 * 한 사람의 하루.
 *
 * 분 단위 시간표를 만들지 않는다. 시간대 넷이면 충분하다 —
 * 08:12 카페 / 08:47 집 같은 건 사람의 하루가 아니라 로그다.
 */
export interface NpcRoutineDef {
  npcId: NpcId
  /** 평일 네 칸. 비워두지 않는다 */
  weekday: Record<import('./rpg').TimeBand, WeightedSpot[]>
  /** 주말에만 달라지는 칸. 없으면 평일과 같다 */
  weekend?: Partial<Record<import('./rpg').TimeBand, WeightedSpot[]>>
}

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
  /**
   * 여는 시각과 닫는 시각 (0~23).
   *
   * 닫는 쪽이 더 작으면 자정을 넘긴다 (예: 21 → 5).
   * `nightOnly` 가 있으면 그쪽이 먼저다 — 밤 가게는 이미 자기 시간을 안다.
   */
  hours?: { open: number; close: number }
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
