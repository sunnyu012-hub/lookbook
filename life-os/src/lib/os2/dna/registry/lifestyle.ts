/**
 * LIFESTYLE — 어디서 어떻게 지내는가. 6개.
 *
 * 마지막 하나(Personal Rhythm)는 메타 DNA 다.
 * 다른 DNA 가 충분히 자리 잡았을 때만 열린다 —
 * "당신만의 하루 리듬이 꽤 선명해졌어요" 라고 말할 자격은
 * 실제로 여러 시간대 패턴이 자리 잡았을 때만 생긴다.
 */
import { expandedTagIds } from '../../analytics/aggregate'
import { getTag } from '../../taxonomy'
import type { QuickLog } from '../../types'
import { measure } from '../measure'
import type { EvaluationInput, Measurement } from '../types'
import { defineDna } from './define'

const has = (log: QuickLog, tagId: string) => expandedTagIds(log).includes(tagId)
const hasAnyOf = (log: QuickLog, ids: readonly string[]) => {
  const tags = expandedTagIds(log)
  return ids.some((id) => tags.includes(id))
}

const OUTSIDE = ['place:outdoors', 'activity:outing', 'environment:outdoors', 'place:park']
const PLAY = ['activity:hobby', 'activity:gaming', 'activity:watching', 'activity:listening']

export const LIFESTYLE_DNA = defineDna('lifestyle', [
  {
    id: 'novelty_lover',
    direction: 1,
    type: 'HIDDEN',
    displayName: '새로운 걸 좋아하는 사람',
    icon: '🧭',
    description: '처음 해봤다고 적은 기록에서 기분이 다른 기록보다 높게 나타나는 경향이 있어요.',
    metric: 'mood',
    evaluator: (input) => {
      // 한 가지 종류의 새로움만으로는 열지 않는다.
      // "새 장소" 만 반복된 거라면 그건 장소 이야기이지 새로움 이야기가 아니다
      const kinds = new Set<string>()
      for (const log of input.logs) {
        if (log.date < input.window.from || log.date > input.window.to) continue
        for (const id of expandedTagIds(log)) {
          if (getTag(id)?.categoryId === 'novelty') kinds.add(id)
        }
      }
      if (kinds.size < 2) return { measurements: [], note: '새로움의 종류 부족' }

      const m = measure(input, {
        metric: 'mood',
        where: (log) => expandedTagIds(log).some((id) => getTag(id)?.categoryId === 'novelty'),
        direction: 1,
        relatedTags: [...kinds],
      })
      if (!m || m.effect <= 0) return { measurements: [] }
      return { measurements: [m] }
    },
  },
  {
    id: 'homebody_recharge',
    direction: 1,
    displayName: '집에서 채우는 사람',
    icon: '🏠',
    teaser: '집에서 보낸 시간은 어떤가요?',
    // 집에서 기분이 좋다는 것만으로는 열지 않는다. 기운이 회복돼야 한다
    description: '집에서 남긴 기록에서 기운이 다른 곳보다 높게 나타나는 경향이 있어요.',
    metric: 'energy',
    evaluator: (input) => {
      const m = measure(input, {
        metric: 'energy',
        where: (log) => has(log, 'place:home'),
        direction: 1,
        adjust: true,
        relatedTags: ['place:home'],
      })
      if (!m || m.effect <= 0) return { measurements: [] }
      return { measurements: [m] }
    },
  },
  {
    id: 'outside_boost',
    direction: 1,
    displayName: '밖에서 올라오는 사람',
    icon: '🌳',
    teaser: '밖에 나간 날은 어떤가요?',
    description: '밖에서 남긴 기록에서 기분이 다른 기록보다 높게 나타나는 경향이 있어요.',
    metric: 'mood',
    evaluator: (input) => {
      const m = measure(input, {
        metric: 'mood',
        where: (log) => hasAnyOf(log, OUTSIDE),
        direction: 1,
        relatedTags: OUTSIDE,
      })
      if (!m || m.effect <= 0) return { measurements: [] }
      return { measurements: [m] }
    },
  },
  {
    id: 'play_matters',
    direction: 1,
    type: 'HIDDEN',
    displayName: '노는 게 남는 사람',
    icon: '🎮',
    description: '쉬면서 논 기록에서 기분이 다른 기록보다 높게 나타나는 경향이 있어요.',
    metric: 'mood',
    evaluator: (input) => {
      const m = measure(input, {
        metric: 'mood',
        where: (log) => hasAnyOf(log, PLAY),
        direction: 1,
        relatedTags: PLAY,
      })
      if (!m || m.effect <= 0) return { measurements: [] }
      return { measurements: [m] }
    },
  },
  {
    id: 'memory_maker',
    direction: 1,
    type: 'HIDDEN',
    displayName: '남겨 두는 사람',
    icon: '📷',
    // 사진을 많이 올린다고 열지 않는다. 여러 종류의 순간에 남겨야 한다
    description: '여러 가지 순간에 사진을 함께 남긴 기록이 꾸준히 이어졌어요.',
    metric: 'mood',
    minimum: { sampleCount: 15, distinctDays: 10, durationDays: 30 },
    evaluator: (input) => {
      const withPhoto = input.logs.filter(
        (log) =>
          log.date >= input.window.from
          && log.date <= input.window.to
          && Boolean(log.photoPath),
      )
      if (withPhoto.length < 15) return { measurements: [], note: '사진 기록 부족' }

      const contexts = new Set<string>()
      for (const log of withPhoto) {
        for (const id of expandedTagIds(log)) {
          const def = getTag(id)
          if (def && def.categoryId !== 'emotion') contexts.add(id)
        }
      }
      if (contexts.size < 4) return { measurements: [], note: '문맥 다양성 부족' }

      const m = measure(input, {
        metric: 'mood',
        where: (log) => Boolean(log.photoPath),
        direction: 1,
        relatedTags: [...contexts].slice(0, 8),
      })
      if (!m) return { measurements: [] }

      // 기록 방식에 대한 DNA 라서 기분 차이가 크지 않아도 된다.
      // 대신 다양성과 꾸준함을 크기로 바꿔 준다
      return {
        measurements: [
          {
            ...m,
            effect: Math.max(m.effect, Math.min(1, contexts.size / 8)),
            consistency: Math.max(m.consistency, 0.75),
          },
        ],
      }
    },
  },
  {
    id: 'personal_rhythm',
    direction: 1,
    displayName: '나만의 하루 리듬',
    icon: '🎼',
    teaser: '당신의 하루에는 어떤 결이 있을까요?',
    description: '여러 값에서 시간대별 흐름이 꾸준히 같은 모양으로 나타나고 있어요.',
    metric: 'mood',
    minimum: { sampleCount: 40, distinctDays: 20, durationDays: 60 },
    evaluator: (input) => metaRhythm(input),
  },
])

/**
 * 메타 DNA — 다른 시간대 패턴들이 얼마나 선명한가.
 *
 * mood/energy/focus 각각에서 "가장 높은 시간대와 가장 낮은 시간대의 차이" 를 재고,
 * 그 중 두 개 이상이 뚜렷할 때만 연다.
 */
function metaRhythm(input: EvaluationInput): { measurements: Measurement[]; note?: string } {
  const parts = ['dawn', 'morning', 'afternoon', 'evening', 'night']
  const spreads: number[] = []
  let base: Measurement | null = null

  for (const metric of ['mood', 'energy', 'focus'] as const) {
    const values: Measurement[] = []
    for (const part of parts) {
      const m = measure(input, {
        metric,
        where: (log) => log.dayPart === part,
        direction: 1,
      })
      // 시간대마다 최소한은 쌓여야 리듬이라고 부를 수 있다
      if (m && m.sampleCount >= 8 && m.distinctDays >= 4) values.push(m)
    }
    if (values.length < 3) continue

    const observed = values.map((v) => v.observed)
    const spread = Math.max(...observed) - Math.min(...observed)
    spreads.push(spread)

    // 근거로 남길 대표 측정 — 가장 뚜렷한 시간대
    const top = values.reduce((a, b) => (b.effect > a.effect ? b : a))
    if (!base || spread > (base.effect ?? 0)) base = top
  }

  const clear = spreads.filter((s) => s >= 0.5)
  if (clear.length < 2 || !base) return { measurements: [], note: '뚜렷한 값이 두 개 미만' }

  return {
    measurements: [
      {
        ...base,
        effect: Math.min(1.5, clear.reduce((sum, s) => sum + s, 0) / clear.length),
        consistency: Math.max(base.consistency, 0.75),
        childLabel: undefined,
      },
    ],
  }
}

export { OUTSIDE, PLAY }
