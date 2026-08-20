/**
 * WEEKLY RESET — 일요일 저녁에 잠깐 앉아서 쓰는 자리.
 *
 * 평가가 아니다. 지난주 점수를 매기지 않고, 목표 달성률도 없다.
 * 자동 요약은 그냥 "이번 주엔 이런 숫자가 남았어요" 이고,
 * 질문은 세 개뿐이며 전부 선택이다.
 *
 * XP 는 한 주에 한 번만 받는다 — 여러 번 만들어서 XP 를 긁을 수 없다.
 */
import type { Checkin, NightCheckout, WeeklyReset } from '@/types'
import { addDays, todayKey } from '../date'
import { computeLifeBalance, type LifeBalanceInput } from './lifeBalance'
import { recoveryCurve } from './recoveryCurve'
import { DOMAIN_META, type LifeDomain } from '../domains'
import type { DayQuests } from '../quests/master'

/** 주간 돌아보기 하나에 붙는 XP — 한 주에 한 번뿐 */
export const WEEKLY_RESET_XP = 10

/** 다음 주에 조금 더 챙기고 싶은 영역은 최대 2개 */
export const MAX_FOCUS_DOMAINS = 2

/** 그 날짜가 속한 주의 월요일 */
export function weekStartOf(date: string = todayKey()): string {
  const d = new Date(`${date}T00:00:00`)
  const day = d.getDay() // 0 = 일요일
  const back = day === 0 ? 6 : day - 1
  return addDays(date, -back)
}

export const weekEndOf = (weekStart: string) => addDays(weekStart, 6)

/** 그 해 몇 번째 주인지 — WEEK 34 처럼 쓴다 */
export function weekNumber(weekStart: string): number {
  const d = new Date(`${weekStart}T00:00:00`)
  const jan1 = new Date(d.getFullYear(), 0, 1)
  const days = Math.floor((d.getTime() - jan1.getTime()) / 86_400_000)
  return Math.floor((days + jan1.getDay()) / 7) + 1
}

export interface WeekSummary {
  weekStart: string
  weekEnd: string
  weekNo: number
  /** 유효 기록이 있는 날 수 */
  checkinDays: number
  totalDays: number
  avgEnergy: number | null
  avgSleepHours: number | null
  /** 지난주 대비 방향 */
  bodyTrend: '↗' | '→' | '↘' | '·'
  mindTrend: '↗' | '→' | '↘' | '·'
  questCount: number
  nightCount: number
  loudest: LifeDomain | null
  quietest: LifeDomain | null
  /** 그대로 화면에 쓰는 한 줄 */
  headline: string
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

const arrowOf = (delta: number | null): '↗' | '→' | '↘' | '·' => {
  if (delta == null) return '·'
  if (delta >= 4) return '↗'
  if (delta <= -4) return '↘'
  return '→'
}

export interface WeekSummaryInput extends Omit<LifeBalanceInput, 'days' | 'today'> {
  weekStart?: string
}

/** 그 주의 자동 요약 — 사람이 답하기 전에 보여 주는 숫자들 */
export function weekSummary(input: WeekSummaryInput): WeekSummary {
  const weekStart = input.weekStart ?? weekStartOf()
  const weekEnd = weekEndOf(weekStart)

  const inWeek = input.checkins.filter((c) => c.date >= weekStart && c.date <= weekEnd)
  const energies = inWeek.map((c) => c.energyScore).filter((v): v is number => v != null)
  const sleeps = inWeek.map((c) => c.sleepHours).filter((v): v is number => v != null)

  // 흐름은 그 주의 마지막 날 기준으로 본다
  const body = recoveryCurve({ checkins: input.checkins, metric: 'body', days: 7, today: weekEnd })
  const mind = recoveryCurve({ checkins: input.checkins, metric: 'mind', days: 7, today: weekEnd })

  const questCount = Object.entries(input.questLog)
    .filter(([date]) => date >= weekStart && date <= weekEnd)
    .reduce((sum, [, day]) => sum + Object.values(day.completions).reduce((s, n) => s + n, 0), 0)

  const balance = computeLifeBalance({ ...input, days: 7, today: weekEnd })

  const avgEnergy = mean(energies)
  const avgSleep = mean(sleeps)

  return {
    weekStart,
    weekEnd,
    weekNo: weekNumber(weekStart),
    checkinDays: inWeek.length,
    totalDays: 7,
    avgEnergy: avgEnergy == null ? null : Math.round(avgEnergy),
    avgSleepHours: avgSleep == null ? null : Math.round(avgSleep * 10) / 10,
    bodyTrend: arrowOf(body.delta),
    mindTrend: arrowOf(mind.delta),
    questCount,
    nightCount: input.nights.filter((n) => n.date >= weekStart && n.date <= weekEnd).length,
    loudest: balance.learning ? null : balance.loudest,
    quietest: balance.learning ? null : balance.quietest,
    headline: balance.headline,
  }
}

/** 저장된 돌아보기를 Archive 한 줄로 */
export function resetLine(reset: WeeklyReset): string {
  const parts: string[] = []
  if (reset.goodText?.trim()) parts.push(reset.goodText.trim())
  else if (reset.hardText?.trim()) parts.push(reset.hardText.trim())
  const focus = (reset.focusDomains ?? [])
    .map((d) => DOMAIN_META[d as LifeDomain]?.label)
    .filter(Boolean)
  if (focus.length) parts.push(`다음 주: ${focus.join(' + ')}`)
  return parts.join(' · ') || '이번 주를 한 번 돌아봤어요.'
}

/** 최근에 고른 focus 영역 — 다음 주 퀘스트 추천에 살짝 반영한다 */
export function activeFocusDomains(
  resets: WeeklyReset[],
  today: string = todayKey(),
): LifeDomain[] {
  const thisWeek = weekStartOf(today)
  const lastWeek = addDays(thisWeek, -7)
  // 지난주에 고른 것이 이번 주에 반영된다
  const source = resets.find((r) => r.weekStart === lastWeek) ?? resets.find((r) => r.weekStart === thisWeek)
  return (source?.focusDomains ?? []).filter((d): d is LifeDomain => d in DOMAIN_META)
}

/** date → 그 주에 고른 영역 (Life Balance 가 쓴다) */
export function focusByDate(resets: WeeklyReset[]): Record<string, LifeDomain[]> {
  const out: Record<string, LifeDomain[]> = {}
  for (const r of resets) {
    const domains = (r.focusDomains ?? []).filter((d): d is LifeDomain => d in DOMAIN_META)
    if (domains.length) out[r.weekEnd] = domains
  }
  return out
}

export type { Checkin, NightCheckout, DayQuests }
