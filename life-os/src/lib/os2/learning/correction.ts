/**
 * 4A — 사용자가 손댄 순간을 남긴다.
 *
 * Inspector 에서 태그를 고치기 전과 후를 견줘서, 무엇이 달라졌는지만 뽑아낸다.
 * 여기서 규칙을 만들지는 않는다. 재료만 모은다.
 *
 * 안 고쳤다는 사실은 아무것도 아니다 (계획서 49).
 * 오래 놔뒀다고 맞다고 보지 않는다. 명시적으로 누른 것만 남긴다.
 */
import type { AppliedLifeTag, QuickLog } from '../types'
import type { CorrectionContext, CorrectionEvent, CorrectionKind } from './types'
import { SCHEMA_VERSION } from '../versions'
import { makeView } from '../tagging/normalize'

/** 본문을 견줄 수 있는 형태로 — 똑같은 문장 기억의 열쇠가 된다 */
export const normalizeText = (raw: string | null | undefined): string =>
  makeView((raw ?? '').trim())
    .lower.replace(/[.,!?…·;:'"()\[\]~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** 태그 하나의 상태를 한 글자로 — 달라졌는지 보려고 */
const stateOf = (tag: AppliedLifeTag): CorrectionKind | 'auto' => {
  if (tag.source === 'user') return 'added'
  if (tag.userRejected) return 'rejected'
  if (tag.userVerified) return 'verified'
  return 'auto'
}

function contextOf(log: QuickLog, tagId: string, myTagNames: readonly string[]): CorrectionContext {
  const others = (log.lifeTags ?? [])
    .filter((t) => t.tagId !== tagId && !t.userRejected)
    .map((t) => t.tagId)

  const target = (log.lifeTags ?? []).find((t) => t.tagId === tagId)

  return {
    myTagIds: log.myTagIds ?? [],
    myTagNames: [...myTagNames],
    lifeTagIds: others,
    dayPart: log.dayPart,
    dayOfWeek: log.dayOfWeek,
    temporalContext: target?.temporalContext ?? 'present',
  }
}

export interface ExtractOptions {
  /** 이 기록에 달린 내 태그 이름들 */
  myTagNames?: readonly string[]
  /** 사건 id 를 만드는 함수 — 테스트에서 고정할 수 있게 밖에서 받는다 */
  newId: () => string
  now?: () => string
}

/**
 * 고치기 전과 후를 견줘서 손짓만 뽑아낸다.
 *
 * after 를 기준으로 본다. before 에 없던 판단이 after 에 생겼으면 그게 손짓이다.
 * 되돌리기(판단을 지운 것)는 사건으로 남기지 않는다 —
 * "아니라고 했다가 취소했다" 를 무슨 뜻으로 배워야 할지 알 수 없기 때문이다.
 */
export function extractCorrections(
  log: QuickLog,
  before: readonly AppliedLifeTag[],
  after: readonly AppliedLifeTag[],
  options: ExtractOptions,
): CorrectionEvent[] {
  const at = options.now?.() ?? new Date().toISOString()
  const text = log.text ?? ''
  const normalized = normalizeText(text)
  const previous = new Map(before.map((t) => [t.tagId, t]))

  const out: CorrectionEvent[] = []

  for (const tag of after) {
    const state = stateOf(tag)
    if (state === 'auto') continue

    const was = previous.get(tag.tagId)
    // 이미 같은 판단이었으면 새 손짓이 아니다
    if (was && stateOf(was) === state) continue

    out.push({
      id: options.newId(),
      userId: log.userId,
      quickLogId: log.id,
      kind: state,
      tagId: tag.tagId,
      text,
      normalizedText: normalized,
      matchedText: tag.matchedText ?? was?.matchedText ?? null,
      sourceRuleId: tag.ruleId ?? was?.ruleId ?? null,
      context: contextOf({ ...log, lifeTags: [...after] }, tag.tagId, options.myTagNames ?? []),
      date: log.date,
      createdAt: at,
      schemaVersion: SCHEMA_VERSION,
    })
  }

  return out
}

// ─────────────────────────────────────────────
// 배우면 안 되는 손짓 거르기
//
// 여기가 Phase 4 에서 제일 조심스러운 자리다.
// 잘못 배운 규칙 하나는 앞으로의 모든 기록을 오염시킨다 (계획서 65).
// ─────────────────────────────────────────────

export type SkipReason =
  /** 미래·가정 이야기에서 나온 손짓 */
  | 'not-present'
  /** 남의 이야기 문장 */
  | 'about-someone-else'
  /** 부정문 안에서만 나온 말 */
  | 'inside-negation'
  /** 본문이 없다 */
  | 'no-text'
  /** 본문이 너무 짧다 */
  | 'too-short'

/** 남을 주어로 세운 문장인지 — Phase 3 의 판단을 그대로 쓴다 */
const OTHER_SUBJECT =
  /(친구|동생|엄마|아빠|언니|오빠|누나|형|부모님|팀장|상사|동료|사장|선배|후배|선생님|남편|아내|여친|남친|애인|걔|쟤|사람들|애들|고객)(가|이|는|은|도)/

const SELF = /(나는|난 |내가|나도|제가|저는)/

/** 부정 표시 — 이 안에서 나온 말로 규칙을 만들면 뜻이 뒤집힌다 (계획서 53) */
const NEGATION = /(안 |안$|못 |별로|전혀|하나도|지 않|지않|지 못|없었|없어|아니)/

export function skipReason(event: CorrectionEvent): SkipReason | null {
  const text = event.normalizedText
  if (!text) return 'no-text'
  if (text.replace(/\s/g, '').length < 2) return 'too-short'

  // "내일 클라이밍 갈 거야" 에서 배운 것을 오늘 일에 쓰면 안 된다 (계획서 54)
  if (event.context.temporalContext !== 'present') return 'not-present'

  // "성현이 피곤하대" 는 내 상태가 아니다 (계획서 55)
  if (OTHER_SUBJECT.test(text) && !SELF.test(text)) return 'about-someone-else'

  // "오늘은 기 안 빨림" 을 보고 "기 빨림 → 막기" 를 배우면 안 된다
  if (event.kind === 'rejected' && event.matchedText && NEGATION.test(text)) {
    return 'inside-negation'
  }

  return null
}

export const isLearnable = (event: CorrectionEvent) => skipReason(event) === null

export const learnableOnly = (events: readonly CorrectionEvent[]): CorrectionEvent[] =>
  events.filter(isLearnable)
