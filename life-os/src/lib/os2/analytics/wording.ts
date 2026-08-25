/**
 * 분석 결과를 말로 바꾸는 곳.
 *
 * 이 파일이 있는 이유는 하나다. 문장을 한 곳에 모아 두면
 * "인과처럼 말하지 않기" 를 코드로 검사할 수 있기 때문이다 (아래 BANNED, 그리고 테스트).
 *
 * 관찰한 것만 말한다.
 *   된다:   "클라이밍이 기록된 로그에서 기분이 평균보다 높게 나타났어요"
 *   안 된다: "클라이밍을 하면 기분이 좋아져요"
 *
 * 차이는 작아 보이지만 크다. 앞은 데이터고 뒤는 주장이다.
 * 이 앱은 의료 앱이 아니고, 무엇을 하라고 말할 자격도 없다.
 */
import type { AnalysisResult } from './result'
import { CONFIDENCE_LABEL } from './confidence'
import { METRICS } from './metrics'

/**
 * 분석 문구에 나오면 안 되는 말.
 * 테스트가 이 목록으로 실제 출력 문자열을 훑는다.
 */
export const BANNED_WORDS = [
  '때문',
  '원인',
  '효과가',
  '효과적',
  '덕분',
  '탓',
  '만든다',
  '만들어',
  '좋아진다',
  '좋아져',
  '나빠진다',
  '나빠져',
  '해야',
  '하세요',
  '추천',
  '권장',
  '반드시',
  '당신은',
  '증상',
  '진단',
  '치료',
]

export const hasBannedWord = (text: string): string | null =>
  BANNED_WORDS.find((word) => text.includes(word)) ?? null

// ─────────────────────────────────────────────
// 문장 만들기
// ─────────────────────────────────────────────

/** 얼마나 차이 나는지 — 부호를 붙여서 */
export const signed = (value: number, digits = 1): string =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(digits)}`

/** 표본을 늘 같이 보여 준다. 숫자만 크게 보이면 과신하게 된다 */
export const sampleNote = (result: AnalysisResult): string =>
  `기록 ${result.sampleCount}개 · ${result.distinctDays}일`

/**
 * 한 줄 설명.
 * "높게 나타났어요" 까지만 말하고 멈춘다. 그 뒤는 사용자가 생각할 몫이다.
 */
export function describeResult(result: AnalysisResult): string {
  const metric = METRICS[result.metric]
  if (result.difference === undefined || result.baseline === undefined) {
    return `${result.label} 기록에서 ${metric.label} 평균은 ${metric.format(result.observed)}이에요.`
  }

  const gap = Math.abs(result.difference)
  if (gap < 0.05) {
    return `${result.label} 기록에서 ${metric.label}은 평소와 비슷하게 나타났어요.`
  }

  const direction = result.difference > 0 ? '높게' : '낮게'
  return `${result.label} 기록에서 ${metric.label}이 개인 평균보다 ${direction} 나타났어요.`
}

/** 시간대 이야기 */
export const describeDayPart = (label: string, metricLabel: string, higher: boolean): string =>
  `${label} 시간대 기록에서 ${metricLabel}이 개인 평균보다 ${higher ? '높게' : '낮게'} 나타났어요.`

/** 평일·주말 이야기 */
export const describeDayType = (metricLabel: string, higherSide: '평일' | '주말'): string =>
  `${higherSide} 기록에서 ${metricLabel}이 다른 날보다 높게 나타났어요.`

/** 기간 비교 */
export const describeWindowChange = (metricLabel: string, difference: number, label: string): string => {
  if (Math.abs(difference) < 0.05) return `최근 ${label}의 ${metricLabel}은 그 전과 비슷했어요.`
  return `최근 ${label}의 ${metricLabel}이 그 전보다 ${difference > 0 ? '높게' : '낮게'} 기록됐어요.`
}

/** 잠 이야기 — 인과로 읽히지 않게 "다음 날 ~로 기록됐다" 로만 */
export const describeSleep = (bucketLabel: string, metricLabel: string, value: string): string =>
  `${bucketLabel} 잔 다음 날 ${metricLabel}은 ${value}로 기록됐어요.`

/** 관계 세기 — 계수를 그대로 보여 주지 않는다 (계획서 50, 51) */
export type Relation = 'none' | 'weak' | 'moderate' | 'clear'

export const RELATION_LABEL: Record<Relation, string> = {
  none: '거의 함께 움직이지 않음',
  weak: '약하게 함께 움직임',
  moderate: '어느 정도 함께 움직임',
  clear: '비교적 뚜렷하게 함께 움직임',
}

export function relationOf(r: number | null): Relation {
  if (r === null) return 'none'
  const size = Math.abs(r)
  if (size < 0.2) return 'none'
  if (size < 0.4) return 'weak'
  if (size < 0.6) return 'moderate'
  return 'clear'
}

/** 데이터가 모자랄 때. 몇 개 더 남기라고 재촉하지 않는다 (계획서 66) */
export const NOT_ENOUGH = '아직 이 패턴을 보기엔 기록이 조금 더 필요해요.'
export const NOT_ENOUGH_SHORT = '기록이 조금 더 필요해요'

export const confidenceNote = (result: AnalysisResult): string =>
  CONFIDENCE_LABEL[result.confidence]
