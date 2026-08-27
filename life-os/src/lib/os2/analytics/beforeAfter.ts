/**
 * 5E — 어떤 일 앞뒤로 (계획서 44~48).
 *
 * 클라이밍을 한 기록 앞 3시간과 뒤 3시간의 상태를 견준다.
 *
 * 지키는 것:
 *   · 실제로 일어난 일만 센다. "내일 클라이밍 갈 거야" 는 사건이 아니다
 *   · 사건이 너무 가까우면 하나로 묶는다 — 같은 활동을 세 번 적은 것뿐일 수 있다
 *   · 짝이 다섯 개, 사흘 미만이면 보여 주지 않는다
 */
import type { QuickLog } from '../types'
import { countsAsHappened } from '../tagging'
import { getTag } from '../taxonomy'
import { activeTagIds, expandedTagIds } from './aggregate'
import { METRICS, valueOfLog, type MetricKey } from './metrics'
import { mean, round } from './stats'
import { inWindow, type AnalysisWindow } from './windows'

/** 앞뒤로 몇 시간을 볼 것인가 */
export const WINDOW_HOURS = 3

/** 사건이 이 안에 또 있으면 하나로 묶는다 */
export const MERGE_HOURS = 4

/** 짝이 이만큼은 있어야 (계획서 47) */
export const MIN_PAIRS = 5
export const MIN_PAIR_DAYS = 3

export interface EventPair {
  eventAt: string
  date: string
  before: number | null
  after: number | null
  /** after - before. 한쪽이 없으면 null */
  change: number | null
}

export interface BeforeAfter {
  tagId: string
  label: string
  metric: MetricKey
  metricLabel: string
  pairs: EventPair[]
  /** 앞뒤가 모두 있는 짝만 */
  paired: EventPair[]
  beforeMean: number | null
  afterMean: number | null
  change: number | null
  distinctDays: number
  enough: boolean
}

export interface BeforeAfterInput {
  logs: readonly QuickLog[]
  window: AnalysisWindow
  metric: MetricKey
  tagId: string
}

export function analyzeBeforeAfter(input: BeforeAfterInput): BeforeAfter {
  const metric = METRICS[input.metric]
  const scoped = [...input.logs]
    .filter((log) => inWindow(log.date, input.window))
    .sort((a, b) => (a.loggedAt < b.loggedAt ? -1 : 1))

  const events = mergeClose(
    scoped.filter((log) => happenedWith(log, input.tagId)),
  )

  /**
   * 시각을 한 번만 뽑아 두고 이진 탐색으로 창을 자른다.
   *
   * 사건마다 전체 기록을 훑으면 기록이 많아질수록 제곱으로 느려진다.
   * 1년치 빽빽한 기록에서 이 하나가 400ms 를 먹고 있었다.
   */
  const stamps = scoped.map((log) => new Date(log.loggedAt).getTime())

  /** stamps 에서 value 이상인 첫 자리 */
  const lowerBound = (value: number): number => {
    let lo = 0
    let hi = stamps.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (stamps[mid] < value) lo = mid + 1
      else hi = mid
    }
    return lo
  }

  const pairs: EventPair[] = events.map((event) => {
    const at = new Date(event.loggedAt).getTime()
    const span = WINDOW_HOURS * 3_600_000

    const valuesIn = (from: number, to: number) => {
      const out: number[] = []
      for (let i = lowerBound(from); i < stamps.length && stamps[i] <= to; i += 1) {
        const log = scoped[i]
        if (log.id === event.id) continue
        const value = valueOfLog(log, input.metric)
        if (value !== null) out.push(value)
      }
      return out
    }

    const before = valuesIn(at - span, at - 1)
    const after = valuesIn(at + 1, at + span)

    const b = before.length ? round(mean(before)) : null
    const a = after.length ? round(mean(after)) : null

    return {
      eventAt: event.loggedAt,
      date: event.date,
      before: b,
      after: a,
      change: b !== null && a !== null ? round(a - b) : null,
    }
  })

  const paired = pairs.filter((p) => p.change !== null)
  const days = new Set(paired.map((p) => p.date)).size

  return {
    tagId: input.tagId,
    label: getTag(input.tagId)?.displayName ?? input.tagId,
    metric: input.metric,
    metricLabel: metric.label,
    pairs,
    paired,
    beforeMean: paired.length ? round(mean(paired.map((p) => p.before as number))) : null,
    afterMean: paired.length ? round(mean(paired.map((p) => p.after as number))) : null,
    change: paired.length ? round(mean(paired.map((p) => p.change as number))) : null,
    distinctDays: days,
    enough: paired.length >= MIN_PAIRS && days >= MIN_PAIR_DAYS,
  }
}

/** 이 기록에서 그 일이 실제로 일어났는가 */
function happenedWith(log: QuickLog, tagId: string): boolean {
  const applied = (log.lifeTags ?? []).find((t) => t.tagId === tagId)
  if (applied) {
    // 미래·가정 이야기는 사건이 아니다
    if (!countsAsHappened(applied.temporalContext) || applied.userRejected) return false
    return true
  }
  // 조상으로 걸린 경우 — 잎이 present 인지 위에서 이미 걸러졌다
  return expandedTagIds(log).includes(tagId) && activeTagIds(log).length > 0
}

/** 가까이 붙은 사건은 하나로 */
function mergeClose(events: readonly QuickLog[]): QuickLog[] {
  const out: QuickLog[] = []
  let lastAt: number | null = null

  for (const event of events) {
    const at = new Date(event.loggedAt).getTime()
    if (lastAt !== null && (at - lastAt) / 3_600_000 < MERGE_HOURS) continue
    out.push(event)
    lastAt = at
  }

  return out
}

// ─────────────────────────────────────────────
// 다음 날로 이어지는가 (계획서 48, 49)
// ─────────────────────────────────────────────

export interface Carryover {
  metric: MetricKey
  /** 어떤 일이 있었던 날 */
  label: string
  /** 그 일이 있던 날의 다음 날 평균 */
  nextDay: number | null
  /** 그 일이 없던 날의 다음 날 평균 */
  otherNextDay: number | null
  difference: number | null
  pairedDays: number
  enough: boolean
}

/** 이만큼은 짝지어져야 (계획서 49) */
export const MIN_CARRYOVER_DAYS = 10

export function analyzeCarryover(input: BeforeAfterInput): Carryover {
  const scoped = input.logs.filter((log) => inWindow(log.date, input.window))

  const byDate = new Map<string, QuickLog[]>()
  for (const log of scoped) byDate.set(log.date, [...(byDate.get(log.date) ?? []), log])

  const dates = [...byDate.keys()].sort()
  const withTag: number[] = []
  const without: number[] = []
  let paired = 0

  for (let i = 0; i < dates.length - 1; i += 1) {
    const today = dates[i]
    const next = dates[i + 1]
    // 바로 다음 날이 아니면 이어짐을 말할 수 없다
    if (dayGap(today, next) !== 1) continue

    const nextValues = (byDate.get(next) ?? [])
      .map((log) => valueOfLog(log, input.metric))
      .filter((v): v is number => v !== null)
    if (!nextValues.length) continue

    const happened = (byDate.get(today) ?? []).some((log) => happenedWith(log, input.tagId))
    ;(happened ? withTag : without).push(mean(nextValues))
    paired += 1
  }

  const enough =
    paired >= MIN_CARRYOVER_DAYS && withTag.length >= 3 && without.length >= 3

  return {
    metric: input.metric,
    label: getTag(input.tagId)?.displayName ?? input.tagId,
    nextDay: withTag.length ? round(mean(withTag)) : null,
    otherNextDay: without.length ? round(mean(without)) : null,
    difference:
      withTag.length && without.length ? round(mean(withTag) - mean(without)) : null,
    pairedDays: paired,
    enough,
  }
}

const dayGap = (a: string, b: string): number => {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round(
    (new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) / 86_400_000,
  )
}
