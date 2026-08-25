/**
 * 5C — 나의 리듬.
 *
 * 답하려는 질문은 다섯 개다.
 *   나는 어느 시간대에 기분이 좋은가
 *   어느 시간대에 기운이 있는가
 *   어느 시간대에 집중이 되는가
 *   피로는 언제 올라오는가
 *   평일과 주말은 다른가
 *
 * 시간대는 quick_logs.day_part 를 그대로 쓴다. 다시 계산하지 않는다.
 * 기록이 모자란 시간대는 억지로 평균을 내지 않고 비워 둔다 (계획서 21).
 */
import type { QuickLog, DayOfWeek, DayPart } from '../types'
import { compareToBaseline, aggregate, baselineOf } from './aggregate'
import { METRICS, QUICK_LOG_METRICS, type MetricKey } from './metrics'
import type { AnalysisResult } from './result'
import { round } from './stats'
import {
  DAY_LABEL,
  DAY_PARTS,
  DAY_PART_LABEL,
  DAY_TYPE_LABEL,
  dayTypeOf,
  type AnalysisWindow,
  type DayType,
} from './windows'

export interface RhythmSlot {
  dayPart: DayPart
  label: string
  result: AnalysisResult
}

export interface MetricRhythm {
  metric: MetricKey
  label: string
  baseline: number
  slots: RhythmSlot[]
  /** 볼 만한 시간대 중 가장 높은 곳 */
  highest: RhythmSlot | null
  /** 가장 낮은 곳 */
  lowest: RhythmSlot | null
  /** 하나라도 볼 만한 게 있는가 */
  enough: boolean
}

export interface Rhythm {
  window: AnalysisWindow
  metrics: MetricRhythm[]
  dayType: DayTypeComparison[]
  weekday: WeekdayRhythm[]
  /** 창 안에 기록이 있는 날 수 */
  activeDays: number
}

export interface DayTypeComparison {
  metric: MetricKey
  label: string
  weekday: AnalysisResult
  weekend: AnalysisResult
  difference: number
  enough: boolean
}

export interface WeekdayRhythm {
  metric: MetricKey
  days: Array<{ day: DayOfWeek; label: string; result: AnalysisResult }>
  enough: boolean
}

export interface RhythmInput {
  logs: readonly QuickLog[]
  window: AnalysisWindow
  metrics?: readonly MetricKey[]
}

export function buildRhythm({ logs, window, metrics }: RhythmInput): Rhythm {
  const keys = metrics ?? QUICK_LOG_METRICS

  return {
    window,
    activeDays: new Set(logs.filter((l) => l.date >= window.from && l.date <= window.to).map((l) => l.date)).size,
    metrics: keys.map((key) => rhythmOf(logs, window, key)),
    dayType: keys.map((key) => dayTypeComparison(logs, window, key)),
    weekday: keys.map((key) => weekdayRhythm(logs, window, key)),
  }
}

/** 한 metric 의 시간대별 모습 */
export function rhythmOf(
  logs: readonly QuickLog[],
  window: AnalysisWindow,
  metric: MetricKey,
): MetricRhythm {
  const base = baselineOf({ logs, metric, window })

  const slots: RhythmSlot[] = DAY_PARTS.map((dayPart) => ({
    dayPart,
    label: DAY_PART_LABEL[dayPart],
    result: compareToBaseline({
      logs,
      metric,
      window,
      where: (log) => log.dayPart === dayPart,
      label: DAY_PART_LABEL[dayPart],
      filter: { dayPart },
    }),
  }))

  const usable = slots.filter((s) => s.result.confidence !== 'insufficient')
  const sorted = [...usable].sort((a, b) => b.result.observed - a.result.observed)

  return {
    metric,
    label: METRICS[metric].label,
    baseline: base.value,
    slots,
    highest: sorted[0] ?? null,
    lowest: sorted.length > 1 ? sorted[sorted.length - 1] : null,
    enough: usable.length >= 2,
  }
}

/** 평일과 주말 (계획서 22) */
export function dayTypeComparison(
  logs: readonly QuickLog[],
  window: AnalysisWindow,
  metric: MetricKey,
): DayTypeComparison {
  const of = (type: DayType) =>
    aggregate({
      logs,
      metric,
      window,
      where: (log) => dayTypeOf(log.dayOfWeek) === type,
      label: DAY_TYPE_LABEL[type],
      filter: { dayType: type },
    })

  const weekday = of('weekday')
  const weekend = of('weekend')

  return {
    metric,
    label: METRICS[metric].label,
    weekday,
    weekend,
    difference: round(weekend.observed - weekday.observed),
    enough: weekday.confidence !== 'insufficient' && weekend.confidence !== 'insufficient',
  }
}

/**
 * 요일별 (계획서 23).
 * 기록이 적으면 화면에 기본으로 내보내지 않는다 — enough 로 알려 준다.
 */
export function weekdayRhythm(
  logs: readonly QuickLog[],
  window: AnalysisWindow,
  metric: MetricKey,
): WeekdayRhythm {
  const days = ([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]).map((day) => ({
    day,
    label: DAY_LABEL[day],
    result: compareToBaseline({
      logs,
      metric,
      window,
      where: (log) => log.dayOfWeek === day,
      label: DAY_LABEL[day],
      filter: { dayOfWeek: day },
    }),
  }))

  return {
    metric,
    days,
    // 요일은 일곱 칸으로 쪼개져서 웬만큼 쌓이기 전엔 못 본다. 그게 맞다
    enough: days.filter((d) => d.result.confidence !== 'insufficient').length >= 5,
  }
}
