/**
 * Scoring 2.0.
 *
 * 이 앱은 의료 앱이 아니다. 여기서 나오는 숫자는 진단이 아니라
 * "내가 적은 것들을 한 눈에 보기 위한 요약" 이다.
 *
 * 규칙
 *   · 비어 있는 항목은 0점이 아니라 계산에서 제외한다.
 *   · 남은 항목끼리 가중치를 다시 나눠 갖는다 (renormalize).
 *   · 얼마나 채웠는지는 confidence 로 따로 보여 준다 — 적게 적은 날의 점수를 과신하지 않도록.
 */
import type { Checkin, CheckinInput, EnergyMode } from '@/types'
import {
  DEFAULT_SCORE_CONTEXT,
  DIMENSIONS,
  METRICS,
  type Dimension,
  type MetricKey,
  type ScoreContext,
} from './metrics'

export * from './metrics'
export * from './normalize'

export interface MetricScore {
  key: MetricKey
  label: string
  dim: Dimension
  raw: number
  score: number
  weight: number
}

export interface ScoreResult {
  /** 0~100. 적은 게 하나도 없으면 null */
  overall: number | null
  mode: EnergyMode | null
  dimensions: Record<Dimension, number | null>
  metrics: MetricScore[]
  byKey: Partial<Record<MetricKey, MetricScore>>
  /** 0~1 — 채운 항목의 가중치 비율 */
  confidence: number
  filled: number
  totalMetrics: number
}

export function scoreCheckin(
  input: CheckinInput,
  ctx: ScoreContext = DEFAULT_SCORE_CONTEXT,
): ScoreResult {
  const metrics: MetricScore[] = []

  for (const def of METRICS) {
    const raw = def.raw(input)
    if (raw === null) continue
    metrics.push({
      key: def.key,
      label: def.label,
      dim: def.dim,
      raw,
      score: def.norm(raw, ctx),
      weight: def.weight,
    })
  }

  const byKey: Partial<Record<MetricKey, MetricScore>> = {}
  metrics.forEach((m) => (byKey[m.key] = m))

  const weighted = (list: MetricScore[]): number | null => {
    const sum = list.reduce((s, m) => s + m.weight, 0)
    if (sum <= 0) return null
    return Math.round(list.reduce((s, m) => s + m.score * m.weight, 0) / sum)
  }

  const dimensions = Object.fromEntries(
    DIMENSIONS.map((d) => [d, weighted(metrics.filter((m) => m.dim === d))]),
  ) as Record<Dimension, number | null>

  const overall = weighted(metrics)
  const totalWeight = METRICS.reduce((s, m) => s + m.weight, 0)
  const filledWeight = metrics.reduce((s, m) => s + m.weight, 0)

  // 얼마나 채웠는지는 두 가지를 섞어서 본다.
  //  · 가중치 기준: 점수를 크게 좌우하는 항목을 채웠는가
  //  · 개수 기준: 화면에 보이는 "7/18" 과 어긋나 보이지 않게
  const coverage =
    0.7 * Math.min(1, filledWeight / totalWeight) + 0.3 * (metrics.length / METRICS.length)

  return {
    overall,
    mode: overall === null ? null : scoreToMode(overall),
    dimensions,
    metrics,
    byKey,
    confidence: Math.round(Math.min(1, coverage) * 100) / 100,
    filled: metrics.length,
    totalMetrics: METRICS.length,
  }
}

export function scoreToMode(score: number): EnergyMode {
  if (score < 40) return 'RECOVERY'
  if (score < 60) return 'EASY'
  if (score < 80) return 'NORMAL'
  return 'POWER'
}

/** 저장된 기록의 표시 점수 — 저장 시점에 계산해 둔 값을 그대로 쓴다 */
export const scoreOf = (c: Checkin | null | undefined): number | null => c?.energyScore ?? null

export type ConfidenceLevel = 'low' | 'medium' | 'high'

export function confidenceLevel(c: number): ConfidenceLevel {
  if (c < 0.35) return 'low'
  if (c < 0.7) return 'medium'
  return 'high'
}

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  low: '조금 적은 날',
  medium: '적당히 적은 날',
  high: '꼼꼼히 적은 날',
}
