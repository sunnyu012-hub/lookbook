/** 날짜 유틸 — 전부 사용자의 로컬 시간대 기준. 저장 키는 YYYY-MM-DD 문자열. */

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayKey = () => toDateKey()

export function addDays(key: string, delta: number): string {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + delta)
  return toDateKey(d)
}

/** 오늘 포함 최근 n일의 키 배열 (오래된 → 최신) */
export function recentKeys(n: number, from: string = todayKey()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(from, -(n - 1 - i)))
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function formatLong(key: string): string {
  const d = fromDateKey(key)
  return `${d.getFullYear()}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())} ${WEEKDAYS[d.getDay()]}요일`
}

export function formatShort(key: string): string {
  const d = fromDateKey(key)
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${WEEKDAYS[d.getDay()]}`
}

export const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export interface MonthCell {
  key: string | null
  day: number | null
  isToday: boolean
  isFuture: boolean
}

/** 달력 그리드 (일요일 시작, 앞뒤 빈칸 포함) */
export function monthGrid(year: number, month: number): MonthCell[] {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const lead = first.getDay()
  const today = todayKey()

  const cells: MonthCell[] = Array.from({ length: lead }, () => ({
    key: null,
    day: null,
    isToday: false,
    isFuture: false,
  }))

  for (let day = 1; day <= daysInMonth; day++) {
    const key = toDateKey(new Date(year, month, day))
    cells.push({ key, day, isToday: key === today, isFuture: key > today })
  }
  return cells
}

export function monthLabel(year: number, month: number): string {
  const names = [
    'JANUARY',
    'FEBRUARY',
    'MARCH',
    'APRIL',
    'MAY',
    'JUNE',
    'JULY',
    'AUGUST',
    'SEPTEMBER',
    'OCTOBER',
    'NOVEMBER',
    'DECEMBER',
  ]
  return `${names[month]} ${year}`
}

/** 같은 달인지 (YYYY-MM 비교) */
export const isSameMonth = (key: string, year: number, month: number) =>
  key.startsWith(`${year}-${pad(month + 1)}`)
