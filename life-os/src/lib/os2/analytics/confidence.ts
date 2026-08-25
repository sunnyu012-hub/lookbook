/**
 * 5A — 이 숫자를 얼마나 믿어도 되는가.
 *
 * 확률처럼 보이지 않게 한다 (계획서 15).
 * "83% 확신" 같은 건 이 데이터로 말할 수 없는 정확도다.
 * 대신 세 단계로만 말한다 — 데이터 적음 / 어느 정도 보임 / 비교적 안정적.
 */
import type { MetricDef } from './metrics'
import type { Stats } from './stats'

export type Confidence = 'insufficient' | 'emerging' | 'stable'

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  insufficient: '데이터 적음',
  emerging: '어느 정도 보임',
  stable: '비교적 안정적',
}

/** 그냥 평균 하나를 낼 때 (계획서 10) */
export const MIN_AGGREGATE = 5
export const MIN_AGGREGATE_DAYS = 3

/** 두 집단을 견줄 때 — 양쪽 다 이만큼 */
export const MIN_COMPARISON = 5

/** 문맥 하나를 패턴이라고 부르려면 */
export const MIN_CONTEXT = 6
export const MIN_CONTEXT_DAYS = 3

/** 더 센 이야기를 하려면 */
export const STRONG_SAMPLE = 10
export const STRONG_DAYS = 5

export function confidenceOf(stats: Stats, metric?: MetricDef): Confidence {
  const minSample = metric?.minSample ?? MIN_AGGREGATE
  const minDays = metric?.minDays ?? MIN_AGGREGATE_DAYS

  if (stats.count < minSample || stats.distinctDays < minDays) return 'insufficient'
  if (stats.count >= STRONG_SAMPLE && stats.distinctDays >= STRONG_DAYS) return 'stable'
  return 'emerging'
}

export const isEnough = (confidence: Confidence) => confidence !== 'insufficient'

// ─────────────────────────────────────────────
// 데이터 품질
//
// 표본 수만으로는 부족하다. 저녁 기록 50개가 사흘에 몰려 있으면
// 그건 저녁의 이야기가 아니라 그 사흘의 이야기다 (계획서 77).
// ─────────────────────────────────────────────

export type Quality = 'low' | 'fair' | 'good'

export const QUALITY_LABEL: Record<Quality, string> = {
  low: '적음',
  fair: '보통',
  good: '충분',
}

export interface DataQuality {
  level: Quality
  /** 창 안에서 기록이 있는 날의 비율 0~1 */
  coverage: number
  /** 하루 평균 몇 개 */
  perDay: number
  distinctDays: number
  count: number
}

export function dataQuality(stats: Stats, windowDays: number | null): DataQuality {
  const span = windowDays ?? Math.max(stats.distinctDays, 1)
  const coverage = span > 0 ? Math.min(1, stats.distinctDays / span) : 0
  const perDay = stats.distinctDays > 0 ? stats.count / stats.distinctDays : 0

  let level: Quality = 'low'
  if (stats.count >= STRONG_SAMPLE && stats.distinctDays >= STRONG_DAYS && coverage >= 0.4) {
    level = 'good'
  } else if (stats.count >= MIN_AGGREGATE && stats.distinctDays >= MIN_AGGREGATE_DAYS) {
    level = 'fair'
  }

  return {
    level,
    coverage: Math.round(coverage * 100) / 100,
    perDay: Math.round(perDay * 10) / 10,
    distinctDays: stats.distinctDays,
    count: stats.count,
  }
}

/**
 * 평균과 중앙값이 서로 다른 쪽을 가리키면 믿음을 한 칸 내린다 (계획서 78).
 * 극단값 하나가 평균을 끌고 간 경우가 대부분이라, 그때는 조심하는 게 맞다.
 */
export function adjustForOutliers(confidence: Confidence, stats: Stats, baseline: number): Confidence {
  if (confidence === 'insufficient') return confidence
  const meanSide = Math.sign(stats.mean - baseline)
  const medianSide = Math.sign(stats.median - baseline)
  if (meanSide !== 0 && medianSide !== 0 && meanSide !== medianSide) {
    return confidence === 'stable' ? 'emerging' : 'insufficient'
  }
  return confidence
}
