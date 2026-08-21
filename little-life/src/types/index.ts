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
  categoryStats: CategoryStats
  dailyLog: DailyLog
  // 향후 확장 예정: coins, inventory, achievements, character, room, pets, randomQuest …
}

/** 퀘스트를 만들 때 화면에서 넘겨주는 입력값 */
export interface QuestDraft {
  title: string
  category: Category
  difficulty: Difficulty
  /** 반복으로 만들 거면 규칙. 없으면 오늘 한 번짜리. */
  repeat?: RepeatRule
}

/** 퀘스트 완료 결과 — 화면에서 피드백 애니메이션을 띄우는 데 쓴다. */
export interface CompleteResult {
  gainedExp: number
  leveledUp: boolean
  newLevel: number
}
