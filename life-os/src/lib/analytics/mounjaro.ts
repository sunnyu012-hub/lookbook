/**
 * Mounjaro 사이클.
 *
 * 아주 중요한 원칙 — 이 앱은 의료 앱이 아니다.
 *   · 용량을 추천하거나 바꾸라고 말하지 않는다.
 *   · 맞아라 / 맞지 마라 를 말하지 않는다.
 *   · "다음 예정일" 은 사용자가 설정에 직접 넣은 주기로 날짜만 더한 값이다. 처방이 아니다.
 *   · 사이클 위치와 컨디션의 관계는 "이 데이터에서는 이렇게 보였다" 로만 표현한다.
 */
import type { Checkin, MounjaroLog, Preferences } from '@/types'
import { addDays, todayKey } from '../date'
import { daysBetween } from '../dday'
import { compareGroups, mean, type GroupComparison } from './stats'

export interface CycleState {
  enabled: boolean
  /** 가장 최근 기록 */
  lastDose: MounjaroLog | null
  /** 마지막 투약일을 1일차로 센다 */
  cycleDay: number | null
  intervalDays: number
  /** 설정한 주기로 계산한 다음 날짜 (예정일일 뿐, 지시가 아니다) */
  nextDate: string | null
  daysUntilNext: number | null
  /** 시작일 기준 몇 주차인지 */
  weekIndex: number | null
  totalDoses: number
  /** 최근 기록된 용량 */
  currentDoseMg: number | null
}

export function mounjaroCycle(
  logs: MounjaroLog[],
  prefs: Pick<Preferences, 'mounjaroEnabled' | 'mounjaroStartDate' | 'mounjaroIntervalDays' | 'mounjaroDoseMg'>,
  today: string = todayKey(),
): CycleState {
  const interval = prefs.mounjaroIntervalDays || 7
  const sorted = [...logs].sort((a, b) => (a.date < b.date ? 1 : -1))
  const past = sorted.filter((l) => l.date <= today)
  const lastDose = past[0] ?? null

  const cycleDay = lastDose ? daysBetween(lastDose.date, today) + 1 : null
  const nextDate = lastDose ? addDays(lastDose.date, interval) : null
  const start = prefs.mounjaroStartDate

  return {
    enabled: Boolean(prefs.mounjaroEnabled),
    lastDose,
    cycleDay,
    intervalDays: interval,
    nextDate,
    daysUntilNext: nextDate ? daysBetween(today, nextDate) : null,
    weekIndex: start ? Math.floor(daysBetween(start, today) / 7) + 1 : null,
    totalDoses: logs.length,
    currentDoseMg: lastDose?.doseMg ?? prefs.mounjaroDoseMg ?? null,
  }
}

/** 마지막 투약일로부터 며칠째인지 — 날짜별로 만들어 둔다 */
export function cycleDayMap(logs: MounjaroLog[], dates: string[]): Map<string, number> {
  const doses = [...logs].map((l) => l.date).sort()
  const map = new Map<string, number>()
  for (const date of dates) {
    let last: string | null = null
    for (const d of doses) {
      if (d <= date) last = d
      else break
    }
    if (last) map.set(date, daysBetween(last, date) + 1)
  }
  return map
}

export interface CyclePhase {
  key: 'early' | 'mid' | 'late'
  label: string
  /** 1-based 사이클 일차 범위 */
  from: number
  to: number
}

/** 주기를 셋으로 나눈다 — 며칠 주기든 비율로 나뉜다 */
export function cyclePhases(intervalDays: number): CyclePhase[] {
  const a = Math.max(1, Math.round(intervalDays / 3))
  const b = Math.max(a + 1, Math.round((intervalDays * 2) / 3))
  return [
    { key: 'early', label: '투약 직후', from: 1, to: a },
    { key: 'mid', label: '중간', from: a + 1, to: b },
    { key: 'late', label: '다음 투약 전', from: b + 1, to: Math.max(b + 1, intervalDays) },
  ]
}

export interface CycleProfilePoint {
  day: number
  avgScore: number
  n: number
}

/** 사이클 일차별 평균 컨디션. 표본이 적은 날은 빼고 돌려준다. */
export function cycleProfile(
  checkins: Checkin[],
  logs: MounjaroLog[],
  intervalDays: number,
  minSamples = 2,
): CycleProfilePoint[] {
  const scored = checkins.filter((c) => c.energyScore != null)
  const dayMap = cycleDayMap(logs, scored.map((c) => c.date))
  const buckets = new Map<number, number[]>()

  scored.forEach((c) => {
    const day = dayMap.get(c.date)
    if (!day || day > intervalDays) return
    buckets.set(day, [...(buckets.get(day) ?? []), c.energyScore as number])
  })

  return Array.from(buckets.entries())
    .filter(([, xs]) => xs.length >= minSamples)
    .map(([day, xs]) => ({ day, avgScore: Math.round(mean(xs)), n: xs.length }))
    .sort((a, b) => a.day - b.day)
}

export interface PhaseComparison {
  comparison: GroupComparison
  intervalDays: number
}

/** 투약 직후 vs 다음 투약 전 — 두 구간의 평균 컨디션 비교 */
export function comparePhases(
  checkins: Checkin[],
  logs: MounjaroLog[],
  intervalDays: number,
  minPerGroup = 4,
): PhaseComparison {
  const phases = cyclePhases(intervalDays)
  const scored = checkins.filter((c) => c.energyScore != null)
  const dayMap = cycleDayMap(logs, scored.map((c) => c.date))

  const pick = (p: CyclePhase) =>
    scored
      .filter((c) => {
        const d = dayMap.get(c.date)
        return d !== undefined && d >= p.from && d <= p.to
      })
      .map((c) => c.energyScore as number)

  return {
    comparison: compareGroups(
      pick(phases[0]),
      pick(phases[2]),
      phases[0].label,
      phases[2].label,
      minPerGroup,
    ),
    intervalDays,
  }
}

/** 투약 다음 날 자주 적힌 증상 (그냥 세기만 한다) */
export function sideEffectCounts(logs: MounjaroLog[]): { name: string; count: number }[] {
  const counts = new Map<string, number>()
  logs.forEach((l) => (l.sideEffects ?? []).forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1)))
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}
