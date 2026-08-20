/**
 * 점수를 이루는 지표 목록.
 *
 * 각 지표는 (1) 어느 축에 속하는지 (2) 얼마나 무겁게 볼지 (3) 원값을 0~100 으로 어떻게 바꾸는지
 * 이 세 가지만 정의한다. 항목을 추가하려면 이 배열에 한 줄 넣으면 앱 전체에 반영된다.
 *
 * 가중치는 "전부 채웠을 때" 기준이다. 비어 있는 지표는 계산에서 빠지고
 * 남은 지표끼리 비율을 다시 나눠 갖는다 (scoring/index.ts).
 * 기본 7개 항목만 채운 예전 기록도 예전과 거의 같은 점수가 나오도록 맞춰 두었다.
 */
import type { CheckinInput } from '@/types'
import { band, clamp, present, up, down, toGoal } from './normalize'

export type Dimension = 'recovery' | 'body' | 'mind' | 'fuel'

export type MetricKey =
  | 'sleepHours'
  | 'sleepQuality'
  | 'fatigue'
  | 'bodyPain'
  | 'headache'
  | 'nausea'
  | 'bloating'
  | 'digestion'
  | 'mood'
  | 'focus'
  | 'stress'
  | 'anxiety'
  | 'motivation'
  | 'socialEnergy'
  | 'appetite'
  | 'mealsCount'
  | 'mealQuality'
  | 'hydration'

/** 점수를 낼 때 참고하는 개인 목표치 — 값 자체는 설정(user_preferences)에서 온다 */
export interface ScoreContext {
  sleepGoalHours: number
  waterGoalMl: number
}

export const DEFAULT_SCORE_CONTEXT: ScoreContext = {
  sleepGoalHours: 8,
  waterGoalMl: 2000,
}

export interface MetricDef {
  key: MetricKey
  dim: Dimension
  weight: number
  label: string
  /** 원값을 꺼낸다. 비어 있으면 null */
  raw: (input: CheckinInput) => number | null
  /** 원값 → 0~100 (높을수록 좋음) */
  norm: (v: number, ctx: ScoreContext) => number
}

const val = (v: unknown): number | null => (present(v) ? Number(v) : null)

/**
 * 수면 시간 점수. 목표 시간 ±1시간을 100점으로 두고
 * 모자라면 가파르게, 넘치면 완만하게 깎는다.
 */
export function sleepHoursScore(hours: number, goal = DEFAULT_SCORE_CONTEXT.sleepGoalHours): number {
  if (!Number.isFinite(hours) || hours <= 0) return 0
  const lo = goal - 1
  const hi = goal + 1
  if (hours >= lo && hours <= hi) return 100
  if (hours < lo) return clamp(((hours - (lo - 4)) / 4) * 100)
  return clamp(100 - (hours - hi) * 12, 45, 100)
}

export const METRICS: MetricDef[] = [
  // ── 회복
  { key: 'sleepHours', dim: 'recovery', weight: 0.22, label: '수면 시간',
    raw: (i) => val(i.sleepHours), norm: (v, c) => sleepHoursScore(v, c.sleepGoalHours) },
  { key: 'sleepQuality', dim: 'recovery', weight: 0.045, label: '수면의 질',
    raw: (i) => val(i.sleepQuality), norm: (v) => up(v, 1, 5) },
  { key: 'fatigue', dim: 'recovery', weight: 0.19, label: '피로도',
    raw: (i) => val(i.fatigue), norm: (v) => down(v, 1, 5) },

  // ── 몸
  { key: 'bodyPain', dim: 'body', weight: 0.11, label: '몸 통증',
    raw: (i) => val(i.bodyPain), norm: (v) => down(v, 0, 5) },
  { key: 'headache', dim: 'body', weight: 0.03, label: '두통',
    raw: (i) => val(i.headache), norm: (v) => down(v, 0, 5) },
  { key: 'nausea', dim: 'body', weight: 0.025, label: '메스꺼움',
    raw: (i) => val(i.nausea), norm: (v) => down(v, 0, 5) },
  { key: 'bloating', dim: 'body', weight: 0.02, label: '더부룩함',
    raw: (i) => val(i.bloating), norm: (v) => down(v, 0, 5) },
  { key: 'digestion', dim: 'body', weight: 0.025, label: '소화',
    raw: (i) => val(i.digestion), norm: (v) => up(v, 1, 5) },

  // ── 마음
  { key: 'focus', dim: 'mind', weight: 0.11, label: '집중력',
    raw: (i) => val(i.focus), norm: (v) => up(v, 1, 5) },
  { key: 'mood', dim: 'mind', weight: 0.075, label: '기분',
    raw: (i) => val(i.mood), norm: (v) => up(v, 1, 5) },
  { key: 'stress', dim: 'mind', weight: 0.045, label: '스트레스',
    raw: (i) => val(i.stress), norm: (v) => down(v, 1, 5) },
  { key: 'anxiety', dim: 'mind', weight: 0.035, label: '불안',
    raw: (i) => val(i.anxiety), norm: (v) => down(v, 1, 5) },
  { key: 'motivation', dim: 'mind', weight: 0.025, label: '의욕',
    raw: (i) => val(i.motivation), norm: (v) => up(v, 1, 5) },
  { key: 'socialEnergy', dim: 'mind', weight: 0.015, label: '사람 만날 기운',
    raw: (i) => val(i.socialEnergy), norm: (v) => up(v, 1, 5) },

  // ── 연료
  { key: 'appetite', dim: 'fuel', weight: 0.03, label: '식욕',
    raw: (i) => val(i.appetite), norm: (v) => up(v, 1, 5) },
  { key: 'mealsCount', dim: 'fuel', weight: 0.015, label: '식사 횟수',
    raw: (i) => val(i.mealsCount), norm: (v) => band(v, 2, 4, 2, 3, 30) },
  { key: 'mealQuality', dim: 'fuel', weight: 0.025, label: '식사의 질',
    raw: (i) => val(i.mealQuality), norm: (v) => up(v, 1, 5) },
  { key: 'hydration', dim: 'fuel', weight: 0.015, label: '수분',
    raw: (i) => val(i.waterMl), norm: (v, c) => toGoal(v, c.waterGoalMl) },
]

export const METRIC_BY_KEY: Record<MetricKey, MetricDef> = Object.fromEntries(
  METRICS.map((m) => [m.key, m]),
) as Record<MetricKey, MetricDef>

export const DIMENSIONS: Dimension[] = ['recovery', 'body', 'mind', 'fuel']

export const DIMENSION_LABEL: Record<Dimension, string> = {
  recovery: '회복',
  body: '몸',
  mind: '마음',
  fuel: '연료',
}

export const DIMENSION_EN: Record<Dimension, string> = {
  recovery: 'RECOVERY',
  body: 'BODY',
  mind: 'MIND',
  fuel: 'FUEL',
}
