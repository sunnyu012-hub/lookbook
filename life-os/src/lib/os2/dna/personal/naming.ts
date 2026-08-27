/**
 * 7D — AI 가 하는 딱 한 가지.
 *
 * 여기서 AI 는 이미 확정된 발견에 "이름" 을 붙인다. 그것뿐이다.
 *
 * AI 가 하지 않는 것 (계획서 114):
 *   패턴 찾기 · 단계 판정 · 신뢰도 판정 · 건강 판단 · 추천 · 처방
 *   새 LIFE TAG 만들기 · 대화 · 매일 요약 · 로그마다 호출
 *
 * 그리고 보내는 것도 최소한이다.
 *   보낸다: 조각 이름 몇 개 · 어떤 지표인지 · 높은 쪽인지 낮은 쪽인지
 *   안 보낸다: 원문 · 사진 · Check-in · 날짜 · 표본 수 · 숫자 전부
 *
 * 사람 이름처럼 보이는 My Tag 는 자리표로 바꿔서 보내고,
 * 돌아온 문장에서 다시 원래 이름으로 되돌린다 (계획서 14).
 */
import { METRICS } from '../../analytics'
import { checkNaming, fallbackDescription, fallbackTitle, type RejectReason } from './safety'
import type { PersonalContext, PersonalDiscoveryRecord } from './types'

// ─────────────────────────────────────────────
// 보내는 것
// ─────────────────────────────────────────────

export interface NamingRequest {
  /** 조각 이름 — My Tag 는 자리표로 */
  contexts: string[]
  /** '기분' · '기운' · '집중' · '피로' */
  metric: string
  direction: 'higher' | 'lower'
  language: 'ko'
}

export interface NamingResult {
  title: string
  description: string
}

/**
 * 이름을 붙여 주는 것.
 *
 * 이 앱은 어떤 AI 를 쓰는지 모른다. 그래서 인터페이스만 둔다.
 * 없으면 없는 대로 돈다 — 그때는 우리가 만든 문장을 쓴다.
 */
export interface PersonalDiscoveryNamingService {
  name(request: NamingRequest): Promise<NamingResult | null>
}

const PLACEHOLDER_PREFIX = 'PERSON_TAG_'

export interface PreparedNaming {
  request: NamingRequest
  /** AI 문장에 남은 자리표를 원래 이름으로 되돌린다 */
  restore: (text: string) => string
  /** 검사에 쓸, 우리가 실제로 준 이름들 */
  labels: string[]
}

export function prepare(record: {
  contexts: readonly PersonalContext[]
  metric: PersonalDiscoveryRecord['metric']
  direction: 1 | -1
}): PreparedNaming {
  const swaps: Array<[token: string, label: string]> = []
  const contexts: string[] = []

  let personIndex = 0
  for (const context of record.contexts) {
    if (context.kind === 'myTag') {
      personIndex += 1
      const token = `${PLACEHOLDER_PREFIX}${personIndex}`
      swaps.push([token, context.label])
      contexts.push(token)
      continue
    }
    contexts.push(context.label)
  }

  return {
    request: {
      contexts,
      metric: METRICS[record.metric]?.label ?? record.metric,
      direction: record.direction > 0 ? 'higher' : 'lower',
      language: 'ko',
    },
    restore: (text) =>
      swaps.reduce((out, [token, label]) => out.split(token).join(label), text),
    labels: record.contexts.map((c) => c.label),
  }
}

// ─────────────────────────────────────────────
// 부르기
// ─────────────────────────────────────────────

export interface NamingOutcome {
  status: 'named' | 'fallback'
  title: string
  description: string
  /** 왜 우리 문장을 쓰게 됐는지 — QA 에서만 본다 */
  note?: RejectReason | 'no-service' | 'no-answer' | 'threw' | 'over-budget'
}

/**
 * 발견 하나에 AI 호출은 최대 1회, 재시도 0회다 (계획서 54).
 *
 * 실패하면 다시 부르지 않는다.
 * 재시도를 넣는 순간 비용은 상한이 없어지고,
 * 두 번째 답이 첫 번째보다 안전하다는 근거도 없다.
 */
export async function nameOne(
  record: {
    contexts: readonly PersonalContext[]
    metric: PersonalDiscoveryRecord['metric']
    direction: 1 | -1
  },
  service: PersonalDiscoveryNamingService | null,
): Promise<NamingOutcome> {
  const fallback = {
    title: fallbackTitle(record),
    description: fallbackDescription(record),
  }

  if (!service) return { status: 'fallback', ...fallback, note: 'no-service' }

  const prepared = prepare(record)

  let answer: NamingResult | null = null
  try {
    answer = await service.name(prepared.request)
  } catch {
    return { status: 'fallback', ...fallback, note: 'threw' }
  }

  if (!answer) return { status: 'fallback', ...fallback, note: 'no-answer' }

  const title = prepared.restore(String(answer.title ?? ''))
  const description = prepared.restore(String(answer.description ?? ''))

  const check = checkNaming({ title, description }, { labels: prepared.labels })
  if (!check.ok) return { status: 'fallback', ...fallback, note: check.reason }

  return { status: 'named', title: title.trim(), description: description.trim() }
}
