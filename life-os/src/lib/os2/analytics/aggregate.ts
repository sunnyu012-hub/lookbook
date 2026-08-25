/**
 * 5B — 계산의 한가운데.
 *
 * 여기 있는 함수는 전부 순수하다. 저장소도 화면도 모른다.
 * 같은 입력을 넣으면 Supabase 든 localStorage 든 같은 값이 나온다 (계획서 85).
 *
 * 태그를 셀 때 지키는 것:
 *   · 사용자가 "이 태그 아니에요" 한 것은 빼고 센다 (계획서 53)
 *   · 미래·가정 이야기는 일어난 일로 세지 않는다 (계획서 45)
 *   · 잎만 저장돼 있어도 조상까지 펼쳐서 센다. 대신 같은 기록을 두 번 세지 않는다
 */
import type { Checkin } from '@/types'
import type { AppliedLifeTag, QuickLog } from '../types'
import { countsAsHappened } from '../tagging'
import { expandForAnalysis, getTag } from '../taxonomy'
import { ANALYSIS_VERSION, TAXONOMY_VERSION } from '../versions'
import { TAGGING_RULE_VERSION } from '../tagging/engine'
import {
  METRICS,
  type MetricKey,
  samplesFromCheckins,
  samplesFromLogs,
} from './metrics'
import {
  adjustForOutliers,
  confidenceOf,
  dataQuality,
  type Confidence,
} from './confidence'
import type { AnalysisFilter, AnalysisResult, Evidence } from './result'
import {
  describeWeighted,
  round,
  type Sample,
  type Stats,
  type Weighting,
} from './stats'
import { withinWindow, type AnalysisWindow } from './windows'

/** 문맥 분석의 기본 무게 — 하루가 분석을 지배하지 않게 (계획서 12) */
export const DEFAULT_WEIGHTING: Weighting = 'day'

// ─────────────────────────────────────────────
// 태그 꺼내기
// ─────────────────────────────────────────────

/**
 * 이 기록이 실제로 달고 있는 LIFE TAG.
 * 아니라고 한 것과 미래 이야기는 뺀다.
 */
export function activeTagIds(log: QuickLog): string[] {
  const kept = (log.lifeTags ?? []).filter(
    (tag: AppliedLifeTag) =>
      !tag.userRejected
      && countsAsHappened(tag.temporalContext)
      // 사전에서 사라진 태그는 분석에서 뺀다. 분석이 깨지지는 않는다 (계획서 54)
      && Boolean(getTag(tag.tagId)),
  )
  return kept.map((tag) => tag.tagId)
}

/** 조상까지 펼친 것. 같은 기록 안에서는 중복 없이 한 번씩만 */
export const expandedTagIds = (log: QuickLog): string[] =>
  expandForAnalysis(activeTagIds(log))

export const hasTag = (log: QuickLog, tagId: string): boolean =>
  expandedTagIds(log).includes(tagId)

export const hasMyTag = (log: QuickLog, myTagId: string): boolean =>
  (log.myTagIds ?? []).includes(myTagId)

// ─────────────────────────────────────────────
// 기본 집계
// ─────────────────────────────────────────────

export interface AggregateInput {
  logs?: readonly QuickLog[]
  checkins?: readonly Checkin[]
  metric: MetricKey
  window: AnalysisWindow
  weighting?: Weighting
  /** 이 조건에 맞는 기록만 */
  where?: (log: QuickLog) => boolean
  whereCheckin?: (checkin: Checkin) => boolean
  label?: string
  filter?: AnalysisFilter
}

/** 창 안에서 조건에 맞는 표본만 뽑는다 */
export function collect(input: AggregateInput): Sample[] {
  const metric = METRICS[input.metric]

  if (metric.source === 'checkin') {
    const scoped = withinWindow(input.checkins ?? [], input.window)
      .filter((c) => input.whereCheckin?.(c) ?? true)
    return samplesFromCheckins(scoped, input.metric)
  }

  const scoped = withinWindow(input.logs ?? [], input.window)
    .filter((log) => input.where?.(log) ?? true)
  return samplesFromLogs(scoped, input.metric)
}

const evidenceOf = (
  input: AggregateInput,
  observed: Stats,
  baselineStats?: Stats,
): Evidence => ({
  window: input.window,
  filter: input.filter,
  weighting: input.weighting ?? DEFAULT_WEIGHTING,
  observed,
  baselineStats,
  quality: dataQuality(observed, input.window.days),
  analysisVersion: ANALYSIS_VERSION,
  taxonomyVersion: TAXONOMY_VERSION,
  ruleVersion: TAGGING_RULE_VERSION,
})

/**
 * 평균 하나. 비교 대상이 없으면 baseline 은 비운다.
 * 표본이 모자라도 결과는 돌려준다 — 화면이 "모자람" 을 알아야 그렇게 말할 수 있다.
 */
export function aggregate(input: AggregateInput): AnalysisResult {
  const how = input.weighting ?? DEFAULT_WEIGHTING
  const samples = collect(input)
  const stats = describeWeighted(samples, how)

  return {
    metric: input.metric,
    label: input.label ?? METRICS[input.metric].label,
    observed: round(stats.mean),
    sampleCount: samples.length,
    distinctDays: stats.distinctDays,
    confidence: confidenceOf(stats, METRICS[input.metric]),
    evidence: evidenceOf(input, stats),
  }
}

/**
 * 개인 평균 — 같은 창, 같은 metric, 조건 없이 전부.
 * 남과 비교하지 않는다. 비교 대상은 언제나 나 자신이다 (계획서 8).
 */
export function baselineOf(input: Omit<AggregateInput, 'where' | 'whereCheckin' | 'label'>): {
  value: number
  stats: Stats
} {
  const how = input.weighting ?? DEFAULT_WEIGHTING
  const samples = collect(input)
  const stats = describeWeighted(samples, how)
  return { value: round(stats.mean), stats }
}

/**
 * 조건에 맞는 기록 vs 개인 평균.
 *
 * 여기서 나오는 difference 가 화면에 "개인 평균 +0.6" 으로 보이는 값이다.
 * 평균과 중앙값이 서로 다른 쪽을 가리키면 믿음을 한 칸 내린다.
 */
export function compareToBaseline(input: AggregateInput): AnalysisResult {
  const how = input.weighting ?? DEFAULT_WEIGHTING
  const samples = collect(input)
  const stats = describeWeighted(samples, how)

  const base = baselineOf({
    logs: input.logs,
    checkins: input.checkins,
    metric: input.metric,
    window: input.window,
    weighting: how,
  })

  let confidence: Confidence = confidenceOf(stats, METRICS[input.metric])
  confidence = adjustForOutliers(confidence, stats, base.value)

  return {
    metric: input.metric,
    label: input.label ?? METRICS[input.metric].label,
    observed: round(stats.mean),
    baseline: base.value,
    difference: round(stats.mean - base.value),
    sampleCount: samples.length,
    distinctDays: stats.distinctDays,
    confidence,
    evidence: evidenceOf(input, stats, base.stats),
  }
}

// ─────────────────────────────────────────────
// 두 집단 견주기
// ─────────────────────────────────────────────

export interface GroupResult {
  metric: MetricKey
  a: AnalysisResult
  b: AnalysisResult
  difference: number
  /** 양쪽 다 표본이 충분한가 */
  enough: boolean
}

export function compareGroups(
  input: Omit<AggregateInput, 'where' | 'label'>,
  groupA: { label: string; where: (log: QuickLog) => boolean; whereCheckin?: (c: Checkin) => boolean },
  groupB: { label: string; where: (log: QuickLog) => boolean; whereCheckin?: (c: Checkin) => boolean },
): GroupResult {
  const a = aggregate({ ...input, ...groupA })
  const b = aggregate({ ...input, ...groupB })

  return {
    metric: input.metric,
    a,
    b,
    difference: round(a.observed - b.observed),
    enough: a.confidence !== 'insufficient' && b.confidence !== 'insufficient',
  }
}

// ─────────────────────────────────────────────
// 기간 비교 (계획서 71)
// ─────────────────────────────────────────────

export interface WindowChange {
  metric: MetricKey
  current: AnalysisResult
  previous: AnalysisResult
  /** 절대 차이. 1~5 눈금에서 퍼센트는 뜻이 흐려진다 (계획서 72) */
  difference: number
  enough: boolean
}

export function compareWindows(
  input: Omit<AggregateInput, 'window' | 'label'>,
  current: AnalysisWindow,
  previous: AnalysisWindow,
): WindowChange {
  const a = aggregate({ ...input, window: current, label: current.label })
  const b = aggregate({ ...input, window: previous, label: previous.label })

  return {
    metric: input.metric,
    current: a,
    previous: b,
    difference: round(a.observed - b.observed),
    enough: a.confidence !== 'insufficient' && b.confidence !== 'insufficient',
  }
}
