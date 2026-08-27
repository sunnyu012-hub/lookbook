/**
 * SOCIAL — 사람과 있을 때. 6개.
 *
 * 여기는 문장을 가장 조심해야 하는 자리다 (계획서 58).
 * "이 사람은 당신에게 좋은 사람입니다" 는 절대 안 된다.
 * "이 태그가 포함된 기록에서 기분이 높게 나타났어요" 까지만이다.
 *
 * 사람 태그는 특히 시간대에 몰리기 쉽다 —
 * 주말 저녁에만 만나는 사람이면 그 차이는 사람이 아니라 주말 저녁의 몫일 수 있다.
 * 그래서 My Person Effect 는 문맥을 맞춘 비교를 통과해야만 열린다.
 */
import { expandedTagIds } from '../../analytics/aggregate'
import { analyzeCarryover, round } from '../../analytics'
import type { MyTag, QuickLog } from '../../types'
import { measure, measureSeries } from '../measure'
import type { EvaluationInput, Measurement } from '../types'
import { hasAny, SOCIAL_TAGS } from './energy'
import { defineDna } from './define'

const ALONE = ['social:alone', 'social:chosen_solitude']
const CROWD = ['social:crowd', 'environment:crowded']
const CONNECTION = [
  'social:deep_conversation',
  'social:quality_time',
  'social:support_received',
  'social:support_given',
]

/**
 * 사람으로 볼 수 있는 My Tag 인가 (계획서 57).
 *
 * 확실하지 않으면 후보에서 뺀다. 프로젝트 이름에 "이 사람과 있을 때" 라는
 * 문장을 붙이면 그건 그냥 틀린 말이다.
 *
 * 판단 근거: 그 태그가 달린 기록에 관계·사회 태그가 자주 같이 나오는가.
 */
export function looksLikePerson(
  input: EvaluationInput,
  tag: MyTag,
): boolean {
  const tagged = input.logs.filter(
    (log) =>
      log.date >= input.window.from
      && log.date <= input.window.to
      && (log.myTagIds ?? []).includes(tag.id),
  )
  if (tagged.length < 6) return false

  const withPeople = tagged.filter((log) => {
    const ids = expandedTagIds(log)
    return ids.some((id) => id.startsWith('relationship:') || SOCIAL_TAGS.includes(id))
  })

  // 절반 넘게 사람 문맥과 같이 나왔으면 사람으로 본다
  return withPeople.length / tagged.length >= 0.5
}

export const SOCIAL_DNA = defineDna('social', [
  {
    id: 'solo_recharge',
    direction: 1,
    displayName: '혼자서 채우는 사람',
    icon: '🪟',
    teaser: '혼자 있는 시간은 어떤가요?',
    description: '혼자 있었다고 적은 기록에서 기운이 다른 기록보다 높게 나타나는 경향이 있어요.',
    metric: 'energy',
    evaluator: (input) => {
      const m = measure(input, {
        metric: 'energy',
        where: (log) => hasAny(log, ALONE),
        direction: 1,
        relatedTags: ALONE,
      })
      if (!m || m.effect <= 0) return { measurements: [] }
      return { measurements: [m] }
    },
  },
  {
    id: 'people_recharge',
    direction: 1,
    displayName: '사람으로 채우는 사람',
    icon: '🤝',
    teaser: '사람을 만난 다음 날은 어떤가요?',
    // Social Charge 는 "그 순간" 이고 이건 "그 다음" 이다 (계획서 34)
    description: '사람과 함께한 날의 다음 날 기운이 다른 날보다 높게 기록되는 경우가 반복됐어요.',
    metric: 'energy',
    minimum: { sampleCount: 10, distinctDays: 10, durationDays: 30 },
    evaluator: (input) => nextDayAfterSocial(input, 1),
  },
  {
    id: 'my_person_effect',
    direction: 1,
    type: 'HIDDEN',
    displayName: '함께 있을 때 달라지는 사람',
    icon: '💗',
    description: '이 태그가 포함된 기록에서 기분이 비슷한 시간대의 다른 기록보다 높게 나타났어요.',
    metric: 'mood',
    multi: true,
    requiresAdjustment: true,
    minimum: { sampleCount: 12, distinctDays: 8, durationDays: 30 },
    effectThreshold: 0.45,
    evaluator: (input) => {
      const out: Measurement[] = []

      for (const tag of input.myTags) {
        if (!looksLikePerson(input, tag)) continue

        const m = measure(input, {
          metric: 'mood',
          where: (log) => (log.myTagIds ?? []).includes(tag.id),
          direction: 1,
          adjust: true,
          childLabel: tag.name,
        })
        if (!m || m.effect <= 0) continue
        // 문맥을 맞춘 비교가 없으면 아예 후보가 아니다
        if (m.adjustedEffect === undefined) continue
        if (m.adjustedEffect < 0.3) continue
        out.push(m)
      }

      return { measurements: out.sort((a, b) => (b.adjustedEffect ?? 0) - (a.adjustedEffect ?? 0)) }
    },
  },
  {
    id: 'crowd_sensitivity',
    direction: 1,
    type: 'HIDDEN',
    displayName: '붐비면 지치는 사람',
    icon: '🚇',
    description: '사람이 많았다고 적은 기록에서 피로가 다른 기록보다 높게 나타나는 경향이 있어요.',
    metric: 'fatigue',
    evaluator: (input) => {
      const m = measure(input, {
        metric: 'fatigue',
        where: (log) => hasAny(log, CROWD),
        direction: 1,
        relatedTags: CROWD,
      })
      if (!m || m.effect <= 0) return { measurements: [] }
      return { measurements: [m] }
    },
  },
  {
    id: 'connection_matters',
    direction: 1,
    type: 'HIDDEN',
    displayName: '깊은 이야기가 남는 사람',
    icon: '🕯️',
    description: '깊은 이야기를 나눴다고 적은 기록에서 기분이 다른 기록보다 높게 나타났어요.',
    metric: 'mood',
    evaluator: (input) => {
      const m = measure(input, {
        metric: 'mood',
        where: (log) => hasAny(log, CONNECTION),
        direction: 1,
        relatedTags: CONNECTION,
      })
      if (!m || m.effect <= 0) return { measurements: [] }
      return { measurements: [m] }
    },
  },
  {
    id: 'social_hangover',
    direction: -1,
    type: 'HIDDEN',
    displayName: '다음 날 남는 사람',
    icon: '🌁',
    description: '사람과 함께한 날의 다음 날 기운이 다른 날보다 낮게 기록되는 경우가 반복됐어요.',
    metric: 'energy',
    minimum: { sampleCount: 10, distinctDays: 10, durationDays: 30 },
    evaluator: (input) => nextDayAfterSocial(input, -1),
  },
])

/**
 * 사람을 만난 날의 다음 날.
 *
 * Phase 5 의 carryover 를 쓰되, 여기서는 사회 태그 전체를 한 덩어리로 본다.
 * 태그 하나씩 보면 표본이 흩어져서 아무것도 안 열린다.
 */
function nextDayAfterSocial(
  input: EvaluationInput,
  direction: 1 | -1,
): { measurements: Measurement[]; note?: string } {
  const carry = analyzeCarryover({
    logs: input.logs,
    window: input.window,
    metric: 'energy',
    tagId: 'social:with_people',
  })

  if (!carry.enough) return { measurements: [], note: '이어진 날 부족' }
  if (carry.nextDay === null || carry.otherNextDay === null) return { measurements: [] }

  const effect = round(carry.nextDay - carry.otherNextDay)
  if (Math.sign(effect) !== direction) return { measurements: [], note: '방향 반대' }

  // 날짜 단위 비교라 표본이 곧 날짜다
  // 날짜를 흩어 두지 않으면 distinctDays 가 1 이 되어 문턱을 못 넘는다.
  // 실제 짝지어진 날 수만큼 자리를 만들어 준다
  const m = measureSeries({
    metric: 'energy',
    window: input.window,
    values: Array.from({ length: carry.pairedDays }, (_, index) => ({
      value: carry.nextDay as number,
      date: shiftBy(input.window.from, index),
    })),
    baseline: carry.otherNextDay,
    direction,
    baselineSampleCount: carry.pairedDays,
  })
  if (!m) return { measurements: [] }

  return {
    measurements: [
      {
        ...m,
        observed: round(carry.nextDay),
        baseline: round(carry.otherNextDay),
        effect,
        // 이 계산은 날짜별 방향을 따로 세지 않는다. 그래서 문턱을 넘길 만큼만 준다
        consistency: 0.7,
        mean: round(carry.nextDay),
        median: round(carry.nextDay),
        relatedTags: SOCIAL_TAGS,
      },
    ],
  }
}

const shiftBy = (date: string, days: number): string => {
  const [y, m, d] = date.split('-').map(Number)
  const at = new Date(y, m - 1, d + days)
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`
}

export { ALONE, CROWD, CONNECTION }
export type { QuickLog }
