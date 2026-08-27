/**
 * 7C — 나만의 발견의 일생.
 *
 * 단계 판정은 Phase 6 의 judge 를 그대로 쓴다 (계획서 30).
 * 개인 발견만 다른 기준으로 열리면, 화면에서 같은 🌱 이 서로 다른 뜻이 된다.
 *
 * 다만 두 가지를 더 건다.
 *
 * 하나. 한 번에 하나만 연다 (계획서 33).
 * 조합을 훑으면 어떤 날은 셋이 한꺼번에 문턱을 넘는다.
 * 그날 발견 세 개가 쏟아지면 그건 발견이 아니라 알림이다.
 *
 * 둘. 동시에 열려 있는 것에 상한을 둔다 (계획서 34).
 * 스무 개가 열려 있으면 하나하나가 아무 뜻도 없어진다.
 */
import type { DiscoveryState } from '../../types'
import { ANALYSIS_VERSION, TAXONOMY_VERSION } from '../../versions'
import { TAGGING_RULE_VERSION } from '../../tagging/engine'
import { makeWindow, shiftDate, type AnalysisWindow } from '../../analytics'
import { measure } from '../measure'
import { judge } from '../thresholds'
import {
  DISCOVERY_RULE_VERSION,
  type DiscoveryDefinition,
  type DiscoveryEvidenceRecord,
  type EvaluationInput,
  type Measurement,
} from '../types'
import { PERSONAL_FLOOR, gateFor, matcher } from './candidates'
import type {
  PersonalCandidate,
  PersonalDiscoveryRecord,
  PersonalResult,
} from './types'

/** 동시에 열려 있을 수 있는 개수 (계획서 34) */
export const ACTIVE_CAP = 10

/** 약해졌는지 볼 때 되돌아보는 날 수 */
export const RECENT_DAYS = 45

/** 이 아래로 떨어지면 약해진 것으로 본다 */
export const WEAKENED_RATIO = 0.5

// ─────────────────────────────────────────────
// 단계 판정
// ─────────────────────────────────────────────

/**
 * judge 에 넘길 가짜 정의.
 *
 * 최소 표본은 일부러 비워 둔다.
 * def.minimum 을 채우면 Phase 6 의 단계별 최소값을 통째로 덮어써서
 * ESTABLISHED 도 10개 · 7일이면 통과해 버린다.
 * Phase 7 의 바닥값은 아래 belowFloor 에서 따로 본다.
 */
function definitionFor(
  metric: PersonalDiscoveryRecord['metric'],
  direction: 1 | -1,
  contexts: PersonalDiscoveryRecord['contexts'],
): DiscoveryDefinition {
  const gate = gateFor(contexts)
  return {
    id: 'personal',
    type: 'PERSONAL',
    family: 'compound',
    displayName: '',
    icon: '✨',
    description: '',
    metric,
    direction,
    effectThreshold: gate.effect,
    consistencyThreshold: gate.consistency,
    // 개인 조합은 시간대에 몰리기 쉽다. 언제나 문맥을 맞춰서 다시 본다
    requiresAdjustment: true,
    requiresMedianAgreement: true,
    evaluator: () => ({ measurements: [] }),
  }
}

const belowFloor = (m: Measurement) =>
  m.sampleCount < PERSONAL_FLOOR.sampleCount
  || m.distinctDays < PERSONAL_FLOOR.distinctDays
  || m.durationDays < PERSONAL_FLOOR.durationDays

export function stateOf(
  m: Measurement,
  record: Pick<PersonalDiscoveryRecord, 'metric' | 'direction' | 'contexts'>,
): DiscoveryState {
  if (belowFloor(m)) return 'LOCKED'
  return judge(definitionFor(record.metric, record.direction, record.contexts), m).state
}

/** 이 조합을 지금 다시 재면 얼마인가 */
export function remeasure(
  input: EvaluationInput,
  record: Pick<PersonalDiscoveryRecord, 'metric' | 'direction' | 'contexts'>,
  window?: AnalysisWindow,
): Measurement | null {
  const scoped = window ? { ...input, window } : input
  return measure(scoped, {
    metric: record.metric,
    where: matcher(record.contexts),
    direction: record.direction,
    adjust: true,
    relatedTags: record.contexts.filter((c) => c.kind === 'tag').map((c) => c.key),
    childLabel: record.contexts.map((c) => c.label).join(' · '),
  })
}

/**
 * 자리 잡았던 것이 최근에도 그대로인가 (Phase 6 과 같은 규칙).
 * 최근 창에 표본이 모자라면 아무 판정도 하지 않는다 —
 * 기록이 줄어든 것과 패턴이 바뀐 것은 다르다.
 */
export function hasChanged(
  input: EvaluationInput,
  record: PersonalDiscoveryRecord,
  previousEffect: number,
): boolean {
  const window = makeWindow('90d', { to: input.today })
  window.from = shiftDate(input.today, -(RECENT_DAYS - 1))
  window.days = RECENT_DAYS

  const recent = remeasure(input, record, window)
  if (!recent) return false
  if (recent.sampleCount < 8 || recent.distinctDays < 4) return false

  if (Math.sign(recent.effect) !== Math.sign(previousEffect)) return true
  return Math.abs(recent.effect) <= Math.abs(previousEffect) * WEAKENED_RATIO
}

// ─────────────────────────────────────────────
// 한 바퀴
// ─────────────────────────────────────────────

export interface LifecycleOptions {
  previous?: readonly PersonalDiscoveryRecord[]
  now?: () => string
}

export function runLifecycle(
  input: EvaluationInput,
  ranked: readonly PersonalCandidate[],
  options: LifecycleOptions = {},
): PersonalResult {
  const at = options.now?.() ?? new Date().toISOString()
  const previous = options.previous ?? []
  const records: PersonalDiscoveryRecord[] = []

  // 1. 이미 열려 있던 것부터 — 다시 재고 단계를 옮긴다
  for (const record of previous) {
    records.push(refresh(input, record, at))
  }

  const openFingerprints = new Set(records.map((r) => r.fingerprint))

  // 2. 자리가 있으면 새로 하나 연다
  const activeCount = records.filter((r) => r.state !== 'LOCKED' && !r.hidden).length
  const fresh = ranked.filter((c) => !openFingerprints.has(c.fingerprint))

  const newlyFound: string[] = []
  let waiting = 0

  for (const candidate of fresh) {
    const state = stateOf(candidate.measurement, candidate)
    if (state === 'LOCKED') continue

    // 한 바퀴에 하나까지, 그리고 상한을 넘지 않는다
    if (newlyFound.length >= 1 || activeCount + newlyFound.length >= ACTIVE_CAP) {
      waiting += 1
      continue
    }

    records.push(open(candidate, state, at))
    newlyFound.push(candidate.fingerprint)
  }

  return { records, newlyFound, waiting, evaluatedAt: at }
}

// ─────────────────────────────────────────────

function open(
  candidate: PersonalCandidate,
  state: DiscoveryState,
  at: string,
): PersonalDiscoveryRecord {
  return {
    fingerprint: candidate.fingerprint,
    metric: candidate.metric,
    direction: candidate.direction,
    contexts: candidate.contexts,
    state,
    peakState: state,
    novelty: candidate.novelty,
    // 이름은 아직 없다. AI 를 부를지 말지는 naming 층이 정한다
    namingStatus: 'pending',
    componentEffects: candidate.componentEffects,
    evidence: [toEvidence(candidate.fingerprint, candidate.measurement, state, at)],
    firstFoundAt: at,
    stateChangedAt: at,
    lastEvaluatedAt: at,
  }
}

function refresh(
  input: EvaluationInput,
  record: PersonalDiscoveryRecord,
  at: string,
): PersonalDiscoveryRecord {
  const m = remeasure(input, record)
  if (!m) return { ...record, lastEvaluatedAt: at }

  let state = stateOf(m, record)

  // 자리 잡았던 것이 최근에 달라졌으면 지우지 않고 CHANGING 으로 옮긴다
  const settled = record.evidence.filter((e) => e.state === 'ESTABLISHED')
  if (record.peakState === 'ESTABLISHED' && settled.length) {
    if (hasChanged(input, record, settled[settled.length - 1].effectSize)) {
      state = 'CHANGING'
    }
  }

  const changed = state !== record.state
  const evidence = [...record.evidence]
  // 단계가 바뀐 순간의 근거만 남긴다. 매번 쌓으면 역사가 아니라 로그가 된다
  if (changed && state !== 'LOCKED') evidence.push(toEvidence(record.fingerprint, m, state, at))

  return {
    ...record,
    state,
    peakState: rank(state) > rank(record.peakState) ? state : record.peakState,
    evidence,
    stateChangedAt: changed ? at : record.stateChangedAt,
    lastEvaluatedAt: at,
    firstFoundAt: record.firstFoundAt ?? (state !== 'LOCKED' ? at : null),
  }
}

const rank = (state: DiscoveryState): number =>
  ({ LOCKED: 0, EMERGING: 1, GROWING: 2, CHANGING: 2, ESTABLISHED: 3 })[state]

export function toEvidence(
  fingerprint: string,
  m: Measurement,
  state: DiscoveryState,
  at: string,
): DiscoveryEvidenceRecord {
  return {
    discoveryId: fingerprint,
    defId: fingerprint,
    childLabel: m.childLabel,
    periodFrom: m.window.from,
    periodTo: m.window.to,
    metric: m.metric,
    observed: m.observed,
    baseline: m.baseline,
    effectSize: m.effect,
    adjustedObserved: m.adjustedBaseline,
    adjustedDifference: m.adjustedEffect,
    adjustedOn: m.adjustedOn,
    sampleCount: m.sampleCount,
    baselineSampleCount: m.baselineSampleCount,
    distinctDays: m.distinctDays,
    durationDays: m.durationDays,
    consistency: m.consistency,
    mean: m.mean,
    median: m.median,
    relatedTags: m.relatedTags ?? [],
    weighting: m.weighting,
    state,
    analysisVersion: ANALYSIS_VERSION,
    taxonomyVersion: TAXONOMY_VERSION,
    ruleVersion: TAGGING_RULE_VERSION,
    discoveryRuleVersion: DISCOVERY_RULE_VERSION,
    evaluatedAt: at,
  }
}
