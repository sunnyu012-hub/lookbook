/**
 * 5A — 언제부터 언제까지 볼 것인가.
 *
 * 날짜는 전부 로컬 YYYY-MM-DD 로 다룬다.
 * quick_logs.date 가 이미 로컬 날짜로 저장돼 있어서, UTC 로 다시 자르면
 * 한국에서 자정 근처 기록이 하루씩 밀린다 (Phase 2 에서 정한 규칙).
 */
import type { DayOfWeek, DayPart } from '../types'

export type WindowKey = '7d' | '30d' | '90d' | 'all'

export interface AnalysisWindow {
  key: WindowKey
  label: string
  /** null 이면 전체 기록 */
  days: number | null
  /** 포함. YYYY-MM-DD */
  from: string
  to: string
}

export const WINDOW_DAYS: Record<WindowKey, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: null,
}

export const WINDOW_LABEL: Record<WindowKey, string> = {
  '7d': '최근 7일',
  '30d': '최근 30일',
  '90d': '최근 90일',
  all: '전체 기록',
}

/** 화면 기본값 (계획서 6) */
export const DEFAULT_WINDOW: WindowKey = '30d'

const DAY = 86_400_000

export const dateKey = (at: Date): string => {
  const y = at.getFullYear()
  const m = String(at.getMonth() + 1).padStart(2, '0')
  const d = String(at.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const shiftDate = (key: string, days: number): string => {
  const [y, m, d] = key.split('-').map(Number)
  return dateKey(new Date(y, m - 1, d + days))
}

/** 두 날짜 사이의 날 수 (b - a) */
export const daysBetween = (a: string, b: string): number => {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / DAY)
}

/**
 * 창 하나를 만든다.
 * `to` 를 넘기지 않으면 오늘까지. 전체 기록이면 earliest 부터.
 */
export function makeWindow(
  key: WindowKey,
  options: { to?: string; earliest?: string } = {},
): AnalysisWindow {
  const to = options.to ?? dateKey(new Date())
  const days = WINDOW_DAYS[key]
  const from = days === null ? options.earliest ?? '0000-01-01' : shiftDate(to, -(days - 1))
  return { key, label: WINDOW_LABEL[key], days, from, to }
}

/**
 * 바로 앞 같은 길이의 창.
 * 최근 30일과 견줄 상대는 그 앞 30일이다 (계획서 6).
 */
export function previousWindow(window: AnalysisWindow): AnalysisWindow | null {
  if (window.days === null) return null
  const to = shiftDate(window.from, -1)
  return {
    key: window.key,
    label: `이전 ${window.days}일`,
    days: window.days,
    from: shiftDate(to, -(window.days - 1)),
    to,
  }
}

export const inWindow = (date: string, window: AnalysisWindow) =>
  date >= window.from && date <= window.to

export const withinWindow = <T extends { date: string }>(
  items: readonly T[],
  window: AnalysisWindow,
): T[] => items.filter((item) => inWindow(item.date, window))

// ─────────────────────────────────────────────
// 시간대 · 요일
//
// quick_logs 에 day_part 와 day_of_week 가 이미 있다. 다시 계산하지 않는다.
// 다만 화면에서 더 잘게 나눠 보고 싶을 때를 위해 파생 함수만 둔다 (계획서 16).
// ─────────────────────────────────────────────

export const DAY_PARTS: DayPart[] = ['dawn', 'morning', 'afternoon', 'evening', 'night']

export const DAY_PART_LABEL: Record<DayPart, string> = {
  dawn: '새벽',
  morning: '아침',
  afternoon: '낮',
  evening: '저녁',
  night: '밤',
}

export const DAY_LABEL: Record<DayOfWeek, string> = {
  0: '일',
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
}

export const isWeekend = (day: DayOfWeek) => day === 0 || day === 6

export type DayType = 'weekday' | 'weekend'

export const dayTypeOf = (day: DayOfWeek): DayType => (isWeekend(day) ? 'weekend' : 'weekday')

export const DAY_TYPE_LABEL: Record<DayType, string> = {
  weekday: '평일',
  weekend: '주말',
}

/** 기록이 실제로 있는 가장 이른 날 */
export const earliestDate = (items: readonly { date: string }[]): string | undefined =>
  items.length ? items.reduce((min, i) => (i.date < min ? i.date : min), items[0].date) : undefined
