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

/**
 * 건넨 물건이 그 사람에게 어떤 것이었는지.
 *
 * 싫어함은 없다. 잘못 고른 선물로 관계가 나빠지면 사람들이 실험을 그만둔다 —
 * 그러면 "이거 좋아할까?" 하고 하나 건네보는 일 자체가 사라진다.
 * NEUTRAL 도 충분히 괜찮은 결과다.
 */
export type GiftPreference = 'NEUTRAL' | 'LIKE' | 'LOVE'

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

/**
 * 생활 대사 한 줄.
 *
 * 이야기(StoryChapter)도 의뢰 대사도 아니다. 몇 번이고 다시 나와도 되는,
 * 그 사람이 지금 그 자리에서 할 법한 말이다. 여기서 비밀을 밝히거나
 * 관계를 진전시키지 않는다 — 그건 이야기가 할 일이다.
 */
export interface LivingLine {
  /** 안정적인 이름. 글자 자체를 신원으로 쓰지 않는다 — 고치면 딴 줄이 된다. */
  id: string
  npcId: NpcId
  text: string
  /** 이 동네에 있을 때만 */
  areaId?: AreaId
  /** 이 시간대에만 */
  band?: import('./rpg').TimeBand
  /** 일하는 중인지 아닌지 */
  context?: LivingContext
}

// ── 리빙신 ──────────────────────────────────────────────

/**
 * 도시에서 한 번만 마주치는 짧은 장면.
 *
 * 생활 대사(LivingLine)도 이야기 장(StoryChapter)도 아니다.
 *
 *   생활 대사 — 그 사람을 눌러서 듣는다. 몇 번이고 다시 나온다.
 *   리빙신   — 그 자리에 있던 두 사람 사이의 일이다. 한 번뿐이다.
 *   이야기 장 — 그 사람이 나에게 하는 말이다. 관계가 진전된다.
 *
 * 리빙신에서는 아무 일도 일어나지 않는다. 보상도 선택지도 없고
 * 친밀도도 안 오른다. **내가 보지 않은 시간에도 이 도시가 굴러가고
 * 있었다는 증거** 하나가 남는 게 전부다.
 */
export interface LivingSceneDef {
  id: string
  /** 어느 동네에서 */
  areaId: AreaId
  /** 언제 (넓게 잡는다 — 몇 시 몇 분에만 열리는 장면은 만들지 않는다) */
  bands: import('./rpg').TimeBand[]
  /** 이 사람들이 지금 다 그 동네에 있어야 한다 */
  participants: NpcId[]
  lines: LivingSceneLine[]
}

/** 한 줄. 지문이거나, 누군가의 말이거나. */
export type LivingSceneLine =
  | { kind: 'NARRATION'; text: string }
  | { kind: 'SAY'; npcId: NpcId; text: string }

/**
 * 일하는 중인가.
 *
 * 자기 동네에 있고 가게가 열려 있으면 일하는 중이다. 저장하지 않는다 —
 * 동선표와 영업시간에서 그때그때 계산한다.
 */
export type LivingContext = 'WORK' | 'OFF_WORK'

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
  /**
   * 이 이야기 장을 읽은 뒤에만 나온다 (K).
   *
   * 이야기를 다 본 다음 날에도 그 사람이 똑같은 말만 하면, 방금 읽은 게
   * 그 사람이 아니라 별도의 읽을거리였던 게 된다. 딱 한두 줄이면 된다 —
   * 알게 된 사람에게만 들리는 말.
   *
   * 반대로 안 읽은 사람에게는 후보에도 안 든다. 아직 모르는 과거를
   * 생활 대사가 먼저 흘리면 나중에 그 장이 이미 아는 얘기가 된다.
   */
  afterChapterId?: string
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
  /** 그림이 아직 없는 사람 자리에 남는 이모지 하나 (`city/portraits.ts`) */
  avatar: string
  dialogues: NpcDialogue[]
  chains: NpcQuestChainDef[]
  shopId: ShopId | null
  /** 좋아하는 선물 */
  likes: GiftTag[]
  /**
   * 딱 이것만은 특별한 것 (LOVE).
   *
   * 결(likes)이 아니라 물건 하나를 콕 집는다. 한 사람당 한둘이면 된다 —
   * 스물넷이 열 개씩 들고 있으면 그건 취향이 아니라 공략표다.
   * 가방 물건 id 든 부엌 음식 id(food_*) 든 여기 그대로 적는다.
   */
  loves: string[]
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
  /**
   * 오늘 이미 하나 받았는지 (YYYY-MM-DD).
   *
   * 인사와 같은 모양이다. 선물이 눌러서 올리는 버튼이 되면 스물넷에게
   * 매일 순회하는 게 최적 플레이가 된다 — 그건 관계가 아니라 숙제다.
   */
  lastGiftedOn: string | null
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
