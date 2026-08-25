import type { Category } from './index'
import type { AreaId } from './rpg'
import type { NpcId } from './city'

/**
 * 발견 층.
 *
 * 이 층에 있는 것들은 전부 "내가 이미 한 것" 에서 나온다.
 * 새로 할 일을 더 얹지 않는다 — 지나고 나서 앱이 알아보는 것뿐이다.
 *
 * 어떤 것도 줄어들거나 사라지지 않는다.
 * 며칠 쉬었다고 7/10 이 0 으로 돌아가면 그건 발견이 아니라 빚이다.
 */

// ── 자동 컬렉션 ─────────────────────────────────────────

export const AUTO_COLLECTION_IDS = [
  'ACTIVE_DAYS',
  'NIGHT_OWL',
  'HOME_KEEPER',
  'FOCUS_SEASON',
  'SOFT_DAYS',
  'LITTLE_EXPLORER',
  'SOCIAL_SPARK',
  'WEEKEND_WANDERER',
  'GREEN_THUMB',
  'LITTLE_FARMER',
  'GARDEN_KEEPER',
] as const
export type AutoCollectionId = (typeof AUTO_COLLECTION_IDS)[number]

/**
 * 무엇을 셀지.
 *
 * 전부 이미 쌓여 있는 기록에서 센다. 따로 적립하지 않는다 —
 * 적립해두면 나중에 조건을 바꿨을 때 저장된 값과 어긋난다.
 */
export type AutoCondition =
  /** 이 분야 퀘스트를 몇 개 끝냈는지 */
  | { kind: 'CATEGORY_QUESTS'; category: Category }
  /** 이 시간대에 몇 개 끝냈는지 */
  | { kind: 'BAND_QUESTS'; band: import('./rpg').TimeBand }
  /** 서로 다른 지역 몇 곳에서 활동했는지 */
  | { kind: 'AREAS_VISITED' }
  /** 주말에 며칠이나 뭔가 했는지 */
  | { kind: 'WEEKEND_DAYS' }
  /** 도시 사람들과 얼마나 지냈는지 (친밀도 합) */
  | { kind: 'FRIENDSHIP_TOTAL' }
  /** 정원에서 몇 번이나 거뒀는지 */
  | { kind: 'CROPS_HARVESTED' }
  /** 몇 가지 작물을 거둬봤는지 */
  | { kind: 'CROPS_DISCOVERED' }
  /** 정원이 몇 단계까지 넓어졌는지 (못 찾았으면 0) */
  | { kind: 'GARDEN_LEVEL' }

export interface AutoCollectionDef {
  id: AutoCollectionId
  name: string
  /** 이게 무슨 뜻인지 한 줄. 잘했다는 말도 못했다는 말도 하지 않는다. */
  description: string
  icon: string
  condition: AutoCondition
  /** 여기까지 오면 완성 */
  target: number
  /** 이만큼 쌓이면 "발견" 으로 알려준다. target 보다 한참 낮다. */
  revealAt: number
  /** 완성했을 때 주는 물건 */
  rewardItemId: string
  /** 아직 안 보이는 동안 도감에서 감출지 */
  hiddenUntilTriggered: boolean
}

/** 화면에서 보는 모양 — 정의에 지금 얼마나 왔는지를 붙인다 */
export interface AutoCollectionView {
  def: AutoCollectionDef
  now: number
  done: boolean
  /** 아직 눈에 안 띈 것인지 */
  hidden: boolean
}

// ── 비밀 장소 ───────────────────────────────────────────

export const SECRET_IDS = [
  'MOON_ALLEY',
  'BACKROOM_CAFE',
  'ROOFTOP_GARDEN',
  'OLD_ARCADE',
  'QUIET_CORNER',
] as const
export type SecretId = (typeof SECRET_IDS)[number]

/**
 * 비밀이 나에게 어디까지 왔는지.
 *
 * UNKNOWN  — 있는 줄도 모른다. 지도에 아무것도 없다.
 * HINTED   — 낌새가 있다. "여기 뭐가 더 있는 것 같다" 정도.
 * FOUND    — 찾았다. 들어갈 수 있다.
 */
export type SecretStage = 'UNKNOWN' | 'HINTED' | 'FOUND'

/** 비밀을 여는 조건 하나 */
export type SecretCondition =
  | { kind: 'AREA_REPUTATION'; areaId: AreaId; value: number }
  | { kind: 'FRIENDSHIP'; npcId: NpcId; value: number }
  | { kind: 'CATEGORY_QUESTS'; category: Category; count: number }
  | { kind: 'COLLECTION_CATEGORY'; category: string; count: number }

export interface SecretDef {
  id: SecretId
  name: string
  /** 어느 동네 안쪽에 있는지 */
  areaId: AreaId
  icon: string
  /** 찾기 전에 흘리는 말 */
  hint: string
  /** 찾은 순간의 한 줄 */
  reveal: string
  /** 들어가면 뭐가 있는지 */
  description: string
  /** 전부 만족해야 열린다 */
  conditions: SecretCondition[]
  /** 이 비율만큼 왔으면 낌새를 흘린다 (0~1) */
  hintAt: number
  /** 여기서만 만날 수 있는 것 */
  itemIds: string[]
  /** 여기서 만나는 사람 */
  npcId?: NpcId
}

export interface SecretView {
  def: SecretDef
  stage: SecretStage
  /** 0~1. 조건을 여럿 걸면 평균으로 본다. */
  progress: number
}

// ── NPC 이야기 ──────────────────────────────────────────

export interface StoryChapterDef {
  id: string
  npcId: NpcId
  /** 몇 번째 장인지 (1부터) */
  order: number
  title: string
  /** 열기 전에 보여주는 한 줄. 조건을 숫자로 말하지 않는다. */
  lockedHint: string
  /** 열리는 조건 */
  conditions: SecretCondition[]
  /** 그 사람이 하는 말. 서너 줄이면 충분하다. */
  lines: string[]
  /** 다 읽고 나서 받는 것 */
  rewardItemId: string | null
  rewardFriendship: number
  /** 이 장을 읽으면 열리는 비밀 */
  unlocksSecret?: SecretId
  /** 이 장을 읽으면 만나는 동료 */
  unlocksCompanion?: CompanionId
}

export interface StoryChapterView {
  def: StoryChapterDef
  unlocked: boolean
  read: boolean
}

// ── 동료 ────────────────────────────────────────────────

export const COMPANION_IDS = ['BORI', 'MOCHI', 'BEAN', 'LUNA'] as const
export type CompanionId = (typeof COMPANION_IDS)[number]

/** 동료를 어떻게 만나는지 */
export type CompanionMeeting =
  | { kind: 'AREA_ACTIVITY'; areaId: AreaId; count: number }
  | { kind: 'SECRET'; secretId: SecretId }
  | { kind: 'STORY'; chapterId: string }
  | { kind: 'CATEGORY_QUESTS'; category: Category; count: number }

export interface CompanionDef {
  id: CompanionId
  name: string
  species: string
  /** 어떤 애인지 한 줄 */
  personality: string
  /**
   * 이모지 한 글자.
   *
   * 그림이 안 뜨는 동안 자리를 지킨다. 도시 사람들도 이모지 한 글자로
   * 서 있어서 (npcs.ts 의 avatar) 나란히 뒀을 때 결이 어긋나지 않는다.
   */
  avatar: string
  /** 그림 폴더 이름. 자세별 파일이 그 안에 있다. */
  art: string
  /** 이 동네를 좋아한다 — 같이 가면 친해진다 */
  favoriteAreas: AreaId[]
  meeting: CompanionMeeting
  /** 만나기 전에 흘리는 말 */
  hint: string
  /** 만난 순간의 한 줄 */
  reveal: string
  /** 이 애와 얽힌 물건들 */
  collectibleIds: string[]
}

/** 같이 지내다 남는 것 */
export interface CompanionMemoryDef {
  id: string
  companionId: CompanionId
  /** 이만큼 친해지면 열린다 */
  atFriendship: number
  title: string
  text: string
  /**
   * 이 요리를 만들어본 적이 있어야 열린다.
   *
   * 동료에게 사람 음식을 먹이는 게 아니다 — 그건 현실에서 위험한 이야기라
   * 게임에 넣지 않는다. "그날 같이 있었다" 는 기록일 뿐이다.
   */
  needsRecipeId?: string
}

/** 저장되는 동료 기록 */
export interface CompanionState {
  friendship: number
  metAt: string
  /** 하루 첫 인사를 한 날 */
  lastPlayedOn: string | null
}

export interface CompanionView {
  def: CompanionDef
  state: CompanionState | null
  met: boolean
  active: boolean
  memories: CompanionMemoryDef[]
}

// ── 도감 힌트 ───────────────────────────────────────────

/**
 * 힌트를 어디까지 열어줄지.
 *
 * 0 아무것도 · 1 분위기만 · 2 어디쯤인지 · 3 꽤 구체적으로
 */
export type HintLevel = 0 | 1 | 2 | 3

export interface ItemHint {
  level: HintLevel
  text: string
}

// ── 발견함 ──────────────────────────────────────────────

/** 알려줄 것 한 줄 */
export type DiscoveryKind =
  | 'AUTO_COLLECTION'
  | 'SECRET'
  | 'STORY'
  | 'COMPANION'
  | 'GARDEN'
  | 'KITCHEN'

export interface DiscoveryNote {
  /** 같은 것을 두 번 알리지 않으려고 쓰는 열쇠 */
  key: string
  kind: DiscoveryKind
  icon: string
  title: string
  text: string
}

// ── 저장되는 것 ─────────────────────────────────────────

/**
 * 발견 층에서 저장하는 전부.
 *
 * 진행도는 저장하지 않는다. 전부 이미 있는 기록에서 센다 —
 * 그래야 나중에 조건을 바꿔도 저장된 값과 어긋나지 않는다.
 * 저장하는 건 "무엇을 이미 봤는지 · 받았는지" 뿐이다.
 */
export interface DiscoveryState {
  /** 이미 알려준 자동 컬렉션 */
  revealedCollectionIds: string[]
  /** 보상을 받아간 자동 컬렉션 */
  claimedCollectionIds: string[]
  /** 찾아낸 비밀 장소 */
  foundSecretIds: string[]
  /** 낌새를 이미 알려준 비밀 장소 */
  hintedSecretIds: string[]
  /** 읽은 이야기 장 */
  readChapterIds: string[]
  /** 만난 동료 */
  companions: Record<string, CompanionState>
  /** 지금 같이 다니는 동료 */
  activeCompanionId: CompanionId | null
  /** itemId → 지금까지 열린 힌트 단계 */
  hintLevels: Record<string, number>
  /** 이미 화면에 띄운 알림 (key). 오래된 것은 정리한다. */
  seenNoteKeys: string[]
}
