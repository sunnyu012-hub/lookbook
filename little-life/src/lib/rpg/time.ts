import type { TimeBand } from '@/types'

/**
 * 시간대.
 *
 * 도시의 공기만 아주 미묘하게 바꾼다. 다크 모드처럼 어두워지지는 않는다.
 */
export function timeBand(now: Date = new Date()): TimeBand {
  const h = now.getHours()
  if (h >= 5 && h < 12) return 'MORNING'
  if (h >= 12 && h < 18) return 'DAY'
  if (h >= 18 && h < 21) return 'EVENING'
  return 'NIGHT'
}

export const TIME_LABEL: Record<TimeBand, string> = {
  MORNING: '아침',
  DAY: '낮',
  EVENING: '저녁',
  NIGHT: '밤',
}

export const TIME_ICON: Record<TimeBand, string> = {
  MORNING: '🌤️',
  DAY: '☀️',
  EVENING: '🌇',
  NIGHT: '🌙',
}

/**
 * 화면 바탕에 아주 옅게 까는 색.
 * 기존 크림색 위에 한 겹만 얹는 정도로 둔다.
 */
export const TIME_TINT: Record<TimeBand, string> = {
  MORNING: 'from-butter-soft/50',
  DAY: 'from-sage-soft/40',
  EVENING: 'from-pink-soft/50',
  NIGHT: 'from-lavender-soft/60',
}

/** Night Town 은 21시부터 문을 연다. */
export function isNightOpen(now: Date = new Date()): boolean {
  return timeBand(now) === 'NIGHT'
}
