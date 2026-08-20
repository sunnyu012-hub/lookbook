/** 앱 전역에서 쓰는 도메인 타입. DB 스키마(snake_case)와는 lib/mappers.ts 에서 변환한다. */

export type EnergyMode = 'RECOVERY' | 'EASY' | 'NORMAL' | 'POWER'

/** 1~5 척도 (통증 계열은 0~5) */
export type Scale5 = 1 | 2 | 3 | 4 | 5
export type Pain5 = 0 | 1 | 2 | 3 | 4 | 5

/** Quick 은 3~4개만, Detailed 는 전부 — 어느 쪽이든 빈 값은 그대로 비워 둔다. */
export type EntryMode = 'quick' | 'detailed'

type N<T> = T | null | undefined

/**
 * 사용자가 체크인 화면에서 입력하는 값.
 * 확장 이후 모든 항목은 선택이다. 비어 있는 항목은 점수 계산에서 빠지고,
 * 남은 항목끼리 가중치를 다시 나눠 갖는다 (lib/scoring).
 */
export interface CheckinInput {
  /** YYYY-MM-DD (로컬 기준) */
  date: string
  entryMode?: EntryMode

  // ── 회복
  sleepHours?: N<number>
  /** 1 나쁨 ~ 5 좋음 */
  sleepQuality?: N<Scale5>
  /** 1 안 피곤 ~ 5 매우 피곤 */
  fatigue?: N<Scale5>

  // ── 몸
  /** 0 없음 ~ 5 심함 */
  bodyPain?: N<Pain5>
  headache?: N<Pain5>
  nausea?: N<Pain5>
  bloating?: N<Pain5>
  /** 1 나쁨 ~ 5 좋음 */
  digestion?: N<Scale5>

  // ── 마음
  mood?: N<Scale5>
  focus?: N<Scale5>
  /** 1 낮음 ~ 5 높음 (높을수록 나쁨) */
  stress?: N<Scale5>
  anxiety?: N<Scale5>
  motivation?: N<Scale5>
  socialEnergy?: N<Scale5>

  // ── 연료
  appetite?: N<Scale5>
  mealsCount?: N<number>
  mealQuality?: N<Scale5>
  caffeineConsumed?: N<boolean>
  /** HH:MM */
  caffeineTime?: N<string>
  caffeineMg?: N<number>
  alcohol?: N<boolean>
  alcoholUnits?: N<number>

  // ── 활동
  exercise?: N<boolean>
  exerciseType?: N<string>
  exerciseMinutes?: N<number>
  exerciseIntensity?: N<Scale5>
  workHours?: N<number>
  screenMinutes?: N<number>
  outdoor?: N<boolean>

  // ── 맥락
  tags?: N<string[]>
  highlight?: N<string>
  memo?: N<string>
}

/** 저장된 체크인 (계산된 점수 포함) */
export interface Checkin extends CheckinInput {
  id: string
  userId: string
  /** 0~100. 입력이 하나도 없으면 null */
  energyScore: number | null
  mode: EnergyMode | null
  recoveryScore?: number | null
  bodyScore?: number | null
  mindScore?: number | null
  fuelScore?: number | null
  /** 0~1 — 얼마나 많은 항목이 채워졌는지 */
  confidence?: number | null
  createdAt: string
  updatedAt: string
}

/** Supabase daily_checkins 행 */
export interface CheckinRow {
  id: string
  user_id: string
  date: string
  entry_mode: EntryMode | null

  sleep_hours: number | null
  sleep_quality: number | null
  fatigue: number | null
  body_pain: number | null
  headache: number | null
  nausea: number | null
  bloating: number | null
  digestion: number | null
  mood: number | null
  focus: number | null
  stress: number | null
  anxiety: number | null
  motivation: number | null
  social_energy: number | null
  appetite: number | null
  meals_count: number | null
  meal_quality: number | null

  caffeine_consumed: boolean | null
  caffeine_time: string | null
  caffeine_mg: number | null
  alcohol: boolean | null
  alcohol_units: number | null

  exercise: boolean | null
  exercise_type: string | null
  exercise_minutes: number | null
  exercise_intensity: number | null
  work_hours: number | null
  screen_minutes: number | null
  outdoor: boolean | null

  tags: string[] | null
  highlight: string | null
  memo: string | null

  energy_score: number | null
  mode: EnergyMode | null
  recovery_score: number | null
  body_score: number | null
  mind_score: number | null
  fuel_score: number | null
  confidence: number | null

  created_at: string
  updated_at: string
}

// ─────────────────────────────────────────────
// 체중
// ─────────────────────────────────────────────
export interface WeightInput {
  date: string
  weightKg: number
  bodyFatPct?: N<number>
  muscleKg?: N<number>
  note?: N<string>
}

export interface WeightLog extends WeightInput {
  id: string
  userId: string
  createdAt: string
  updatedAt: string
}

// ─────────────────────────────────────────────
// Mounjaro — 투약 "기록". 용량 판단은 이 앱이 하지 않는다.
// ─────────────────────────────────────────────
export interface MounjaroInput {
  date: string
  doseMg: number
  injectionSite?: N<string>
  takenAt?: N<string>
  sideEffects?: N<string[]>
  note?: N<string>
}

export interface MounjaroLog extends MounjaroInput {
  id: string
  userId: string
  createdAt: string
  updatedAt: string
}

// ─────────────────────────────────────────────
// D-Day
// ─────────────────────────────────────────────
export type DdayKind = 'love' | 'health' | 'life' | 'goal'
export type CountMode = 'since' | 'until'

export interface DdayInput {
  title: string
  startDate: string
  kind: DdayKind
  countMode: CountMode
  pinned: boolean
  sortOrder?: number
}

export interface DdayEvent extends DdayInput {
  id: string
  userId: string
  /** 설정에서 자동으로 만들어진 항목이면 true — 편집/삭제 대신 설정으로 안내한다 */
  derived?: boolean
  createdAt: string
  updatedAt: string
}

// ─────────────────────────────────────────────
// 라이프 이벤트 (타임라인)
// ─────────────────────────────────────────────
export type LifeCategory = 'note' | 'love' | 'health' | 'work' | 'play' | 'travel' | 'milestone'

export interface LifeEventInput {
  date: string
  title: string
  category: LifeCategory
  detail?: N<string>
  mood?: N<Scale5>
}

export interface LifeEvent extends LifeEventInput {
  id: string
  userId: string
  createdAt: string
  updatedAt: string
}

// ─────────────────────────────────────────────
// 개인 설정 — 개인적인 날짜/용량/목표는 전부 여기에만 있다
// ─────────────────────────────────────────────
export interface Preferences {
  displayName: string | null
  lifeOsStartDate: string | null

  heightCm: number | null
  startingWeightKg: number | null
  goalWeightKg: number | null

  mounjaroEnabled: boolean
  mounjaroStartDate: string | null
  mounjaroDoseMg: number | null
  mounjaroIntervalDays: number

  relationshipEnabled: boolean
  relationshipStartDate: string | null
  partnerName: string | null

  sleepGoalHours: number
}

export type TabKey = 'home' | 'checkin' | 'life' | 'log' | 'me'
