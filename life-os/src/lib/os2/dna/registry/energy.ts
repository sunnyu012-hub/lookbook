/**
 * ENERGY & RECOVERY — 기운이 어떻게 오르내리고 어떻게 돌아오는가. 8개.
 *
 * 회복이 빠른 게 좋고 느린 게 나쁘다고 말하지 않는다.
 * 개인 기록 안에서 "이런 편" 이라고만 적는다. 건강 평가가 아니다.
 */
import { analyzeBeforeAfter, analyzeRecovery, round } from '../../analytics'
import { expandedTagIds } from '../../analytics/aggregate'
import type { QuickLog } from '../../types'
import { measure, measureSeries } from '../measure'
import type { EvaluationInput } from '../types'
import { defineDna } from './define'
import { volatility } from './rhythm'

const hasAny = (log: QuickLog, tagIds: readonly string[]) => {
  const ids = expandedTagIds(log)
  return tagIds.some((id) => ids.includes(id))
}

const SOCIAL_TAGS = [
  'social:with_people',
  'social:socializing',
  'social:meeting_people',
  'social:small_group',
  'social:large_group',
  'social:crowd',
]

const WORK_TAGS = ['activity:work']

/** 회복 시간이 내 평소보다 빠른/느린 편인가 */
const recharge = (direction: 1 | -1) =>
  (input: EvaluationInput) => {
    const recovery = analyzeRecovery({
      logs: input.logs,
      window: input.window,
      metric: 'energy',
    })

    const done = recovery.recovered.filter((e) => e.hours !== null)
    if (done.length < 8) return { measurements: [], note: '회복 구간 부족' }

    const hours = done.map((e) => e.hours as number).sort((a, b) => a - b)
    const middle = hours[Math.floor(hours.length / 2)]

    // 내 회복 시간의 중앙값을 기준선으로 삼는다.
    // 남과 견주지 않는다 — 여덟 시간이 빠른지 느린지는 사람마다 다르다.
    const REFERENCE_HOURS = 12
    const m = measureSeries({
      metric: 'energy',
      window: input.window,
      values: done.map((e) => ({ value: e.hours as number, date: e.startDate })),
      baseline: REFERENCE_HOURS,
      direction,
    })
    if (!m) return { measurements: [] }
    if (Math.sign(m.effect) !== direction) return { measurements: [], note: '방향 반대' }

    // 시간 단위는 1~5 눈금이 아니라서 effect 가 크게 나온다.
    // 눈금을 맞춰 주지 않으면 문턱이 의미를 잃는다
    const scaled = round(m.effect / REFERENCE_HOURS)
    return {
      measurements: [{ ...m, effect: scaled, median: round(middle), observed: round(m.mean) }],
    }
  }

/** 어떤 일이 있고 나서 기운이 어떻게 됐는가 */
const afterEffect = (
  tagId: string,
  metric: 'energy' | 'fatigue' | 'mood' | 'focus',
  direction: 1 | -1,
) =>
  (input: EvaluationInput) => {
    const result = analyzeBeforeAfter({
      logs: input.logs,
      window: input.window,
      metric,
      tagId,
    })
    if (result.paired.length < 8) return { measurements: [], note: '앞뒤 짝 부족' }

    const m = measureSeries({
      metric,
      window: input.window,
      values: result.paired.map((p) => ({ value: p.change as number, date: p.date })),
      baseline: 0,
      direction,
      relatedTags: [tagId],
    })
    if (!m) return { measurements: [] }
    if (Math.sign(m.effect) !== direction) return { measurements: [], note: '방향 반대' }
    return { measurements: [m] }
  }

export const ENERGY_DNA = defineDna('energy', [
  {
    id: 'fast_recharge',
    direction: -1,
    displayName: '빨리 돌아오는 사람',
    icon: '⚡',
    teaser: '기운이 빠진 뒤 어떻게 돌아올까요?',
    description: '기운이 낮게 기록된 뒤 평소 수준으로 돌아오기까지의 시간이 짧은 편으로 반복됐어요.',
    metric: 'energy',
    minimum: { sampleCount: 8, distinctDays: 8, durationDays: 30 },
    exclusiveWith: ['slow_recharge'],
    evaluator: recharge(-1),
  },
  {
    id: 'slow_recharge',
    direction: 1,
    displayName: '천천히 돌아오는 사람',
    icon: '🐢',
    teaser: '기운이 빠진 뒤 어떻게 돌아올까요?',
    description: '기운이 낮게 기록된 뒤 평소 수준으로 돌아오기까지의 시간이 긴 편으로 반복됐어요.',
    metric: 'energy',
    minimum: { sampleCount: 8, distinctDays: 8, durationDays: 30 },
    exclusiveWith: ['fast_recharge'],
    evaluator: recharge(1),
  },
  {
    id: 'energy_rollercoaster',
    direction: 1,
    displayName: '기운이 크게 움직이는 사람',
    icon: '🔋',
    teaser: '기운은 하루 안에서 얼마나 움직일까요?',
    description: '하루 안에서 기운의 오르내림이 큰 편으로 반복됐어요.',
    metric: 'energy',
    minimum: { sampleCount: 10, distinctDays: 10, durationDays: 30 },
    exclusiveWith: ['steady_battery'],
    evaluator: (input) => volatility(input, 'energy', 1),
  },
  {
    id: 'steady_battery',
    direction: -1,
    type: 'HIDDEN',
    displayName: '기운이 고른 사람',
    icon: '🪫',
    description: '하루 안에서 기운의 오르내림이 비교적 작게 유지되고 있어요.',
    metric: 'energy',
    minimum: { sampleCount: 10, distinctDays: 10, durationDays: 30 },
    exclusiveWith: ['energy_rollercoaster'],
    evaluator: (input) => volatility(input, 'energy', -1),
  },
  {
    id: 'post_work_crash',
    direction: -1,
    type: 'HIDDEN',
    displayName: '일 끝나고 꺾이는 사람',
    icon: '💼',
    description: '일이 기록된 뒤에는 기운이 이전보다 낮게 기록되는 경우가 반복됐어요.',
    metric: 'energy',
    minimum: { sampleCount: 8, distinctDays: 5, durationDays: 30 },
    evaluator: afterEffect('activity:work', 'energy', -1),
  },
  {
    id: 'activity_boost',
    direction: 1,
    type: 'HIDDEN',
    displayName: '움직이면 올라오는 사람',
    icon: '🏃',
    description: '몸을 움직인 기록 뒤에는 기운이 이전보다 높게 기록되는 경우가 반복됐어요.',
    metric: 'energy',
    minimum: { sampleCount: 8, distinctDays: 5, durationDays: 30 },
    evaluator: afterEffect('activity:exercise', 'energy', 1),
  },
  {
    id: 'social_drain',
    direction: -1,
    displayName: '사람을 만나면 빠지는 사람',
    icon: '🫂',
    teaser: '사람을 만나고 나면 어떤가요?',
    description: '사람과 함께한 기록에서 기운이 다른 기록보다 낮게 나타나는 경향이 있어요.',
    metric: 'energy',
    requiresAdjustment: true,
    evaluator: (input) => {
      const m = measure(input, {
        metric: 'energy',
        where: (log) => hasAny(log, SOCIAL_TAGS),
        direction: -1,
        adjust: true,
        relatedTags: SOCIAL_TAGS,
      })
      if (!m) return { measurements: [], note: '표본 없음' }
      if (m.effect >= 0) return { measurements: [], note: '방향 반대' }
      return { measurements: [m] }
    },
  },
  {
    id: 'social_charge',
    direction: 1,
    displayName: '사람을 만나면 올라오는 사람',
    icon: '✨',
    teaser: '사람을 만나고 나면 어떤가요?',
    description: '사람과 함께한 기록에서 기분이 다른 기록보다 높게 나타나는 경향이 있어요.',
    metric: 'mood',
    requiresAdjustment: true,
    evaluator: (input) => {
      const m = measure(input, {
        metric: 'mood',
        where: (log) => hasAny(log, SOCIAL_TAGS),
        direction: 1,
        adjust: true,
        relatedTags: SOCIAL_TAGS,
      })
      if (!m) return { measurements: [], note: '표본 없음' }
      if (m.effect <= 0) return { measurements: [], note: '방향 반대' }
      return { measurements: [m] }
    },
  },
])

export { hasAny, SOCIAL_TAGS, WORK_TAGS, afterEffect }
