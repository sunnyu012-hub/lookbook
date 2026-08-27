/**
 * 6A — 무엇을 얼마나 봐야 "발견" 이라고 부를 것인가.
 *
 * 여기가 Phase 6 전체에서 제일 중요한 파일이다.
 * 문턱을 낮추면 DNA 는 많이 열리지만, 그건 잘못된 자기분석을 파는 것과 같다.
 *
 * 잠금이 오래 유지되는 쪽이 틀린 발견보다 낫다 (계획서 82).
 *
 * effect 하나만으로 절대 열지 않는다. 언제나 네 가지를 같이 본다 —
 * 표본 수 · 며칠에 걸쳐 · 얼마 동안 · 얼마나 되풀이됐는가.
 */
import type { DiscoveryState } from '../types'
import type { DiscoveryDefinition, Measurement, Minimums } from './types'

export interface Gate {
  minimum: Minimums
  effect: number
  consistency: number
}

/** 보이기 시작 — 아직 "그럴 수도" 수준이다 */
export const EMERGING: Gate = {
  minimum: { sampleCount: 8, distinctDays: 4, durationDays: 14 },
  effect: 0.35,
  consistency: 0.65,
}

/** 반복되는 중 */
export const GROWING: Gate = {
  minimum: { sampleCount: 15, distinctDays: 7, durationDays: 30 },
  effect: 0.45,
  consistency: 0.7,
}

/** 자리 잡음 — 여기부터는 평균과 중앙값이 같은 쪽을 봐야 한다 */
export const ESTABLISHED: Gate = {
  minimum: { sampleCount: 30, distinctDays: 12, durationDays: 60 },
  effect: 0.5,
  consistency: 0.75,
}

const GATES: Array<[DiscoveryState, Gate]> = [
  ['ESTABLISHED', ESTABLISHED],
  ['GROWING', GROWING],
  ['EMERGING', EMERGING],
]

/** 이 DNA 만의 조건을 공통값 위에 얹는다 */
export function gateFor(def: DiscoveryDefinition, gate: Gate): Gate {
  return {
    minimum: { ...gate.minimum, ...(def.minimum ?? {}) },
    effect: def.effectThreshold ?? gate.effect,
    consistency: def.consistencyThreshold ?? gate.consistency,
  }
}

export interface Verdict {
  state: DiscoveryState
  /** 왜 더 못 올라갔는지 — QA 에서만 본다 */
  blockedBy?:
    | 'sample'
    | 'days'
    | 'duration'
    | 'effect'
    | 'consistency'
    | 'median'
    | 'confounded'
}

/**
 * 측정값 하나가 어느 단계인가.
 *
 * 위에서부터 내려오며 처음 통과하는 칸이 답이다.
 * 하나도 통과 못 하면 LOCKED 이고, 그때 무엇에 막혔는지를 같이 돌려준다.
 */
export function judge(def: DiscoveryDefinition, m: Measurement): Verdict {
  let closest: Verdict['blockedBy'] = 'sample'

  for (const [state, base] of GATES) {
    const gate = gateFor(def, base)
    const blocked = check(def, m, gate, state)
    if (!blocked) return { state }
    closest = blocked
  }

  return { state: 'LOCKED', blockedBy: closest }
}

function check(
  def: DiscoveryDefinition,
  m: Measurement,
  gate: Gate,
  state: DiscoveryState,
): Verdict['blockedBy'] | null {
  if (m.sampleCount < gate.minimum.sampleCount) return 'sample'
  if (m.distinctDays < gate.minimum.distinctDays) return 'days'
  if (m.durationDays < gate.minimum.durationDays) return 'duration'

  // 방향이 있는 DNA 는 부호까지 맞아야 한다.
  // "아침 안개" 는 아침 집중이 낮아야 성립하므로 effect 가 음수여야 한다.
  if (def.direction && Math.sign(m.effect) !== def.direction) return 'effect'
  if (Math.abs(m.effect) < gate.effect) return 'effect'
  if (m.consistency < gate.consistency) return 'consistency'

  // 자리 잡았다고 말하려면 평균과 중앙값이 같은 쪽을 봐야 한다 (계획서 14).
  // 한쪽만 크면 며칠의 극단값이 끌고 간 것이다.
  const needsMedian = def.requiresMedianAgreement ?? state === 'ESTABLISHED'
  if (needsMedian && !sameSide(m)) return 'median'

  // 사람·장소처럼 시간대에 몰리기 쉬운 DNA 는 문맥을 맞춰도 남아야 한다 (계획서 15).
  if (def.requiresAdjustment) {
    const adjusted = m.adjustedEffect
    if (adjusted === undefined) return 'confounded'
    // 맞춰서 견줬더니 방향이 뒤집혔거나 거의 사라졌다면 그건 시간대의 몫이었다
    if (Math.sign(adjusted) !== Math.sign(m.effect)) return 'confounded'
    if (Math.abs(adjusted) < gate.effect * 0.6) return 'confounded'
  }

  return null
}

/** 평균과 중앙값이 baseline 을 기준으로 같은 쪽에 있는가 */
export function sameSide(m: Measurement): boolean {
  const meanSide = Math.sign(m.mean - m.baseline)
  const medianSide = Math.sign(m.median - m.baseline)
  if (meanSide === 0 || medianSide === 0) return true
  return meanSide === medianSide
}

/**
 * 여러 자식을 담는 DNA 의 단계.
 * 자식 중 가장 높은 단계를 부모의 단계로 삼는다 —
 * 클라이밍이 자리 잡았으면 "기쁨을 부르는 것" 자체는 자리 잡은 것이다.
 */
export function bestState(states: readonly DiscoveryState[]): DiscoveryState {
  const rank: Record<DiscoveryState, number> = {
    LOCKED: 0,
    EMERGING: 1,
    GROWING: 2,
    CHANGING: 2,
    ESTABLISHED: 3,
  }
  return states.reduce<DiscoveryState>(
    (best, s) => (rank[s] > rank[best] ? s : best),
    'LOCKED',
  )
}
