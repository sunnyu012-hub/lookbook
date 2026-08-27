/**
 * 6A — Phase 5 분석을 Measurement 로 바꾸는 얇은 층.
 *
 * Phase 5 가 이미 다 계산한다. 여기서 같은 계산을 다시 하지 않는다 (계획서 96, 97).
 * 평가자들이 공통으로 쓰는 모양만 만들어 준다.
 *
 * 여기서 새로 계산하는 건 하나뿐이다 — consistency.
 * "평균이 높다" 와 "거의 매번 높다" 는 다른 이야기이고, 후자만 발견이라고 부를 수 있다.
 */
import type { QuickLog } from '../types'
import {
  compareToBaseline,
  daysBetween,
  describeWeighted,
  round,
  valueOfLog,
  type AnalysisWindow,
  type MetricKey,
  type Sample,
  type Weighting,
} from '../analytics'
import { adjustedFor } from '../analytics/context'
import type { EvaluationInput, Measurement } from './types'

/**
 * 얼마나 되풀이됐는가 (계획서 13).
 *
 * 날짜별로 접은 뒤, 그날의 값이 baseline 을 기대한 방향으로 넘은 날의 비율을 센다.
 * 평균이 +0.6 이어도 열흘 중 사흘만 높았던 것이면 그건 아직 패턴이 아니다.
 */
export function consistencyOf(
  samples: readonly Sample[],
  baseline: number,
  direction: 1 | -1,
): number {
  if (!samples.length) return 0

  const byDate = new Map<string, number[]>()
  for (const s of samples) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s.value])

  let agree = 0
  for (const [, values] of byDate) {
    const dayMean = values.reduce((sum, v) => sum + v, 0) / values.length
    if ((dayMean - baseline) * direction > 0) agree += 1
  }

  return round(agree / byDate.size, 3)
}

/** 처음과 마지막 기록이 며칠에 걸쳐 있는가 */
export function durationOf(samples: readonly Sample[]): number {
  if (samples.length < 2) return 0
  const dates = samples.map((s) => s.date).sort()
  return daysBetween(dates[0], dates[dates.length - 1]) + 1
}

export interface MeasureOptions {
  metric: MetricKey
  /** 이 조건에 맞는 기록 */
  where: (log: QuickLog) => boolean
  /** 기대하는 방향 — 낮아야 성립하는 DNA 는 -1 */
  direction?: 1 | -1
  weighting?: Weighting
  /** 문맥을 맞춘 비교까지 낼 것인가 */
  adjust?: boolean
  relatedTags?: string[]
  childLabel?: string
  /** baseline 을 "나머지 전부" 가 아니라 특정 조건으로 잡고 싶을 때 */
  against?: (log: QuickLog) => boolean
}

/**
 * 조건에 맞는 기록 vs 나머지.
 *
 * Phase 5 의 compareToBaseline 은 "전체 평균" 과 견준다.
 * DNA 에서는 "나머지와" 견주는 게 맞다 — 저녁이 전체 평균보다 높은 것보다
 * 저녁이 저녁 아닌 때보다 높은 게 더 분명한 이야기다.
 */
export function measure(input: EvaluationInput, options: MeasureOptions): Measurement | null {
  const direction = options.direction ?? 1
  const how = options.weighting ?? 'day'
  const { logs, window } = input

  const inWindow = logs.filter((l) => l.date >= window.from && l.date <= window.to)

  const pick = (list: readonly QuickLog[]): Sample[] =>
    list
      .map((log) => ({ log, value: valueOfLog(log, options.metric) }))
      .filter((x): x is { log: QuickLog; value: number } => x.value !== null)
      .map(({ log, value }) => ({ value, date: log.date, sourceId: log.id }))

  const target = pick(inWindow.filter(options.where))
  const rest = pick(
    inWindow.filter((log) => (options.against ? options.against(log) : !options.where(log))),
  )

  if (!target.length || !rest.length) return null

  const observed = describeWeighted(target, how)
  const baseline = describeWeighted(rest, how)

  const m: Measurement = {
    metric: options.metric,
    observed: round(observed.mean),
    baseline: round(baseline.mean),
    effect: round(observed.mean - baseline.mean),
    sampleCount: target.length,
    baselineSampleCount: rest.length,
    distinctDays: observed.distinctDays,
    durationDays: durationOf(target),
    consistency: consistencyOf(target, baseline.mean, direction),
    mean: round(observed.mean),
    median: round(observed.median),
    relatedTags: options.relatedTags,
    childLabel: options.childLabel,
    weighting: how,
    window,
  }

  if (options.adjust) {
    const adjusted = adjustedFor(
      { logs: inWindow, window, metric: options.metric, weighting: how },
      options.where,
      { ...m, label: options.childLabel ?? '', confidence: 'stable', evidence: null as never },
    )
    if (adjusted) {
      m.adjustedEffect = adjusted.difference
      m.adjustedBaseline = adjusted.baseline
      m.adjustedOn = adjusted.matchedOn
      m.adjustedBaselineCount = adjusted.baselineCount
    }
  }

  return m
}

/**
 * 두 값 목록을 직접 견줄 때 (회복 시간, 앞뒤 변화처럼 Quick Log 값이 아닌 것).
 * 이때 consistency 는 "개별 사건이 같은 방향이었던 비율" 이다.
 */
export function measureSeries(options: {
  metric: MetricKey
  window: AnalysisWindow
  /** 각 사건의 값 */
  values: Array<{ value: number; date: string }>
  baseline: number
  direction?: 1 | -1
  relatedTags?: string[]
  childLabel?: string
  baselineSampleCount?: number
}): Measurement | null {
  const { values, baseline } = options
  if (!values.length) return null

  const direction = options.direction ?? 1
  const stats = describeWeighted(values, 'log')

  let agree = 0
  for (const v of values) if ((v.value - baseline) * direction > 0) agree += 1

  return {
    metric: options.metric,
    observed: round(stats.mean),
    baseline: round(baseline),
    effect: round(stats.mean - baseline),
    sampleCount: values.length,
    baselineSampleCount: options.baselineSampleCount ?? values.length,
    distinctDays: stats.distinctDays,
    durationDays: durationOf(values),
    consistency: round(agree / values.length, 3),
    mean: round(stats.mean),
    median: round(stats.median),
    relatedTags: options.relatedTags,
    childLabel: options.childLabel,
    weighting: 'log',
    window: options.window,
  }
}

/** compareToBaseline 결과를 그대로 쓰고 싶을 때 (Phase 5 재사용) */
export { compareToBaseline }
