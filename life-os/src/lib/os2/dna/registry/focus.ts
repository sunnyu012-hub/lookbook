/**
 * FOCUS & CREATION — 집중이 언제 어디서 붙는가. 8개.
 */
import { DAY_PART_LABEL, round } from '../../analytics'
import { expandedTagIds } from '../../analytics/aggregate'
import { getTag } from '../../taxonomy'
import type { DayPart, QuickLog } from '../../types'
import { measure, measureSeries } from '../measure'
import type { Measurement } from '../types'
import { afterEffect } from './energy'
import { multiContext } from './emotion'
import { defineDna } from './define'

const CREATIVE = 'activity:creative'
const has = (log: QuickLog, tagId: string) => expandedTagIds(log).includes(tagId)

export const FOCUS_DNA = defineDna('focus', [
  {
    id: 'deep_work_window',
    direction: 1,
    displayName: '집중이 붙는 시간대',
    icon: '🎯',
    teaser: '집중이 잘 되는 시간이 따로 있을까요?',
    description: '이 시간대에 남긴 기록에서 집중이 다른 시간대보다 높게 나타나는 경향이 있어요.',
    metric: 'focus',
    evaluator: (input) => {
      // 다섯 시간대를 다 보고 가장 뚜렷한 하나만 남긴다.
      // 여러 개를 열면 "집중이 잘 되는 시간" 이라는 말이 뜻을 잃는다
      const parts: DayPart[] = ['dawn', 'morning', 'afternoon', 'evening', 'night']
      const results: Measurement[] = []

      for (const part of parts) {
        const m = measure(input, {
          metric: 'focus',
          where: (log) => log.dayPart === part,
          direction: 1,
          childLabel: DAY_PART_LABEL[part],
        })
        if (m && m.effect > 0) results.push(m)
      }

      results.sort((a, b) => b.effect - a.effect)
      return { measurements: results.slice(0, 1) }
    },
  },
  {
    id: 'maker_mode',
    direction: 1,
    displayName: '만들 때 붙는 사람',
    icon: '🛠️',
    teaser: '무언가 만들 때는 어떤 편일까요?',
    description: '무언가 만든 기록에서 집중이 다른 기록보다 높게 나타나는 경향이 있어요.',
    metric: 'focus',
    minimum: { sampleCount: 10, distinctDays: 5, durationDays: 21 },
    evaluator: (input) => {
      const m = measure(input, {
        metric: 'focus',
        where: (log) => has(log, CREATIVE),
        direction: 1,
        relatedTags: [CREATIVE],
      })
      if (!m || m.effect <= 0) return { measurements: [] }
      return { measurements: [m] }
    },
  },
  {
    id: 'creative_night',
    direction: 1,
    type: 'HIDDEN',
    displayName: '밤에 만드는 사람',
    icon: '🌃',
    description: '저녁과 밤에 남긴 만들기 기록에서 집중이 다른 때보다 높게 나타났어요.',
    metric: 'focus',
    minimum: { sampleCount: 10, distinctDays: 6, durationDays: 30 },
    evaluator: (input) => {
      const lateCreative = (log: QuickLog) =>
        has(log, CREATIVE) && (log.dayPart === 'evening' || log.dayPart === 'night')

      // 빈도만으로 열지 않는다. 다른 때의 만들기와 견줘서 실제로 높아야 한다
      const otherCreative = (log: QuickLog) => has(log, CREATIVE) && !lateCreative(log)

      const m = measure(input, {
        metric: 'focus',
        where: lateCreative,
        against: otherCreative,
        direction: 1,
        relatedTags: [CREATIVE],
      })
      if (!m || m.effect <= 0) return { measurements: [], note: '다른 때 만들기와 차이 없음' }
      return { measurements: [m] }
    },
  },
  {
    id: 'starter_friction',
    direction: 1,
    type: 'HIDDEN',
    displayName: '시작이 어려운 사람',
    icon: '🚪',
    description: '일이 기록되기 전에는 기분이 낮았다가, 시작한 뒤에는 높아지는 경우가 반복됐어요.',
    metric: 'mood',
    minimum: { sampleCount: 8, distinctDays: 5, durationDays: 30 },
    evaluator: afterEffect('activity:work', 'mood', 1),
  },
  {
    id: 'momentum_builder',
    direction: 1,
    type: 'HIDDEN',
    displayName: '한 번 되면 이어지는 사람',
    icon: '🎳',
    description: '무언가 끝냈다고 적은 뒤에는 집중이 이전보다 높게 기록되는 경우가 반복됐어요.',
    metric: 'focus',
    minimum: { sampleCount: 8, distinctDays: 5, durationDays: 30 },
    evaluator: afterEffect('outcome:completed', 'focus', 1),
  },
  {
    id: 'context_switch_cost',
    direction: -1,
    type: 'HIDDEN',
    displayName: '옮겨 다니면 흩어지는 사람',
    icon: '🔀',
    description: '이것저것 오간 기록에서 집중이 다른 기록보다 낮게 나타나는 경향이 있어요.',
    metric: 'focus',
    minimum: { sampleCount: 8, distinctDays: 10, durationDays: 30 },
    evaluator: (input) => {
      const m = measure(input, {
        metric: 'focus',
        where: (log) => has(log, 'work:context_switching') || has(log, 'work:multitasking'),
        direction: -1,
        relatedTags: ['work:context_switching', 'work:multitasking'],
      })
      if (!m || m.effect >= 0) return { measurements: [] }
      return { measurements: [m] }
    },
  },
  {
    id: 'meeting_drain',
    direction: -1,
    type: 'HIDDEN',
    displayName: '회의 뒤에 빠지는 사람',
    icon: '🗣️',
    description: '회의가 기록된 뒤에는 기운이 이전보다 낮게 기록되는 경우가 반복됐어요.',
    metric: 'energy',
    minimum: { sampleCount: 8, distinctDays: 5, durationDays: 30 },
    evaluator: afterEffect('work:meeting', 'energy', -1),
  },
  {
    id: 'flow_magnet',
    type: 'HIDDEN',
    displayName: '흐름을 타게 하는 것',
    icon: '🌊',
    description: '이런 기록에서 몰입이 함께 적힌 경우가 반복됐어요.',
    metric: 'focus',
    multi: true,
    evaluator: (input) => ({
      // 기분만 높은 걸로는 열지 않는다. 실제로 몰입이라고 적힌 기록이 있어야 한다
      measurements: multiContext(input, {
        metric: 'focus',
        direction: 1,
        requiresAny: ['mental:flow', 'mental:deep_focus', 'mental:hyperfocus'],
      }),
    }),
  },
])

export { has, CREATIVE }
export { round, getTag, measureSeries }
