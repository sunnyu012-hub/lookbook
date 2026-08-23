import type { Category, Difficulty } from './index'
import type { TimeBand } from './rpg'

/**
 * 퀘스트 라이브러리와 사용 패턴 학습.
 *
 * 목표는 하나다 — 퀘스트를 직접 타이핑하지 않게 하는 것.
 * 첫날에는 준비된 세트가, 며칠 뒤에는 자주 쓰는 것이, 몇 주 뒤에는
 * 요일·시간대까지 본 추천이 대신한다.
 *
 * 학습은 전부 이 기기 안에서만 돈다. 밖으로 나가는 게 없다.
 */

// ── 준비된 퀘스트 ───────────────────────────────────────
export interface QuestPreset {
  /** 팩 안에서 고유. questKey 로도 쓴다. */
  id: string
  title: string
  category: Category
  difficulty: Difficulty
}

export interface QuestPackDef {
  id: string
  name: string
  icon: string
  description: string
  /** 이 세트가 어울리는 시간대. 추천 정렬에 쓴다. */
  bands?: TimeBand[]
  /** 주말에 어울리는 세트 */
  weekend?: boolean
  items: QuestPreset[]
}

// ── 사용 기록 ───────────────────────────────────────────

/** 시간대별 횟수. TimeBand 의 DAY 가 명세의 AFTERNOON 이다. */
export type BandCounts = Record<TimeBand, number>

/** 0 = 월요일 … 6 = 일요일 */
export type DayCounts = Record<number, number>

/**
 * 퀘스트 하나에 대한 내 사용 기록.
 *
 * 제목이 아니라 questKey 로 묶는다 — 준비된 퀘스트는 preset id,
 * 직접 만든 것은 다듬은 제목이다. "물 마시기" 와 "물 챙겨 마시기" 를
 * 억지로 같은 것으로 합치지는 않는다.
 */
export interface QuestUsageProfile {
  questKey: string
  title: string
  category: Category
  difficulty: Difficulty
  /** 준비된 퀘스트에서 왔으면 그 id */
  presetId: string | null
  /** 어떤 세트에서 왔는지 */
  sourcePackIds: string[]

  totalAdded: number
  totalCompleted: number
  lastAddedAt: string | null
  lastCompletedAt: string | null

  addedByDayOfWeek: DayCounts
  addedByBand: BandCounts
  completedByDayOfWeek: DayCounts
  completedByBand: BandCounts
  /** 최근 완료한 날 (YYYY-MM-DD). 오래된 것부터 잘라낸다. */
  recentCompletionDates: string[]

  favorite: boolean
  /** "추천에서 덜 보기" 를 누른 횟수 */
  dismissCount: number
  /** 오늘 하루만 숨긴 날 (YYYY-MM-DD) */
  hiddenOn: string | null
}

export type UsageProfiles = Record<string, QuestUsageProfile>

// ── 추천 ────────────────────────────────────────────────

/** 왜 추천했는지. 가장 대표적인 것 하나만 화면에 보여준다. */
export type RecommendReason =
  | 'ROUTINE'
  | 'FAVORITE'
  | 'DAY_OF_WEEK'
  | 'TIME_OF_DAY'
  | 'FREQUENT'
  | 'RECENT'
  | 'PACK'
  /** 예전에 안 해본 것 · 오래 안 한 것 */
  | 'FRESH'

export interface Recommendation {
  questKey: string
  title: string
  category: Category
  difficulty: Difficulty
  presetId: string | null
  score: number
  reason: RecommendReason
  /** 점수 구성 — 왜 이 순서인지 들여다볼 때 쓴다 */
  parts: Record<string, number>
}

/** ME 화면에서 끄고 켤 수 있는 것 */
export interface RecommendSettings {
  /** 사용 패턴 기반 추천을 쓸지. 끄면 시간대 기본 추천만 나온다. */
  personalized: boolean
}
