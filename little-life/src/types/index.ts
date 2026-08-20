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
}

export interface User {
  name: string
  level: number
  /** 현재 레벨에서 쌓은 EXP */
  currentExp: number
  /** 지금까지 획득한 EXP 총합 */
  totalExp: number
}

/**
 * 저장되는 전체 스냅샷.
 * version 은 나중에 마이그레이션할 때 쓴다.
 */
export interface AppState {
  version: number
  user: User
  quests: Quest[]
  // 향후 확장 예정: coins, inventory, achievements, character, room, pets, stats, dailyRandomQuest
}

/** 퀘스트를 만들 때 화면에서 넘겨주는 입력값 */
export interface QuestDraft {
  title: string
  category: Category
  difficulty: Difficulty
}

/** 퀘스트 완료 결과 — 화면에서 피드백 애니메이션을 띄우는 데 쓴다. */
export interface CompleteResult {
  gainedExp: number
  leveledUp: boolean
  newLevel: number
}
