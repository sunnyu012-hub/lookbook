/**
 * Phase 6 — MY DNA.
 *
 * 이건 성격 검사가 아니다.
 * "당신은 원래 이런 사람입니다" 라고 말하지 않는다.
 * "지금까지의 기록에서는 이런 경향이 관찰됐어요" 까지만 말한다.
 *
 * 그래서 세 가지를 지킨다.
 *   · 근거 없이는 아무것도 열지 않는다 (thresholds.ts)
 *   · 열릴 때의 근거를 그대로 얼려서 남긴다 (evidence 는 덮어쓰지 않는다)
 *   · 사람은 바뀌므로 DNA 도 약해지고 뒤집힐 수 있다 (CHANGING)
 */
import type {
  DiscoveryFamily,
  DiscoveryKind,
  DiscoveryState,
  QuickLog,
  MyTag,
} from '../types'
import type { Checkin } from '@/types'
import type { AnalysisWindow, MetricKey, Weighting } from '../analytics'

/** 판정 규칙이 바뀌면 올린다. 근거에 찍혀서 남는다 (계획서 73) */
export const DISCOVERY_RULE_VERSION = 1

/** 화면에 보여 줄 단계 이름 */
export const STATE_LABEL: Record<DiscoveryState, string> = {
  LOCKED: '아직',
  EMERGING: '보이기 시작',
  GROWING: '반복되는 중',
  ESTABLISHED: '자리 잡음',
  CHANGING: '달라지는 중',
}

export const STATE_ICON: Record<DiscoveryState, string> = {
  LOCKED: '·',
  EMERGING: '🌱',
  GROWING: '🌿',
  ESTABLISHED: '🌳',
  CHANGING: '🍂',
}

/** 단계별 한 줄 (계획서 35~37). 규정하지 않고 관찰만 말한다 */
export const STATE_SENTENCE: Record<DiscoveryState, string> = {
  LOCKED: '아직 알아가는 중이에요.',
  EMERGING: '이런 경향이 보이기 시작했어요.',
  GROWING: '여러 날에 걸쳐 비슷한 흐름이 반복되고 있어요.',
  ESTABLISHED: '오랫동안 비슷한 패턴이 안정적으로 나타나고 있어요.',
  CHANGING: '최근 기록에서는 예전과 조금 다르게 나타나고 있어요.',
}

/** 단계의 순서 — 올라갔는지 내려갔는지 견줄 때 */
export const STATE_RANK: Record<DiscoveryState, number> = {
  LOCKED: 0,
  EMERGING: 1,
  GROWING: 2,
  ESTABLISHED: 3,
  CHANGING: 2,
}

export const FAMILY_LABEL: Record<DiscoveryFamily, string> = {
  rhythm: '리듬',
  energy: '기운과 회복',
  emotion: '감정',
  focus: '집중과 만들기',
  social: '사람',
  body: '몸',
  lifestyle: '생활',
  compound: '겹친 것',
}

export const FAMILY_ORDER: DiscoveryFamily[] = [
  'rhythm',
  'energy',
  'emotion',
  'focus',
  'social',
  'body',
  'lifestyle',
]

// ─────────────────────────────────────────────
// 평가에 들어가는 것
// ─────────────────────────────────────────────

export interface EvaluationInput {
  logs: readonly QuickLog[]
  checkins: readonly Checkin[]
  myTags: readonly MyTag[]
  /** 평가 기준 창 — 보통 전체 기록 */
  window: AnalysisWindow
  /** 오늘 (테스트에서 고정하려고 밖에서 받는다) */
  today: string
}

/**
 * 평가자 한 번의 결과.
 *
 * 평가자는 "몇 단계다" 를 말하지 않는다. 숫자만 낸다.
 * 단계는 thresholds.ts 가 정한다 — 그래야 기준을 한 곳에서 고칠 수 있다.
 */
export interface Measurement {
  metric: MetricKey
  /** 관찰된 값 */
  observed: number
  /** 견준 값 */
  baseline: number
  /**
   * 차이. 방향이 중요한 DNA 는 부호를 그대로 쓴다.
   * "아침 안개" 처럼 낮아야 성립하는 것은 effect 가 음수다.
   */
  effect: number
  /** 문맥을 맞춰서 다시 견준 차이 (있으면) */
  adjustedEffect?: number
  adjustedBaseline?: number
  adjustedOn?: string
  adjustedBaselineCount?: number

  sampleCount: number
  baselineSampleCount: number
  distinctDays: number
  /** 처음 기록부터 마지막 기록까지 며칠에 걸쳐 있는가 */
  durationDays: number

  /** 0~1. 같은 방향이 얼마나 되풀이됐는가 */
  consistency: number

  mean: number
  median: number

  /** 이 발견에 관련된 LIFE TAG */
  relatedTags?: string[]
  /** Joy Trigger 처럼 여러 개를 담는 DNA 의 자식 이름 */
  childLabel?: string
  weighting: Weighting
  window: AnalysisWindow
}

/**
 * 평가자가 돌려주는 것.
 * 표본이 모자라면 measurements 가 비어 있고, 그건 LOCKED 를 뜻한다.
 */
export interface EvaluatorOutput {
  measurements: Measurement[]
  /** 왜 못 열었는지 — QA 에서만 본다 */
  note?: string
}

export type Evaluator = (input: EvaluationInput) => EvaluatorOutput

// ─────────────────────────────────────────────
// 사전 정의
// ─────────────────────────────────────────────

export interface Minimums {
  sampleCount: number
  distinctDays: number
  durationDays: number
}

export interface DiscoveryDefinition {
  id: string
  type: DiscoveryKind
  family: DiscoveryFamily
  displayName: string
  icon: string
  /** 잠겨 있을 때 보여 줄 한 줄. 조건은 절대 적지 않는다 (계획서 4) */
  teaser?: string
  /** 열렸을 때의 한 줄 */
  description: string
  metric?: MetricKey
  /**
   * 이 DNA 가 성립하는 방향.
   *
   * 평가자가 방향을 걸러 버리면 "예전과 반대로 뒤집혔다" 를 볼 수가 없다.
   * 그래서 평가자는 잰 값을 그대로 주고, 방향은 여기서 판정한다 (thresholds.ts).
   */
  direction?: 1 | -1

  /** 이 DNA 만의 최소 조건. 없으면 공통값 */
  minimum?: Partial<Minimums>
  effectThreshold?: number
  consistencyThreshold?: number

  /** 교란 확인을 통과해야 하는가 (사람·장소·특정 활동) */
  requiresAdjustment?: boolean
  /** 평균과 중앙값이 같은 쪽을 가리켜야 하는가 */
  requiresMedianAgreement?: boolean
  /** 여러 자식을 담을 수 있는가 (Joy Trigger 등) */
  multi?: boolean
  /** 같은 시점에 함께 ESTABLISHED 가 될 수 없는 짝 */
  exclusiveWith?: string[]

  evaluator: Evaluator
}

// ─────────────────────────────────────────────
// 평가 결과
// ─────────────────────────────────────────────

export interface DiscoveryEvidenceRecord {
  discoveryId: string
  defId: string
  childLabel?: string
  periodFrom: string
  periodTo: string
  metric: MetricKey
  observed: number
  baseline: number
  effectSize: number
  adjustedObserved?: number
  adjustedDifference?: number
  adjustedOn?: string
  sampleCount: number
  baselineSampleCount: number
  distinctDays: number
  durationDays: number
  consistency: number
  mean: number
  median: number
  relatedTags: string[]
  weighting: Weighting
  state: DiscoveryState
  analysisVersion: number
  taxonomyVersion: number
  ruleVersion: number
  discoveryRuleVersion: number
  evaluatedAt: string
}

/** 사용자가 이 발견을 어떻게 느끼는가 (계획서 42). 통계를 바꾸지 않는다 */
export type UserPerception = 'agree' | 'somewhat' | 'unsure' | 'disagree'

export const PERCEPTION_LABEL: Record<UserPerception, string> = {
  agree: '맞아요',
  somewhat: '어느 정도 맞아요',
  unsure: '잘 모르겠어요',
  disagree: '아닌 것 같아요',
}

export interface DiscoveryRecord {
  defId: string
  type: DiscoveryKind
  family: DiscoveryFamily
  state: DiscoveryState
  /** 지금까지 올라간 가장 높은 단계 — 약해져도 여기는 안 내려간다 */
  peakState: DiscoveryState
  firstDiscoveredAt: string | null
  stateChangedAt: string | null
  lastEvaluatedAt: string
  userPerception?: UserPerception
  /** 이 DNA 를 받치는 근거들. 새 단계가 되면 덮어쓰지 않고 더한다 */
  evidence: DiscoveryEvidenceRecord[]
  /** 여러 자식을 담는 DNA 의 자식 이름들 */
  children?: string[]
}

export interface ShiftRecord {
  fromDefId: string
  toDefId: string
  detectedAt: string
  summary: string
  previousPeriod: { from: string; to: string; effect: number }
  recentPeriod: { from: string; to: string; effect: number }
}

export interface CollectionResult {
  records: DiscoveryRecord[]
  shifts: ShiftRecord[]
  /** 이번 평가에서 새로 열린 것 */
  newlyFound: string[]
  /** 단계가 올라간 것 */
  upgraded: string[]
  evaluatedAt: string
  /** 평가 중 터진 평가자 — 하나가 죽어도 나머지는 돈다 (계획서 72) */
  failed: string[]
}
