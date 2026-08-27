/**
 * 6C / 6D — 평가를 돌리고, 단계를 옮기고, 근거를 쌓는다.
 *
 * 지키는 것 셋.
 *
 * 하나. 평가자 하나가 터져도 나머지는 돈다 (계획서 72).
 * 48개 중 하나에 실수가 있다고 컬렉션 전체가 사라지면 안 된다.
 *
 * 둘. 근거는 덮어쓰지 않는다 (계획서 10, 74).
 * Analysis Snapshot 은 캐시라 다시 계산하면 그만이지만,
 * DiscoveryEvidence 는 "그때 왜 열렸는가" 라서 역사다.
 *
 * 셋. 한 번 자리 잡았다고 영원히 자리 잡은 게 아니다 (계획서 92).
 * 다만 기록이 줄어든 것만으로 내려가지는 않는다 — 그건 변한 게 아니라 안 적은 것이다.
 */
import { ANALYSIS_VERSION, TAXONOMY_VERSION } from '../versions'
import { TAGGING_RULE_VERSION } from '../tagging/engine'
import { daysBetween, makeWindow, shiftDate, type AnalysisWindow } from '../analytics'
import type { DiscoveryState } from '../types'
import { BASE_DNA } from './registry'
import { RARE_DNA } from './registry/rare'
import { bestState, judge } from './thresholds'
import {
  DISCOVERY_RULE_VERSION,
  type CollectionResult,
  type DiscoveryDefinition,
  type DiscoveryEvidenceRecord,
  type DiscoveryRecord,
  type EvaluationInput,
  type Measurement,
  type ShiftRecord,
} from './types'

export const ALL_DNA: DiscoveryDefinition[] = [...BASE_DNA, ...RARE_DNA]

/**
 * 얼마나 되돌아보며 판정할 것인가.
 *
 * 전체 기록을 다 보면, 반년 전에 반대였던 패턴이 지금 뚜렷한 패턴을 가려 버린다.
 * 저녁형이었다가 아침형이 된 사람은 1년을 통째로 보면 둘 다 안 열린다 —
 * 서로 상쇄되기 때문이다. 그건 "아무 리듬이 없다" 가 아니라 "바뀌었다" 인데
 * 전체 창으로는 그 둘을 구별할 수 없다.
 *
 * 그래서 판정은 최근 180일로 한다. 자리 잡으려면 60일이 필요하니 넉넉하고,
 * 반년 전 이야기가 지금을 가리지도 않는다.
 * 예전의 나는 peakState 와 evidence 에 그대로 남는다.
 */
export const EVALUATION_DAYS = 180

/** 평가에 쓸 창 — 기록이 짧으면 있는 만큼만 */
export function evaluationWindow(
  logs: readonly { date: string }[],
  today: string,
): AnalysisWindow {
  const window = makeWindow('90d', { to: today })
  window.from = shiftDate(today, -(EVALUATION_DAYS - 1))
  window.days = EVALUATION_DAYS
  window.key = 'all'
  window.label = `최근 ${EVALUATION_DAYS}일`

  const earliest = logs.reduce<string | null>(
    (min, l) => (min === null || l.date < min ? l.date : min),
    null,
  )
  if (earliest && earliest > window.from) window.from = earliest

  return window
}

export interface EvaluateOptions {
  /** 이전 평가 결과 — 처음이면 비운다 */
  previous?: readonly DiscoveryRecord[]
  /** 평가할 것만 고르고 싶을 때 (계획서 48) */
  only?: readonly string[]
  now?: () => string
}

export function evaluateCollection(
  input: EvaluationInput,
  options: EvaluateOptions = {},
): CollectionResult {
  const at = options.now?.() ?? new Date().toISOString()
  const before = new Map((options.previous ?? []).map((r) => [r.defId, r]))
  const records: DiscoveryRecord[] = []
  const failed: string[] = []
  const newlyFound: string[] = []
  const upgraded: string[] = []

  const targets = options.only
    ? ALL_DNA.filter((d) => options.only!.includes(d.id))
    : ALL_DNA

  for (const def of targets) {
    let measurements: Measurement[] = []
    try {
      measurements = def.evaluator(input).measurements
    } catch {
      // 하나가 터져도 나머지는 계속 돈다
      failed.push(def.id)
      measurements = []
    }

    const previous = before.get(def.id)
    const record = buildRecord(def, measurements, previous, at)

    // 상반된 DNA 가 동시에 자리 잡지 못하게 (계획서 54)
    records.push(record)

    if (record.state !== 'LOCKED' && (!previous || previous.state === 'LOCKED')) {
      newlyFound.push(def.id)
    } else if (previous && isUpgrade(previous.state, record.state)) {
      upgraded.push(def.id)
    }
  }

  resolveExclusives(records)

  return {
    records,
    // 이동은 CHANGING 이 찍힌 뒤에야 보인다 — applyChanging 이 채운다
    shifts: [],
    newlyFound,
    upgraded,
    evaluatedAt: at,
    failed,
  }
}

// ─────────────────────────────────────────────

function buildRecord(
  def: DiscoveryDefinition,
  measurements: readonly Measurement[],
  previous: DiscoveryRecord | undefined,
  at: string,
): DiscoveryRecord {
  const verdicts = measurements.map((m) => ({ m, verdict: judge(def, m) }))
  const passing = verdicts.filter((v) => v.verdict.state !== 'LOCKED')

  // 여러 자식을 담는 DNA 는 자식 중 가장 높은 단계가 부모의 단계다
  const state = passing.length
    ? bestState(passing.map((v) => v.verdict.state))
    : 'LOCKED'

  const kept = def.multi ? passing : passing.slice(0, 1)

  const evidence: DiscoveryEvidenceRecord[] = [...(previous?.evidence ?? [])]

  // 단계가 바뀌었을 때만 근거를 더한다. 매번 쌓으면 역사가 아니라 로그가 된다
  const stateChanged = !previous || previous.state !== state
  if (stateChanged && state !== 'LOCKED') {
    for (const { m, verdict } of kept) {
      evidence.push(toEvidence(def, m, verdict.state, at))
    }
  }

  const peakRank = rank(previous?.peakState ?? 'LOCKED')
  const peakState = rank(state) > peakRank ? state : previous?.peakState ?? state

  return {
    defId: def.id,
    type: def.type,
    family: def.family,
    state,
    peakState,
    firstDiscoveredAt:
      previous?.firstDiscoveredAt ?? (state !== 'LOCKED' ? at : null),
    stateChangedAt: stateChanged ? at : previous?.stateChangedAt ?? null,
    lastEvaluatedAt: at,
    // 사용자가 느낀 것은 재평가해도 지우지 않는다 (계획서 44)
    userPerception: previous?.userPerception,
    evidence,
    children: def.multi
      ? kept.map((v) => v.m.childLabel ?? '').filter(Boolean)
      : undefined,
  }
}

function toEvidence(
  def: DiscoveryDefinition,
  m: Measurement,
  state: DiscoveryState,
  at: string,
): DiscoveryEvidenceRecord {
  return {
    discoveryId: def.id,
    defId: def.id,
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

const rank = (state: DiscoveryState): number =>
  ({ LOCKED: 0, EMERGING: 1, GROWING: 2, CHANGING: 2, ESTABLISHED: 3 })[state]

const isUpgrade = (from: DiscoveryState, to: DiscoveryState) =>
  rank(to) > rank(from) && to !== 'CHANGING'

/**
 * 상반된 DNA 정리 (계획서 53, 54).
 *
 * 아침형과 저녁형이 둘 다 평균보다 높을 수는 있다 — 낮이 낮았을 뿐일 수도 있으니까.
 * 그래서 무조건 배타로 두지 않고, 둘 다 ESTABLISHED 일 때만 약한 쪽을 한 칸 내린다.
 */
function resolveExclusives(records: DiscoveryRecord[]): void {
  const byId = new Map(records.map((r) => [r.defId, r]))

  for (const def of ALL_DNA) {
    if (!def.exclusiveWith?.length) continue
    const mine = byId.get(def.id)
    if (!mine || mine.state !== 'ESTABLISHED') continue

    for (const otherId of def.exclusiveWith) {
      const other = byId.get(otherId)
      if (!other || other.state !== 'ESTABLISHED') continue

      const a = latestEffect(mine)
      const b = latestEffect(other)
      // 약한 쪽을 한 칸 내린다. 지우지는 않는다
      const weaker = Math.abs(a) < Math.abs(b) ? mine : other
      weaker.state = 'GROWING'
    }
  }
}

const latestEffect = (record: DiscoveryRecord): number =>
  record.evidence.length ? Math.abs(record.evidence[record.evidence.length - 1].effectSize) : 0

// ─────────────────────────────────────────────
// CHANGING — 약해졌거나 뒤집혔는가 (계획서 38, 93)
// ─────────────────────────────────────────────

/** 최근 얼마를 볼 것인가 */
export const RECENT_DAYS = 45

/** 이 아래로 떨어지면 약해진 것으로 본다 */
export const WEAKENED_RATIO = 0.5

export interface ChangeCheck {
  changed: boolean
  reason?: 'weakened' | 'reversed' | 'gone'
  recentEffect?: number
  previousEffect?: number
}

/**
 * 자리 잡았던 DNA 가 최근에도 그대로인가.
 *
 * 최근 창에 표본이 모자라면 아무 판정도 하지 않는다.
 * 기록이 줄어든 것과 패턴이 바뀐 것은 다르다.
 */
export function checkChanging(
  def: DiscoveryDefinition,
  record: DiscoveryRecord,
  input: EvaluationInput,
): ChangeCheck {
  if (record.peakState !== 'ESTABLISHED') return { changed: false }

  const past = record.evidence.filter((e) => e.state === 'ESTABLISHED')
  if (!past.length) return { changed: false }
  const previousEffect = past[past.length - 1].effectSize

  const recentWindow: AnalysisWindow = makeWindow('90d', {
    to: input.today,
  })
  recentWindow.from = shiftDate(input.today, -(RECENT_DAYS - 1))
  recentWindow.days = RECENT_DAYS

  let recent: Measurement[] = []
  try {
    recent = def.evaluator({ ...input, window: recentWindow }).measurements
  } catch {
    return { changed: false }
  }

  const current = recent[0]

  // 최근에 볼 만한 표본이 없으면 판정하지 않는다
  if (!current || current.sampleCount < 8 || current.distinctDays < 4) {
    return { changed: false }
  }

  if (Math.sign(current.effect) !== Math.sign(previousEffect)) {
    return {
      changed: true,
      reason: 'reversed',
      recentEffect: current.effect,
      previousEffect,
    }
  }

  if (Math.abs(current.effect) <= Math.abs(previousEffect) * WEAKENED_RATIO) {
    return {
      changed: true,
      reason: 'weakened',
      recentEffect: current.effect,
      previousEffect,
    }
  }

  return { changed: false, recentEffect: current.effect, previousEffect }
}

/** 자리 잡았던 것들 중 최근에 달라진 것을 CHANGING 으로 옮긴다 */
export function applyChanging(
  result: CollectionResult,
  input: EvaluationInput,
  previous: readonly DiscoveryRecord[] = [],
): CollectionResult {
  const records = result.records.map((record) => {
    const def = ALL_DNA.find((d) => d.id === record.defId)
    if (!def) return record

    const check = checkChanging(def, record, input)
    if (!check.changed) return record

    return {
      ...record,
      state: 'CHANGING' as DiscoveryState,
      stateChangedAt: result.evaluatedAt,
    }
  })

  const before = new Map(previous.map((r) => [r.defId, r]))
  return { ...result, records, shifts: detectShifts(records, before, result.evaluatedAt) }
}

// ─────────────────────────────────────────────
// DNA Shift (계획서 40)
// ─────────────────────────────────────────────

/** 이 짝들 사이에서만 이동을 본다 — 아무 둘이나 이었다고 변화가 아니다 */
export const SHIFT_PAIRS: Array<[string, string]> = [
  ['morning_bloom', 'evening_bloom'],
  ['evening_bloom', 'morning_bloom'],
  ['fast_recharge', 'slow_recharge'],
  ['slow_recharge', 'fast_recharge'],
  ['daily_rollercoaster', 'stable_rhythm'],
  ['stable_rhythm', 'daily_rollercoaster'],
  ['social_charge', 'social_drain'],
  ['social_drain', 'social_charge'],
  ['creative_night', 'afternoon_focus'],
]

function detectShifts(
  records: readonly DiscoveryRecord[],
  before: ReadonlyMap<string, DiscoveryRecord>,
  at: string,
): ShiftRecord[] {
  const byId = new Map(records.map((r) => [r.defId, r]))
  const out: ShiftRecord[] = []

  for (const [fromId, toId] of SHIFT_PAIRS) {
    const from = byId.get(fromId)
    const to = byId.get(toId)
    if (!from || !to) continue

    // 예전에 자리 잡았던 쪽이 흔들리고, 반대쪽이 자라났을 때만
    const wasStrong = rank(from.peakState) >= 3
    const nowWeak = from.state === 'CHANGING'
    const otherGrew = rank(to.state) >= 2 && rank(before.get(toId)?.state ?? 'LOCKED') < 2

    if (!wasStrong || !nowWeak || !otherGrew) continue

    const fromEvidence = from.evidence[from.evidence.length - 1]
    const toEvidence = to.evidence[to.evidence.length - 1]
    if (!fromEvidence || !toEvidence) continue

    out.push({
      fromDefId: fromId,
      toDefId: toId,
      detectedAt: at,
      // 인과를 말하지 않는다. 무엇이 무엇으로 바뀌었는지만 적는다
      summary: '최근 기록에서는 예전과 다른 쪽이 더 자주 나타나고 있어요.',
      previousPeriod: {
        from: fromEvidence.periodFrom,
        to: fromEvidence.periodTo,
        effect: fromEvidence.effectSize,
      },
      recentPeriod: {
        from: toEvidence.periodFrom,
        to: toEvidence.periodTo,
        effect: toEvidence.effectSize,
      },
    })
  }

  return out
}

export { daysBetween }
