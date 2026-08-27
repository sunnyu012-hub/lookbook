/**
 * BODY — 몸과 상태. 4개.
 *
 * 여기서는 의학적인 말을 하지 않는다 (계획서 59).
 * "수면 부족 때문에 건강이 나빠지고 있어요" 는 이 앱이 할 말이 아니다.
 * "짧게 잔 다음 날에는 집중이 낮게 기록됐어요" 까지만 적는다.
 *
 * 특히 Sleep Resilient 는 조심해야 한다.
 * "적게 자도 괜찮다" 로 읽히면 그건 해로운 문장이다.
 */
import { analyzeSleep, correlation, round, stdev } from '../../analytics'
import { byDay } from '../../analytics/stats'
import { expandedTagIds } from '../../analytics/aggregate'
import type { QuickLog } from '../../types'
import { measure, measureSeries } from '../measure'
import type { EvaluationInput, Measurement } from '../types'
import { defineDna } from './define'

const EXERCISE = 'activity:exercise'
const BODY_DISCOMFORT = [
  'body:pain',
  'body:headache',
  'body:sore',
  'body:neck_tension',
  'body:shoulder_tension',
  'body:muscle_soreness',
]

const has = (log: QuickLog, tagId: string) => expandedTagIds(log).includes(tagId)
const hasAnyOf = (log: QuickLog, ids: readonly string[]) => {
  const tags = expandedTagIds(log)
  return ids.some((id) => tags.includes(id))
}

/** 수면과 다음 날 — 두 DNA 가 같은 계산을 나눠 쓴다 */
function sleepLink(input: EvaluationInput, metric: 'focus' | 'mood' | 'energy') {
  const sleep = analyzeSleep({
    checkins: input.checkins,
    logs: input.logs,
    window: input.window,
    metric,
  })

  const usable = sleep.buckets.filter((b) => b.confidence !== 'insufficient')
  if (sleep.pairs.length < 15 || usable.length < 2) return null

  const short = usable[0]
  const long = usable[usable.length - 1]
  const r = correlation(sleep.pairs.map((p) => ({ x: p.hours, y: p.value, date: p.date })))

  return { sleep, short, long, r, gap: round(long.observed - short.observed) }
}

export const BODY_DNA = defineDna('body', [
  {
    id: 'movement_lift',
    direction: 1,
    displayName: '움직이면 올라오는 기분',
    icon: '👟',
    teaser: '몸을 움직인 날은 어떤가요?',
    description: '몸을 움직였다고 적은 기록에서 기분이 다른 기록보다 높게 나타나는 경향이 있어요.',
    metric: 'mood',
    evaluator: (input) => {
      const m = measure(input, {
        metric: 'mood',
        where: (log) => has(log, EXERCISE),
        direction: 1,
        adjust: true,
        relatedTags: [EXERCISE],
      })
      if (!m || m.effect <= 0) return { measurements: [] }
      return { measurements: [m] }
    },
  },
  {
    id: 'body_mood_link',
    direction: -1,
    displayName: '몸과 기분이 같이 가는 사람',
    icon: '🫀',
    teaser: '몸이 불편한 날의 기분은 어떤가요?',
    // 원인이라고 쓰지 않는다. 같이 나타났다고만 쓴다
    description: '몸이 불편하다고 적은 기록에서 기분이 다른 기록보다 낮게 함께 나타났어요.',
    metric: 'mood',
    evaluator: (input) => {
      const m = measure(input, {
        metric: 'mood',
        where: (log) => hasAnyOf(log, BODY_DISCOMFORT),
        direction: -1,
        relatedTags: BODY_DISCOMFORT,
      })
      if (!m || m.effect >= 0) return { measurements: [] }
      return { measurements: [m] }
    },
  },
  {
    id: 'sleep_sensitive',
    direction: 1,
    displayName: '잠에 민감한 사람',
    icon: '🛏️',
    teaser: '잠이 다음 날에 얼마나 남을까요?',
    description: '짧게 잔 다음 날에는 집중이 낮게 기록되는 경향이 있어요.',
    metric: 'focus',
    minimum: { sampleCount: 15, distinctDays: 15, durationDays: 30 },
    exclusiveWith: ['sleep_resilient'],
    evaluator: (input) => {
      const link = sleepLink(input, 'focus')
      if (!link) return { measurements: [], note: '수면 짝 부족' }
      if (link.gap <= 0) return { measurements: [], note: '방향 반대' }

      const m = measureSeries({
        metric: 'focus',
        window: input.window,
        values: link.sleep.pairs.map((p) => ({ value: p.value, date: p.nextDate })),
        baseline: round(link.short.observed),
        direction: 1,
        baselineSampleCount: link.short.sampleCount,
      })
      if (!m) return { measurements: [] }

      return {
        measurements: [
          {
            ...m,
            observed: round(link.long.observed),
            baseline: round(link.short.observed),
            effect: link.gap,
            // 함께 움직인 정도를 되풀이 정도로 쓴다. 관계가 뚜렷할수록 높다
            consistency: Math.min(0.95, Math.abs(link.r ?? 0) + 0.4),
            relatedTags: [],
          },
        ],
      }
    },
  },
  {
    id: 'sleep_resilient',
    direction: 1,
    type: 'HIDDEN',
    displayName: '잠에 덜 흔들리는 사람',
    icon: '🌾',
    // "적게 자도 괜찮다" 로 읽히면 안 된다. 관찰만 적는다
    description: '현재 기록에서는 수면 시간 차이와 다음 날 상태 차이가 비교적 작게 관찰됐어요.',
    metric: 'focus',
    // 없음을 말하려면 있음보다 더 오래 봐야 한다
    minimum: { sampleCount: 40, distinctDays: 40, durationDays: 90 },
    exclusiveWith: ['sleep_sensitive'],
    evaluator: (input) => {
      const link = sleepLink(input, 'focus')
      if (!link) return { measurements: [], note: '수면 짝 부족' }

      // 수면이 실제로 들쭉날쭉해야 "덜 흔들린다" 를 말할 수 있다.
      // 매일 같은 시간 잤으면 그건 흔들릴 일이 없었던 것뿐이다
      const hours = link.sleep.pairs.map((p) => p.hours)
      const spread = Math.max(...hours) - Math.min(...hours)
      if (spread < 2) return { measurements: [], note: '수면 편차 부족' }

      if (Math.abs(link.gap) > 0.25) return { measurements: [], note: '차이가 작지 않음' }
      if (Math.abs(link.r ?? 1) > 0.15) return { measurements: [], note: '함께 움직임' }

      /**
       * 여기가 이 DNA 의 핵심 안전장치다.
       *
       * "없음" 을 주장하는 건 "있음" 보다 훨씬 어렵다.
       * 다음 날 집중이 날마다 크게 흔들리는 사람은 잠에 덜 흔들리는 게 아니라,
       * 그냥 아무 패턴도 없는 것이다. 그걸 발견이라고 부르면 거짓말이 된다.
       *
       * 그래서 집중 자체가 어느 정도 고를 때만 연다.
       */
      const daily = byDay(link.sleep.pairs.map((p) => ({ value: p.value, date: p.nextDate })))
      if (stdev(daily.map((d) => d.value)) > 0.5) {
        return { measurements: [], note: '값 자체가 들쭉날쭉' }
      }

      const m = measureSeries({
        metric: 'focus',
        window: input.window,
        values: link.sleep.pairs.map((p) => ({ value: p.value, date: p.nextDate })),
        baseline: 0,
        direction: 1,
      })
      if (!m) return { measurements: [] }

      return {
        measurements: [
          {
            ...m,
            observed: round(link.long.observed),
            baseline: round(link.short.observed),
            // 차이가 작다는 것 자체가 이 DNA 의 근거다.
            // 문턱을 넘기려면 "작음" 을 크기로 바꿔 줘야 한다
            effect: round(1 - Math.abs(link.gap) * 2),
            consistency: 0.8,
            mean: round(link.long.observed),
            median: round(link.long.observed),
            relatedTags: [],
          },
        ],
      }
    },
  },
])

export { BODY_DISCOMFORT, EXERCISE, hasAnyOf }
export type { Measurement }
