/**
 * 베이스라인 — "나에게 보통이란 어느 정도인가".
 * 남과 비교하지 않는다. 최근 기록의 평균과 흔들림 폭만 본다.
 */
import type { Checkin } from '@/types'
import { METRICS, scoreCheckin, type MetricKey, type ScoreContext } from '../scoring'
import { mean, stdev } from './stats'

export interface MetricBaseline {
  key: MetricKey
  label: string
  /** 정규화된 0~100 평균 */
  avg: number
  sd: number
  n: number
}

export interface Baseline {
  /** 전체 점수 평균 */
  avgScore: number | null
  sdScore: number
  metrics: MetricBaseline[]
  days: number
  enough: boolean
}

/** 최소 이만큼은 있어야 "보통" 이라고 부를 수 있다 */
export const MIN_BASELINE_DAYS = 7

export function baseline(
  checkins: Checkin[],
  ctx?: ScoreContext,
  minDays = MIN_BASELINE_DAYS,
): Baseline {
  const results = checkins.map((c) => scoreCheckin(c, ctx))
  const scores = results.map((r) => r.overall).filter((v): v is number => v !== null)

  const metrics: MetricBaseline[] = METRICS.map((def) => {
    const values = results
      .map((r) => r.byKey[def.key]?.score)
      .filter((v): v is number => v !== undefined)
    return { key: def.key, label: def.label, avg: Math.round(mean(values)), sd: Math.round(stdev(values)), n: values.length }
  }).filter((m) => m.n >= 3)

  return {
    avgScore: scores.length ? Math.round(mean(scores)) : null,
    sdScore: Math.round(stdev(scores)),
    metrics,
    days: scores.length,
    enough: scores.length >= minDays,
  }
}

/** 오늘이 내 보통과 얼마나 떨어져 있는지 (표준편차 단위) */
export function deviationFromBaseline(score: number | null, base: Baseline): number | null {
  if (score === null || !base.enough || base.avgScore === null || base.sdScore === 0) return null
  return Math.round(((score - base.avgScore) / base.sdScore) * 10) / 10
}
