/**
 * Life OS 2.0 Phase 4 — 개인 규칙.
 *
 * 여기 있는 것들은 전부 "이 사람이 이렇게 고쳤다" 에서 나온다.
 * 시스템이 혼자 추론해서 만드는 것은 하나도 없다.
 *
 * 그리고 built-in 사전은 절대 건드리지 않는다.
 * 개인 규칙은 그 위에 얇게 덮는 겹(overlay)일 뿐이다.
 */
import type { AppliedLifeTag, DayOfWeek, DayPart, TemporalContext } from '../types'
import type { Versioned } from '../versions'

// ─────────────────────────────────────────────
// 4A — 교정 사건
//
// 사용자가 Inspector 에서 손을 댄 순간 하나를 그대로 남긴다.
// 규칙을 만들고 나서도 근거는 지우지 않는다 —
// "왜 이걸 배웠지?" 에 답할 수 있어야 나중에 잘못 배운 것을 찾아낸다.
// ─────────────────────────────────────────────

/**
 * 어떤 손짓이었나.
 *   verified   자동으로 붙은 걸 "맞아요" 했다
 *   rejected   자동으로 붙은 걸 "이 태그 제외" 했다
 *   added      자동으로 안 붙은 걸 직접 골라 넣었다
 */
export type CorrectionKind = 'verified' | 'rejected' | 'added'

/**
 * 손짓의 무게.
 *
 * 직접 고른 것이 제일 세다 — 시스템이 놓친 것을 사람이 채운 것이기 때문이다.
 * "맞아요" 는 이미 있는 것을 확인해 준 것이라 조금 약하다.
 * 그냥 놔둔 것은 0 이다. 안 고쳤다고 맞다고 볼 수는 없다 (계획서 49).
 */
export const SIGNAL_WEIGHT: Record<CorrectionKind, number> = {
  added: 1,
  rejected: 1,
  verified: 0.8,
}

export interface CorrectionContext {
  /** 이 기록에 달려 있던 내 태그들 */
  myTagIds: string[]
  /** 내 태그 이름 — 규칙을 사람 말로 보여 줄 때 쓴다 */
  myTagNames: string[]
  /** 같이 붙어 있던 LIFE TAG (교정 대상은 뺀다) */
  lifeTagIds: string[]
  dayPart: DayPart
  dayOfWeek: DayOfWeek
  /** 그 태그가 붙었던 시제 — 미래 이야기에서 배우면 안 된다 */
  temporalContext: TemporalContext
}

export interface CorrectionEvent extends Versioned {
  id: string
  userId: string
  /** 어느 기록에서 나온 손짓인가 */
  quickLogId: string
  kind: CorrectionKind
  /** 무슨 태그에 대한 손짓인가 */
  tagId: string

  /** 원문 그대로 */
  text: string
  /** 다듬은 본문 — 똑같은 문장을 다시 만났는지 볼 때 쓴다 */
  normalizedText: string
  /** built-in 규칙이 잡았던 말 (있으면) */
  matchedText: string | null
  /** built-in 규칙 이름 (있으면) */
  sourceRuleId: string | null

  context: CorrectionContext
  /** 기록의 날짜 (로컬 YYYY-MM-DD) — 며칠에 걸쳐 반복됐는지 셀 때 쓴다 */
  date: string
  createdAt: string
}

// ─────────────────────────────────────────────
// 똑같은 문장 기억
//
// 반복을 기다리지 않고 한 번에 외운다.
// 대신 아주 좁게 — 다듬은 본문이 글자 하나까지 같을 때만 꺼낸다.
// 비슷한 문장까지 끌어다 쓰면 그건 일반화이고, 일반화는 규칙 쪽 일이다.
// ─────────────────────────────────────────────

export interface ExactMemory extends Versioned {
  id: string
  userId: string
  /** 다듬은 본문 전체가 열쇠다 */
  normalizedText: string
  /** 이 문장에서는 이 태그들을 붙인다 */
  addTagIds: string[]
  /** 이 문장에서는 이 태그들을 막는다 */
  suppressTagIds: string[]
  useCount: number
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
}

// ─────────────────────────────────────────────
// 4B/4C — 후보와 규칙
// ─────────────────────────────────────────────

export type RuleType =
  /** 이 말이 나오면 이 태그를 붙인다 */
  | 'positive'
  /** 이 말이 나오면 built-in 이 붙인 이 태그를 막는다 */
  | 'suppress'
  /** 이 말은 이 태그와 같은 뜻이다 — positive 의 한 갈래지만 표현 매핑이라 따로 본다 */
  | 'alias'

export type RuleStatus =
  /** 아직 근거가 모자라다. 적용하지 않는다 */
  | 'candidate'
  /** 실제로 적용한다 */
  | 'active'
  /** 반대되는 교정이 늘어서 잠시 멈췄다 */
  | 'paused'
  /** 오래 쓰이지 않았거나 사용자가 껐다. 지우지는 않는다 */
  | 'deprecated'

/** 화면에 보여 줄 단계. 숫자를 확률처럼 읽게 하지 않는다 */
export type ConfidenceTier = 'learning' | 'reliable' | 'strong'

/**
 * 규칙이 성립하는 문맥.
 *
 * 좁을수록 안전하지만 너무 좁으면 다시는 안 걸린다.
 * 그래서 "충분히 좁은 것 중 가장 넓은 것" 을 고르려고 한다 (계획서 11).
 */
export interface RuleContext {
  myTagIds?: string[]
  lifeTagIds?: string[]
  dayPart?: DayPart
  dayOfWeek?: DayOfWeek
  /**
   * 이 시제에서만 성립한다. 안 적으면 present 로 본다.
   * "내일 클라이밍 갈 거야" 에서 배운 것을 오늘 일에 쓰면 안 되기 때문이다.
   */
  temporalContext?: TemporalContext
}

export interface PersonalRule extends Versioned {
  id: string
  userId: string

  type: RuleType
  status: RuleStatus

  /** 본문에서 찾을 말 */
  trigger: string
  /** 조사·어미를 떼어 낸 형태 — 같은 말인지 볼 때 이걸 쓴다 */
  normalizedTrigger: string

  /** positive/alias 일 때 붙일 태그 */
  targetTagId: string | null
  /** suppress 일 때 막을 태그 */
  suppressedTagId: string | null

  context: RuleContext

  correctionCount: number
  positiveCount: number
  negativeCount: number
  /** 며칠에 걸쳐 반복됐는지 */
  distinctDays: number
  /** 반대 방향 교정이 몇 번 있었는지 */
  conflictCount: number

  /** 0~1 */
  confidence: number
  /** 문맥을 몇 개 걸었는지 — 구체적인 규칙이 먼저다 */
  specificity: number

  /** 사용자가 직접 만들었거나 직접 승격시킨 규칙 */
  userDefined: boolean

  lastMatchedAt: string | null
  lastCorrectedAt: string | null

  taxonomyVersion: number
  ruleVersion: number
  createdAt: string
  updatedAt: string
}

/** 저장 전 형태 */
export type PersonalRuleInput = Omit<
  PersonalRule,
  'id' | 'userId' | 'createdAt' | 'updatedAt' | 'schemaVersion'
>

// ─────────────────────────────────────────────
// 적용 결과
// ─────────────────────────────────────────────

/** 개인 규칙이 붙인 태그 — built-in 이 붙인 것과 구별된다 */
export interface PersonalTag extends AppliedLifeTag {
  userRuleId: string
}

export const isPersonalTag = (tag: AppliedLifeTag): tag is PersonalTag =>
  typeof (tag as PersonalTag).userRuleId === 'string'
