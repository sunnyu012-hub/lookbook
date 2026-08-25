/**
 * 저장할 때 태그를 붙이는 자리.
 *
 * 규칙 하나만 지킨다: 태깅이 실패해도 기록은 저장된다.
 * 사전에 오타가 나든 규칙이 터지든, 그 때문에 "지금 기분" 이 날아가면 안 된다.
 * 그래서 여기 있는 함수들은 절대 던지지 않는다 — 실패하면 태그 없이 돌려준다.
 *
 * 사용자가 손댄 태그는 다시 계산하지 않는다.
 * "이 태그 아니에요" 를 눌러 놓고 본문을 한 글자 고쳤다고 그게 되살아나면,
 * 고치는 의미가 없어진다.
 */
import type { AppliedLifeTag, QuickLogInput } from '../types'
import { TAGGING_RULE_VERSION, analyze } from './engine'
import { TAXONOMY_VERSION } from '../versions'
import type { ExactMemory, PersonalRule } from '../learning/types'
import { analyzeWithPersonal } from '../learning/apply'

export interface TagStamp {
  lifeTags: AppliedLifeTag[]
  taggedRuleVersion: number
  taggedTaxonomyVersion: number
  taggedAt: string
}

/** 사용자가 이미 판단을 내린 태그인가 */
export const isDecided = (tag: AppliedLifeTag) =>
  Boolean(tag.userVerified || tag.userRejected || tag.source === 'user')

export interface RetagOptions {
  myTagNames?: readonly string[]
  previous?: readonly AppliedLifeTag[]
  /** 개인 규칙 겹 — 없으면 built-in 만 돈다 */
  rules?: readonly PersonalRule[]
  memories?: readonly ExactMemory[]
}

export function retag(input: QuickLogInput, options: RetagOptions = {}): TagStamp {
  const decided = (options.previous ?? []).filter(isDecided)
  const taggedAt = new Date().toISOString()

  const fallback: TagStamp = {
    lifeTags: [...decided],
    taggedRuleVersion: TAGGING_RULE_VERSION,
    taggedTaxonomyVersion: TAXONOMY_VERSION,
    taggedAt,
  }

  try {
    const taggingInput = {
      text: input.text ?? '',
      mood: input.mood,
      energy: input.energy ?? null,
      myTagNames: options.myTagNames ?? [],
      myTagIds: input.myTagIds ?? [],
    }

    // 개인 규칙이 있으면 그 겹까지 얹는다. 없으면 built-in 그대로다
    const hasOverlay = Boolean(options.rules?.length || options.memories?.length)
    const result = hasOverlay
      ? analyzeWithPersonal(taggingInput, {
          rules: options.rules,
          memories: options.memories,
          previous: decided,
        })
      : analyze(taggingInput)

    const decidedIds = new Set(decided.map((t) => t.tagId))
    const fresh = result.tags.filter((t) => !decidedIds.has(t.tagId))

    return { ...fallback, lifeTags: [...decided, ...fresh] }
  } catch {
    // 규칙이 터져도 기록은 그대로 간다
    return fallback
  }
}

/** 저장 직전 입력에 태그를 얹는다 */
export function withTags(input: QuickLogInput, options: RetagOptions = {}): QuickLogInput {
  const stamp = retag(input, options)
  return {
    ...input,
    lifeTags: stamp.lifeTags,
    taggedRuleVersion: stamp.taggedRuleVersion,
    taggedTaxonomyVersion: stamp.taggedTaxonomyVersion,
    taggedAt: stamp.taggedAt,
  }
}

/**
 * 다시 태깅할 때가 됐는가.
 *
 * 화면을 열 때마다 전부 다시 돌리지 않는다 — 기록이 수천 개면 앱이 멈춘다.
 * 판 번호가 다른 기록만, 그 기록을 실제로 열어 볼 때 다시 돌린다.
 */
export const needsRetag = (log: {
  taggedRuleVersion?: number | null
  taggedTaxonomyVersion?: number | null
}): boolean =>
  (log.taggedRuleVersion ?? 0) < TAGGING_RULE_VERSION
  || (log.taggedTaxonomyVersion ?? 0) < TAXONOMY_VERSION

// ─────────────────────────────────────────────
// Inspector 에서 사용자가 고친 것
// ─────────────────────────────────────────────

/** "맞아요" — 앞으로 다시 계산해도 살아남는다 */
export const verifyTag = (tags: readonly AppliedLifeTag[], tagId: string): AppliedLifeTag[] =>
  tags.map((t) =>
    t.tagId === tagId ? { ...t, userVerified: true, userRejected: false, confidence: 1 } : t,
  )

/**
 * "이 태그 아니에요" — 지우지 않고 아니라고 표시만 한다.
 * 지워 버리면 다음 저장 때 똑같이 되붙고, 무엇을 고쳤는지도 남지 않는다.
 */
export const rejectTag = (tags: readonly AppliedLifeTag[], tagId: string): AppliedLifeTag[] =>
  tags.map((t) =>
    t.tagId === tagId ? { ...t, userRejected: true, userVerified: false } : t,
  )

/** 되돌리기 */
export const clearDecision = (tags: readonly AppliedLifeTag[], tagId: string): AppliedLifeTag[] =>
  tags.map((t) =>
    t.tagId === tagId ? { ...t, userRejected: false, userVerified: false } : t,
  )

/** 사용자가 직접 고른 태그를 더한다 */
export function addUserTag(tags: readonly AppliedLifeTag[], tagId: string): AppliedLifeTag[] {
  const existing = tags.find((t) => t.tagId === tagId)
  if (existing) return verifyTag(tags, tagId)
  return [
    ...tags,
    {
      tagId,
      source: 'user',
      confidence: 1,
      userVerified: true,
      appliedAt: new Date().toISOString(),
      temporalContext: 'present',
      taxonomyVersion: TAXONOMY_VERSION,
      ruleVersion: TAGGING_RULE_VERSION,
    },
  ]
}

/** 화면·분석에 실제로 쓰는 것 — 아니라고 한 건 뺀다 */
export const activeTags = (tags: readonly AppliedLifeTag[]): AppliedLifeTag[] =>
  tags.filter((t) => !t.userRejected)
