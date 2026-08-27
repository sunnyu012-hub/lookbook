/**
 * 나만의 발견 입구. 화면에서는 여기만 본다.
 *
 * 한 바퀴는 언제나 이 순서다.
 *   후보 만들기(7A) → 새로운가 보기(7B) → 단계 정하기(7C) → 이름 붙이기(7D·7E)
 *
 * 앞이 실패하면 뒤는 아예 돌지 않는다.
 * 그리고 이 전체가 실패해도 Quick Log 저장과 48개 DNA 는 그대로다 (계획서 71).
 */
import type { DiscoveryRecord, EvaluationInput } from '../types'
import { buildCandidates } from './candidates'
import { knownFrom, rankCandidates } from './novelty'
import { runLifecycle } from './lifecycle'
import { nameOne, type PersonalDiscoveryNamingService } from './naming'
import {
  monthOf,
  readBudget,
  spend,
  withinBudget,
  writeBudget,
  type NamingBudget,
} from './budget'
import type { PersonalDiscoveryRecord, PersonalResult } from './types'

export * from './types'
export {
  PERSONAL_FLOOR,
  TWO_WAY_GATE,
  THREE_WAY_GATE,
  SCANNED_METRICS,
  CONTEXT_CATEGORIES,
  buildCandidates,
  fingerprintOf,
  matcher,
  passes,
} from './candidates'
export {
  MIN_NOVELTY,
  MIN_COMBINATION_LIFT,
  INCREMENTAL_VALUE,
  SIMILAR,
  combinationLiftOf,
  isKnown,
  jaccard,
  keepsIncrementalValue,
  knownFrom,
  mergeSimilar,
  noveltyOf,
  rankCandidates,
  type KnownPattern,
} from './novelty'
export {
  ACTIVE_CAP,
  RECENT_DAYS,
  WEAKENED_RATIO,
  remeasure,
  runLifecycle,
  stateOf,
} from './lifecycle'
export {
  nameOne,
  prepare,
  type NamingRequest,
  type NamingResult,
  type NamingOutcome,
  type PersonalDiscoveryNamingService,
} from './naming'
export {
  PERSONAL_BANNED_WORDS,
  TITLE_MAX,
  DESCRIPTION_MAX,
  bannedWordIn,
  checkNaming,
  descriptionOf,
  fallbackDescription,
  fallbackTitle,
  titleOf,
  type NamingCheck,
  type RejectReason,
} from './safety'
export {
  MONTHLY_LIMIT,
  emptyBudget,
  monthOf,
  readBudget,
  spend,
  withinBudget,
  writeBudget,
  type NamingBudget,
} from './budget'
export { NAMING_ENDPOINT, defaultNamingService, httpNamingService } from './service'
export {
  buildPersonalView,
  toPersonalCard,
  type PersonalCard,
  type PersonalView,
} from './view'

export interface EvaluatePersonalOptions {
  /** 지난번 결과 */
  previous?: readonly PersonalDiscoveryRecord[]
  /** 48개·Rare 의 결과 — 이미 말한 이야기를 또 하지 않으려고 */
  dnaRecords?: readonly DiscoveryRecord[]
  myTagNameOf?: (id: string) => string | undefined
  now?: () => string
}

export function evaluatePersonal(
  input: EvaluationInput,
  options: EvaluatePersonalOptions = {},
): PersonalResult {
  const candidates = buildCandidates(input, { myTagNameOf: options.myTagNameOf })
  const ranked = rankCandidates(candidates, {
    logs: input.logs,
    known: knownFrom(options.dnaRecords ?? []),
    existing: options.previous ?? [],
  })
  return runLifecycle(input, ranked, { previous: options.previous, now: options.now })
}

// ─────────────────────────────────────────────
// 이름 붙이기 한 바퀴
// ─────────────────────────────────────────────

export interface NamingRunOptions {
  now?: () => string
  /** 밖에서 예산을 넘겨주고 싶을 때 (테스트) */
  budget?: NamingBudget
  onBudget?: (budget: NamingBudget) => void
}

export interface NamingRunResult {
  records: PersonalDiscoveryRecord[]
  /** 실제로 AI 를 부른 횟수 */
  calls: number
  budget: NamingBudget
}

/**
 * 아직 이름이 없는 발견에 이름을 붙인다.
 *
 * 한 발견당 한 번만 부르고, 실패해도 다시 부르지 않는다.
 * 예산을 넘으면 부르지 않고 넘어간다 — 그때는 우리가 만든 문장이 그대로 쓰인다.
 */
export async function namePending(
  records: readonly PersonalDiscoveryRecord[],
  service: PersonalDiscoveryNamingService | null,
  options: NamingRunOptions = {},
): Promise<NamingRunResult> {
  const at = options.now?.() ?? new Date().toISOString()
  const month = monthOf(at)
  let budget = options.budget ?? readBudget(month)
  let calls = 0

  const out: PersonalDiscoveryRecord[] = []

  for (const record of records) {
    // 'fallback' 과 'named' 는 이미 한 번 불렀다. 다시 부르지 않는다 (재시도 0회).
    // 'skipped' 는 부른 적이 없는 것이라 다음 바퀴에 다시 볼 수 있다
    const retryable = record.namingStatus === 'pending' || record.namingStatus === 'skipped'
    if (!retryable || record.state === 'LOCKED') {
      out.push(record)
      continue
    }

    // 서비스가 없으면 호출 자체가 없었던 것으로 둔다.
    // 나중에 붙었을 때 이름을 받을 수 있어야 한다
    if (!service) {
      out.push({ ...record, namingStatus: 'skipped', namingNote: 'no-service' })
      continue
    }

    if (!withinBudget(budget, month)) {
      // 이번 달은 여기까지. 다음 달에 다시 볼 수 있게 pending 을 유지하지 않는다 —
      // 대신 skipped 로 남겨서 "부른 적 없음" 을 분명히 해 둔다
      out.push({ ...record, namingStatus: 'skipped', namingNote: 'over-budget' })
      continue
    }

    const outcome = await nameOne(record, service)
    calls += 1
    budget = spend(budget, month)

    out.push({
      ...record,
      generatedTitle: outcome.status === 'named' ? outcome.title : undefined,
      generatedDescription: outcome.status === 'named' ? outcome.description : undefined,
      namingStatus: outcome.status,
      namingNote: outcome.note,
    })
  }

  if (!options.budget) writeBudget(budget)
  options.onBudget?.(budget)

  return { records: out, calls, budget }
}
