/**
 * 4D / 4E — 개인 규칙을 built-in 위에 덮는다.
 *
 * built-in 사전과 엔진은 손대지 않는다. 먼저 그대로 돌리고, 그 결과 위에 겹을 얹는다.
 * 이렇게 해야 개인 규칙 쪽에서 무슨 일이 나도 built-in 태깅은 살아남는다 (계획서 47).
 *
 * 순서 (계획서 18):
 *   built-in → 개인 규칙(붙이기) → 개인 규칙(막기) → 똑같은 문장 기억 → 사용자 판단
 *
 * 마지막이 사용자 판단인 이유는 하나다. 그게 제일 세기 때문이다 (계획서 20, 21).
 * 이 기록에서 "이 태그 아니에요" 한 것은 어떤 규칙도 되살릴 수 없다.
 */
import type { AppliedLifeTag } from '../types'
import type { ExactMemory, PersonalRule, PersonalTag, RuleContext } from './types'
import { TAXONOMY_VERSION } from '../versions'
import {
  CONFIDENCE_THRESHOLD,
  MAX_TAGS_PER_LOG,
  TAGGING_RULE_VERSION,
  analyze,
  type TaggingInput,
  type TaggingResult,
} from '../tagging/engine'
import { collapseToLeaves, getAncestors, getTag } from '../taxonomy/registry'
import { conflicts } from '../tagging/conflicts'
import { canSearchDense, clauseAt, findTerm, makeView, splitClauses } from '../tagging/normalize'
import { isNegated } from '../tagging/negation'
import { contextOfClause } from '../tagging/temporal'
import { findMemory } from './memory'
import { normalizeTrigger } from './trigger'

export interface Overlay {
  rules?: readonly PersonalRule[]
  memories?: readonly ExactMemory[]
  /** 이 기록에 이미 달려 있던 태그 — 사용자 판단을 지키려고 받는다 */
  previous?: readonly AppliedLifeTag[]
}

export interface PersonalTaggingResult extends TaggingResult {
  /** 개인 규칙이 붙인 태그 id 들 */
  fromRules: string[]
  /** 개인 규칙이 막은 태그 id 들 */
  suppressed: string[]
  /** 똑같은 문장 기억이 쓰였는지 */
  memoryUsed: string | null
}

/**
 * built-in 태깅 + 개인 겹.
 *
 * 개인 겹에서 예외가 나면 built-in 결과를 그대로 돌려준다.
 * 배우다 만 규칙 하나 때문에 태그가 통째로 사라지는 일은 없어야 한다.
 */
export function analyzeWithPersonal(
  input: TaggingInput,
  overlay: Overlay = {},
): PersonalTaggingResult {
  const base = analyze(input)
  const empty: PersonalTaggingResult = {
    ...base,
    fromRules: [],
    suppressed: [],
    memoryUsed: null,
  }

  try {
    return overlayOn(base, input, overlay)
  } catch {
    return empty
  }
}

function overlayOn(
  base: TaggingResult,
  input: TaggingInput,
  overlay: Overlay,
): PersonalTaggingResult {
  const at = new Date().toISOString()
  const active = (overlay.rules ?? []).filter((r) => r.status === 'active')
  const byId = new Map<string, AppliedLifeTag>(base.tags.map((t) => [t.tagId, t]))

  const fromRules: string[] = []
  const suppressed: string[] = []

  // ── 1. 붙이는 규칙
  const positives = active
    .filter((r) => r.type !== 'suppress' && r.targetTagId)
    // 구체적인 규칙이 먼저다 (계획서 23)
    .sort((a, b) => b.specificity - a.specificity || b.confidence - a.confidence)

  const matchedRules = new Map<string, PersonalRule>()

  for (const rule of positives) {
    const hit = matches(rule, input, base)
    if (!hit) continue

    const tagId = rule.targetTagId as string
    if (!getTag(tagId)) continue // 사전에서 사라진 태그는 붙이지 않는다
    if (byId.has(tagId)) continue // built-in 이 이미 붙였으면 그대로 둔다

    // 이미 붙인 개인 태그와 같은 눈금의 반대쪽이면 더 구체적인 쪽만 남긴다
    const clash = [...matchedRules.entries()].find(([id]) => conflicts(id, tagId))
    if (clash) continue

    const tag: PersonalTag = {
      tagId,
      source: 'rule',
      confidence: rule.confidence,
      appliedAt: at,
      temporalContext: 'present',
      matchedText: hit.matchedText,
      ruleId: `personal/${rule.id}`,
      userRuleId: rule.id,
      taxonomyVersion: TAXONOMY_VERSION,
      ruleVersion: TAGGING_RULE_VERSION,
    }

    byId.set(tagId, tag)
    matchedRules.set(tagId, rule)
    fromRules.push(tagId)
  }

  // ── 2. 막는 규칙
  for (const rule of active) {
    if (rule.type !== 'suppress' || !rule.suppressedTagId) continue
    if (!byId.has(rule.suppressedTagId)) continue
    if (!matches(rule, input, base)) continue

    byId.delete(rule.suppressedTagId)
    suppressed.push(rule.suppressedTagId)
  }

  // ── 3. 똑같은 문장 기억 — 규칙보다 세다
  const memory = findMemory(overlay.memories ?? [], input.text)
  if (memory) {
    for (const tagId of memory.suppressTagIds) {
      if (byId.delete(tagId)) suppressed.push(tagId)
    }
    for (const tagId of memory.addTagIds) {
      if (!getTag(tagId)) continue
      byId.set(tagId, {
        tagId,
        source: 'user',
        confidence: 1,
        userVerified: true,
        appliedAt: at,
        temporalContext: 'present',
        ruleId: `memory/${memory.id}`,
        taxonomyVersion: TAXONOMY_VERSION,
        ruleVersion: TAGGING_RULE_VERSION,
      })
    }
  }

  // ── 4. 이 기록에서 사용자가 내린 판단 — 무엇보다 세다
  for (const tag of overlay.previous ?? []) {
    if (tag.userRejected) {
      // 아니라고 한 것은 되살아나지 않는다. 표시는 남긴다 (계획서 21)
      byId.set(tag.tagId, { ...tag, userRejected: true })
      continue
    }
    if (tag.userVerified || tag.source === 'user') byId.set(tag.tagId, tag)
  }

  // ── 정리: 같은 줄기면 아래만, 개수 자르기
  const decided = [...byId.values()].filter((t) => t.userVerified || t.userRejected || t.source === 'user')
  const rest = [...byId.values()].filter((t) => !decided.includes(t))

  const keep = new Set(collapseToLeaves(rest.map((t) => t.tagId)))
  const trimmed = rest
    .filter((t) => keep.has(t.tagId) && t.confidence >= CONFIDENCE_THRESHOLD)
    .sort((a, b) => b.confidence - a.confidence || a.tagId.localeCompare(b.tagId))
    .slice(0, MAX_TAGS_PER_LOG)

  return {
    ...base,
    tags: [...decided, ...trimmed],
    fromRules,
    suppressed,
    memoryUsed: memory?.id ?? null,
  }
}

// ─────────────────────────────────────────────
// 규칙이 이 기록에 걸리는가
// ─────────────────────────────────────────────

interface RuleHit {
  matchedText: string
}

export function matches(
  rule: PersonalRule,
  input: TaggingInput,
  base: TaggingResult,
): RuleHit | null {
  const text = input.text ?? ''
  if (!text.trim()) return null

  const view = makeView(text)
  const term = rule.trigger
  const spans = findTerm(view, term, canSearchDense(term))
  const found = spans.length ? spans : findTerm(view, rule.normalizedTrigger, canSearchDense(rule.normalizedTrigger))
  if (!found.length) return null

  const span = found[0]

  // Phase 3 의 안전장치를 그대로 통과해야 한다.
  // 개인 규칙이라고 부정문·미래 문장을 무시하면 배운 것이 오히려 해가 된다.
  if (isNegated(view, span, term).negated) return null

  const clauses = splitClauses(view)
  const when = contextOfClause(clauseAt(clauses, span))
  const need = rule.context.temporalContext ?? 'present'
  if (when !== need) return null

  if (!contextHolds(rule.context, input, base)) return null

  return { matchedText: view.raw.slice(span.start, span.end) }
}

/** 규칙이 요구하는 문맥이 이 기록에 있는가 */
function contextHolds(context: RuleContext, input: TaggingInput, base: TaggingResult): boolean {
  // 문맥은 갈래마다 "하나라도 겹치면", 갈래끼리는 "전부 만족해야" 로 본다.
  // 느슨하게 잡으면 배운 규칙이 엉뚱한 기록에 붙고, 그게 제일 나쁜 실패다.
  const needMyTags = context.myTagIds ?? []
  if (needMyTags.length) {
    const has = new Set(input.myTagIds ?? [])
    if (!needMyTags.some((id) => has.has(id))) return false
  }

  const needLifeTags = context.lifeTagIds ?? []
  if (needLifeTags.length) {
    const present = new Set(
      base.tags.flatMap((t) => [t.tagId, ...getAncestors(t.tagId)]),
    )
    if (!needLifeTags.some((id) => present.has(id))) return false
  }

  return true
}

/** 같은 규칙인지 — 저장 전에 중복을 거른다 (계획서 61) */
export const sameRule = (a: PersonalRule, b: PersonalRule) =>
  a.type === b.type
  && normalizeTrigger(a.trigger).replace(/\s+/g, '') === normalizeTrigger(b.trigger).replace(/\s+/g, '')
  && a.targetTagId === b.targetTagId
  && a.suppressedTagId === b.suppressedTagId
  && JSON.stringify(sortedContext(a.context)) === JSON.stringify(sortedContext(b.context))

const sortedContext = (context: RuleContext) => ({
  myTagIds: [...(context.myTagIds ?? [])].sort(),
  lifeTagIds: [...(context.lifeTagIds ?? [])].sort(),
  dayPart: context.dayPart ?? null,
  dayOfWeek: context.dayOfWeek ?? null,
  temporalContext: context.temporalContext ?? 'present',
})
