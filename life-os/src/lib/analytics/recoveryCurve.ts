/**
 * RECOVERY CURVE — 오늘 점수 말고 "요즘 어느 쪽으로 흐르고 있나".
 *
 * 어제보다 올랐다 내렸다로 말하지 않는다. 하루치는 원래 흔들린다.
 * 3일 이동평균의 앞뒤를 비교해서 흐름만 본다.
 *
 * 이건 의학적 판단이 아니다. 내가 적은 숫자가 어느 방향으로 움직였는지일 뿐이다.
 */
import type { Checkin } from '@/types'
import { recentKeys } from '../date'

export type CurveMetric = 'overall' | 'recovery' | 'body' | 'mind'

export type CurveTrend = 'RECOVERING' | 'STABLE' | 'DIPPING' | 'VARIABLE' | 'LEARNING'

export const CURVE_METRIC_LABEL: Record<CurveMetric, string> = {
  overall: 'Overall',
  recovery: 'Recovery',
  body: 'Body',
  mind: 'Mind',
}

/** 흐름을 말하려면 이만큼은 있어야 한다 */
export const MIN_CURVE_POINTS = 4

/** 이보다 작은 차이는 흐름이라고 부르지 않는다 (100점 만점 기준) */
const TREND_DIFF = 4

/** 표준편차가 이보다 크면 "흔들리는 편" 으로 본다 */
const VARIABLE_SD = 16

const valueOf = (c: Checkin, metric: CurveMetric): number | null => {
  switch (metric) {
    case 'overall':
      return c.energyScore ?? null
    case 'recovery':
      return c.recoveryScore ?? null
    case 'body':
      return c.bodyScore ?? null
    case 'mind':
      return c.mindScore ?? null
  }
}

export interface CurvePoint {
  date: string
  /** 그날 값 — 기록이 없으면 null (0 으로 채우지 않는다) */
  value: number | null
  /** 3일 이동평균 — 앞이 모자라면 null */
  smooth: number | null
}

export interface RecoveryCurve {
  metric: CurveMetric
  days: number
  points: CurvePoint[]
  /** 유효 기록 수 */
  count: number
  trend: CurveTrend
  /** 최근 절반과 앞 절반의 차이 (반올림) */
  delta: number | null
  arrow: string
  title: string
  message: string
  latest: number | null
  average: number | null
}

const TREND_META: Record<CurveTrend, { arrow: string; title: string }> = {
  RECOVERING: { arrow: '↗', title: 'RECOVERING' },
  STABLE: { arrow: '→', title: 'STABLE' },
  DIPPING: { arrow: '↘', title: 'DIPPING' },
  VARIABLE: { arrow: '≈', title: 'VARIABLE' },
  LEARNING: { arrow: '·', title: 'LEARNING YOUR RHYTHM…' },
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

function sd(xs: number[]): number {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)))
}

/** 3일 이동평균 — 값이 없는 날은 건너뛰고 최근 3개의 유효값으로 만든다 */
function smoothed(points: { date: string; value: number | null }[]): CurvePoint[] {
  const out: CurvePoint[] = []
  for (let i = 0; i < points.length; i += 1) {
    const window: number[] = []
    for (let j = i; j >= 0 && window.length < 3; j -= 1) {
      const v = points[j].value
      if (v != null) window.push(v)
    }
    out.push({
      ...points[i],
      smooth: window.length >= 2 ? Math.round(mean(window) * 10) / 10 : null,
    })
  }
  return out
}

export interface CurveInput {
  checkins: Checkin[]
  metric?: CurveMetric
  days?: number
  today?: string
}

export function recoveryCurve({
  checkins,
  metric = 'overall',
  days = 7,
  today,
}: CurveInput): RecoveryCurve {
  const dates = recentKeys(days, today)
  const byDate = new Map(checkins.map((c) => [c.date, c]))

  const raw = dates.map((date) => {
    const c = byDate.get(date)
    return { date, value: c ? valueOf(c, metric) : null }
  })
  const points = smoothed(raw)

  const values = raw.map((p) => p.value).filter((v): v is number => v != null)
  const count = values.length

  if (count < MIN_CURVE_POINTS) {
    return {
      metric,
      days,
      points,
      count,
      trend: 'LEARNING',
      delta: null,
      ...TREND_META.LEARNING,
      message: '조금 더 기록하면 최근 흐름을 볼 수 있어요.',
      latest: values[values.length - 1] ?? null,
      average: count ? Math.round(mean(values)) : null,
    }
  }

  // 앞 절반 vs 뒤 절반 — 이동평균을 쓴 값끼리 비교한다
  const delta = halfDelta(points)

  /**
   * 하루짜리 이상값 하나가 흐름 판정을 뒤집는 걸 막는다.
   * 엿새 내내 60이다가 하루만 20인 날은 "내려가는 흐름" 이 아니라 "힘든 하루" 다.
   * 가장 튄 값 하나를 빼고 다시 계산해서, 그때도 같은 방향이어야 흐름이라고 부른다.
   */
  const robust = delta == null ? null : halfDelta(withoutOutlier(points, raw))

  const spread = sd(values)
  const trending =
    delta != null &&
    robust != null &&
    Math.abs(delta) >= TREND_DIFF &&
    Math.abs(robust) >= TREND_DIFF &&
    Math.sign(delta) === Math.sign(robust)

  let trend: CurveTrend
  if (trending) trend = delta > 0 ? 'RECOVERING' : 'DIPPING'
  else if (spread >= VARIABLE_SD) trend = 'VARIABLE'
  else trend = 'STABLE'

  return {
    metric,
    days,
    points,
    count,
    trend,
    delta: delta ?? null,
    ...TREND_META[trend],
    message: messageOf(trend, metric, delta ?? 0),
    latest: values[values.length - 1] ?? null,
    average: Math.round(mean(values)),
  }
}

/** 이동평균의 앞 절반과 뒤 절반 차이 */
function halfDelta(list: CurvePoint[]): number | null {
  const smooths = list.map((p) => p.smooth).filter((v): v is number => v != null)
  const half = Math.floor(smooths.length / 2)
  if (half < 2) return null
  const before = smooths.slice(0, half)
  const after = smooths.slice(smooths.length - half)
  return Math.round((mean(after) - mean(before)) * 10) / 10
}

/** 중앙값에서 가장 멀리 떨어진 하루를 빼고 다시 이동평균을 만든다 */
function withoutOutlier(
  list: CurvePoint[],
  raw: { date: string; value: number | null }[],
): CurvePoint[] {
  const values = raw.map((p) => p.value).filter((v): v is number => v != null)
  if (values.length < 4) return list

  const sorted = [...values].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]

  let worst = -1
  let worstGap = -1
  raw.forEach((p, i) => {
    if (p.value == null) return
    const gap = Math.abs(p.value - median)
    if (gap > worstGap) {
      worstGap = gap
      worst = i
    }
  })
  if (worst < 0) return list

  return smoothed(raw.map((p, i) => (i === worst ? { ...p, value: null } : p)))
}

function messageOf(trend: CurveTrend, metric: CurveMetric, delta: number): string {
  const name = CURVE_METRIC_LABEL[metric]
  const amount = Math.abs(delta)
  switch (trend) {
    case 'RECOVERING':
      return `최근 ${name} 기록이 조금씩 올라오는 흐름이에요. (평균 ${amount}점 차이)`
    case 'DIPPING':
      return `최근 기록에서는 ${name}이 조금 낮아지는 흐름이에요. 무슨 일이 있었는지 적어 두면 나중에 도움이 돼요.`
    case 'VARIABLE':
      return `최근 ${name} 변화 폭이 조금 큰 편이에요. 좋은 날과 힘든 날이 섞여 있었어요.`
    case 'STABLE':
      return `최근 ${name}이 비슷한 범위에서 유지되고 있어요.`
    default:
      return '조금 더 기록하면 최근 흐름을 볼 수 있어요.'
  }
}
