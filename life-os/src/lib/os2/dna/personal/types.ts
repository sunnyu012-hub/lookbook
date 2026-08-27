/**
 * Phase 7 — 나만의 발견 (Personal Discovery).
 *
 * 48개 DNA 는 "사람들에게 흔히 보이는 것" 을 미리 적어 둔 목록이다.
 * 여기서 다루는 것은 그 목록에 없는 것 — 이 사람의 기록에서만 나온 조합이다.
 *
 * 그래서 위험도 여기가 가장 크다. 미리 정해 둔 정의가 없으니
 * "우연히 맞아떨어진 조합" 을 발견이라고 부르기 쉽다.
 *
 * 그걸 막는 장치가 셋이다.
 *   · 문턱을 48개보다 높게 둔다 (n≥10 · 7일 · 30일 · effect 0.55 · 되풀이 70%)
 *   · 이미 아는 것과 겹치면 버린다 (novelty.ts)
 *   · 한 번에 하나만 연다 (lifecycle.ts)
 *
 * AI 는 여기서 딱 한 가지만 한다 — 이미 확정된 발견에 "이름" 을 붙인다.
 * 패턴을 찾지도, 판단하지도, 건강을 말하지도 않는다.
 */
import type { DiscoveryState, DayPart, QuickLog } from '../../types'
import type { MetricKey, AnalysisWindow, Weighting } from '../../analytics'
import type { DiscoveryEvidenceRecord, Measurement, UserPerception } from '../types'

/** 개인 발견 규칙이 바뀌면 올린다. 지문(fingerprint)에 들어간다 */
export const PERSONAL_RULE_VERSION = 1

// ─────────────────────────────────────────────
// 조합 한 조각
// ─────────────────────────────────────────────

export type ContextKind = 'tag' | 'myTag' | 'dayPart'

export interface PersonalContext {
  kind: ContextKind
  /** tag id / myTag id / DayPart */
  key: string
  /** 화면에 보여 줄 이름. 영문 key 를 그대로 내보내지 않는다 */
  label: string
}

/** AI 로 보낼 때 사람 이름처럼 보이는 것은 이 자리표로 바꾼다 (계획서 14) */
export interface Placeholder {
  token: string
  context: PersonalContext
}

// ─────────────────────────────────────────────
// 후보
// ─────────────────────────────────────────────

export interface PersonalCandidate {
  fingerprint: string
  metric: MetricKey
  direction: 1 | -1
  contexts: PersonalContext[]
  measurement: Measurement
  /** 조각 하나하나만 봤을 때의 차이 — 조합이 무엇을 더했는지 보려고 */
  componentEffects: Array<{ label: string; effect: number }>
  /** 새로움 점수. novelty.ts 가 채운다 */
  novelty: number
  noveltyParts?: NoveltyParts
  window: AnalysisWindow
  weighting: Weighting
}

export interface NoveltyParts {
  /** 조합이 조각 하나보다 얼마나 더 크게 나타났는가 */
  combinationLift: number
  /** 개인 평균에서 얼마나 떨어져 있는가 */
  baselineLift: number
  /** 얼마나 좁은 이야기인가 */
  specificity: number
  consistency: number
  /** 문맥을 맞춰도 남는가 */
  independence: number
  sampleQuality: number
}

// ─────────────────────────────────────────────
// 발견 기록
// ─────────────────────────────────────────────

export type NamingStatus = 'pending' | 'named' | 'fallback' | 'skipped'

export interface PersonalDiscoveryRecord {
  /** 지문 = 조합의 정체. 같은 조합은 앱을 다시 켜도 같은 지문이다 */
  fingerprint: string
  metric: MetricKey
  direction: 1 | -1
  contexts: PersonalContext[]
  state: DiscoveryState
  peakState: DiscoveryState
  novelty: number

  /** AI 가 붙인 이름. 없으면 fallback 을 쓴다 */
  generatedTitle?: string
  generatedDescription?: string
  /** 사용자가 직접 고친 이름이 언제나 이긴다 (계획서 68) */
  userTitle?: string
  namingStatus: NamingStatus
  /** 왜 fallback 이 됐는지 — QA 에서만 본다 */
  namingNote?: string

  hidden?: boolean
  userPerception?: UserPerception

  componentEffects: Array<{ label: string; effect: number }>
  evidence: DiscoveryEvidenceRecord[]

  firstFoundAt: string | null
  stateChangedAt: string | null
  lastEvaluatedAt: string
}

export interface PersonalResult {
  records: PersonalDiscoveryRecord[]
  /** 이번에 새로 열린 것 — 한 번에 하나까지 */
  newlyFound: string[]
  /** 문턱은 넘었지만 자리가 없어서 기다리는 후보 수 (화면에는 안 쓴다) */
  waiting: number
  evaluatedAt: string
}

export interface PersonalInput {
  logs: readonly QuickLog[]
  window: AnalysisWindow
  today: string
  myTagNameOf: (id: string) => string | undefined
}

export type { DayPart, MetricKey, DiscoveryState }
