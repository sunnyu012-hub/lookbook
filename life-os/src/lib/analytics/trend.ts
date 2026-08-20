/** 컨디션 추세 — 최근 구간과 그 앞 구간을 비교한다. */
import type { Checkin } from '@/types'
import { addDays, todayKey } from '../date'
import { mean, movingAverage, slopePerDay, type Point } from './stats'

export type Direction = 'up' | 'down' | 'flat'

export interface Trend {
  /** 최근 구간 평균 */
  recent: number | null
  /** 그 앞 구간 평균 */
  previous: number | null
  delta: number | null
  direction: Direction
  nRecent: number
  nPrevious: number
  /** 비교할 만큼 기록이 쌓였는지 */
  enough: boolean
}

const FLAT_BAND = 2

export function scorePoints(checkins: Checkin[]): Point[] {
  return checkins
    .filter((c) => c.energyScore !== null && c.energyScore !== undefined)
    .map((c) => ({ date: c.date, value: c.energyScore as number }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

export function conditionTrend(
  checkins: Checkin[],
  windowDays = 7,
  today: string = todayKey(),
): Trend {
  const points = scorePoints(checkins)
  const recentFrom = addDays(today, -(windowDays - 1))
  const prevFrom = addDays(today, -(windowDays * 2 - 1))

  const recent = points.filter((p) => p.date >= recentFrom && p.date <= today)
  const previous = points.filter((p) => p.date >= prevFrom && p.date < recentFrom)

  const r = recent.length ? Math.round(mean(recent.map((p) => p.value))) : null
  const p = previous.length ? Math.round(mean(previous.map((x) => x.value))) : null
  const delta = r !== null && p !== null ? r - p : null

  return {
    recent: r,
    previous: p,
    delta,
    direction:
      delta === null || Math.abs(delta) < FLAT_BAND ? 'flat' : delta > 0 ? 'up' : 'down',
    nRecent: recent.length,
    nPrevious: previous.length,
    enough: recent.length >= 3 && previous.length >= 3,
  }
}

/** 그래프용 — 점수의 7일 이동평균 */
export function scoreTrendLine(checkins: Checkin[], window = 7): Point[] {
  return movingAverage(scorePoints(checkins), window)
}

/** 하루당 변화량 (점수) */
export const scoreSlope = (checkins: Checkin[]) => slopePerDay(scorePoints(checkins))
