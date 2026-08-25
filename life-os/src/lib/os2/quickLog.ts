/**
 * Quick Log 의 순수 계산들.
 *
 * 저장 시각 하나에서 날짜·요일·시간대를 뽑아 같이 저장한다.
 * 매번 다시 파싱하지 않으려는 것도 있지만, 더 중요한 이유는
 * 나중에 사용자가 시각을 고치면 파생값도 같이 고쳐져야 하기 때문이다 — 한 곳에서만 계산한다.
 *
 * UI 컴포넌트 안에서 이런 계산을 하지 않는다.
 */
import type { DayOfWeek, DayPart, Mood, QuickLog, QuickLogInput } from './types'
import { SCHEMA_VERSION } from './versions'

/** 시간대 경계 — 바꾸려면 여기만 고친다 */
export const DAY_PART_HOURS: { part: DayPart; from: number; to: number }[] = [
  { part: 'dawn', from: 0, to: 5 },
  { part: 'morning', from: 5, to: 12 },
  { part: 'afternoon', from: 12, to: 17 },
  { part: 'evening', from: 17, to: 22 },
  { part: 'night', from: 22, to: 24 },
]

export const DAY_PART_LABEL: Record<DayPart, string> = {
  dawn: '새벽',
  morning: '아침',
  afternoon: '낮',
  evening: '저녁',
  night: '밤',
}

export const MOOD_LABEL: Record<Mood, string> = {
  1: '많이 힘들어요',
  2: '조금 힘들어요',
  3: '그저 그래요',
  4: '괜찮아요',
  5: '아주 좋아요',
}

export function dayPartOf(date: Date): DayPart {
  const h = date.getHours()
  return DAY_PART_HOURS.find((r) => h >= r.from && h < r.to)?.part ?? 'night'
}

/** 로컬 기준 YYYY-MM-DD — UTC 로 바꾸면 자정 근처 기록이 하루씩 밀린다 */
export function dateKeyOf(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

export interface DerivedFields {
  date: string
  dayOfWeek: DayOfWeek
  dayPart: DayPart
}

/** 저장 시각 하나에서 파생값을 뽑는다 */
export function deriveFields(loggedAt: string): DerivedFields {
  const d = new Date(loggedAt)
  return {
    date: dateKeyOf(d),
    dayOfWeek: d.getDay() as DayOfWeek,
    dayPart: dayPartOf(d),
  }
}

export interface NewQuickLogContext {
  id: string
  userId: string
  now: string
}

/** 입력 하나를 저장 가능한 모양으로 */
export function toQuickLog(input: QuickLogInput, ctx: NewQuickLogContext): QuickLog {
  const loggedAt = input.loggedAt ?? ctx.now
  return {
    ...input,
    ...deriveFields(loggedAt),
    loggedAt,
    id: ctx.id,
    userId: ctx.userId,
    myTagIds: input.myTagIds ?? [],
    lifeTags: input.lifeTags ?? [],
    schemaVersion: SCHEMA_VERSION,
    createdAt: ctx.now,
    updatedAt: ctx.now,
  }
}

/** 기분만 있는 최소 입력 — Quick Log 는 이모지 하나로 저장된다 */
export const moodOnly = (mood: Mood): QuickLogInput => ({ mood })

/** 하루치로 묶는다 (Today Log Timeline 이 쓸 모양) */
export function groupByDate(logs: QuickLog[]): { date: string; logs: QuickLog[] }[] {
  const map = new Map<string, QuickLog[]>()
  for (const log of logs) {
    const list = map.get(log.date)
    if (list) list.push(log)
    else map.set(log.date, [log])
  }
  return [...map.entries()]
    .map(([date, list]) => ({
      date,
      logs: [...list].sort((a, b) => (a.loggedAt < b.loggedAt ? -1 : 1)),
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}
