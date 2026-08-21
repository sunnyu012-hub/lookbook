/**
 * XP.
 *
 * 원칙 — XP 는 "기록하고 스스로를 돌본 행동" 에만 준다.
 *   · 체중이 줄었다고, 적게 먹었다고, 많이 움직였다고 XP 를 주지 않는다.
 *   · 숫자가 좋아진 것에 보상하지 않는다. 적어 둔 것에 보상한다.
 * 그래서 아래 표에는 "결과" 가 아니라 "행동" 만 들어 있다.
 */
import type { Checkin, LifeEvent, MounjaroLog, WeightLog } from '@/types'

export const XP_RULES = {
  /** 아침에 오늘 상태를 적음 */
  morningCheckin: 5,
  /** 밤에 하루를 닫음 */
  nightCheckout: 5,
  /** 자세히 적음 (아침 기록에 얹어 준다) */
  detailedBonus: 3,
  /** 체중을 잼 */
  weightLog: 2,
  /** 투약 기록을 적음 */
  mounjaroLog: 2,
  /** 오늘 있었던 일을 적음 */
  lifeEvent: 2,
  /** 이벤트 태그를 적은 날 */
  eventTags: 2,
  /** 새로 발견한 패턴 */
  discovery: 10,
  /** 새 배지 */
  badge: 5,
  /** 주간 돌아보기 — 한 주에 한 번만 (여러 번 만들어 긁을 수 없다) */
  weeklyReset: 10,
  /** 오늘의 작은 목표를 해낸 날 — 하루에 한 번만 */
  dailyFocus: 6,
} as const

export const XP_RULE_LABEL: Record<keyof typeof XP_RULES, string> = {
  morningCheckin: '아침 기록',
  nightCheckout: '밤 마무리',
  detailedBonus: '자세히 적기',
  weightLog: '체중 기록',
  mounjaroLog: '투약 기록',
  lifeEvent: '있었던 일 기록',
  eventTags: '오늘 태그',
  discovery: '패턴 발견',
  badge: '새 배지',
  weeklyReset: '주간 돌아보기',
  dailyFocus: '오늘의 목표',
}

export interface XpSources {
  checkins: Checkin[]
  weights?: WeightLog[]
  mounjaro?: MounjaroLog[]
  lifeEvents?: LifeEvent[]
  /** 밤에 하루를 닫은 날짜들 */
  nights?: { date: string }[]
  /** date → 이벤트 태그 */
  eventLog?: Record<string, string[]>
  /** 퀘스트로 번 XP (useQuests 가 계산해서 넘겨 준다) */
  questXp?: number
  discoveries?: number
  badges?: number
  /** 저장된 주간 돌아보기 수 — 한 주 한 건이라 그대로 곱하면 된다 */
  weeklyResets?: number
  /** 오늘의 목표를 해낸 날 수 — 하루 한 번이라 그대로 곱하면 된다 */
  focusDays?: number
}

export interface XpBreakdown {
  checkin: number
  night: number
  weight: number
  mounjaro: number
  lifeEvent: number
  events: number
  quest: number
  discovery: number
  badge: number
  weekly: number
  focus: number
  total: number
}

export function xpBreakdown({
  checkins,
  weights = [],
  mounjaro = [],
  lifeEvents = [],
  nights = [],
  eventLog = {},
  questXp = 0,
  discoveries = 0,
  badges = 0,
  weeklyResets = 0,
  focusDays = 0,
}: XpSources): XpBreakdown {
  const checkin = checkins.reduce(
    (sum, c) =>
      sum + XP_RULES.morningCheckin + (c.entryMode === 'detailed' ? XP_RULES.detailedBonus : 0),
    0,
  )
  const night = nights.length * XP_RULES.nightCheckout
  const weight = weights.length * XP_RULES.weightLog
  const mj = mounjaro.length * XP_RULES.mounjaroLog
  const life = lifeEvents.length * XP_RULES.lifeEvent
  const events =
    Object.values(eventLog).filter((tags) => tags.length > 0).length * XP_RULES.eventTags
  const discovery = discoveries * XP_RULES.discovery
  const badge = badges * XP_RULES.badge
  const weekly = weeklyResets * XP_RULES.weeklyReset
  const focus = focusDays * XP_RULES.dailyFocus

  return {
    checkin,
    night,
    weight,
    mounjaro: mj,
    lifeEvent: life,
    events,
    quest: questXp,
    discovery,
    badge,
    weekly,
    focus,
    total:
      checkin + night + weight + mj + life + events + questXp + discovery + badge + weekly + focus,
  }
}

/** 오늘까지 며칠 연속으로 무언가를 적었는지 */
export function loggingStreak(dates: Iterable<string>, today: string): number {
  const set = new Set(dates)
  let streak = 0
  const cursor = new Date(today)
  // 오늘 아직 안 적었으면 어제부터 센다
  if (!set.has(today)) cursor.setDate(cursor.getDate() - 1)

  for (;;) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(
      cursor.getDate(),
    ).padStart(2, '0')}`
    if (!set.has(key)) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
    if (streak > 2000) break
  }
  return streak
}
