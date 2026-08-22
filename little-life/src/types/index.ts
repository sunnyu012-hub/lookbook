export * from './rpg'
export * from './city'
export * from './library'
export * from './collection'
import type { CollectionState } from './collection'
import type {
  AreaId,
  Battle,
  ClassId,
  EquippedItems,
  InventoryEntry,
  Stats,
} from './rpg'
import type { ActiveBuff, NpcId, NpcStates, Reputation } from './city'
import type { RecommendSettings, UsageProfiles } from './library'
import type { TimeBand } from './rpg'

/**
 * Little Life 의 데이터 모델.
 *
 * MVP 는 localStorage 만 쓰지만, 나중에 Supabase 로 옮길 때
 * 이 타입이 그대로 테이블 스키마가 되도록 평평한 구조로 유지한다.
 * (id 는 uuid 문자열, 시각은 ISO 문자열)
 */

export const CATEGORIES = ['LIFE', 'WORK', 'BODY', 'PLAY', 'MIND', 'HEART'] as const
export type Category = (typeof CATEGORIES)[number]

export const DIFFICULTIES = ['EASY', 'NORMAL', 'HARD'] as const
export type Difficulty = (typeof DIFFICULTIES)[number]

/**
 * 반복 규칙.
 * "주 3회" 같은 건 어느 요일인지 정해지지 않아 애매해서, 요일을 직접 고르게 했다.
 */
export type RepeatRule =
  | { kind: 'daily' }
  | { kind: 'weekdays' } // 월~금
  | { kind: 'days'; days: number[] } // 0=월 … 6=일
  /** 요일을 정하지 않고 주 N회만 채운다 */
  | { kind: 'timesPerWeek'; times: number }

/**
 * 반복 퀘스트의 원본.
 *
 * Routine 은 조리법이고, 매일 아침 거기서 Quest 하나가 만들어진다.
 * 둘을 한 타입에 섞으면 "이게 원본인가 오늘 것인가" 가 늘 헷갈린다.
 */
export interface Routine {
  id: string
  title: string
  category: Category
  difficulty: Difficulty
  rule: RepeatRule
  createdAt: string
  /** 마지막으로 퀘스트를 만들어준 날 (YYYY-MM-DD). 하루에 두 번 만들지 않으려고 둔다. */
  lastSpawnedOn: string | null
  /** 잠시 쉬고 싶을 때. 지우지 않고 멈춰만 둔다. */
  paused: boolean
  /**
   * 하루 중 언제쯤 하는 것인지. 정확한 시각을 정하게 하지 않는다 —
   * 알림이 아니라 "이 시간대 사람" 이라는 표시에 가깝다.
   */
  timeOfDay?: TimeBand | 'ANY'
  /** 세트에서 만들었으면 어디서 왔는지 */
  sourcePackId?: string
  sourcePresetId?: string
}

export interface Quest {
  id: string
  title: string
  category: Category
  difficulty: Difficulty
  /** 생성 시점의 난이도로 계산해 굳혀둔다. 밸런스를 바꿔도 과거 기록이 흔들리지 않게. */
  exp: number
  completed: boolean
  createdAt: string
  completedAt: string | null
  /** 반복 퀘스트에서 생겼으면 그 원본의 id */
  routineId?: string
  /**
   * 이 날짜(YYYY-MM-DD)가 오기 전까지는 오늘 목록에서 숨긴다.
   * 지우기는 아깝고 오늘은 안 할 때 쓴다. 지워지는 게 아니라 미뤄지는 것이다.
   */
  snoozedUntil?: string
  /** DAILY 는 내가 만든 것, NPC 는 누가 부탁한 것. 몬스터·보스는 Battle 로 따로 다룬다. */
  questType?: 'DAILY' | 'NPC'
  /** 준비된 세트에서 왔으면 어디서 왔는지. 사용 기록을 같은 것으로 묶는 데 쓴다. */
  sourcePackId?: string
  sourcePresetId?: string
  /** NPC 의뢰라면 누가 부탁했는지 */
  npcId?: NpcId
  /** 여러 단계짜리 의뢰의 몇 번째인지 */
  chainId?: string
  step?: number
  totalSteps?: number
  /**
   * 완료할 때 실제로 받은 것.
   *
   * 되돌리기가 정확히 반대로 돌려면 그때 무엇을 받았는지 알아야 한다.
   * 보너스가 붙은 EXP·코인·올린 스탯·떨어진 아이템까지 여기 적어둔다.
   */
  reward?: QuestReward
}

export interface QuestReward {
  exp: number
  coins: number
  statKey: import('./rpg').StatKey | null
  droppedItemId?: string
  /** 어느 지역 평판을 올려줬는지 */
  areaId?: AreaId
  reputation?: number
  /** NPC 의뢰였다면 누구와 얼마나 가까워졌는지 */
  npcId?: NpcId
  friendship?: number
  /** 이때 써버린 일시 버프. 되돌리면 다시 살려낸다. */
  usedBuff?: ActiveBuff
  /**
   * 이때 나온 재료·수집품.
   * 그게 처음 본 것이었는지까지 적어둬야 되돌릴 때 도감도 정확히 돌아간다.
   */
  collectDrops?: Array<{ itemId: string; wasNew: boolean }>
}

export interface User {
  name: string
  level: number
  /** 현재 레벨에서 쌓은 EXP */
  currentExp: number
  /** 지금까지 획득한 EXP 총합 */
  totalExp: number
  /** 지금까지 완료한 퀘스트 수 */
  totalCompletedQuests: number
  coins: number
  classId: ClassId | null
  stats: Stats
  equippedItems: EquippedItems
  currentAreaId: AreaId
  /**
   * 아직 안 쓴 스킬 포인트.
   *
   * 레벨과 찍어둔 스킬에서 그대로 계산되는 값이라 따로 쌓지 않는다.
   * 저장은 하지만 상태를 바꿀 때마다 다시 계산해서 덮는다 —
   * 그래야 완료를 되돌려 레벨이 내려갔을 때 포인트도 같이 돌아가고,
   * 완료·되돌리기를 반복해서 포인트만 불리는 일이 생기지 않는다.
   */
  skillPoints: number
  unlockedSkills: string[]
  /** 마시거나 먹어서 지금 걸려 있는 것 */
  activeBuffs: ActiveBuff[]
}

/** 카테고리별 누적 EXP. 퀘스트에서 계산하지 않고 따로 쌓는다 — 아래 주석 참고. */
export type CategoryStats = Record<Category, number>

/** 하루치 기록. 날짜별 통계와 이번 주 인사이트가 여기서 나온다. */
export interface DayStat {
  completed: number
  exp: number
  byCategory: Partial<Record<Category, number>>
}

/** 'YYYY-MM-DD' → 그날의 기록 */
export type DailyLog = Record<string, DayStat>

/**
 * 저장되는 전체 스냅샷.
 *
 * categoryStats 와 dailyLog 를 quests 에서 매번 계산하지 않고 따로 쌓아두는 이유:
 * 완료한 퀘스트를 지워도 이미 받은 EXP 와 기록은 남아야 하기 때문이다.
 * quests 에서 유도하면 삭제하는 순간 통계가 같이 사라진다.
 */
export interface AppState {
  version: number
  user: User
  quests: Quest[]
  routines: Routine[]
  inventory: InventoryEntry[]
  battles: Battle[]
  categoryStats: CategoryStats
  dailyLog: DailyLog
  /** Welcome Gift 를 이미 줬는지. 두 번 주지 않으려고 둔다. */
  welcomeGiftGiven: boolean
  /** 나와 도시 사람들 사이의 기록 */
  npcs: NpcStates
  /** 지역별 평판 */
  reputation: Reputation
  /**
   * 퀘스트별 사용 기록. 추가 화면의 순서를 정하는 데만 쓴다.
   * 이 기기 밖으로 나가지 않는다.
   */
  usageProfiles: UsageProfiles
  recommendSettings: RecommendSettings
  /**
   * 분야별로 끝낸 퀘스트 수.
   *
   * categoryStats 는 EXP 라서 개수를 알 수 없다. 트로피와 방 조건이
   * "일 퀘스트 100개" 같은 개수를 보기 때문에 따로 쌓는다.
   * quests 에서 세지 않는 이유는 categoryStats 와 같다 — 지워도 남아야 한다.
   */
  categoryCompleted: CategoryStats
  /** 넘긴 보스 수. 보스는 클리어 뒤 목록에서 지울 수 있어서 따로 센다. */
  bossClears: number
  /** 발견한 것, 가진 것, 방에 놓은 것 */
  collection: CollectionState
  // 향후 확장 예정: achievements, character, pets …
  //
  // 오늘의 이벤트와 상점 진열은 여기 없다.
  // 날짜에서 그대로 계산하기 때문에 저장할 게 없고, 자정이 지나면 알아서 바뀐다.
}

/** 퀘스트를 만들 때 화면에서 넘겨주는 입력값 */
export interface QuestDraft {
  title: string
  category: Category
  difficulty: Difficulty
  /** 반복으로 만들 거면 규칙. 없으면 오늘 한 번짜리. */
  repeat?: RepeatRule
  /** 준비된 세트에서 골랐으면 */
  sourcePackId?: string
  sourcePresetId?: string
  /** 반복으로 만들 때의 시간대 */
  timeOfDay?: TimeBand | 'ANY'
}

/** 퀘스트 완료 결과 — 화면에서 피드백 애니메이션을 띄우는 데 쓴다. */
export interface CompleteResult {
  gainedExp: number
  gainedCoins: number
  /** 보너스로 더 받은 EXP. 0 이면 보너스가 없었다는 뜻. */
  bonusExp: number
  leveledUp: boolean
  newLevel: number
  statKey: import('./rpg').StatKey | null
  drop: import('./rpg').DropResult | null
  /** 이번에 오른 지역 평판 */
  areaId: AreaId | null
  gainedReputation: number
  /** NPC 의뢰였다면 */
  npcId: NpcId | null
  gainedFriendship: number
  /** 이번에 써버린 일시 버프 이름 */
  usedBuffName: string | null
  /** 레벨업으로 스킬 포인트가 생겼으면 */
  gainedSkillPoints: number
  /** 이번에 나온 재료·수집품. 처음 본 것은 따로 연출한다. */
  collected: import('./collection').DiscoveryResult[]
}
