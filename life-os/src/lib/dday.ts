/**
 * D-Day 계산.
 *
 * 한국식으로 "시작한 날 = 1일째" 로 센다 (count).
 * D+N 표기는 관례대로 시작일을 D-DAY 로 두고 그 다음 날부터 D+1 이다 (days).
 */
import { addDays, fromDateKey, todayKey, toDateKey } from './date'

/** a → b 사이의 온전한 날짜 수 (같은 날이면 0) */
export function daysBetween(a: string, b: string): number {
  const ms = fromDateKey(b).getTime() - fromDateKey(a).getTime()
  return Math.round(ms / 86_400_000)
}

export interface Milestone {
  /** 몇 일째인지 */
  count: number
  label: string
  date: string
  remaining: number
}

/** 100일 단위 + 해마다 오는 기념일 */
function milestoneCounts(upTo: number): Milestone[] {
  const out: { count: number; label: string }[] = []
  for (let c = 100; c <= upTo + 1200; c += 100) out.push({ count: c, label: `${c}일` })
  for (let y = 1; y <= Math.ceil((upTo + 800) / 365); y++) {
    out.push({ count: y * 365 + 1, label: `${y}주년` })
  }
  return out
    .sort((a, b) => a.count - b.count)
    .map((m) => ({ ...m, date: '', remaining: 0 }))
}

export interface DdayResult {
  /** 시작일로부터 지난 날 수 (시작일 = 0) */
  days: number
  /** 며칠째인지 (시작일 = 1일째) */
  count: number
  /** D+123 / D-5 / D-DAY */
  label: string
  /** 124일째 */
  countLabel: string
  isFuture: boolean
  nextMilestone: Milestone | null
}

export function ddayFrom(
  startDate: string,
  countMode: 'since' | 'until' = 'since',
  today: string = todayKey(),
): DdayResult {
  const days = daysBetween(startDate, today)
  const count = days + 1

  if (countMode === 'until') {
    const remaining = -days
    return {
      days,
      count,
      label: remaining === 0 ? 'D-DAY' : remaining > 0 ? `D-${remaining}` : `D+${-remaining}`,
      countLabel: remaining > 0 ? `${remaining}일 남음` : remaining === 0 ? '오늘' : `${-remaining}일 지남`,
      isFuture: remaining > 0,
      nextMilestone: null,
    }
  }

  const next =
    milestoneCounts(Math.max(count, 0)).find((m) => m.count > count) ?? null

  return {
    days,
    count,
    label: days === 0 ? 'D-DAY' : days > 0 ? `D+${days}` : `D-${-days}`,
    countLabel: count > 0 ? `${count.toLocaleString()}일째` : `${-days}일 남음`,
    isFuture: days < 0,
    nextMilestone: next
      ? {
          ...next,
          date: addDays(startDate, next.count - 1),
          remaining: next.count - count,
        }
      : null,
  }
}

/** 오늘 기준 요일 이름이 필요한 곳에서 쓴다 */
export const weekdayOf = (key: string) =>
  ['일', '월', '화', '수', '목', '금', '토'][fromDateKey(key).getDay()]

export const dateKeyOf = (d: Date) => toDateKey(d)
