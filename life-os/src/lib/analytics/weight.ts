/**
 * 체중 분석.
 *
 * 규칙
 *   · 하루하루의 오르내림을 경고처럼 말하지 않는다. 몸무게는 원래 하루 안에서도 출렁인다.
 *   · 빨리 빼는 걸 칭찬하거나 재촉하지 않는다. 속도에 대한 평가를 만들지 않는다.
 *   · 여기서 나오는 건 전부 "관찰된 값" 이다.
 */
import type { Preferences, WeightLog } from '@/types'
import { todayKey } from '../date'
import { mean, movingAverage, slopePerDay, type Point } from './stats'

export interface WeightSummary {
  latest: WeightLog | null
  /** 7일 이동평균의 마지막 값 — 하루치 출렁임을 눌러 본 값 */
  smoothed: number | null
  /** 30일 전 이동평균 대비 (kg) */
  change30: number | null
  /** 기록 시작 이후 변화 (kg) */
  changeAll: number | null
  /** 목표까지 남은 양 (설정에 목표가 있을 때만) */
  toGoal: number | null
  points: Point[]
  line: Point[]
  count: number
  /** 최근 14일 안에 잰 적이 있는지 */
  fresh: boolean
}

export function weightPoints(logs: WeightLog[]): Point[] {
  return logs
    .map((w) => ({ date: w.date, value: Number(w.weightKg) }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

export function weightSummary(
  logs: WeightLog[],
  prefs: Pick<Preferences, 'goalWeightKg' | 'startingWeightKg'>,
  today: string = todayKey(),
): WeightSummary {
  const points = weightPoints(logs)
  const line = movingAverage(points, 7)
  const latest = [...logs].sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? null
  const smoothed = line.length ? Math.round(line[line.length - 1].value * 10) / 10 : null

  const round1 = (v: number) => Math.round(v * 10) / 10
  const at = (i: number) => (i >= 0 && i < line.length ? line[i].value : null)

  // 30일 전과 비교할 때도 이동평균끼리 본다 (그날 하루의 값이 아니라)
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() - 30)
  const cutoffKey = cutoff.toISOString().slice(0, 10)
  let olderIdx = -1
  for (let i = line.length - 1; i >= 0; i--) {
    if (line[i].date <= cutoffKey) {
      olderIdx = i
      break
    }
  }
  const old30 = at(olderIdx)

  const first = at(0)
  const start = prefs.startingWeightKg ?? first

  return {
    latest,
    smoothed,
    change30: smoothed !== null && old30 !== null ? round1(smoothed - old30) : null,
    changeAll: smoothed !== null && start !== null ? round1(smoothed - start) : null,
    toGoal:
      smoothed !== null && prefs.goalWeightKg !== null && prefs.goalWeightKg !== undefined
        ? round1(smoothed - prefs.goalWeightKg)
        : null,
    points,
    line,
    count: logs.length,
    fresh: latest ? latest.date >= addDaysKey(today, -14) : false,
  }
}

function addDaysKey(key: string, delta: number): string {
  const d = new Date(key)
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

/** 목표를 향해 얼마나 왔는지 (0~1). 시작·목표가 다 있어야 계산된다. */
export function goalProgress(
  summary: WeightSummary,
  prefs: Pick<Preferences, 'goalWeightKg' | 'startingWeightKg'>,
): number | null {
  const start = prefs.startingWeightKg
  const goal = prefs.goalWeightKg
  if (start == null || goal == null || summary.smoothed == null) return null
  const span = start - goal
  if (span === 0) return null
  return Math.max(0, Math.min(1, (start - summary.smoothed) / span))
}

/** 기록해 둘 만한 지점들 — 도달한 사실만 적는다 */
export interface WeightMilestone {
  value: number
  date: string
  label: string
}

export function weightMilestones(
  logs: WeightLog[],
  prefs: Pick<Preferences, 'startingWeightKg'>,
  step = 1,
): WeightMilestone[] {
  const points = weightPoints(logs)
  if (points.length === 0) return []
  const start = prefs.startingWeightKg ?? points[0].value

  const out: WeightMilestone[] = []
  let nextDown = Math.floor((start - step) / step) * step

  for (const p of points) {
    while (p.value <= nextDown) {
      out.push({ value: nextDown, date: p.date, label: `${nextDown}kg 를 지나감` })
      nextDown -= step
    }
  }
  return out.slice(-6).reverse()
}

/** 며칠에 한 번 재고 있는지 */
export function loggingCadence(logs: WeightLog[]): number | null {
  if (logs.length < 2) return null
  const points = weightPoints(logs)
  const gaps: number[] = []
  for (let i = 1; i < points.length; i++) {
    const d =
      (new Date(points[i].date).getTime() - new Date(points[i - 1].date).getTime()) / 86_400_000
    gaps.push(d)
  }
  return Math.round(mean(gaps) * 10) / 10
}

export const weightSlope = (logs: WeightLog[]) => slopePerDay(weightPoints(logs))
