const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 'YYYY-MM-DD'. 시간대를 건너뛰지 않으려고 UTC 변환을 쓰지 않는다. */
export function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayKey(now: Date = new Date()): string {
  return dateKey(now)
}

/** 'YYYY-MM-DD' -> 그 지역 자정의 Date */
export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function shiftKey(key: string, days: number): string {
  const d = parseKey(key)
  d.setDate(d.getDate() + days)
  return dateKey(d)
}

export function isValidKey(key: unknown): key is string {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false
  return dateKey(parseKey(key)) === key
}

/** '9월 12일 토요일' */
export function formatDay(key: string): string {
  const d = parseKey(key)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`
}

/** '2026년 9월' */
export function formatMonth(key: string): string {
  const d = parseKey(key)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`
}

export function weekdayOf(key: string): string {
  return WEEKDAYS[parseKey(key).getDay()]
}

/** 오늘 기준 '오늘 · 어제 · 3일 전 · 9월 2일 화요일' */
export function relativeDay(key: string, today: string = todayKey()): string {
  const diff = daysBetween(key, today)
  if (diff === 0) return '오늘'
  if (diff === 1) return '어제'
  if (diff === 2) return '그제'
  if (diff > 0 && diff < 7) return `${diff}일 전`
  if (diff === -1) return '내일'
  return formatDay(key)
}

/** from 에서 to 까지 며칠. to 가 더 나중이면 양수. */
export function daysBetween(from: string, to: string): number {
  const ms = parseKey(to).getTime() - parseKey(from).getTime()
  return Math.round(ms / 86_400_000)
}

export function monthKeyOf(key: string): string {
  return key.slice(0, 7)
}

export function shiftMonth(monthKey: string, months: number): string {
  const [y, m] = monthKey.split('-').map(Number)
  const d = new Date(y, m - 1 + months, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * 달력 한 판. 일요일로 시작하는 6주(42칸)를 만들고,
 * 그 달이 아닌 칸은 null 로 둔다 — 화면에서 빈자리로 그린다.
 */
export function monthGrid(monthKey: string): (string | null)[] {
  const [y, m] = monthKey.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  const lead = first.getDay()
  const lastDate = new Date(y, m, 0).getDate()

  return Array.from({ length: 42 }, (_, i) => {
    const date = i - lead + 1
    if (date < 1 || date > lastDate) return null
    return `${monthKey}-${String(date).padStart(2, '0')}`
  })
}
