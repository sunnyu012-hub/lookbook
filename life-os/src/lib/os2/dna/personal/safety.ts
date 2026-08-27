/**
 * 7E — AI 가 뭐라고 하든, 화면에 나가기 전에 여기를 지난다.
 *
 * 전제는 하나다. AI 의 출력은 신뢰할 수 없는 입력이다.
 * 잘 쓰는지 못 쓰는지의 문제가 아니라, 검사할 수 없는 문장을
 * 사용자의 자기 이해에 붙여 놓을 수는 없다는 문제다.
 *
 * 그래서 네 가지를 본다.
 *   · 규정하거나 인과로 읽히는 말을 쓰지 않았는가
 *   · 우리가 준 적 없는 것을 지어내지 않았는가 (숫자, 다른 태그 이름)
 *   · 길이와 모양이 맞는가
 *   · 자리표(PERSON_TAG_1)가 그대로 새어 나오지 않았는가
 *
 * 하나라도 걸리면 되돌려보내지 않는다. 재시도는 0회다 (계획서 54).
 * 그냥 우리가 만든 문장을 쓴다. 그게 언제나 안전하고, 언제나 사실이다.
 */
import { BANNED_WORDS } from '../../analytics/wording'
import { METRICS, type MetricKey } from '../../analytics'
import { LIFE_TAGS } from '../../taxonomy'
import type { PersonalContext, PersonalDiscoveryRecord } from './types'

/**
 * Phase 5 의 금지어에 개인 발견에서만 위험한 말을 더한다 (계획서 44).
 *
 * "타고난" / "체질" / "유형" 은 관찰을 정체성으로 바꾼다.
 * MY DNA 는 성격 검사가 아니라고 계속 말해 왔는데,
 * 이름 한 줄이 그 전제를 통째로 뒤집을 수 있다.
 */
export const PERSONAL_BANNED_WORDS = [
  ...BANNED_WORDS,
  '타고난',
  '본질',
  '성향이다',
  '유형',
  '체질',
  '운명',
  '필연',
  '확실히',
  '항상',
  '절대',
]

export const bannedWordIn = (text: string): string | null =>
  PERSONAL_BANNED_WORDS.find((word) => text.includes(word)) ?? null

/** 길이 (계획서 47) */
export const TITLE_MAX = 20
export const DESCRIPTION_MAX = 80
const DESCRIPTION_MIN = 10

/** 자리표가 그대로 새어 나오면 안 된다 */
const PLACEHOLDER = /(PERSON|TAG|PLACE|CONTEXT)_\d+/i

/** 태그 사전에 있는 이름들 — 우리가 주지 않은 이름을 쓰면 지어낸 것이다 */
const ALL_TAG_NAMES = LIFE_TAGS.map((t) => t.displayName).filter((n) => n.length >= 2)

export type RejectReason =
  | 'empty'
  | 'too-long'
  | 'too-short'
  | 'banned-word'
  | 'placeholder-leak'
  | 'invented-number'
  | 'invented-context'
  | 'ungrounded'
  | 'shape'

export interface NamingCheck {
  ok: boolean
  reason?: RejectReason
  detail?: string
}

export interface CheckContext {
  /** 우리가 준 조각 이름들 */
  labels: readonly string[]
}

/**
 * AI 가 준 이름 한 벌을 검사한다.
 * 통과하지 못하면 이유만 돌려준다 — 고쳐 쓰지 않는다.
 */
export function checkNaming(
  value: { title?: unknown; description?: unknown },
  context: CheckContext,
): NamingCheck {
  const title = typeof value.title === 'string' ? value.title.trim() : ''
  const description = typeof value.description === 'string' ? value.description.trim() : ''

  if (!title || !description) return { ok: false, reason: 'empty' }
  if (/[\n\r{}<>[\]]/.test(title + description)) return { ok: false, reason: 'shape' }
  if (title.length > TITLE_MAX) return { ok: false, reason: 'too-long', detail: 'title' }
  if (description.length > DESCRIPTION_MAX) {
    return { ok: false, reason: 'too-long', detail: 'description' }
  }
  if (description.length < DESCRIPTION_MIN) return { ok: false, reason: 'too-short' }

  const both = `${title} ${description}`
  if (PLACEHOLDER.test(both)) return { ok: false, reason: 'placeholder-leak' }

  const banned = bannedWordIn(both)
  if (banned) return { ok: false, reason: 'banned-word', detail: banned }

  // 숫자는 우리가 넣는다. AI 가 숫자를 쓰면 그건 지어낸 숫자다
  if (/\d/.test(both)) return { ok: false, reason: 'invented-number' }

  // 우리가 준 적 없는 태그 이름을 끌어오지 않았는가
  const allowed = new Set(context.labels)
  const invented = ALL_TAG_NAMES.find((name) => !allowed.has(name) && both.includes(name))
  if (invented) return { ok: false, reason: 'invented-context', detail: invented }

  // 준 조각 중 하나는 실제로 이야기해야 한다
  if (!context.labels.some((label) => both.includes(label))) {
    return { ok: false, reason: 'ungrounded' }
  }

  return { ok: true }
}

// ─────────────────────────────────────────────
// 우리가 만드는 문장 (계획서 57)
//
// AI 를 못 쓰거나 못 믿을 때 쓰는 것이지만,
// "모자란 대체품" 이 아니라 이것만으로도 완결된 문장이어야 한다.
// 실제로 대부분의 사용자는 이쪽만 보게 된다.
// ─────────────────────────────────────────────

const joinLabels = (contexts: readonly PersonalContext[]) =>
  contexts.map((c) => c.label).join(' + ')

/**
 * 받침이 있는가.
 *
 * 조사를 안 맞추면 "카페이 함께" 같은 문장이 나온다.
 * 문장을 우리가 만든다고 해 놓고 이러면 AI 를 안 쓴 이유가 무색해진다.
 * 한글 음절이 아니면 알 수 없으므로 받침 없는 쪽으로 둔다.
 */
export function hasBatchim(word: string): boolean {
  const trimmed = word.trim()
  if (!trimmed) return false
  const code = trimmed.charCodeAt(trimmed.length - 1)
  if (code < 0xac00 || code > 0xd7a3) return false
  return (code - 0xac00) % 28 !== 0
}

/** 와/과 */
export const withGwa = (word: string): string => `${word}${hasBatchim(word) ? '과' : '와'}`

/** 이/가 */
export const withI = (word: string): string => `${word}${hasBatchim(word) ? '이' : '가'}`

export function fallbackTitle(record: {
  contexts: readonly PersonalContext[]
}): string {
  const joined = joinLabels(record.contexts)
  return joined.length <= TITLE_MAX ? joined : `${joined.slice(0, TITLE_MAX - 1)}…`
}

export function fallbackDescription(record: {
  contexts: readonly PersonalContext[]
  metric: MetricKey
  direction: 1 | -1
}): string {
  const metric = METRICS[record.metric]?.label ?? record.metric
  const labels = record.contexts.map((c) => c.label)
  const where = labels
    .map((label, i) => (i === labels.length - 1 ? withI(label) : `${withGwa(label)} `))
    .join('')
  // 인과로 읽히지 않게. 무엇이 무엇을 만들었다고 말하지 않는다
  return `${where} 함께 기록된 날에 ${withI(metric)} 평소보다 ${record.direction > 0 ? '높게' : '낮게'} 나타났어요.`
}

/** 화면에 보여 줄 이름 — 사용자가 고친 이름이 언제나 이긴다 (계획서 68) */
export const titleOf = (record: PersonalDiscoveryRecord): string =>
  record.userTitle?.trim() || record.generatedTitle?.trim() || fallbackTitle(record)

export const descriptionOf = (record: PersonalDiscoveryRecord): string =>
  record.generatedDescription?.trim() || fallbackDescription(record)
