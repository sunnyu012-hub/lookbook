/**
 * 4F — 규칙의 한살이.
 *
 * 사람은 바뀐다. 작년에 '기 빨림' 이던 말이 올해는 다른 뜻일 수 있다.
 * 그래서 규칙을 영원히 고정하지 않는다.
 *
 * 다만 시간이 지났다는 이유만으로 지우지도 않는다 (계획서 24).
 * 안 쓰이는 규칙은 조용히 힘이 빠지다가 물러날 뿐이고, 실제로 지우는 건 사용자만 한다.
 */
import type { PersonalRule, RuleStatus } from './types'
import { confidenceOf } from './promotion'

/** 이 기간 동안 한 번도 안 걸리면 힘이 빠지기 시작한다 */
export const IDLE_DAYS_BEFORE_DECAY = 60
/** 이 기간 동안 안 걸리면 물러난다 */
export const IDLE_DAYS_BEFORE_DEPRECATE = 180
/** 반대 교정이 이만큼 쌓이면 멈춘다 */
export const CONFLICTS_BEFORE_PAUSE = 2
/** 힘이 이 아래로 내려가면 적용하지 않는다 */
export const MIN_ACTIVE_CONFIDENCE = 0.55

const DAY = 24 * 60 * 60 * 1000

const daysSince = (iso: string | null, now: number): number | null => {
  if (!iso) return null
  const then = new Date(iso).getTime()
  return Number.isNaN(then) ? null : Math.floor((now - then) / DAY)
}

/** 마지막으로 무슨 일이 있었던 게 며칠 전인가 */
export function idleDays(rule: PersonalRule, now = Date.now()): number | null {
  const candidates = [rule.lastMatchedAt, rule.lastCorrectedAt, rule.updatedAt]
    .map((iso) => daysSince(iso, now))
    .filter((v): v is number => v !== null)
  return candidates.length ? Math.min(...candidates) : null
}

export interface LifecycleChange {
  status: RuleStatus
  confidence: number
  reason:
    | 'unchanged'
    | 'too-many-conflicts'
    | 'too-weak'
    | 'idle-decay'
    | 'long-idle'
    | 'recovered'
}

/**
 * 이 규칙이 지금 어떤 상태여야 하는가.
 *
 * 사용자가 직접 만든 규칙은 건드리지 않는다.
 * 본인이 그렇게 하겠다고 한 것을 시스템이 몰래 끄면 안 된다 (계획서 35).
 */
export function review(rule: PersonalRule, now = Date.now()): LifecycleChange {
  const unchanged: LifecycleChange = {
    status: rule.status,
    confidence: rule.confidence,
    reason: 'unchanged',
  }

  if (rule.userDefined) return unchanged
  if (rule.status === 'deprecated') return unchanged

  // 반대 교정이 쌓였다 — 지우지 않고 멈춘다 (계획서 59)
  if (rule.conflictCount >= CONFLICTS_BEFORE_PAUSE && rule.status === 'active') {
    return { status: 'paused', confidence: rule.confidence, reason: 'too-many-conflicts' }
  }

  const idle = idleDays(rule, now)

  if (idle !== null && idle >= IDLE_DAYS_BEFORE_DEPRECATE) {
    return { status: 'deprecated', confidence: rule.confidence, reason: 'long-idle' }
  }

  if (idle !== null && idle >= IDLE_DAYS_BEFORE_DECAY) {
    // 하루아침에 깎지 않는다. 두 달 넘게 안 쓰였으면 조금씩만
    const weakened = Number(Math.max(0, rule.confidence - 0.1).toFixed(4))
    const status: RuleStatus = weakened < MIN_ACTIVE_CONFIDENCE ? 'paused' : rule.status
    return { status, confidence: weakened, reason: 'idle-decay' }
  }

  if (rule.status === 'active' && rule.confidence < MIN_ACTIVE_CONFIDENCE) {
    return { status: 'paused', confidence: rule.confidence, reason: 'too-weak' }
  }

  // 멈춰 있었는데 충돌이 정리되고 힘이 돌아왔으면 다시 쓴다
  if (
    rule.status === 'paused'
    && rule.conflictCount < CONFLICTS_BEFORE_PAUSE
    && rule.confidence >= MIN_ACTIVE_CONFIDENCE
  ) {
    return { status: 'active', confidence: rule.confidence, reason: 'recovered' }
  }

  return unchanged
}

/** 검토 결과를 규칙에 반영한다 */
export function applyReview(rule: PersonalRule, now = Date.now()): PersonalRule {
  const change = review(rule, now)
  if (change.reason === 'unchanged') return rule
  return {
    ...rule,
    status: change.status,
    confidence: change.confidence,
    updatedAt: new Date(now).toISOString(),
  }
}

/**
 * 반대되는 교정이 들어왔다.
 * 곧바로 끄지 않는다 — 충돌을 세고 힘을 깎는다. 계속되면 review 가 멈춘다.
 */
export function weaken(rule: PersonalRule): PersonalRule {
  const conflictCount = rule.conflictCount + 1
  const total = rule.correctionCount + conflictCount
  return {
    ...rule,
    conflictCount,
    confidence: confidenceOf({
      weight: rule.correctionCount,
      distinctDays: rule.distinctDays,
      agreement: total ? rule.correctionCount / total : 0,
      specificity: rule.specificity,
      conflictCount,
      userDefined: rule.userDefined,
    }),
    updatedAt: new Date().toISOString(),
  }
}

/** 규칙이 걸렸다고 표시 — 이건 학습 근거가 아니다 (계획서 48) */
export const markMatched = (rule: PersonalRule, at = new Date().toISOString()): PersonalRule => ({
  ...rule,
  lastMatchedAt: at,
})

export const STATUS_LABEL: Record<RuleStatus, string> = {
  candidate: '배우는 중',
  active: '쓰는 중',
  paused: '잠시 멈춤',
  deprecated: '물러남',
}
