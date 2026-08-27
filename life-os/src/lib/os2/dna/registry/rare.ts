/**
 * RARE / COMPOUND — 여러 조건이 겹쳤을 때만 보이는 것들.
 *
 * 기본 48에 넣지 않는다. 넣으면 "18 / 48" 이 거짓말이 되고,
 * 무엇보다 발견 전에는 존재 자체를 숨겨야 하기 때문이다 (계획서 6, 27).
 * 진행 막대도, "Rare 2 / 5" 같은 전체 수도 보여 주지 않는다.
 *
 * 문턱은 기본 48보다 높다. 조합은 우연히 맞아떨어지기 쉬워서,
 * 같은 기준으로 열면 대부분 거짓 발견이 된다.
 */
import { analyzeRecovery, round, twoWay, timeByTag, DAY_PART_LABEL } from '../../analytics'
import { expandedTagIds } from '../../analytics/aggregate'
import { getTag } from '../../taxonomy'
import type { DayPart, QuickLog } from '../../types'
import { measure } from '../measure'
import type { DiscoveryDefinition, EvaluationInput, Measurement } from '../types'
import { defineDna } from './define'

/** 조합 DNA 는 이만큼은 있어야 한다 */
const RARE_MINIMUM = { sampleCount: 12, distinctDays: 8, durationDays: 30 }

const has = (log: QuickLog, tagId: string) => expandedTagIds(log).includes(tagId)

export const RARE_DNA: DiscoveryDefinition[] = defineDna(
  'compound',
  [
    {
      id: 'rare_sweet_spot',
      direction: 1,
      displayName: '나의 스위트 스팟',
      icon: '💎',
      description: '이 세 가지가 함께 있던 기록에서 기분이 유난히 높게 나타났어요.',
      metric: 'mood',
      minimum: RARE_MINIMUM,
      effectThreshold: 0.6,
      consistencyThreshold: 0.75,
      requiresAdjustment: true,
      requiresMedianAgreement: true,
      evaluator: (input) => sweetSpot(input, 'mood'),
    },
    {
      id: 'rare_flow_formula',
      direction: 1,
      displayName: '나의 몰입 공식',
      icon: '🔮',
      description: '이 조건이 함께 있던 기록에서 집중이 유난히 높게 나타났어요.',
      metric: 'focus',
      minimum: RARE_MINIMUM,
      effectThreshold: 0.6,
      consistencyThreshold: 0.75,
      requiresMedianAgreement: true,
      evaluator: (input) => sweetSpot(input, 'focus'),
    },
    {
      id: 'rare_perfect_recharge',
      direction: 1,
      displayName: '가장 빨리 돌아오는 자리',
      icon: '🫧',
      description: '기운이 빠진 뒤 빨리 돌아온 날에는 이 조합이 함께 적혀 있던 경우가 많았어요.',
      metric: 'energy',
      minimum: { sampleCount: 8, distinctDays: 6, durationDays: 45 },
      effectThreshold: 0.5,
      consistencyThreshold: 0.7,
      evaluator: (input) => perfectRecharge(input),
    },
    {
      id: 'rare_overload_signal',
      direction: 1,
      displayName: '무거워지기 전의 신호',
      icon: '🌑',
      // 예측이 아니다. 앞서 함께 나타났다는 관찰이다
      description: '기운이 크게 낮아진 기록 앞에 이 조합이 자주 함께 나타났어요.',
      metric: 'energy',
      minimum: { sampleCount: 7, distinctDays: 6, durationDays: 45 },
      effectThreshold: 0.5,
      consistencyThreshold: 0.7,
      evaluator: (input) => overloadSignal(input),
    },
    {
      id: 'rare_social_paradox',
      direction: 1,
      displayName: '사람의 두 얼굴',
      icon: '🎭',
      description: '사람과 함께한 그 순간에는 기분이 높았고, 다음 날에는 기운이 낮게 기록됐어요.',
      metric: 'mood',
      minimum: { sampleCount: 12, distinctDays: 10, durationDays: 45 },
      effectThreshold: 0.45,
      consistencyThreshold: 0.7,
      evaluator: (input) => socialParadox(input),
    },
  ],
  'RARE',
)

export const RARE_BY_ID = new Map(RARE_DNA.map((d) => [d.id, d]))

// ─────────────────────────────────────────────
// 조합 찾기
// ─────────────────────────────────────────────

/**
 * 시간대 × 활동 × 장소 조합에서 가장 뚜렷한 하나.
 *
 * Phase 5 의 조합 후보를 그대로 쓴다. 여기서 다시 훑지 않는다.
 * 모든 조합을 DNA 로 만들지 않고, 문턱을 넘은 맨 위 하나만 남긴다.
 */
function sweetSpot(
  input: EvaluationInput,
  metric: 'mood' | 'focus',
): { measurements: Measurement[]; note?: string } {
  const pairs = twoWay({
    logs: input.logs,
    window: input.window,
    metric,
    minSample: RARE_MINIMUM.sampleCount,
    minDays: RARE_MINIMUM.distinctDays,
    take: 40,
  })
  const times = timeByTag({
    logs: input.logs,
    window: input.window,
    metric,
    minSample: RARE_MINIMUM.sampleCount,
    minDays: RARE_MINIMUM.distinctDays,
    take: 40,
  })

  const best: Measurement[] = []

  // 시간대 × 태그 × 태그 — 세 겹까지 본다
  for (const time of times) {
    if ((time.difference ?? 0) < 0.5) continue
    const dayPart = time.dayPart as DayPart
    const [, tagId] = time.parts

    for (const pair of pairs) {
      if (!pair.parts.includes(tagId)) continue
      const other = pair.parts.find((p) => p !== tagId)
      if (!other) continue

      const m = measure(input, {
        metric,
        where: (log) => log.dayPart === dayPart && has(log, tagId) && has(log, other),
        direction: 1,
        adjust: true,
        relatedTags: [tagId, other],
        childLabel: [
          DAY_PART_LABEL[dayPart],
          getTag(tagId)?.displayName ?? tagId,
          getTag(other)?.displayName ?? other,
        ].join(' · '),
      })
      if (m && m.effect > 0) best.push(m)
    }
  }

  if (!best.length) return { measurements: [], note: '조합 없음' }
  best.sort((a, b) => b.effect - a.effect)
  return { measurements: best.slice(0, 1) }
}

/** 빨리 돌아온 구간과 자주 같이 적힌 조합 */
function perfectRecharge(
  input: EvaluationInput,
): { measurements: Measurement[]; note?: string } {
  const recovery = analyzeRecovery({ logs: input.logs, window: input.window, metric: 'energy' })
  const done = recovery.recovered.filter((e) => e.hours !== null)
  if (done.length < 8) return { measurements: [], note: '회복 구간 부족' }

  const hours = done.map((e) => e.hours as number).sort((a, b) => a - b)
  const fastLine = hours[Math.floor(hours.length / 2)]
  const fast = done.filter((e) => (e.hours as number) <= fastLine)
  if (fast.length < 4) return { measurements: [], note: '빠른 회복 부족' }

  // 빨리 돌아온 구간 사이에 어떤 태그가 자주 적혔는가
  const fastDates = new Set(fast.map((e) => e.startDate))
  const counts = new Map<string, number>()
  for (const log of input.logs) {
    if (!fastDates.has(log.date)) continue
    for (const id of expandedTagIds(log)) {
      const def = getTag(id)
      if (!def || def.categoryId === 'emotion') continue
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
  }

  const common = [...counts]
    .filter(([, n]) => n >= fast.length * 0.6)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id)

  if (common.length < 2) return { measurements: [], note: '함께 나온 조합 없음' }

  const m = measure(input, {
    metric: 'energy',
    where: (log) => common.every((id) => has(log, id)),
    direction: 1,
    relatedTags: common,
    childLabel: common.map((id) => getTag(id)?.displayName ?? id).join(' · '),
  })
  if (!m || m.effect <= 0) return { measurements: [], note: '조합 효과 없음' }
  return { measurements: [m] }
}

/** 기운이 크게 떨어진 기록 앞 24시간에 자주 나온 조합 */
function overloadSignal(
  input: EvaluationInput,
): { measurements: Measurement[]; note?: string } {
  const recovery = analyzeRecovery({ logs: input.logs, window: input.window, metric: 'energy' })
  if (recovery.episodes.length < 7) return { measurements: [], note: '가라앉은 구간 부족' }

  const counts = new Map<string, number>()
  for (const episode of recovery.episodes) {
    const at = new Date(episode.startedAt).getTime()
    const before = input.logs.filter((log) => {
      const t = new Date(log.loggedAt).getTime()
      return t < at && at - t <= 24 * 3_600_000
    })

    const seen = new Set<string>()
    for (const log of before) {
      for (const id of expandedTagIds(log)) {
        const def = getTag(id)
        if (!def || def.categoryId === 'emotion') continue
        seen.add(id)
      }
    }
    for (const id of seen) counts.set(id, (counts.get(id) ?? 0) + 1)
  }

  // 가라앉은 구간의 70% 이상에서 나온 것만
  const line = recovery.episodes.length * 0.7
  const common = [...counts]
    .filter(([, n]) => n >= line)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id)

  if (common.length < 2) return { measurements: [], note: '앞서 나온 조합 없음' }

  const m = measure(input, {
    metric: 'energy',
    where: (log) => common.every((id) => has(log, id)),
    direction: -1,
    relatedTags: common,
    childLabel: common.map((id) => getTag(id)?.displayName ?? id).join(' · '),
  })
  if (!m) return { measurements: [], note: '조합 표본 부족' }

  return {
    measurements: [
      {
        ...m,
        // 이 DNA 의 크기는 "얼마나 자주 앞서 나왔는가" 다
        effect: round(Math.min(1, line / Math.max(1, recovery.episodes.length))),
        consistency: round(
          Math.min(1, (counts.get(common[0]) ?? 0) / recovery.episodes.length),
          3,
        ),
      },
    ],
  }
}

/** 그 순간엔 좋고 다음 날엔 빠지는 것 — 두 DNA 가 함께 있어야 성립 */
function socialParadox(
  input: EvaluationInput,
): { measurements: Measurement[]; note?: string } {
  const charge = measure(input, {
    metric: 'mood',
    where: (log) => has(log, 'social:with_people'),
    direction: 1,
    adjust: true,
    relatedTags: ['social:with_people'],
  })
  if (!charge || charge.effect <= 0) return { measurements: [], note: '그 순간 상승 없음' }

  // 다음 날 기운은 social.ts 의 계산과 같은 방식으로 본다
  const byDate = new Map<string, QuickLog[]>()
  for (const log of input.logs) {
    if (log.date < input.window.from || log.date > input.window.to) continue
    byDate.set(log.date, [...(byDate.get(log.date) ?? []), log])
  }
  const dates = [...byDate.keys()].sort()

  const after: number[] = []
  const other: number[] = []
  for (let i = 0; i < dates.length - 1; i += 1) {
    const next = (byDate.get(dates[i + 1]) ?? [])
      .map((l) => l.energy)
      .filter((v): v is number => typeof v === 'number')
    if (!next.length) continue
    const social = (byDate.get(dates[i]) ?? []).some((l) => has(l, 'social:with_people'))
    const mean = next.reduce((s, v) => s + v, 0) / next.length
    ;(social ? after : other).push(mean)
  }

  if (after.length < 5 || other.length < 5) return { measurements: [], note: '다음 날 짝 부족' }
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length
  const nextDayDrop = round(avg(after) - avg(other))

  if (nextDayDrop >= 0) return { measurements: [], note: '다음 날 하락 없음' }

  return {
    measurements: [
      {
        ...charge,
        childLabel: `그 순간 ${round(charge.effect) > 0 ? '+' : ''}${round(charge.effect)} · 다음 날 ${nextDayDrop}`,
      },
    ],
  }
}
