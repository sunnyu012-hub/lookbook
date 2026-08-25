/**
 * 자동 태깅 — 규칙만 쓴다.
 *
 * AI 를 부르지 않는다. 외부 사전도, 임베딩도, 감정 분석 API 도 없다.
 * 같은 글을 넣으면 언제나 같은 태그가 나온다 — 무작위 요소가 하나도 없다.
 * 그래야 "왜 이게 붙었어요?" 에 규칙 이름과 원문 조각으로 답할 수 있다.
 *
 * 정확도를 개수보다 앞에 둔다. 애매하면 안 붙인다.
 *
 * 순서:
 *   다듬기 → 사전에서 찾기 → 금지어 → 부정 → 시제 → My Tag 우선
 *   → 점수 → 문맥 조건 → 사용자가 고른 값 우선 → 충돌 정리 → 아래쪽만 남기기 → 문턱
 */
import type { AppliedLifeTag, LifeTagDef, TemporalContext } from '../types'
import { TAXONOMY_VERSION } from '../versions'
import { LIFE_TAGS, collapseToLeaves, getTag } from '../taxonomy/registry'
import {
  type Span,
  type TextView,
  canSearchDense,
  clauseAt,
  findTerm,
  makeView,
  splitClauses,
} from './normalize'
import { isNegated } from './negation'
import { contextOfClause } from './temporal'
import { conflicts } from './conflicts'
import { isAboutSomeoneElse, isInnerState } from './attribution'

/** 규칙이 바뀌면 올린다. 어떤 규칙으로 붙은 태그인지 기록에 남는다 */
export const TAGGING_RULE_VERSION = 1

/** 이 아래면 안 붙인다 */
export const CONFIDENCE_THRESHOLD = 0.72

/** 한 기록에 붙일 수 있는 최대 개수. 스무 개가 붙으면 아무 말도 안 하는 것과 같다 */
export const MAX_TAGS_PER_LOG = 12

/**
 * 짧은 낱말은 우연히 맞을 수 있다.
 * 다만 한국어는 두 글자가 이미 온전한 말이다 — '집중' '러닝' '회의'.
 * 그래서 한 글자('배' '잠')만 세게 깎고, 두 글자는 살짝만 깎는다.
 */
const ONE_CHAR_PENALTY = 0.2
const TWO_CHAR_PENALTY = 0.03
const PHRASE_BONUS = 0.05
const REPEAT_BONUS = 0.03
const MOOD_AGREEMENT_BONUS = 0.05
const NON_PRESENT_PENALTY = 0.1
const CEILING = 0.98

export interface TaggingInput {
  text: string
  /** 사용자가 직접 고른 값들 — 텍스트보다 세다 */
  mood?: number | null
  energy?: number | null
  /** 사용자가 만든 태그 이름들. 여기 걸린 말은 LIFE TAG 로 가져가지 않는다 */
  myTagNames?: readonly string[]
}

export interface TaggingResult {
  tags: AppliedLifeTag[]
  /** 문턱을 못 넘거나 걸러진 것들 — 화면에는 안 쓰고 QA 에서만 본다 */
  rejected: RejectedTag[]
  ruleVersion: number
  taxonomyVersion: number
}

export interface RejectedTag {
  tagId: string
  reason: 'negated' | 'negative-keyword' | 'missing-context' | 'excluded-context'
    | 'below-threshold' | 'conflict' | 'my-tag' | 'structured-signal' | 'over-limit'
    | 'rolled-up' | 'other-person'
  detail?: string
}

interface Candidate {
  tag: LifeTagDef
  span: Span
  term: string
  fromPhrase: boolean
  hits: number
  temporalContext: TemporalContext
  confidence: number
}

// ─────────────────────────────────────────────
// 사전 색인 — 낱말 하나에 여러 태그가 걸릴 수 있다
// ─────────────────────────────────────────────

interface Term {
  term: string
  tag: LifeTagDef
  fromPhrase: boolean
}

/** 긴 낱말을 먼저 본다. '집중이 안' 이 '집중' 보다 먼저 걸려야 한다 */
const ALL_TERMS: Term[] = (() => {
  const out: Term[] = []
  for (const tag of LIFE_TAGS) {
    for (const phrase of tag.phrases ?? []) out.push({ term: phrase, tag, fromPhrase: true })
    for (const keyword of tag.keywords ?? []) out.push({ term: keyword, tag, fromPhrase: false })
  }
  return out.sort((a, b) => b.term.length - a.term.length)
})()

// ─────────────────────────────────────────────

export function analyze(input: TaggingInput): TaggingResult {
  const raw = (input.text ?? '').trim()
  const empty: TaggingResult = {
    tags: [],
    rejected: [],
    ruleVersion: TAGGING_RULE_VERSION,
    taxonomyVersion: TAXONOMY_VERSION,
  }
  if (!raw) return empty

  const view = makeView(raw)
  const clauses = splitClauses(view)
  const rejected: RejectedTag[] = []

  // 사용자가 만든 태그 이름이 차지한 자리 — 여기 걸치는 건 LIFE TAG 로 안 가져간다
  const myTagSpans = spansOfMyTags(view, input.myTagNames ?? [])

  // 1) 사전에서 찾기
  const best = new Map<string, Candidate>()
  for (const { term, tag, fromPhrase } of ALL_TERMS) {
    const spans = findTerm(view, term, canSearchDense(term))
    if (!spans.length) continue

    // 금지어가 있으면 이 태그는 통째로 버린다
    if (hasNegativeKeyword(view, tag)) {
      note(rejected, tag.id, 'negative-keyword')
      continue
    }

    for (const span of spans) {
      if (overlapsAny(span, myTagSpans) && personOrPlace(tag)) {
        note(rejected, tag.id, 'my-tag', '내가 만든 태그가 먼저다')
        continue
      }

      const negation = isNegated(view, span, term)
      if (negation.negated) {
        note(rejected, tag.id, 'negated', negation.cue)
        continue
      }

      const clause = clauseAt(clauses, span)

      // 남의 마음·몸 이야기는 내 기록으로 세지 않는다
      if (isInnerState(tag.categoryId)) {
        const who = isAboutSomeoneElse(view, clause, span)
        if (who.other) {
          note(rejected, tag.id, 'other-person', who.cue)
          continue
        }
      }

      const temporalContext = contextOfClause(clause)
      const candidate: Candidate = {
        tag,
        span,
        term,
        fromPhrase,
        hits: spans.length,
        temporalContext,
        confidence: 0,
      }
      candidate.confidence = score(candidate, input)

      const previous = best.get(tag.id)
      if (!previous || candidate.confidence > previous.confidence) best.set(tag.id, candidate)
    }
  }

  // 2) 문맥 조건 — 다른 태그가 같이 있어야만 성립하는 것들
  const present = new Set(best.keys())
  for (const [tagId, candidate] of [...best]) {
    const need = candidate.tag.contextRequired ?? []
    if (need.length && !need.some((id) => present.has(id))) {
      best.delete(tagId)
      note(rejected, tagId, 'missing-context', need.join(', '))
      continue
    }
    const avoid = candidate.tag.contextExcluded ?? []
    if (avoid.some((id) => present.has(id))) {
      best.delete(tagId)
      note(rejected, tagId, 'excluded-context')
    }
  }

  // 3) 사용자가 직접 고른 값이 텍스트보다 세다
  reconcileStructured(best, input, rejected)

  // 4) 문턱
  for (const [tagId, candidate] of [...best]) {
    if (candidate.confidence < CONFIDENCE_THRESHOLD) {
      best.delete(tagId)
      note(rejected, tagId, 'below-threshold', candidate.confidence.toFixed(2))
    }
  }

  // 5) 한 눈금 위에서 양쪽 끝을 동시에 가리키는 것 정리
  resolveConflicts(best, rejected)

  // 6) 같은 줄기면 아래쪽만 남긴다 — 같은 말을 두 번 하지 않으려고
  const kept = collapseToLeaves([...best.keys()])
  for (const tagId of [...best.keys()]) {
    if (!kept.includes(tagId)) {
      best.delete(tagId)
      note(rejected, tagId, 'rolled-up')
    }
  }

  // 7) 개수 자르기
  const ordered = [...best.values()].sort(
    (a, b) => b.confidence - a.confidence || a.tag.id.localeCompare(b.tag.id),
  )
  for (const extra of ordered.slice(MAX_TAGS_PER_LOG)) {
    note(rejected, extra.tag.id, 'over-limit')
  }

  const appliedAt = new Date().toISOString()
  return {
    tags: ordered.slice(0, MAX_TAGS_PER_LOG).map((c) => toApplied(c, appliedAt)),
    rejected,
    ruleVersion: TAGGING_RULE_VERSION,
    taxonomyVersion: TAXONOMY_VERSION,
  }
}

// ─────────────────────────────────────────────
// 점수
// ─────────────────────────────────────────────

function score(candidate: Candidate, input: TaggingInput): number {
  let value = candidate.tag.defaultConfidence

  if (candidate.fromPhrase) value += PHRASE_BONUS
  if (candidate.hits >= 2) value += REPEAT_BONUS
  const length = candidate.term.replace(/\s/g, '').length
  if (length <= 1) value -= ONE_CHAR_PENALTY
  else if (length === 2) value -= TWO_CHAR_PENALTY
  if (candidate.temporalContext !== 'present') value -= NON_PRESENT_PENALTY
  if (agreesWithMood(candidate.tag, input.mood)) value += MOOD_AGREEMENT_BONUS

  return Math.min(CEILING, Math.max(0, Number(value.toFixed(4))))
}

/**
 * 사용자가 고른 기분과 태그의 결이 같으면 조금 올려 준다.
 *
 * 반대라고 깎지는 않는다 — 좋은 하루에도 짜증 나는 순간은 있고,
 * 그걸 지워 버리면 기록이 사람보다 단순해진다.
 */
function agreesWithMood(tag: LifeTagDef, mood: number | null | undefined): boolean {
  if (mood == null) return false
  if (tag.categoryId !== 'emotion') return false
  if (mood >= 4) return POSITIVE_EMOTIONS.has(tag.id)
  if (mood <= 2) return NEGATIVE_EMOTIONS.has(tag.id)
  return false
}

const POSITIVE_EMOTIONS = new Set([
  'emotion:joy', 'emotion:happiness', 'emotion:contentment', 'emotion:excitement',
  'emotion:pride', 'emotion:relief', 'emotion:gratitude', 'emotion:affection',
  'emotion:love', 'emotion:amusement', 'emotion:calm', 'emotion:comfortable',
  'emotion:hopeful', 'emotion:confidence', 'emotion:anticipation_positive',
])

const NEGATIVE_EMOTIONS = new Set([
  'emotion:sadness', 'emotion:frustration', 'emotion:irritation', 'emotion:anger',
  'emotion:anxiety', 'emotion:worry', 'emotion:fear', 'emotion:disappointment',
  'emotion:loneliness', 'emotion:guilt', 'emotion:embarrassment', 'emotion:boredom',
  'emotion:overwhelmed_emotion',
])

// ─────────────────────────────────────────────
// 사용자가 고른 값 우선
//
// Quick Log 에 energy 칸이 이미 있다. 거기에 "기운 좋음" 을 골라 놓고
// 본문에 "좀 피곤" 이라고 적었으면, 고른 값을 믿는다.
// 숫자만 보고 태그를 새로 만들지도 않는다 — 그러면 같은 사실이 두 벌이 된다.
// ─────────────────────────────────────────────

const HIGH_ENERGY_TAGS = ['energy:very_high', 'energy:high', 'energy:recovered', 'energy:second_wind']
const LOW_ENERGY_TAGS = [
  'energy:low', 'energy:very_low', 'energy:drained',
  'energy:physically_tired', 'energy:sluggish', 'energy:sleepy',
]

function reconcileStructured(
  best: Map<string, Candidate>,
  input: TaggingInput,
  rejected: RejectedTag[],
): void {
  const energy = input.energy
  if (energy == null) return

  const contradicting = energy >= 4 ? LOW_ENERGY_TAGS : energy <= 2 ? HIGH_ENERGY_TAGS : []
  for (const tagId of contradicting) {
    if (best.delete(tagId)) note(rejected, tagId, 'structured-signal', `고른 기운 ${energy}`)
  }
}

// ─────────────────────────────────────────────

function resolveConflicts(best: Map<string, Candidate>, rejected: RejectedTag[]): void {
  const ids = [...best.keys()]
  for (const a of ids) {
    for (const b of ids) {
      if (a >= b) continue
      const left = best.get(a)
      const right = best.get(b)
      if (!left || !right || !conflicts(a, b)) continue

      if (left.confidence === right.confidence) {
        // 어느 쪽인지 알 수 없으면 둘 다 안 붙인다
        best.delete(a)
        best.delete(b)
        note(rejected, a, 'conflict', b)
        note(rejected, b, 'conflict', a)
        continue
      }
      const loser = left.confidence < right.confidence ? a : b
      best.delete(loser)
      note(rejected, loser, 'conflict', loser === a ? b : a)
    }
  }
}

// ─────────────────────────────────────────────
// 잔손질
// ─────────────────────────────────────────────

const toApplied = (c: Candidate, appliedAt: string): AppliedLifeTag => ({
  tagId: c.tag.id,
  // 'ai' 는 쓰지 않는다 — 이 엔진은 사전 대조만 한다
  source: 'keyword',
  confidence: c.confidence,
  appliedAt,
  temporalContext: c.temporalContext,
  matchedText: c.term,
  ruleId: ruleIdOf(c),
  taxonomyVersion: TAXONOMY_VERSION,
  ruleVersion: TAGGING_RULE_VERSION,
})

/** 규칙 이름 — 같은 입력이면 언제나 같은 이름이 나온다 */
const ruleIdOf = (c: Candidate) =>
  `${c.tag.id}/${c.fromPhrase ? 'phrase' : 'keyword'}/${c.term.replace(/\s+/g, '_')}`

const note = (list: RejectedTag[], tagId: string, reason: RejectedTag['reason'], detail?: string) => {
  if (list.some((r) => r.tagId === tagId && r.reason === reason)) return
  list.push({ tagId, reason, detail })
}

const hasNegativeKeyword = (view: TextView, tag: LifeTagDef) =>
  (tag.negativeKeywords ?? []).some((word) => findTerm(view, word, canSearchDense(word)).length > 0)

const personOrPlace = (tag: LifeTagDef) =>
  Boolean(tag.ruleHints?.personSensitive || tag.ruleHints?.placeSensitive)
  || tag.categoryId === 'relationship'
  || tag.categoryId === 'place'

function spansOfMyTags(view: TextView, names: readonly string[]): Span[] {
  const out: Span[] = []
  for (const name of names) {
    const trimmed = name.trim()
    if (trimmed.length < 2) continue // 한 글자짜리 이름은 아무 데나 걸린다
    out.push(...findTerm(view, trimmed, canSearchDense(trimmed)))
  }
  return out
}

const overlapsAny = (span: Span, spans: readonly Span[]) =>
  spans.some((other) => span.start < other.end && other.start < span.end)

/** 화면에서 쓸 이름 — 사전에 없으면 id 를 그대로 준다 */
export const tagName = (tagId: string) => getTag(tagId)?.displayName ?? tagId
