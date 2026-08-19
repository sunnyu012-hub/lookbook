/** 앱 전역에서 쓰는 도메인 타입. DB 스키마(snake_case)와는 lib/mappers.ts 에서 변환한다. */

export type EnergyMode = 'RECOVERY' | 'EASY' | 'NORMAL' | 'POWER'

/** 1~5 척도 (bodyPain 은 0~5) */
export type Scale5 = 1 | 2 | 3 | 4 | 5
export type Pain5 = 0 | 1 | 2 | 3 | 4 | 5

/** 사용자가 체크인 화면에서 입력하는 값 */
export interface CheckinInput {
  /** YYYY-MM-DD (로컬 기준) */
  date: string
  sleepHours: number
  /** 1 나쁨 ~ 5 좋음 */
  sleepQuality: Scale5
  /** 1 안 피곤 ~ 5 매우 피곤 */
  fatigue: Scale5
  /** 0 없음 ~ 5 심함 */
  bodyPain: Pain5
  /** 1 나쁨 ~ 5 좋음 */
  mood: Scale5
  /** 1 낮음 ~ 5 높음 */
  focus: Scale5
  /** 1 없음 ~ 5 좋음 */
  appetite: Scale5
  caffeineConsumed: boolean
  /** HH:MM */
  caffeineTime?: string | null
  exercise: boolean
  exerciseType?: string | null
  memo?: string | null
}

/** 저장된 체크인 (계산된 점수 포함) */
export interface Checkin extends CheckinInput {
  id: string
  userId: string
  energyScore: number
  mode: EnergyMode
  createdAt: string
  updatedAt: string
}

/** Supabase daily_checkins 행 */
export interface CheckinRow {
  id: string
  user_id: string
  date: string
  sleep_hours: number
  sleep_quality: number
  fatigue: number
  body_pain: number
  mood: number
  focus: number
  appetite: number
  caffeine_consumed: boolean
  caffeine_time: string | null
  exercise: boolean
  exercise_type: string | null
  memo: string | null
  energy_score: number
  mode: EnergyMode
  created_at: string
  updated_at: string
}

export type TabKey = 'today' | 'checkin' | 'history' | 'insights'
