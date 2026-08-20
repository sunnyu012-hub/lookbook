/** 저장된 기록만으로 계산하는 통계. AI 없음. 표본이 모자라면 null 을 돌려주고 화면에서 감춘다. */
import type { Checkin, EnergyMode } from '@/types'
import { recentKeys } from './date'

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

function average(values: number[], min: number): number | null {
  return values.length >= min ? avg(values) : null
}

export interface Insights {
  totalCount: number
  avgScore7: number | null
  avgScore30: number | null
  avgSleepHours: number | null
  avgFatigue: number | null
  avgMood: number | null
  modeDays: Record<EnergyMode, number>
  modeDaysTotal: number
  exercise: { withAvg: number; withoutAvg: number; withDays: number; withoutDays: number } | null
  /** 최근 14일 스파크라인용 (기록 없는 날은 null) */
  trend14: { date: string; score: number | null }[]
}

/** 최소 표본 기준 — 이 값보다 적으면 해당 분석을 표시하지 않는다 */
export const MIN_SAMPLES = {
  weekly: 3,
  monthly: 5,
  metric: 3,
  exercise: 3,
} as const

export function buildInsights(checkins: Checkin[]): Insights {
  const last7 = new Set(recentKeys(7))
  const last30 = new Set(recentKeys(30))

  const in7 = checkins.filter((c) => last7.has(c.date))
  const in30 = checkins.filter((c) => last30.has(c.date))

  const modeDays: Record<EnergyMode, number> = {
    RECOVERY: 0,
    EASY: 0,
    NORMAL: 0,
    POWER: 0,
  }
  in30.forEach((c) => {
    modeDays[c.mode] += 1
  })

  const withEx = in30.filter((c) => c.exercise)
  const withoutEx = in30.filter((c) => !c.exercise)
  const exerciseComparable =
    withEx.length >= MIN_SAMPLES.exercise && withoutEx.length >= MIN_SAMPLES.exercise

  const byDate = new Map(checkins.map((c) => [c.date, c]))

  return {
    totalCount: checkins.length,
    avgScore7: average(in7.map((c) => c.energyScore), MIN_SAMPLES.weekly),
    avgScore30: average(in30.map((c) => c.energyScore), MIN_SAMPLES.monthly),
    avgSleepHours: average(in30.map((c) => c.sleepHours), MIN_SAMPLES.metric),
    avgFatigue: average(in30.map((c) => c.fatigue), MIN_SAMPLES.metric),
    avgMood: average(in30.map((c) => c.mood), MIN_SAMPLES.metric),
    modeDays,
    modeDaysTotal: in30.length,
    exercise: exerciseComparable
      ? {
          withAvg: avg(withEx.map((c) => c.energyScore)),
          withoutAvg: avg(withoutEx.map((c) => c.energyScore)),
          withDays: withEx.length,
          withoutDays: withoutEx.length,
        }
      : null,
    trend14: recentKeys(14).map((date) => ({
      date,
      score: byDate.get(date)?.energyScore ?? null,
    })),
  }
}
