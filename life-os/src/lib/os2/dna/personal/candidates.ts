/**
 * 7A — 개인 조합 후보 만들기.
 *
 * 새 탐색 엔진을 처음부터 만들지 않는다 (계획서 9).
 * Phase 5 의 twoWay / timeByTag / tripleCandidates 가 이미 조합을 훑는다.
 * 여기서는 그 결과를 받아 Phase 7 문턱으로 다시 거른다.
 *
 * 문턱이 48개보다 높은 이유:
 * 48개는 "이런 게 있다" 를 미리 알고 재는 것이고,
 * 여기는 아무 조합이나 다 훑어서 가장 큰 것을 고르는 것이다.
 * 같은 기준으로 열면 우연히 큰 조합이 반드시 하나는 나온다.
 *
 * 그리고 무엇을 조합의 재료로 쓸지도 좁혀 둔다.
 * 감정·정신·기운·몸 태그는 뺀다 — 그 태그들은 기분·집중과 같은 글에서 나온다.
 * "기뻤다고 적힌 기록에서 기분이 높다" 는 발견이 아니라 같은 말의 반복이다.
 */
import { getTag, isDescendantOf } from '../../taxonomy'
import type { DayPart, QuickLog } from '../../types'
import {
  DAY_PART_LABEL,
  timeByTag,
  tripleCandidates,
  twoWay,
  type MetricKey,
} from '../../analytics'
import { expandedTagIds, hasMyTag } from '../../analytics/aggregate'
import { measure } from '../measure'
import type { EvaluationInput, Measurement } from '../types'
import {
  PERSONAL_RULE_VERSION,
  type PersonalCandidate,
  type PersonalContext,
} from './types'

// ─────────────────────────────────────────────
// 문턱 (계획서 10~12)
// ─────────────────────────────────────────────

/** 후보라고 부르기 위한 최소한 */
export const PERSONAL_FLOOR = {
  sampleCount: 10,
  distinctDays: 7,
  durationDays: 30,
}

/** 두 조각 조합 */
export const TWO_WAY_GATE = { effect: 0.55, consistency: 0.7 }

/** 세 조각 조합 — 좁을수록 우연히 커지기 쉬워서 더 높다 */
export const THREE_WAY_GATE = { effect: 0.6, consistency: 0.72 }

/** 여기서 훑을 지표 */
export const SCANNED_METRICS: MetricKey[] = ['mood', 'energy', 'focus', 'fatigue']

/** 무겁게 재기 전에 걸러 내는 값 — 이걸 넘어야 measure 를 돌린다 */
const PRESCREEN = 0.4

/**
 * 조합의 재료로 쓸 수 있는 태그 갈래.
 * 느낌을 나타내는 갈래는 뺀다 (위 주석).
 */
export const CONTEXT_CATEGORIES = new Set([
  'activity',
  'sport',
  'work',
  'creative',
  'social',
  'relationship',
  'place',
  'environment',
  'food',
  'recovery',
  'novelty',
  'agency',
])

export const gateFor = (contexts: readonly PersonalContext[]) =>
  contexts.length >= 3 ? THREE_WAY_GATE : TWO_WAY_GATE

// ─────────────────────────────────────────────
// 지문 (계획서 76)
// ─────────────────────────────────────────────

/**
 * 같은 조합은 언제나 같은 지문이다.
 * 순서를 정렬해서 넣기 때문에 [클라이밍, 저녁] 과 [저녁, 클라이밍] 은 하나다.
 */
export function fingerprintOf(
  metric: MetricKey,
  direction: 1 | -1,
  contexts: readonly PersonalContext[],
): string {
  const parts = contexts.map((c) => `${c.kind}:${c.key}`).sort()
  return `${metric}|${direction > 0 ? 'up' : 'down'}|${parts.join('+')}|v${PERSONAL_RULE_VERSION}`
}

// ─────────────────────────────────────────────
// 후보 만들기
// ─────────────────────────────────────────────

export interface CandidateOptions {
  /** My Tag id → 이름 */
  myTagNameOf?: (id: string) => string | undefined
  /** 한 지표에서 살펴볼 조합의 최대 개수 */
  take?: number
}

export function buildCandidates(
  input: EvaluationInput,
  options: CandidateOptions = {},
): PersonalCandidate[] {
  const out: PersonalCandidate[] = []

  for (const metric of SCANNED_METRICS) {
    for (const contexts of shapesFor(input, metric, options)) {
      const candidate = evaluateShape(input, metric, contexts)
      if (candidate) out.push(candidate)
    }
  }

  return dedupeNested(out)
}

/** 살펴볼 조합의 모양들 — 아직 재지 않았다 */
function shapesFor(
  input: EvaluationInput,
  metric: MetricKey,
  options: CandidateOptions,
): PersonalContext[][] {
  const take = options.take ?? 24
  const shapes: PersonalContext[][] = []
  const seen = new Set<string>()

  const push = (contexts: PersonalContext[]) => {
    if (!usable(contexts)) return
    const key = contexts.map((c) => `${c.kind}:${c.key}`).sort().join('+')
    if (seen.has(key)) return
    seen.add(key)
    shapes.push(contexts)
  }

  const base = {
    logs: input.logs,
    window: input.window,
    metric,
    minSample: PERSONAL_FLOOR.sampleCount,
    minDays: PERSONAL_FLOOR.distinctDays,
    take,
  }

  // 태그 × 태그
  const pairs = twoWay(base).filter((r) => Math.abs(r.difference ?? 0) >= PRESCREEN)
  for (const pair of pairs) push(pair.parts.map(tagContext).filter(isContext))

  // 시간대 × 태그
  const times = timeByTag(base).filter((r) => Math.abs(r.difference ?? 0) >= PRESCREEN)
  for (const time of times) {
    const [dayPart, tagId] = time.parts
    push([dayPartContext(dayPart as DayPart), tagContext(tagId)].filter(isContext))
  }

  // 시간대 × 태그 × 태그 — 이미 뭔가 보이던 조각이 들어간 것만
  const hot = new Set([
    ...pairs.flatMap((p) => p.parts),
    ...times.map((t) => t.parts[1]),
  ])
  for (const triple of tripleCandidates(base)) {
    const [dayPart, a, b] = triple.parts
    if (!hot.has(a) && !hot.has(b)) continue
    push(
      [dayPartContext(dayPart as DayPart), tagContext(a), tagContext(b)].filter(isContext),
    )
  }

  // My Tag 조합 — 여기가 이 사람에게만 있는 부분이다
  for (const shape of myTagShapes(input, options)) push(shape)

  return shapes
}

/**
 * My Tag × 시간대 / My Tag × 태그.
 * Phase 5 의 조합 엔진은 LIFE TAG 만 본다. My Tag 는 여기서 센다.
 */
function myTagShapes(
  input: EvaluationInput,
  options: CandidateOptions,
): PersonalContext[][] {
  const scoped = input.logs.filter(
    (l) => l.date >= input.window.from && l.date <= input.window.to,
  )

  const counts = new Map<string, { days: Set<string>; n: number; shape: PersonalContext[] }>()

  const bump = (shape: PersonalContext[], date: string) => {
    const key = shape.map((c) => `${c.kind}:${c.key}`).sort().join('+')
    const entry = counts.get(key) ?? { days: new Set<string>(), n: 0, shape }
    entry.days.add(date)
    entry.n += 1
    counts.set(key, entry)
  }

  for (const log of scoped) {
    for (const myTagId of log.myTagIds ?? []) {
      const name = options.myTagNameOf?.(myTagId)
      if (!name) continue
      const mine: PersonalContext = { kind: 'myTag', key: myTagId, label: name }

      bump([mine, dayPartContext(log.dayPart)], log.date)

      for (const tagId of expandedTagIds(log)) {
        const context = tagContext(tagId)
        if (!context) continue
        bump([mine, context], log.date)
      }
    }
  }

  return [...counts.values()]
    .filter(
      (e) =>
        e.n >= PERSONAL_FLOOR.sampleCount && e.days.size >= PERSONAL_FLOOR.distinctDays,
    )
    .map((e) => e.shape)
}

// ─────────────────────────────────────────────
// 실제로 재기
// ─────────────────────────────────────────────

function evaluateShape(
  input: EvaluationInput,
  metric: MetricKey,
  contexts: PersonalContext[],
): PersonalCandidate | null {
  const where = matcher(contexts)

  // 방향을 먼저 정하지 않는다. 잰 뒤에 부호를 본다 —
  // 개인 발견은 미리 정해 둔 정의가 없기 때문이다
  const rough = measure(input, { metric, where })
  if (!rough) return null
  if (rough.effect === 0) return null

  const direction: 1 | -1 = rough.effect > 0 ? 1 : -1

  const m = measure(input, {
    metric,
    where,
    direction,
    // 문맥을 맞춰도 남는지 늘 확인한다. 개인 조합은 특히 시간대에 몰리기 쉽다
    adjust: true,
    relatedTags: contexts.filter((c) => c.kind === 'tag').map((c) => c.key),
    childLabel: contexts.map((c) => c.label).join(' · '),
  })
  if (!m) return null
  if (!passes(m, contexts)) return null

  return {
    fingerprint: fingerprintOf(metric, direction, contexts),
    metric,
    direction,
    contexts,
    measurement: m,
    componentEffects: componentEffects(input, metric, contexts),
    novelty: 0,
    window: input.window,
    weighting: m.weighting,
  }
}

/** 문턱을 넘었는가 */
export function passes(m: Measurement, contexts: readonly PersonalContext[]): boolean {
  const gate = gateFor(contexts)
  if (m.sampleCount < PERSONAL_FLOOR.sampleCount) return false
  if (m.distinctDays < PERSONAL_FLOOR.distinctDays) return false
  if (m.durationDays < PERSONAL_FLOOR.durationDays) return false
  if (Math.abs(m.effect) < gate.effect) return false
  if (m.consistency < gate.consistency) return false
  // 평균과 중앙값이 같은 쪽을 봐야 한다. 며칠의 극단값이 끌고 간 것이면 아니다
  if (Math.sign(m.mean - m.baseline) * Math.sign(m.median - m.baseline) < 0) return false

  /**
   * 문맥을 맞춰도 남아야 한다.
   *
   * 여기가 개인 발견에서 가장 많이 걸러 내는 조건이다.
   * "저녁에 집에 있으면 기분이 높다" 는 대개 집의 이야기가 아니라 저녁의 이야기다.
   * 같은 시간대끼리 견줬을 때 차이가 사라지거나 뒤집히면 그건 조합의 몫이 아니었다.
   */
  const adjusted = m.adjustedEffect
  if (adjusted === undefined) return false
  if (Math.sign(adjusted) !== Math.sign(m.effect)) return false
  if (Math.abs(adjusted) < gate.effect * 0.6) return false

  return true
}

/** 조각 하나하나만 봤을 때의 차이 — 조합이 무엇을 더했는지 보려고 */
function componentEffects(
  input: EvaluationInput,
  metric: MetricKey,
  contexts: readonly PersonalContext[],
): Array<{ label: string; effect: number }> {
  const out: Array<{ label: string; effect: number }> = []
  for (const context of contexts) {
    const m = measure(input, { metric, where: matcher([context]) })
    out.push({ label: context.label, effect: m?.effect ?? 0 })
  }
  return out
}

// ─────────────────────────────────────────────
// 조각 다루기
// ─────────────────────────────────────────────

const isContext = (c: PersonalContext | null): c is PersonalContext => c !== null

export function tagContext(tagId: string): PersonalContext | null {
  const def = getTag(tagId)
  if (!def) return null
  if (!CONTEXT_CATEGORIES.has(def.categoryId)) return null
  return { kind: 'tag', key: tagId, label: def.displayName }
}

export const dayPartContext = (dayPart: DayPart): PersonalContext => ({
  kind: 'dayPart',
  key: dayPart,
  label: DAY_PART_LABEL[dayPart],
})

/** 이 조합이 말이 되는가 */
function usable(contexts: readonly PersonalContext[]): boolean {
  if (contexts.length < 2) return false
  if (contexts.filter((c) => c.kind === 'dayPart').length > 1) return false

  // 조상과 자손을 같이 두지 않는다 — "운동 + 클라이밍" 은 그냥 "클라이밍" 이다
  const tags = contexts.filter((c) => c.kind === 'tag').map((c) => c.key)
  for (const a of tags) {
    for (const b of tags) {
      if (a !== b && isDescendantOf(a, b)) return false
    }
  }
  return true
}

export function matcher(
  contexts: readonly PersonalContext[],
): (log: QuickLog) => boolean {
  return (log) =>
    contexts.every((c) => {
      if (c.kind === 'dayPart') return log.dayPart === c.key
      if (c.kind === 'myTag') return hasMyTag(log, c.key)
      return expandedTagIds(log).includes(c.key)
    })
}

/**
 * 조상만 다른 같은 이야기를 지운다.
 * "저녁 + 운동" 과 "저녁 + 클라이밍" 이 둘 다 남으면 발견이 두 개처럼 보인다.
 * 더 좁은 쪽(자손)을 남긴다 — 그쪽이 더 말이 되는 이야기다.
 */
function dedupeNested(candidates: PersonalCandidate[]): PersonalCandidate[] {
  return candidates.filter((candidate) => {
    return !candidates.some((other) => {
      if (other === candidate) return false
      if (other.metric !== candidate.metric) return false
      if (other.direction !== candidate.direction) return false
      return isNarrowerOrSame(other.contexts, candidate.contexts)
    })
  })
}

/** other 가 candidate 와 같은 이야기를 더 좁게 하고 있는가 */
function isNarrowerOrSame(
  other: readonly PersonalContext[],
  candidate: readonly PersonalContext[],
): boolean {
  if (other.length !== candidate.length) return false
  let narrower = false
  for (const c of candidate) {
    const match = other.find(
      (o) => o.kind === c.kind && (o.key === c.key || (c.kind === 'tag' && isDescendantOf(o.key, c.key))),
    )
    if (!match) return false
    if (match.key !== c.key) narrower = true
  }
  return narrower
}
