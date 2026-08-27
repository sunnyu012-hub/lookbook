/**
 * EMOTION — 감정이 무엇과 함께 나타나는가. 8개.
 *
 * 여기가 제일 조심스러운 자리다.
 * "클라이밍이 기분을 좋게 만든다" 가 아니라
 * "클라이밍이 기록된 로그에서 기분이 높게 나타났다" 까지만 말한다.
 *
 * Joy / Calm / Stress Trigger 는 여러 개를 담을 수 있다 (multi).
 * 사람의 기쁨은 한 가지가 아니어서, 하나만 고르면 그건 틀린 요약이다.
 */
import { analyzeCarryover, analyzeRecovery, round } from '../../analytics'
import { expandedTagIds } from '../../analytics/aggregate'
import { getTag } from '../../taxonomy'
import type { QuickLog } from '../../types'
import { measure, measureSeries } from '../measure'
import type { EvaluationInput, Measurement } from '../types'
import { defineDna } from './define'

/** 후보로 볼 만한 문맥 카테고리 — 감정 자체는 원인 자리에 두지 않는다 */
const CONTEXT_CATEGORIES = [
  'activity',
  'sport',
  'work',
  'creative',
  'social',
  'place',
  'environment',
  'recovery',
  'food',
  'novelty',
]

/** 이 창에서 충분히 나온 문맥 태그들 */
export function candidateTags(
  input: EvaluationInput,
  options: { minDays?: number; minLogs?: number } = {},
): string[] {
  const minDays = options.minDays ?? 4
  const minLogs = options.minLogs ?? 8

  const days = new Map<string, Set<string>>()
  const counts = new Map<string, number>()

  for (const log of input.logs) {
    if (log.date < input.window.from || log.date > input.window.to) continue
    for (const tagId of expandedTagIds(log)) {
      const def = getTag(tagId)
      if (!def || !CONTEXT_CATEGORIES.includes(def.categoryId)) continue
      const set = days.get(tagId) ?? new Set<string>()
      set.add(log.date)
      days.set(tagId, set)
      counts.set(tagId, (counts.get(tagId) ?? 0) + 1)
    }
  }

  return [...counts]
    .filter(([id, n]) => n >= minLogs && (days.get(id)?.size ?? 0) >= minDays)
    .map(([id]) => id)
}

/**
 * 여러 문맥을 훑어서 조건에 맞는 것들을 자식으로 담는다.
 * 부모 DNA 하나가 여러 자식을 갖는 구조 (계획서 55).
 */
export function multiContext(
  input: EvaluationInput,
  options: {
    metric: 'mood' | 'energy' | 'focus' | 'fatigue'
    direction: 1 | -1
    /** 이 태그들 중 하나라도 같이 있어야 성립 */
    requiresAny?: string[]
    adjust?: boolean
  },
): Measurement[] {
  const out: Measurement[] = []

  for (const tagId of candidateTags(input)) {
    // 조건 태그가 있으면, 그 태그가 같이 나온 기록만 본다
    const where = (log: QuickLog) => {
      const ids = expandedTagIds(log)
      if (!ids.includes(tagId)) return false
      if (!options.requiresAny) return true
      return options.requiresAny.some((need) => ids.includes(need))
    }

    const m = measure(input, {
      metric: options.metric,
      where,
      direction: options.direction,
      // 문맥이 한 시간대에 몰려 있는지 언제나 확인한다
      adjust: true,
      relatedTags: [tagId],
      childLabel: getTag(tagId)?.displayName ?? tagId,
    })
    if (!m) continue
    if (Math.sign(m.effect) !== options.direction) continue

    /**
     * 주말 저녁에만 나오는 태그는 그 차이가 태그의 몫이 아니라 주말 저녁의 몫일 수 있다.
     * 같은 조건끼리 견줘서 방향이 뒤집히거나 거의 사라지면 자식으로 넣지 않는다.
     *
     * adjustedEffect 가 없다는 건 몰려 있지 않다는 뜻이라 그냥 통과시킨다.
     */
    if (m.adjustedEffect !== undefined) {
      if (Math.sign(m.adjustedEffect) !== options.direction) continue
      if (Math.abs(m.adjustedEffect) < 0.2) continue
    }

    out.push(m)
  }

  // 차이가 큰 것부터. 화면에는 위에서 몇 개만 보여 준다
  return out.sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect))
}

const CALM_TAGS = [
  'emotion:calm',
  'emotion:comfortable',
  'emotion:peaceful',
  'emotion:contentment',
]

const STRESS_TAGS = [
  'mental:overwhelmed',
  'emotion:frustration',
  'emotion:anxiety',
  'mental:pressure',
]

const POSITIVE_TAGS = [
  'emotion:joy',
  'emotion:happiness',
  'emotion:amusement',
  'emotion:pride',
  'emotion:relief',
  'emotion:gratitude',
  'emotion:excitement',
  'emotion:contentment',
]

export const EMOTION_DNA = defineDna('emotion', [
  {
    id: 'joy_trigger',
    direction: 1,
    displayName: '기분이 올라오는 것들',
    icon: '🌈',
    teaser: '어떤 순간에 기분이 좋아질까요?',
    description: '이런 기록에서 기분이 다른 기록보다 높게 나타나는 경향이 있어요.',
    metric: 'mood',
    multi: true,
    evaluator: (input) => ({
      measurements: multiContext(input, { metric: 'mood', direction: 1 }),
    }),
  },
  {
    id: 'calm_trigger',
    direction: 1,
    type: 'HIDDEN',
    displayName: '마음이 가라앉는 것들',
    icon: '🕊️',
    description: '이런 기록에서 차분함이 함께 적힌 경우가 반복됐어요.',
    metric: 'mood',
    multi: true,
    evaluator: (input) => ({
      // 차분함을 추론하지 않는다. 실제로 그렇게 적힌 기록만 본다
      measurements: multiContext(input, {
        metric: 'mood',
        direction: 1,
        requiresAny: CALM_TAGS,
      }),
    }),
  },
  {
    id: 'stress_trigger',
    direction: -1,
    displayName: '부담이 함께 오는 것들',
    icon: '🌀',
    teaser: '어떤 순간에 마음이 무거워질까요?',
    description: '이런 기록에서 부담이 함께 적힌 경우가 반복됐어요.',
    metric: 'mood',
    multi: true,
    evaluator: (input) => ({
      measurements: multiContext(input, {
        metric: 'mood',
        direction: -1,
        requiresAny: STRESS_TAGS,
      }),
    }),
  },
  {
    id: 'mood_resilience',
    direction: -1,
    type: 'HIDDEN',
    displayName: '기분이 빨리 돌아오는 사람',
    icon: '🌤️',
    description: '기분이 낮게 기록된 뒤 평소 수준으로 돌아오기까지의 시간이 짧은 편으로 반복됐어요.',
    metric: 'mood',
    minimum: { sampleCount: 8, distinctDays: 8, durationDays: 30 },
    evaluator: (input) => {
      const recovery = analyzeRecovery({
        logs: input.logs,
        window: input.window,
        metric: 'mood',
      })
      const done = recovery.recovered.filter((e) => e.hours !== null)
      if (done.length < 8) return { measurements: [], note: '기분 회복 구간 부족' }

      const REFERENCE_HOURS = 12
      const m = measureSeries({
        metric: 'mood',
        window: input.window,
        values: done.map((e) => ({ value: e.hours as number, date: e.startDate })),
        baseline: REFERENCE_HOURS,
        direction: -1,
      })
      if (!m || m.effect >= 0) return { measurements: [] }
      return { measurements: [{ ...m, effect: round(m.effect / REFERENCE_HOURS) }] }
    },
  },
  {
    id: 'mood_carryover',
    direction: 1,
    type: 'HIDDEN',
    displayName: '어제가 오늘로 이어지는 사람',
    icon: '🔗',
    description: '기분이 좋았던 날의 다음 날 아침도 비슷한 방향으로 기록되는 경우가 반복됐어요.',
    metric: 'mood',
    minimum: { sampleCount: 10, distinctDays: 10, durationDays: 30 },
    evaluator: (input) => {
      const carry = carryoverPairs(input)
      if (carry.length < 10) return { measurements: [], note: '이어진 날 부족' }

      // 좋았던 날 다음 날 vs 그렇지 않은 날 다음 날
      const good = carry.filter((c) => c.todayHigh)
      const rest = carry.filter((c) => !c.todayHigh)
      if (good.length < 5 || rest.length < 5) return { measurements: [], note: '양쪽 부족' }

      const avg = (list: typeof carry) =>
        list.reduce((sum, c) => sum + c.nextMorning, 0) / list.length

      const m = measureSeries({
        metric: 'mood',
        window: input.window,
        values: good.map((c) => ({ value: c.nextMorning, date: c.nextDate })),
        baseline: avg(rest),
        direction: 1,
        baselineSampleCount: rest.length,
      })
      if (!m || m.effect <= 0) return { measurements: [] }
      return { measurements: [m] }
    },
  },
  {
    id: 'weekend_lift',
    direction: 1,
    type: 'HIDDEN',
    displayName: '주말에 올라오는 사람',
    icon: '🎈',
    description: '주말에 남긴 기록에서 기분이 평일보다 높게 나타나는 경향이 있어요.',
    metric: 'mood',
    minimum: { sampleCount: 15, distinctDays: 12, durationDays: 35 },
    evaluator: (input) => {
      const m = measure(input, {
        metric: 'mood',
        where: (log) => log.dayOfWeek === 0 || log.dayOfWeek === 6,
        direction: 1,
      })
      if (!m || m.effect <= 0) return { measurements: [] }
      if (m.distinctDays < 6) return { measurements: [], note: '주말 날짜 부족' }
      return { measurements: [m] }
    },
  },
  {
    id: 'workday_dip',
    direction: -1,
    type: 'HIDDEN',
    displayName: '일하는 날 내려가는 사람',
    icon: '📋',
    description: '일이 기록된 날에는 기분이 다른 날보다 낮게 나타나는 경향이 있어요.',
    metric: 'mood',
    requiresAdjustment: true,
    evaluator: (input) => {
      const m = measure(input, {
        metric: 'mood',
        where: (log) => expandedTagIds(log).includes('activity:work'),
        direction: -1,
        adjust: true,
        relatedTags: ['activity:work'],
      })
      if (!m || m.effect >= 0) return { measurements: [] }
      return { measurements: [m] }
    },
  },
  {
    id: 'small_joy_collector',
    direction: 1,
    type: 'HIDDEN',
    displayName: '작은 기쁨을 모으는 사람',
    icon: '🧺',
    description: '여러 가지 서로 다른 순간에 기분 좋음이 적힌 기록이 꾸준히 이어졌어요.',
    metric: 'mood',
    minimum: { sampleCount: 20, distinctDays: 10, durationDays: 30 },
    evaluator: (input) => {
      const positives = input.logs.filter((log) => {
        if (log.date < input.window.from || log.date > input.window.to) return false
        return expandedTagIds(log).some((id) => POSITIVE_TAGS.includes(id))
      })
      if (positives.length < 20) return { measurements: [], note: '긍정 기록 부족' }

      // 서로 다른 문맥이 다섯 가지 이상 — 한 가지 활동으로 설명되면 안 된다
      const contexts = new Set<string>()
      for (const log of positives) {
        for (const tagId of expandedTagIds(log)) {
          const def = getTag(tagId)
          if (def && CONTEXT_CATEGORIES.includes(def.categoryId)) contexts.add(tagId)
        }
      }
      if (contexts.size < 5) return { measurements: [], note: '문맥 다양성 부족' }

      const m = measure(input, {
        metric: 'mood',
        where: (log) => expandedTagIds(log).some((id) => POSITIVE_TAGS.includes(id)),
        direction: 1,
        relatedTags: [...contexts].slice(0, 8),
      })
      if (!m || m.effect <= 0) return { measurements: [] }
      return { measurements: [{ ...m, consistency: Math.max(m.consistency, 0.75) }] }
    },
  },
])

/** 오늘 기분과 다음 날 아침 기분 짝 */
function carryoverPairs(input: EvaluationInput) {
  const byDate = new Map<string, QuickLog[]>()
  for (const log of input.logs) {
    if (log.date < input.window.from || log.date > input.window.to) continue
    byDate.set(log.date, [...(byDate.get(log.date) ?? []), log])
  }

  const dates = [...byDate.keys()].sort()
  const overall = average([...byDate.values()].flat().map((l) => l.mood))

  const out: Array<{ nextDate: string; nextMorning: number; todayHigh: boolean }> = []

  for (let i = 0; i < dates.length - 1; i += 1) {
    const today = byDate.get(dates[i]) ?? []
    const next = (byDate.get(dates[i + 1]) ?? []).filter(
      (l) => l.dayPart === 'morning' || l.dayPart === 'dawn',
    )
    if (!today.length || !next.length) continue

    out.push({
      nextDate: dates[i + 1],
      nextMorning: average(next.map((l) => l.mood)),
      todayHigh: average(today.map((l) => l.mood)) > overall,
    })
  }

  return out
}

const average = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)

export { CALM_TAGS, STRESS_TAGS, POSITIVE_TAGS, CONTEXT_CATEGORIES }
export { analyzeCarryover }
