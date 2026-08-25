/**
 * 4C — 후보를 실제 규칙으로 올릴지 정한다.
 *
 * 한 번 고쳤다고 바로 외우지 않는다.
 * 대신 그 한 번은 "똑같은 문장 기억" 이 따로 챙긴다 (memory.ts) —
 * 그러니 여기서 기다린다고 사용자의 수정이 버려지는 건 아니다.
 *
 * 막는 규칙(suppress)은 더 오래 기다린다.
 * 잘못 붙은 태그는 눈에 띄지만, 잘못 막힌 태그는 없다는 것조차 모른다.
 */
import type { Candidate } from './candidates'
import { specificityOf } from './candidates'
import type { ConfidenceTier, PersonalRule, PersonalRuleInput, RuleContext } from './types'
import { TAXONOMY_VERSION } from '../versions'
import { TAGGING_RULE_VERSION } from '../tagging/engine'
import { normalizeTrigger } from './trigger'

/** 붙이는 규칙 — 세 번, 이틀 (계획서 7) */
export const POSITIVE_MIN_COUNT = 3
export const POSITIVE_MIN_DAYS = 2
export const POSITIVE_MIN_AGREEMENT = 0.8

/** 막는 규칙 — 네 번, 사흘, 더 높은 일치율 (계획서 13) */
export const SUPPRESS_MIN_COUNT = 4
export const SUPPRESS_MIN_DAYS = 3
export const SUPPRESS_MIN_AGREEMENT = 0.9

export type PromotionVerdict =
  | { promote: true }
  | { promote: false; reason: 'not-enough' | 'not-enough-days' | 'inconsistent' | 'no-context' }

/**
 * 문맥 없는 규칙은 만들지 않는다 (계획서 10).
 * '원트' 만으로 성취를 붙이면 "촬영 원트로 끝남" 에도 붙는다.
 *
 * 다만 사용자가 직접 만든 규칙은 예외다 — 본인이 그렇게 하겠다고 한 것이다.
 */
const hasContext = (context: RuleContext) =>
  Boolean(context.myTagIds?.length || context.lifeTagIds?.length)

export function judge(candidate: Candidate, userDefined = false): PromotionVerdict {
  if (userDefined) return { promote: true }

  const suppress = candidate.type === 'suppress'
  const minCount = suppress ? SUPPRESS_MIN_COUNT : POSITIVE_MIN_COUNT
  const minDays = suppress ? SUPPRESS_MIN_DAYS : POSITIVE_MIN_DAYS
  const minAgreement = suppress ? SUPPRESS_MIN_AGREEMENT : POSITIVE_MIN_AGREEMENT

  if (candidate.agreeing < minCount) return { promote: false, reason: 'not-enough' }
  if (candidate.distinctDays < minDays) return { promote: false, reason: 'not-enough-days' }
  if (agreementOf(candidate) < minAgreement) return { promote: false, reason: 'inconsistent' }
  if (!hasContext(candidate.context)) return { promote: false, reason: 'no-context' }

  return { promote: true }
}

export const agreementOf = (candidate: Candidate): number => {
  const total = candidate.agreeing + candidate.disagreeing
  return total === 0 ? 0 : candidate.agreeing / total
}

// ─────────────────────────────────────────────
// 신뢰도
//
// 단순하고 설명 가능해야 한다 (계획서 16). 머신러닝 금지.
// 더하기 빼기 몇 줄이면 "왜 이 점수인지" 를 화면에서 그대로 말할 수 있다.
// ─────────────────────────────────────────────

export const BASE_CONFIDENCE = 0.35
/** 손짓 하나당 */
const PER_SIGNAL = 0.05
const MAX_SIGNAL_BONUS = 0.25
/** 다른 날 하나당 — 하루에 몰아서 다섯 번 누른 것보다 사흘에 걸친 세 번이 낫다 */
const PER_DAY = 0.035
const MAX_DAY_BONUS = 0.15
/** 방향이 일치할수록 */
const AGREEMENT_WEIGHT = 0.12
/** 문맥이 좁을수록 */
const PER_SPECIFICITY = 0.02
const MAX_SPECIFICITY_BONUS = 0.06
/** 반대 교정 하나당 깎는다 */
const PER_CONFLICT = 0.12

/**
 * 자동으로 배운 규칙은 여기까지만 올라간다.
 * 천장에 붙으면 더 쌓여도 점수가 안 움직여서, 오래 검증된 규칙과
 * 이제 막 올라온 규칙을 구별할 수 없게 된다.
 */
const CEILING = 0.97

export function confidenceOf(input: {
  weight: number
  distinctDays: number
  agreement: number
  specificity: number
  conflictCount: number
  userDefined?: boolean
}): number {
  // 사용자가 직접 만든 규칙은 계산하지 않는다. 본인이 그렇다고 한 것보다 센 근거는 없다
  if (input.userDefined) return CEILING

  const value =
    BASE_CONFIDENCE
    + Math.min(MAX_SIGNAL_BONUS, input.weight * PER_SIGNAL)
    + Math.min(MAX_DAY_BONUS, input.distinctDays * PER_DAY)
    + input.agreement * AGREEMENT_WEIGHT
    + Math.min(MAX_SPECIFICITY_BONUS, input.specificity * PER_SPECIFICITY)
    - input.conflictCount * PER_CONFLICT

  return Number(Math.min(CEILING, Math.max(0, value)).toFixed(4))
}

/**
 * 화면에 보여 줄 단계 (계획서 17, 58).
 * 0.83 같은 숫자를 그대로 보여 주면 확률처럼 읽힌다. 그런 정확도가 아니다.
 */
export function tierOf(rule: {
  correctionCount: number
  distinctDays: number
  conflictCount: number
  confidence: number
}): ConfidenceTier {
  if (rule.correctionCount >= 7 && rule.distinctDays >= 4 && rule.conflictCount === 0) {
    return 'strong'
  }
  if (rule.correctionCount >= 4 && rule.distinctDays >= 3 && rule.confidence >= 0.7) {
    return 'reliable'
  }
  return 'learning'
}

export const TIER_LABEL: Record<ConfidenceTier, string> = {
  learning: '배우는 중',
  reliable: '어느 정도 확실',
  strong: '확실',
}

// ─────────────────────────────────────────────

/** 후보를 규칙 모양으로 바꾼다. 저장은 repository 가 한다 */
export function toRule(candidate: Candidate, options: { userDefined?: boolean } = {}): PersonalRuleInput {
  const userDefined = options.userDefined ?? false
  const verdict = judge(candidate, userDefined)
  const agreement = agreementOf(candidate)
  const specificity = specificityOf(candidate.context)
  const suppress = candidate.type === 'suppress'

  const dates = candidate.events.map((e) => e.date).sort()
  const stamps = candidate.events.map((e) => e.createdAt).sort()
  const lastCorrectedAt = stamps.length ? stamps[stamps.length - 1] : null

  return {
    type: candidate.type,
    status: verdict.promote ? 'active' : 'candidate',
    trigger: candidate.trigger,
    normalizedTrigger: normalizeTrigger(candidate.trigger),
    targetTagId: suppress ? null : candidate.tagId,
    suppressedTagId: suppress ? candidate.tagId : null,
    context: candidate.context,
    correctionCount: candidate.agreeing,
    positiveCount: suppress ? 0 : candidate.agreeing,
    negativeCount: suppress ? candidate.agreeing : 0,
    distinctDays: new Set(dates).size,
    conflictCount: candidate.disagreeing,
    confidence: confidenceOf({
      weight: candidate.weight,
      distinctDays: candidate.distinctDays,
      agreement,
      specificity,
      conflictCount: candidate.disagreeing,
      userDefined,
    }),
    specificity,
    userDefined,
    lastMatchedAt: null,
    lastCorrectedAt,
    taxonomyVersion: TAXONOMY_VERSION,
    ruleVersion: TAGGING_RULE_VERSION,
  }
}

const latestOf = (candidate: Candidate): string | null => {
  const stamps = candidate.events.map((e) => e.createdAt).sort()
  return stamps.length ? stamps[stamps.length - 1] : null
}

/** 이미 있는 규칙에 새 근거를 얹는다 */
export function reinforce(rule: PersonalRule, candidate: Candidate): PersonalRule {
  const correctionCount = candidate.agreeing
  const conflictCount = candidate.disagreeing
  const distinctDays = candidate.distinctDays
  const agreement = agreementOf(candidate)

  const next: PersonalRule = {
    ...rule,
    correctionCount,
    conflictCount,
    distinctDays,
    positiveCount: candidate.type === 'suppress' ? 0 : correctionCount,
    negativeCount: candidate.type === 'suppress' ? correctionCount : 0,
    confidence: confidenceOf({
      weight: candidate.weight,
      distinctDays,
      agreement,
      specificity: rule.specificity,
      conflictCount,
      userDefined: rule.userDefined,
    }),
    lastCorrectedAt: latestOf(candidate) ?? rule.lastCorrectedAt,
    updatedAt: new Date().toISOString(),
  }

  // 아직 후보였다면 이번에 올라갈 수 있는지 다시 본다
  if (rule.status === 'candidate' && judge(candidate, rule.userDefined).promote) {
    next.status = 'active'
  }

  return next
}
