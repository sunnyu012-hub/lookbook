/**
 * 5D — 두 가지가 겹칠 때 (계획서 80~83).
 *
 * 태그가 300개다. 전부 짝지으면 45,000 가지가 나오고 대부분은 한 번도 같이 안 나온다.
 * 그래서 두 가지를 건다.
 *   · 의미가 있을 법한 카테고리 짝만 본다 (아래 PAIRS)
 *   · 실제로 같이 나온 기록이 충분할 때만 계산한다
 *
 * 여기서 나온 결과는 아직 화면에 안 쓴다. Phase 6 이 읽을 재료다.
 */
import type { QuickLog } from '../types'
import { getTag } from '../taxonomy'
import { compareToBaseline, expandedTagIds, hasTag } from './aggregate'
import { MIN_CONTEXT, MIN_CONTEXT_DAYS } from './confidence'
import type { AnalysisResult } from './result'
import { byEffect } from './result'
import { DAY_PARTS, DAY_PART_LABEL, type AnalysisWindow } from './windows'
import type { MetricKey } from './metrics'
import type { Weighting } from './stats'
import type { DayPart } from '../types'

/** 겹쳐 볼 만한 카테고리 짝 (계획서 81) */
export const PAIRS: Array<[string, string]> = [
  ['activity', 'place'],
  ['activity', 'social'],
  ['sport', 'place'],
  ['place', 'social'],
  ['work', 'environment'],
  ['creative', 'place'],
  ['work', 'social'],
  ['recovery', 'place'],
]

export interface CombinationResult extends AnalysisResult {
  /** 무엇과 무엇이 겹쳤는지 */
  parts: string[]
  partLabels: string[]
  /** time × 무엇 조합이면 시간대 */
  dayPart?: DayPart
}

export interface CombinationInput {
  logs: readonly QuickLog[]
  window: AnalysisWindow
  metric: MetricKey
  weighting?: Weighting
  minSample?: number
  minDays?: number
  take?: number
}

/** 태그 두 개가 같이 나온 기록 */
export function twoWay(input: CombinationInput): CombinationResult[] {
  const minSample = input.minSample ?? MIN_CONTEXT
  const minDays = input.minDays ?? MIN_CONTEXT_DAYS
  const scoped = input.logs.filter(
    (l) => l.date >= input.window.from && l.date <= input.window.to,
  )

  // 같이 나온 횟수를 먼저 센다. 계산은 그 다음이다
  const together = new Map<string, Set<string>>()
  for (const log of scoped) {
    const tags = expandedTagIds(log)
    for (let i = 0; i < tags.length; i += 1) {
      for (let j = i + 1; j < tags.length; j += 1) {
        const a = getTag(tags[i])
        const b = getTag(tags[j])
        if (!a || !b) continue
        if (!allowed(a.categoryId, b.categoryId)) continue
        const key = [tags[i], tags[j]].sort().join('+')
        const days = together.get(key) ?? new Set<string>()
        days.add(log.date)
        together.set(key, days)
      }
    }
  }

  const out: CombinationResult[] = []

  for (const [key, days] of together) {
    if (days.size < minDays) continue
    const [first, second] = key.split('+')
    const a = getTag(first)
    const b = getTag(second)
    if (!a || !b) continue

    const result = compareToBaseline({
      logs: input.logs,
      metric: input.metric,
      window: input.window,
      weighting: input.weighting,
      where: (log) => hasTag(log, first) && hasTag(log, second),
      label: `${a.displayName} + ${b.displayName}`,
      filter: { lifeTagId: first, and: { lifeTagId: second } },
    })

    if (result.sampleCount < minSample) continue

    out.push({
      ...result,
      parts: [first, second],
      partLabels: [a.displayName, b.displayName],
    })
  }

  return out.sort(byEffect).slice(0, input.take ?? 20)
}

const allowed = (a: string, b: string) =>
  PAIRS.some(([x, y]) => (a === x && b === y) || (a === y && b === x))

/** 시간대 × 태그 (계획서 81 의 Time × Activity) */
export function timeByTag(input: CombinationInput): CombinationResult[] {
  const minSample = input.minSample ?? MIN_CONTEXT
  const minDays = input.minDays ?? MIN_CONTEXT_DAYS
  const scoped = input.logs.filter(
    (l) => l.date >= input.window.from && l.date <= input.window.to,
  )

  const together = new Map<string, Set<string>>()
  for (const log of scoped) {
    for (const tagId of expandedTagIds(log)) {
      const def = getTag(tagId)
      if (!def) continue
      if (!['activity', 'sport', 'work', 'creative', 'place', 'social'].includes(def.categoryId)) {
        continue
      }
      const key = `${log.dayPart}|${tagId}`
      const days = together.get(key) ?? new Set<string>()
      days.add(log.date)
      together.set(key, days)
    }
  }

  const out: CombinationResult[] = []

  for (const [key, days] of together) {
    if (days.size < minDays) continue
    const [dayPart, tagId] = key.split('|') as [DayPart, string]
    const def = getTag(tagId)
    if (!def || !DAY_PARTS.includes(dayPart)) continue

    const result = compareToBaseline({
      logs: input.logs,
      metric: input.metric,
      window: input.window,
      weighting: input.weighting,
      where: (log) => log.dayPart === dayPart && hasTag(log, tagId),
      label: `${DAY_PART_LABEL[dayPart]} · ${def.displayName}`,
      filter: { dayPart, and: { lifeTagId: tagId } },
    })

    if (result.sampleCount < minSample) continue

    out.push({
      ...result,
      parts: [dayPart, tagId],
      partLabels: [DAY_PART_LABEL[dayPart], def.displayName],
      dayPart,
    })
  }

  return out.sort(byEffect).slice(0, input.take ?? 20)
}

/**
 * 세 가지 겹치기는 후보만 만든다 (계획서 82).
 * 실제 계산은 Phase 6/7 에서 필요해질 때 한다 — 지금 하면 대부분 표본이 모자란다.
 */
export interface TripleCandidate {
  parts: string[]
  partLabels: string[]
  sampleCount: number
  distinctDays: number
}

export function tripleCandidates(input: CombinationInput): TripleCandidate[] {
  const minSample = input.minSample ?? MIN_CONTEXT
  const minDays = input.minDays ?? MIN_CONTEXT_DAYS
  const scoped = input.logs.filter(
    (l) => l.date >= input.window.from && l.date <= input.window.to,
  )

  const counts = new Map<string, { days: Set<string>; n: number }>()

  for (const log of scoped) {
    const tags = expandedTagIds(log).filter((id) => {
      const def = getTag(id)
      return def && ['activity', 'sport', 'work', 'creative', 'place', 'social'].includes(def.categoryId)
    })
    if (tags.length < 2) continue

    for (let i = 0; i < tags.length; i += 1) {
      for (let j = i + 1; j < tags.length; j += 1) {
        const key = [log.dayPart, tags[i], tags[j]].join('|')
        const entry = counts.get(key) ?? { days: new Set<string>(), n: 0 }
        entry.days.add(log.date)
        entry.n += 1
        counts.set(key, entry)
      }
    }
  }

  return [...counts]
    .filter(([, v]) => v.n >= minSample && v.days.size >= minDays)
    .map(([key, v]) => {
      const [dayPart, a, b] = key.split('|')
      return {
        parts: [dayPart, a, b],
        partLabels: [
          DAY_PART_LABEL[dayPart as DayPart] ?? dayPart,
          getTag(a)?.displayName ?? a,
          getTag(b)?.displayName ?? b,
        ],
        sampleCount: v.n,
        distinctDays: v.days.size,
      }
    })
    .sort((a, b) => b.sampleCount - a.sampleCount)
    .slice(0, input.take ?? 20)
}
