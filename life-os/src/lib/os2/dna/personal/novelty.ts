/**
 * 7B — 이미 아는 이야기인가, 새로운 이야기인가.
 *
 * 7A 를 통과한 조합은 통계적으로는 다 "진짜" 다.
 * 그런데 진짜라고 해서 볼 가치가 있는 건 아니다.
 *
 *   · "클라이밍장 + 클라이밍" — 같은 사건을 두 번 적은 것이다
 *   · "저녁 + 클라이밍" — 클라이밍만 봐도 똑같이 나온다. 저녁은 아무것도 안 더했다
 *   · "클라이밍" — 48개 DNA 가 이미 열어 준 것이다
 *
 * 셋 다 통계는 멀쩡하지만 사용자에게는 같은 말의 반복이다.
 * 그래서 여기서 묻는 것은 "맞는가" 가 아니라 "더한 것이 있는가" 다.
 *
 * 가장 무겁게 보는 값은 combinationLift —
 * 조합이 그 조각 하나보다 얼마나 더 크게 나타났는가.
 * 이게 0이면 조합은 이야기를 하나도 더하지 않은 것이다.
 */
import type { QuickLog } from '../../types'
import type { MetricKey } from '../../analytics'
import type { DiscoveryRecord } from '../types'
import { gateFor } from './candidates'
import type {
  NoveltyParts,
  PersonalCandidate,
  PersonalContext,
  PersonalDiscoveryRecord,
} from './types'

/** 이 아래면 열지 않는다 */
export const MIN_NOVELTY = 0.45

/** 조각을 더 붙였다면 이만큼은 더 커야 한다 (계획서 25) */
export const INCREMENTAL_VALUE = 0.2

/**
 * 조합이 그 조각 하나보다 이만큼은 더 크게 나타나야 한다.
 *
 * 점수에만 반영하면 다른 항목이 높은 조합이 lift 0 으로도 통과한다.
 * "집 + 혼자" 가 그렇다 — 되풀이도 완벽하고 문맥을 맞춰도 남지만,
 * 집만 봐도 똑같이 나온다. 그건 새로운 발견이 아니라 이미 아는 이야기의 다른 이름이다.
 * 그래서 이건 점수가 아니라 통과 여부로 둔다.
 */
export const MIN_COMBINATION_LIFT = 0.2

/** 겹치는 정도가 이 이상이면 같은 이야기로 본다 */
export const SIMILAR = 0.75

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** 조각 하나만 봤을 때의 가장 큰 차이 */
const bestComponent = (candidate: PersonalCandidate): number =>
  candidate.componentEffects.reduce((max, c) => Math.max(max, Math.abs(c.effect)), 0)

/** 조합이 조각 하나보다 얼마나 더 크게 나타났는가 */
export const combinationLiftOf = (candidate: PersonalCandidate): number =>
  Math.round((Math.abs(candidate.measurement.effect) - bestComponent(candidate)) * 100) / 100

// ─────────────────────────────────────────────
// 새로움 점수
// ─────────────────────────────────────────────

const WEIGHTS: Record<keyof NoveltyParts, number> = {
  combinationLift: 0.3,
  independence: 0.2,
  consistency: 0.15,
  baselineLift: 0.15,
  specificity: 0.1,
  sampleQuality: 0.1,
}

export function noveltyOf(
  candidate: PersonalCandidate,
  totalLogs: number,
): { score: number; parts: NoveltyParts } {
  const m = candidate.measurement
  const gate = gateFor(candidate.contexts)

  // 조각 하나만 봐도 나오는 이야기라면 조합은 아무것도 더하지 않았다
  const lift = combinationLiftOf(candidate)

  const share = totalLogs > 0 ? m.sampleCount / totalLogs : 1

  const parts: NoveltyParts = {
    combinationLift: clamp01(lift / 0.6),
    // 문맥을 맞춰도 얼마나 남는가
    independence: clamp01(Math.abs(m.adjustedEffect ?? 0) / Math.max(0.01, Math.abs(m.effect))),
    consistency: clamp01((m.consistency - gate.consistency) / (1 - gate.consistency)),
    baselineLift: clamp01(Math.abs(m.effect) / 1.2),
    // 기록의 4분의 1을 차지하는 조합은 발견이 아니라 이 사람의 일상 그 자체다
    specificity: clamp01(1 - share / 0.25),
    sampleQuality: Math.min(
      clamp01(m.distinctDays / 20),
      clamp01(m.durationDays / 90),
    ),
  }

  const score = (Object.keys(WEIGHTS) as Array<keyof NoveltyParts>).reduce(
    (sum, key) => sum + parts[key] * WEIGHTS[key],
    0,
  )

  return { score: Math.round(score * 1000) / 1000, parts }
}

// ─────────────────────────────────────────────
// 이미 아는 것과 겹치는가
// ─────────────────────────────────────────────

export interface KnownPattern {
  metric: MetricKey
  direction: 1 | -1
  tagIds: string[]
}

/** 열려 있는 48개·Rare 가 무엇을 이미 말하고 있는지 (계획서 27) */
export function knownFrom(records: readonly DiscoveryRecord[]): KnownPattern[] {
  const out: KnownPattern[] = []

  for (const record of records) {
    if (record.state === 'LOCKED') continue
    for (const evidence of record.evidence) {
      if (!evidence.relatedTags.length) continue
      out.push({
        metric: evidence.metric,
        direction: evidence.effectSize >= 0 ? 1 : -1,
        tagIds: evidence.relatedTags,
      })
    }
  }

  return out
}

const keysOf = (contexts: readonly PersonalContext[]) =>
  contexts.map((c) => `${c.kind}:${c.key}`)

export function jaccard(a: readonly string[], b: readonly string[]): number {
  if (!a.length || !b.length) return 0
  const setB = new Set(b)
  const shared = new Set(a.filter((x) => setB.has(x))).size
  const union = new Set([...a, ...b]).size
  return union === 0 ? 0 : shared / union
}

/**
 * 48개가 이미 말한 이야기인가.
 * 태그만 견준다 — 48개는 시간대를 근거에 남기지 않기 때문이다.
 */
export function isKnown(candidate: PersonalCandidate, known: readonly KnownPattern[]): boolean {
  const tags = candidate.contexts.filter((c) => c.kind === 'tag').map((c) => c.key)
  if (!tags.length) return false

  return known.some(
    (k) =>
      k.metric === candidate.metric
      && k.direction === candidate.direction
      && jaccard(tags, k.tagIds) >= SIMILAR,
  )
}

// ─────────────────────────────────────────────
// 후보끼리 정리
// ─────────────────────────────────────────────

const isSuperset = (a: readonly PersonalContext[], b: readonly PersonalContext[]) => {
  if (a.length <= b.length) return false
  const keys = new Set(keysOf(a))
  return keysOf(b).every((k) => keys.has(k))
}

/**
 * 조각을 더 붙인 쪽은 그만큼 더 커야 남는다 (계획서 25).
 *
 * "저녁 + 클라이밍 + 클라이밍장" 이 "저녁 + 클라이밍" 과 같은 크기라면
 * 클라이밍장은 이야기를 더한 게 아니라 조건만 좁힌 것이다.
 * 좁을수록 표본이 줄고, 표본이 줄면 우연히 커지기 쉽다.
 */
export function keepsIncrementalValue(
  candidate: PersonalCandidate,
  all: readonly PersonalCandidate[],
): boolean {
  const size = Math.abs(candidate.measurement.effect)

  return !all.some((other) => {
    if (other === candidate) return false
    if (other.metric !== candidate.metric) return false
    if (other.direction !== candidate.direction) return false
    if (!isSuperset(candidate.contexts, other.contexts)) return false
    return size - Math.abs(other.measurement.effect) < INCREMENTAL_VALUE
  })
}

/** 거의 같은 조합이 여럿이면 점수가 높은 하나만 남긴다 */
export function mergeSimilar(candidates: readonly PersonalCandidate[]): PersonalCandidate[] {
  const kept: PersonalCandidate[] = []

  for (const candidate of [...candidates].sort((a, b) => b.novelty - a.novelty)) {
    const twin = kept.find(
      (k) =>
        k.metric === candidate.metric
        && k.direction === candidate.direction
        && jaccard(keysOf(k.contexts), keysOf(candidate.contexts)) >= SIMILAR,
    )
    if (!twin) kept.push(candidate)
  }

  return kept
}

// ─────────────────────────────────────────────
// 전체
// ─────────────────────────────────────────────

export interface RankOptions {
  logs: readonly QuickLog[]
  known: readonly KnownPattern[]
  /** 이미 열려 있는 나만의 발견 */
  existing: readonly PersonalDiscoveryRecord[]
}

/**
 * 후보를 점수 순으로 정리한다.
 * 이 함수를 지나면 남은 것은 "통계도 되고, 새롭기도 한" 것들뿐이다.
 */
export function rankCandidates(
  candidates: readonly PersonalCandidate[],
  options: RankOptions,
): PersonalCandidate[] {
  const total = options.logs.length
  const scored = candidates.map((c) => {
    const { score, parts } = noveltyOf(c, total)
    return { ...c, novelty: score, noveltyParts: parts }
  })

  const survivors = scored.filter(
    (c) =>
      combinationLiftOf(c) >= MIN_COMBINATION_LIFT
      && c.novelty >= MIN_NOVELTY
      && !isKnown(c, options.known)
      && keepsIncrementalValue(c, scored),
  )

  const openFingerprints = new Set(options.existing.map((r) => r.fingerprint))
  const fresh = mergeSimilar(survivors).filter((c) => {
    if (openFingerprints.has(c.fingerprint)) return true
    // 이미 열린 발견과 거의 같은 조합이면 새 발견으로 열지 않는다
    return !options.existing.some(
      (r) =>
        r.metric === c.metric
        && r.direction === c.direction
        && jaccard(keysOf(r.contexts), keysOf(c.contexts)) >= SIMILAR,
    )
  })

  return fresh.sort((a, b) => b.novelty - a.novelty)
}
