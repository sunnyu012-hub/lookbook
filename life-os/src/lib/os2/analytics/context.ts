/**
 * 5D — 무엇과 함께 있을 때 달라지는가.
 *
 * 조심할 것이 둘 있다.
 *
 * 하나. 넓은 태그와 좁은 태그를 같은 줄에 세우면 같은 이야기가 두 번 보인다.
 * `activity:exercise` 와 `sport:climbing` 은 사실상 같은 기록을 가리킨다.
 * 그래서 화면 랭킹에는 잎을 먼저 올린다 (계획서 28, 29).
 *
 * 둘. `#성현` 로그가 전부 주말 저녁이면, 그 +0.8 은 성현이 아니라 주말 저녁의 몫일 수 있다.
 * 그래서 같은 요일종류·같은 시간대끼리 견준 값을 따로 계산해 둔다 (계획서 32, 33).
 */
import type { DayPart, MyTag, QuickLog } from '../types'
import { CATEGORY_BY_ID } from '../categories'
import { getTag, displayNameOf } from '../taxonomy'
import { compareToBaseline, expandedTagIds, hasMyTag, hasTag } from './aggregate'
import { MIN_CONTEXT, MIN_CONTEXT_DAYS } from './confidence'
import { METRICS, type MetricKey } from './metrics'
import { byEffect, type AnalysisFilter, type AnalysisResult } from './result'
import { describeWeighted, round, type Weighting } from './stats'
import { DAY_PART_LABEL, dayTypeOf, type AnalysisWindow } from './windows'

/** 분석 대상 카테고리 (계획서 25). emotion 은 뺀다 — 감정을 원인처럼 다루지 않는다 */
export const CONTEXT_CATEGORIES = [
  'activity',
  'sport',
  'work',
  'creative',
  'social',
  'relationship',
  'place',
  'environment',
  'recovery',
  'food',
  'stressor',
  'outcome',
  'novelty',
  'agency',
] as const

export type ContextCategory = (typeof CONTEXT_CATEGORIES)[number]

const isContextTag = (tagId: string): boolean => {
  const tag = getTag(tagId)
  return Boolean(tag) && (CONTEXT_CATEGORIES as readonly string[]).includes(tag!.categoryId)
}

export interface ContextResult extends AnalysisResult {
  tagId: string
  categoryId: string
  categoryLabel: string
  /** 잎인가 — 화면 랭킹에서 먼저 올린다 */
  isLeaf: boolean
  /** 문맥을 맞춰서 다시 견준 값 */
  adjusted?: AdjustedComparison
}

/**
 * 문맥 보정 (계획서 33).
 *
 * 완전한 통계 보정은 아니다. 같은 요일종류·같은 시간대 기록끼리만 견주는 것뿐이다.
 * 그래도 "주말 저녁에만 나오는 태그" 의 겉보기 차이를 상당히 걷어낸다.
 */
export interface AdjustedComparison {
  matchedOn: string
  baseline: number
  difference: number
  baselineCount: number
}

export interface ContextInput {
  logs: readonly QuickLog[]
  window: AnalysisWindow
  metric: MetricKey
  weighting?: Weighting
  /** 이만큼 안 되면 아예 만들지 않는다 */
  minSample?: number
  minDays?: number
}

// ─────────────────────────────────────────────
// LIFE TAG
// ─────────────────────────────────────────────

export function contextResults(input: ContextInput): ContextResult[] {
  const { logs, window, metric } = input
  const minSample = input.minSample ?? MIN_CONTEXT
  const minDays = input.minDays ?? MIN_CONTEXT_DAYS

  const scoped = logs.filter((l) => l.date >= window.from && l.date <= window.to)

  // 어떤 태그가 얼마나 나오는지 먼저 센다 — 300개를 전부 계산하지 않으려고
  const counts = new Map<string, Set<string>>()
  for (const log of scoped) {
    for (const tagId of expandedTagIds(log)) {
      if (!isContextTag(tagId)) continue
      const days = counts.get(tagId) ?? new Set<string>()
      days.add(log.date)
      counts.set(tagId, days)
    }
  }

  const out: ContextResult[] = []

  for (const [tagId, days] of counts) {
    if (days.size < minDays) continue

    const def = getTag(tagId)
    if (!def) continue

    const result = compareToBaseline({
      logs,
      metric,
      window,
      weighting: input.weighting,
      where: (log) => hasTag(log, tagId),
      label: def.displayName,
      filter: { lifeTagId: tagId },
    })

    if (result.sampleCount < minSample) continue

    out.push({
      ...result,
      tagId,
      categoryId: def.categoryId,
      categoryLabel: CATEGORY_BY_ID[def.categoryId]?.ko ?? def.categoryId,
      isLeaf: !hasChildIn(tagId, counts),
      adjusted: adjustedFor(input, (log) => hasTag(log, tagId), result),
    })
  }

  return out
}

/** 이 태그의 자식이 이번 분석에도 나왔는가 — 그렇다면 이건 넓은 쪽이다 */
function hasChildIn(tagId: string, counts: ReadonlyMap<string, Set<string>>): boolean {
  for (const other of counts.keys()) {
    if (other === tagId) continue
    const def = getTag(other)
    if (def?.parentId === tagId) return true
  }
  return false
}

/**
 * 화면에 올릴 순서.
 *
 * 두 가지를 한다.
 *   넓은 부모는 자식이 같이 잡혔으면 뒤로 민다 (계획서 29)
 *   같은 기록을 가리키는 줄은 하나만 남긴다
 *
 * 두 번째가 필요한 이유: 클라이밍을 하면 늘 클라이밍장에 있다.
 * 두 태그의 표본이 글자 하나까지 같은데 나란히 보여 주면
 * 같은 이야기를 두 번 읽게 되고, 그만큼 다른 이야기가 밀려난다.
 */
export function rankContexts(results: readonly ContextResult[], take = 8): ContextResult[] {
  const leaves = results.filter((r) => r.isLeaf && r.confidence !== 'insufficient')
  const rest = results.filter((r) => !r.isLeaf && r.confidence !== 'insufficient')
  const ordered = [...leaves.sort(byEffect), ...rest.sort(byEffect)]

  const seen = new Set<string>()
  const out: ContextResult[] = []
  for (const result of ordered) {
    // 표본 수·날짜 수·평균이 전부 같으면 같은 기록을 보고 있는 것이다
    const shape = `${result.sampleCount}|${result.distinctDays}|${result.observed}`
    if (seen.has(shape)) continue
    seen.add(shape)
    out.push(result)
    if (out.length >= take) break
  }
  return out
}

/** 같은 기록을 가리키는 줄을 걷어내기 전 목록 — 근거를 볼 때 쓴다 */
export const allContexts = (results: readonly ContextResult[]): ContextResult[] =>
  results.filter((r) => r.confidence !== 'insufficient').sort(byEffect)

/** 높은 쪽 / 낮은 쪽 둘 다 보여 준다 (계획서 27) */
export const higherThanUsual = (results: readonly ContextResult[], take = 5) =>
  results
    .filter((r) => r.confidence !== 'insufficient' && (r.difference ?? 0) > 0)
    .sort((a, b) => (b.difference ?? 0) - (a.difference ?? 0))
    .slice(0, take)

export const lowerThanUsual = (results: readonly ContextResult[], take = 5) =>
  results
    .filter((r) => r.confidence !== 'insufficient' && (r.difference ?? 0) < 0)
    .sort((a, b) => (a.difference ?? 0) - (b.difference ?? 0))
    .slice(0, take)

// ─────────────────────────────────────────────
// My Tag (계획서 30, 31)
//
// 사람 이름이 붙은 태그가 많다. 그래서 문장을 더 조심해서 만든다 —
// "성현이 기분을 좋게 만든다" 가 아니라 "#성현 태그가 있는 기록에서" 다.
// 문장은 wording.ts 가 만들고, 여기서는 숫자만 낸다.
// ─────────────────────────────────────────────

export interface MyTagResult extends AnalysisResult {
  myTagId: string
  name: string
  adjusted?: AdjustedComparison
}

export function myTagResults(
  input: ContextInput & { myTags: readonly MyTag[] },
): MyTagResult[] {
  const minSample = input.minSample ?? MIN_CONTEXT
  const minDays = input.minDays ?? MIN_CONTEXT_DAYS
  const scoped = input.logs.filter(
    (l) => l.date >= input.window.from && l.date <= input.window.to,
  )

  const out: MyTagResult[] = []

  for (const tag of input.myTags) {
    const days = new Set(scoped.filter((l) => hasMyTag(l, tag.id)).map((l) => l.date))
    if (days.size < minDays) continue

    const result = compareToBaseline({
      logs: input.logs,
      metric: input.metric,
      window: input.window,
      weighting: input.weighting,
      where: (log) => hasMyTag(log, tag.id),
      label: tag.name,
      filter: { myTagId: tag.id },
    })

    if (result.sampleCount < minSample) continue

    out.push({
      ...result,
      myTagId: tag.id,
      name: tag.name,
      adjusted: adjustedFor(input, (log) => hasMyTag(log, tag.id), result),
    })
  }

  return out.sort(byEffect)
}

// ─────────────────────────────────────────────
// 문맥 맞춰 견주기
// ─────────────────────────────────────────────

/**
 * 이 태그가 나온 기록들이 주로 어느 요일종류·시간대에 있었는지 보고,
 * 같은 조건의 다른 기록들과만 견준다.
 *
 * 태그 로그가 여러 시간대에 골고루 퍼져 있으면 보정할 게 없으므로 undefined 를 준다.
 */
export function adjustedFor(
  input: ContextInput,
  where: (log: QuickLog) => boolean,
  raw: AnalysisResult,
): AdjustedComparison | undefined {
  const how = input.weighting ?? 'day'
  const scoped = input.logs.filter(
    (l) => l.date >= input.window.from && l.date <= input.window.to,
  )
  const tagged = scoped.filter(where)
  if (tagged.length < 3) return undefined

  // 이 태그가 어디에 몰려 있는가
  const dayTypes = new Set(tagged.map((l) => dayTypeOf(l.dayOfWeek)))
  const dayParts = new Set(tagged.map((l) => l.dayPart))

  const narrowDayType = dayTypes.size === 1
  const narrowDayPart = dayParts.size <= 2
  if (!narrowDayType && !narrowDayPart) return undefined

  /**
   * 좁은 것부터 넓은 것 순으로 시도한다.
   *
   * #성현 처럼 "주말 저녁에만" 나오는 태그는 주말+저녁을 둘 다 맞추면
   * 비교할 기록이 하나도 안 남는다. 그럴 때는 한 칸 넓혀서 저녁끼리만 견준다.
   * 아무것도 안 보여 주는 것보다 "저녁끼리 견주면 이만큼" 이 훨씬 쓸모 있다.
   */
  const levels: Array<{ label: string; same: (log: QuickLog) => boolean }> = []

  if (narrowDayType && narrowDayPart) {
    levels.push({
      label: `${[...dayTypes].map(dayTypeName).join('/')} · ${[...dayParts].map(dayPartName).join('/')}`,
      same: (log) => dayTypes.has(dayTypeOf(log.dayOfWeek)) && dayParts.has(log.dayPart),
    })
  }
  if (narrowDayPart) {
    levels.push({
      label: `같은 시간대(${[...dayParts].map(dayPartName).join('/')})`,
      same: (log) => dayParts.has(log.dayPart),
    })
  }
  if (narrowDayType) {
    levels.push({
      label: `같은 ${[...dayTypes].map(dayTypeName).join('/')}`,
      same: (log) => dayTypes.has(dayTypeOf(log.dayOfWeek)),
    })
  }

  for (const level of levels) {
    const comparison = scoped.filter((log) => level.same(log) && !where(log))
    if (comparison.length < 3) continue

    const baseline = describeWeighted(
      comparison
        .map((log) => ({ log, value: valueOf(log, input.metric) }))
        .filter((x): x is { log: QuickLog; value: number } => x.value !== null)
        .map(({ log, value }) => ({ value, date: log.date, sourceId: log.id })),
      how,
    )
    if (baseline.count < 3) continue

    return {
      matchedOn: level.label,
      baseline: round(baseline.mean),
      difference: round(raw.observed - baseline.mean),
      baselineCount: baseline.count,
    }
  }

  return undefined
}

const dayTypeName = (type: string) => (type === 'weekend' ? '주말' : '평일')

const dayPartName = (part: string) => DAY_PART_LABEL[part as DayPart] ?? part

const valueOf = (log: QuickLog, metric: MetricKey): number | null => {
  const raw =
    metric === 'mood' ? log.mood
    : metric === 'energy' ? log.energy
    : metric === 'focus' ? log.focus
    : metric === 'fatigue' ? log.fatigue
    : null
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null
}

/** 화면에 쓸 이름 — 영문 key 를 그대로 내보내지 않는다 */
export const contextName = (tagId: string) => displayNameOf(tagId)

export const metricLabel = (metric: MetricKey) => METRICS[metric].label

export type { AnalysisFilter }
