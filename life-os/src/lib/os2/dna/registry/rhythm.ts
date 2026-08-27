/**
 * RHYTHM — 하루 안에서 나는 언제 어떤가. 8개.
 *
 * 여기 DNA 들은 전부 "시간대 vs 나머지 시간대" 로 견준다.
 * 전체 평균과 견주면 "저녁이 평균보다 높다" 가 되는데,
 * 그건 저녁이 특별해서가 아니라 아침이 낮아서일 수도 있다.
 */
import { round, valueOfLog, type MetricKey } from '../../analytics'
import type { QuickLog } from '../../types'
import { measure, measureSeries } from '../measure'
import type { Evaluator, EvaluationInput, Measurement } from '../types'
import { AFTERNOON, EVENING, MORNING, defineDna } from './define'

/** 이 시간대 기록이면 true */
const at = (parts: Set<string>) => (log: QuickLog) => parts.has(log.dayPart)

/** 시간대 하나를 나머지와 견주는 평가자 */
const dayPartEvaluator = (
  parts: Set<string>,
  metric: MetricKey,
  direction: 1 | -1,
): Evaluator =>
  (input) => {
    // 방향으로 잘라 내지 않는다. 잰 값을 그대로 주고 판정은 judge 가 한다 —
    // 그래야 나중에 "예전과 반대로 뒤집혔다" 를 볼 수 있다
    const m = measure(input, { metric, where: at(parts), direction })
    return m ? { measurements: [m] } : { measurements: [], note: '표본 없음' }
  }

export const RHYTHM_DNA = defineDna('rhythm', [
  {
    id: 'morning_bloom',
    direction: 1,
    displayName: '아침이 좋은 사람',
    icon: '🌅',
    teaser: '하루 중 어느 시간대가 잘 맞을까요?',
    description: '아침에 남긴 기록에서 기분이 다른 시간대보다 높게 나타나는 경향이 있어요.',
    metric: 'mood',
    exclusiveWith: ['evening_bloom'],
    evaluator: dayPartEvaluator(MORNING, 'mood', 1),
  },
  {
    id: 'evening_bloom',
    direction: 1,
    displayName: '저녁이 좋은 사람',
    icon: '🌙',
    teaser: '하루 중 어느 시간대가 잘 맞을까요?',
    description: '저녁에 남긴 기록에서 기분이 다른 시간대보다 높게 나타나는 경향이 있어요.',
    metric: 'mood',
    exclusiveWith: ['morning_bloom'],
    evaluator: dayPartEvaluator(EVENING, 'mood', 1),
  },
  {
    id: 'afternoon_focus',
    direction: 1,
    displayName: '낮에 집중되는 사람',
    icon: '☀️',
    teaser: '집중이 잘 되는 시간이 따로 있을까요?',
    description: '낮에 남긴 기록에서 집중이 다른 시간대보다 높게 나타나는 경향이 있어요.',
    metric: 'focus',
    evaluator: dayPartEvaluator(AFTERNOON, 'focus', 1),
  },
  {
    id: 'morning_fog',
    direction: -1,
    displayName: '아침에 흐린 사람',
    icon: '🌫️',
    teaser: '아침에는 어떤 편일까요?',
    description: '아침에 남긴 기록에서 집중이 다른 시간대보다 낮게 나타나는 경향이 있어요.',
    metric: 'focus',
    evaluator: dayPartEvaluator(MORNING, 'focus', -1),
  },
  {
    id: 'evening_crash',
    direction: -1,
    type: 'HIDDEN',
    displayName: '저녁에 꺾이는 사람',
    icon: '📉',
    description: '같은 날 낮보다 저녁에 기운이 낮게 기록되는 경우가 반복됐어요.',
    metric: 'energy',
    // 같은 날 안에서 견주므로 하루가 표본 하나다. 그만큼 문턱을 낮춘다
    minimum: { sampleCount: 10, distinctDays: 10, durationDays: 30 },
    evaluator: (input) => {
      const drops = withinDayDrop(input, 'energy', AFTERNOON, EVENING)
      if (drops.length < 5) return { measurements: [], note: '같은 날 짝이 모자람' }
      const m = measureSeries({
        metric: 'energy',
        window: input.window,
        values: drops,
        baseline: 0,
        direction: -1,
      })
      return m && m.effect < 0 ? { measurements: [m] } : { measurements: [] }
    },
  },
  {
    id: 'weekend_shift',
    displayName: '주말이 다른 사람',
    icon: '🗓️',
    teaser: '평일과 주말의 하루는 얼마나 다를까요?',
    description: '주말 기록의 흐름이 평일과 다르게 나타나는 경향이 있어요.',
    metric: 'mood',
    minimum: { sampleCount: 18, distinctDays: 18, durationDays: 35 },
    evaluator: (input) => {
      const weekend = (log: QuickLog) => log.dayOfWeek === 0 || log.dayOfWeek === 6
      const m = measure(input, { metric: 'mood', where: weekend, direction: 1 })
      if (!m) return { measurements: [], note: '표본 없음' }
      // 주말은 기록이 적게 마련이다. 주말 날짜 수를 따로 본다
      if (m.distinctDays < 6) return { measurements: [], note: '주말 날짜 부족' }
      return { measurements: [{ ...m, effect: round(Math.abs(m.effect)) }] }
    },
  },
  {
    id: 'daily_rollercoaster',
    direction: 1,
    displayName: '하루 안에서 크게 움직이는 사람',
    icon: '🎢',
    teaser: '하루 안에서 얼마나 오르내릴까요?',
    description: '하루 안에서 기분의 오르내림이 다른 날들보다 큰 편으로 반복됐어요.',
    metric: 'mood',
    minimum: { sampleCount: 10, distinctDays: 10, durationDays: 30 },
    exclusiveWith: ['stable_rhythm'],
    evaluator: (input) => volatility(input, 'mood', 1),
  },
  {
    id: 'stable_rhythm',
    direction: -1,
    type: 'HIDDEN',
    displayName: '고르게 흐르는 사람',
    icon: '〰️',
    description: '하루 안에서 기분의 오르내림이 비교적 작게 유지되고 있어요.',
    metric: 'mood',
    minimum: { sampleCount: 10, distinctDays: 10, durationDays: 30 },
    exclusiveWith: ['daily_rollercoaster'],
    evaluator: (input) => volatility(input, 'mood', -1),
  },
])

// ─────────────────────────────────────────────
// 같이 쓰는 계산
// ─────────────────────────────────────────────

/** 같은 날 안에서 A 시간대와 B 시간대의 차이 */
export function withinDayDrop(
  input: EvaluationInput,
  metric: MetricKey,
  from: Set<string>,
  to: Set<string>,
): Array<{ value: number; date: string }> {
  const byDate = new Map<string, QuickLog[]>()
  for (const log of input.logs) {
    if (log.date < input.window.from || log.date > input.window.to) continue
    byDate.set(log.date, [...(byDate.get(log.date) ?? []), log])
  }

  const out: Array<{ value: number; date: string }> = []
  for (const [date, logs] of byDate) {
    const a = mean(logs.filter((l) => from.has(l.dayPart)), metric)
    const b = mean(logs.filter((l) => to.has(l.dayPart)), metric)
    if (a === null || b === null) continue
    out.push({ value: round(b - a), date })
  }
  return out
}

const mean = (logs: readonly QuickLog[], metric: MetricKey): number | null => {
  const values = logs
    .map((log) => valueOfLog(log, metric))
    .filter((v): v is number => v !== null)
  if (!values.length) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/**
 * 하루 안 변동폭.
 *
 * 기록이 3개 이상인 날만 본다 — 두 개로는 "오르내렸다" 를 말할 수 없다.
 * 그날의 폭이 내 평소 폭보다 큰지 작은지를 견준다.
 */
export function volatility(
  input: EvaluationInput,
  metric: MetricKey,
  direction: 1 | -1,
): { measurements: Measurement[]; note?: string } {
  const byDate = new Map<string, number[]>()
  for (const log of input.logs) {
    if (log.date < input.window.from || log.date > input.window.to) continue
    const value = valueOfLog(log, metric)
    if (value === null) continue
    byDate.set(log.date, [...(byDate.get(log.date) ?? []), value])
  }

  const ranges: Array<{ value: number; date: string }> = []
  for (const [date, values] of byDate) {
    if (values.length < 3) continue
    ranges.push({ value: Math.max(...values) - Math.min(...values), date })
  }

  if (ranges.length < 10) return { measurements: [], note: '기록이 3개 이상인 날이 부족' }

  const sorted = [...ranges.map((r) => r.value)].sort((a, b) => a - b)
  const middle = sorted[Math.floor(sorted.length / 2)]

  // 폭이 큰 사람인가 작은 사람인가 — 1~5 눈금에서 2.0 을 가르는 선으로 본다
  const REFERENCE = 2
  const m = measureSeries({
    metric,
    window: input.window,
    values: ranges,
    baseline: REFERENCE,
    direction,
  })
  if (!m) return { measurements: [] }
  return { measurements: [{ ...m, median: round(middle) }] }
}
