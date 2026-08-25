/**
 * 4B — 반복되는 교정을 묶는다.
 *
 * "오늘 원트 세 개" / "남색 원트" / "원트 성공" 이 전부 성취로 고쳐졌다면,
 * 이 셋의 공통점은 '원트' 와 '클라이밍 문맥' 이다. 그걸 찾아내는 게 여기 하는 일이다.
 *
 * 방법은 단순하다. built-in 이 잡았던 말이 있으면 그걸 쓰고,
 * 없으면 본문을 띄어쓰기로 잘라 여러 기록에 공통으로 나오는 말을 찾는다.
 * 형태소 분석기도, 임베딩도, 유사도 계산도 없다.
 */
import type { CorrectionEvent, RuleContext, RuleType } from './types'
import { SIGNAL_WEIGHT } from './types'
import { commonPhrases, isLearnableTrigger, normalizeTrigger } from './trigger'
import { getAncestors } from '../taxonomy/registry'

/** 후보 하나 — 아직 규칙이 아니다 */
export interface Candidate {
  /** 같은 후보인지 알아보는 열쇠 */
  key: string
  type: RuleType
  trigger: string
  normalizedTrigger: string
  /** positive/alias 면 붙일 태그, suppress 면 막을 태그 */
  tagId: string
  context: RuleContext

  /** 이 후보를 받치는 손짓들 */
  events: CorrectionEvent[]
  /** 방향이 같은 손짓 수 */
  agreeing: number
  /** 반대 방향 손짓 수 */
  disagreeing: number
  /** 며칠에 걸쳐 나왔는지 */
  distinctDays: number
  /** 손짓의 무게 합 */
  weight: number
}

/** positive 인가 suppress 인가 */
const typeOf = (kind: CorrectionEvent['kind']): RuleType =>
  kind === 'rejected' ? 'suppress' : kind === 'added' ? 'positive' : 'alias'

/** 같은 방향인가 — verified 와 added 는 둘 다 "붙이자" 쪽이다 */
const isPositiveKind = (kind: CorrectionEvent['kind']) => kind !== 'rejected'

/**
 * 후보의 문맥을 정한다.
 *
 * 문맥을 다 넣으면 다시는 안 걸리고, 하나도 안 넣으면 아무 데나 걸린다.
 * 그래서 "이 손짓들 전부에 공통으로 있던 것" 만 넣는다 —
 * 세 번 다 클라이밍 태그가 달려 있었으면 클라이밍이 문맥이고,
 * 요일이 매번 달랐으면 요일은 문맥이 아니다.
 */
export function sharedContext(events: readonly CorrectionEvent[]): RuleContext {
  if (!events.length) return {}

  const intersect = (lists: string[][]): string[] => {
    const [first, ...rest] = lists
    return (first ?? []).filter((value) => rest.every((list) => list.includes(value)))
  }

  const myTagIds = intersect(events.map((e) => e.context.myTagIds))
  // LIFE TAG 는 조상까지 펼쳐서 견준다 — bouldering 과 climbing 은 같은 줄기다
  const lifeTagIds = intersect(
    events.map((e) => [
      ...e.context.lifeTagIds,
      ...e.context.lifeTagIds.flatMap((id) => getAncestors(id)),
    ]),
  )

  const context: RuleContext = {}
  if (myTagIds.length) context.myTagIds = myTagIds
  if (lifeTagIds.length) context.lifeTagIds = pickNarrowest(lifeTagIds)

  // 시제는 항상 남긴다. present 에서 배운 것을 미래 문장에 쓰면 안 된다
  context.temporalContext = 'present'

  return context
}

/**
 * 같은 줄기가 여럿이면 제일 아래만 남긴다.
 * climbing 과 exercise 가 둘 다 공통이면 climbing 이 더 뜻이 분명하다.
 */
function pickNarrowest(tagIds: readonly string[]): string[] {
  const set = new Set(tagIds)
  return [...set].filter((id) => !tagIds.some((other) => getAncestors(other).includes(id)))
}

/** 문맥을 몇 개 걸었는지 — 구체적인 규칙이 먼저 적용된다 (계획서 23) */
export const specificityOf = (context: RuleContext): number =>
  1
  + (context.myTagIds?.length ? 1 : 0)
  + (context.lifeTagIds?.length ? 1 : 0)
  + (context.dayPart ? 1 : 0)
  + (context.dayOfWeek !== undefined ? 1 : 0)

/**
 * 손짓들에서 후보를 만든다.
 *
 * 태그별로 모은 다음, 그 안에서 공통된 말을 찾는다.
 * 말을 못 찾으면 후보를 만들지 않는다 — 무엇을 보고 붙일지 모르는 규칙은 쓸모가 없다.
 */
export function buildCandidates(events: readonly CorrectionEvent[]): Candidate[] {
  const byTag = new Map<string, CorrectionEvent[]>()
  for (const event of events) {
    byTag.set(event.tagId, [...(byTag.get(event.tagId) ?? []), event])
  }

  const out: Candidate[] = []

  for (const [tagId, group] of byTag) {
    for (const kindGroup of splitByDirection(group)) {
      const trigger = findTrigger(kindGroup)
      if (!trigger) continue

      // 그 말이 실제로 들어 있는 손짓만 이 후보를 받친다
      const supporting = kindGroup.filter((e) => mentions(e, trigger))
      if (!supporting.length) continue

      const opposite = group.filter(
        (e) => isPositiveKind(e.kind) !== isPositiveKind(supporting[0].kind) && mentions(e, trigger),
      )

      const context = sharedContext(supporting)
      const type = typeOf(supporting[0].kind)

      out.push({
        key: candidateKey(type, trigger, tagId, context),
        type,
        trigger,
        normalizedTrigger: normalizeTrigger(trigger),
        tagId,
        context,
        events: supporting,
        agreeing: supporting.length,
        disagreeing: opposite.length,
        distinctDays: new Set(supporting.map((e) => e.date)).size,
        weight: supporting.reduce((sum, e) => sum + SIGNAL_WEIGHT[e.kind], 0),
      })
    }
  }

  return out.sort((a, b) => b.weight - a.weight || a.key.localeCompare(b.key))
}

/** 붙이자는 손짓과 막자는 손짓은 따로 센다 */
function splitByDirection(events: readonly CorrectionEvent[]): CorrectionEvent[][] {
  const yes = events.filter((e) => isPositiveKind(e.kind))
  const no = events.filter((e) => !isPositiveKind(e.kind))
  return [yes, no].filter((list) => list.length > 0)
}

/**
 * 이 손짓들의 공통된 말을 찾는다.
 *
 * built-in 이 잡은 말이 전부 같으면 그게 답이다 — 제일 믿을 만하다.
 * 아니면 본문에서 두 번 이상 나온 말 중 가장 긴 것을 쓴다.
 */
function findTrigger(events: readonly CorrectionEvent[]): string | null {
  const matched = events.map((e) => e.matchedText).filter((v): v is string => Boolean(v))
  if (matched.length === events.length && matched.length > 0) {
    const first = normalizeTrigger(matched[0])
    if (matched.every((m) => normalizeTrigger(m) === first) && isLearnableTrigger(first)) {
      return first
    }
  }

  const shared = commonPhrases(events.map((e) => e.normalizedText))
  return shared[0] ?? null
}

/** 이 손짓의 본문에 그 말이 들어 있는가 */
const mentions = (event: CorrectionEvent, trigger: string) => {
  const dense = (v: string) => v.replace(/\s+/g, '')
  return dense(event.normalizedText).includes(dense(trigger))
    || dense(normalizeTrigger(event.matchedText ?? '')) === dense(trigger)
}

export function candidateKey(
  type: RuleType,
  trigger: string,
  tagId: string,
  context: RuleContext,
): string {
  const parts = [
    type,
    normalizeTrigger(trigger).replace(/\s+/g, ''),
    tagId,
    (context.myTagIds ?? []).slice().sort().join('+'),
    (context.lifeTagIds ?? []).slice().sort().join('+'),
  ]
  return parts.join('|')
}
