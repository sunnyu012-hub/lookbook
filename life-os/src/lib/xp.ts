/**
 * XP.
 *
 * 원칙 — XP 는 "기록하고 스스로를 돌본 행동" 에만 준다.
 *   · 체중이 줄었다고, 적게 먹었다고, 많이 움직였다고 XP 를 주지 않는다.
 *   · 숫자가 좋아진 것에 보상하지 않는다. 적어 둔 것에 보상한다.
 * 그래서 아래 표에는 "결과" 가 아니라 "행동" 만 들어 있다.
 */
import type { Checkin, LifeEvent, MounjaroLog, WeightLog } from '@/types'
import { xpOf } from './quests'

export const XP_RULES = {
  /** 오늘 상태를 간단히 적음 */
  checkinQuick: 10,
  /** 자세히 적음 */
  checkinDetailed: 25,
  /** 체중을 잼 */
  weightLog: 5,
  /** 투약 기록을 적음 */
  mounjaroLog: 10,
  /** 오늘 있었던 일을 적음 */
  lifeEvent: 5,
} as const

export const XP_RULE_LABEL: Record<keyof typeof XP_RULES, string> = {
  checkinQuick: '오늘 상태 간단 기록',
  checkinDetailed: '오늘 상태 자세히 기록',
  weightLog: '체중 기록',
  mounjaroLog: '투약 기록',
  lifeEvent: '오늘 있었던 일 기록',
}

export interface XpSources {
  checkins: Checkin[]
  weights?: WeightLog[]
  mounjaro?: MounjaroLog[]
  lifeEvents?: LifeEvent[]
  /** date → 완료한 퀘스트 id 목록 */
  questLog?: Record<string, string[]>
}

export interface XpBreakdown {
  checkin: number
  weight: number
  mounjaro: number
  lifeEvent: number
  quest: number
  total: number
}

export function xpBreakdown({
  checkins,
  weights = [],
  mounjaro = [],
  lifeEvents = [],
  questLog = {},
}: XpSources): XpBreakdown {
  const checkin = checkins.reduce(
    (sum, c) => sum + (c.entryMode === 'quick' ? XP_RULES.checkinQuick : XP_RULES.checkinDetailed),
    0,
  )
  const weight = weights.length * XP_RULES.weightLog
  const mj = mounjaro.length * XP_RULES.mounjaroLog
  const life = lifeEvents.length * XP_RULES.lifeEvent
  const quest = Object.values(questLog).reduce((sum, ids) => sum + xpOf(ids), 0)

  return {
    checkin,
    weight,
    mounjaro: mj,
    lifeEvent: life,
    quest,
    total: checkin + weight + mj + life + quest,
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
