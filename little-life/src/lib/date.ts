/**
 * 날짜 판정은 전부 로컬 기준.
 * 서버가 없으니 사용자의 기기 시간이 곧 진실이다.
 */

export function toDayKey(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayKey(now: Date = new Date()): string {
  return toDayKey(now)
}

export function isToday(iso: string, now: Date = new Date()): boolean {
  return toDayKey(iso) === toDayKey(now)
}

/** 월요일 00:00 을 이번 주의 시작으로 본다. */
export function startOfWeek(now: Date = new Date()): Date {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  const weekday = (d.getDay() + 6) % 7 // 월=0 … 일=6
  d.setDate(d.getDate() - weekday)
  return d
}

export function isThisWeek(iso: string, now: Date = new Date()): boolean {
  const t = new Date(iso).getTime()
  return t >= startOfWeek(now).getTime()
}

export type Daypart = 'morning' | 'afternoon' | 'evening'

export function daypart(now: Date = new Date()): Daypart {
  const h = now.getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

export const GREETING: Record<Daypart, string> = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
}
