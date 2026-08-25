/**
 * 5A — 분석 결과 한 개의 모양.
 *
 * 모든 분석이 같은 모양으로 나온다. 화면은 이 하나만 읽을 줄 알면 된다.
 * 그리고 결과마다 근거(evidence)를 달고 다닌다 —
 * "왜 이렇게 나왔지?" 에 답할 수 없는 숫자는 보여 주지 않기로 했기 때문이다.
 */
import type { MetricKey } from './metrics'
import type { Confidence, DataQuality } from './confidence'
import type { Stats, Weighting } from './stats'
import type { AnalysisWindow } from './windows'

/** 무엇을 걸러서 본 것인지 */
export interface AnalysisFilter {
  /** LIFE TAG id */
  lifeTagId?: string
  /** My Tag id */
  myTagId?: string
  dayPart?: string
  dayType?: string
  dayOfWeek?: number
  /** 두 가지를 겹쳐 본 경우 */
  and?: AnalysisFilter
}

/**
 * Phase 6 DiscoveryEvidence 가 그대로 읽을 수 있게 맞춰 둔다.
 * 여기 있는 값만으로 화면의 숫자를 전부 재현할 수 있어야 한다.
 */
export interface Evidence {
  window: AnalysisWindow
  filter?: AnalysisFilter
  weighting: Weighting
  observed: Stats
  baselineStats?: Stats
  quality: DataQuality
  /** 문맥 보정을 한 경우 그 결과 (계획서 33) */
  adjusted?: {
    /** 무엇에 맞춰 비교했는지 */
    matchedOn: string
    baseline: number
    difference: number
    baselineCount: number
  }
  analysisVersion: number
  taxonomyVersion: number
  ruleVersion: number
}

export interface AnalysisResult {
  metric: MetricKey
  /** 이 묶음의 이름 — '저녁', '클라이밍' 같은 것 */
  label: string
  observed: number
  /** 개인 평균. 없으면 비교 대상이 없는 분석이다 */
  baseline?: number
  /** observed - baseline */
  difference?: number

  sampleCount: number
  distinctDays: number
  confidence: Confidence
  evidence: Evidence
}

/** 차이가 있는 결과만 */
export const withDifference = (results: readonly AnalysisResult[]): AnalysisResult[] =>
  results.filter((r) => r.difference !== undefined)

/** 볼 만한 것만 남긴다 */
export const usable = (results: readonly AnalysisResult[]): AnalysisResult[] =>
  results.filter((r) => r.confidence !== 'insufficient')

/**
 * 차이가 큰 순서. 방향은 따지지 않는다 —
 * 낮게 나온 문맥도 사용자에게는 알 만한 이야기다 (계획서 27).
 */
export const byEffect = (a: AnalysisResult, b: AnalysisResult) =>
  Math.abs(b.difference ?? 0) - Math.abs(a.difference ?? 0)
