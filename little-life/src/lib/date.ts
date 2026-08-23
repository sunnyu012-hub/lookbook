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

/** 그 주 월요일의 날짜 키. 주 단위로 고정되는 것들의 씨앗이다. */
export function weekKey(now: Date = new Date()): string {
  return toDayKey(startOfWeek(now))
}

/** 이번 주에 해당하는 날짜 키들. dailyLog 를 훑을 때 쓴다. */
export function weekDayKeys(now: Date = new Date()): string[] {
  const start = startOfWeek(now)
  const keys: string[] = []
  const cursor = new Date(start)
  while (cursor <= now) {
    keys.push(toDayKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return keys
}

export type Daypart = 'morning' | 'afternoon' | 'evening'

/** 05:00~11:59 아침, 12:00~17:59 오후, 18:00~04:59 저녁 */
export function daypart(now: Date = new Date()): Daypart {
  const h = now.getHours()
  if (h >= 5 && h < 12) return 'morning'
  if (h >= 12 && h < 18) return 'afternoon'
  return 'evening'
}

export const GREETING: Record<Daypart, string> = {
  morning: '좋은 아침이야',
  afternoon: '좋은 오후야',
  evening: '좋은 저녁이야',
}

const SUBCOPY = [
  '작은 한 걸음도 경험치가 돼.',
  '한 번에 하나씩이면 충분해.',
  '조금 나아간 것도 나아간 거야.',
  '오늘을 작은 모험으로 만들어보자.',
]

/**
 * 서브카피는 하루 단위로 고른다.
 * 매 렌더마다 무작위로 뽑으면 화면이 깜빡이는 것처럼 바뀐다.
 */
export function subcopyForDay(now: Date = new Date()): string {
  const seed = Math.floor(now.getTime() / 86_400_000)
  return SUBCOPY[seed % SUBCOPY.length]
}

/** 완료 시각 표시용 — "오후 8:42" */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  })
}
