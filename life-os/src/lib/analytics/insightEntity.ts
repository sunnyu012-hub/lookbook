/**
 * INSIGHT — "기록에서 나온 한 가지 관찰" 의 단일 표현.
 *
 * 왜 따로 두는가:
 *   같은 관찰을 Patterns 화면, My Manual, Life Tree, Archive 가 각자 계산하면
 *   같은 이야기가 네 군데에서 조금씩 다르게 나온다. 그래서 한 번만 만들고 참조한다.
 *
 * 말투 규칙 (전부 강제한다):
 *   · "기록상 / 함께 나타나는 경향 / 평균적으로 / 현재 데이터에서는" 만 쓴다.
 *   · "원인이다 / 문제다 / 고쳐야 한다 / 때문에" 는 쓰지 않는다.
 *   · 표본이 모자라면 결론을 만들지 않고 STILL_LEARNING 으로 남긴다.
 */
import type { Checkin, LifeEvent, MounjaroLog, Preferences } from '@/types'
import type { PixelAsset } from '../pixelAssets'
import { effects as fx, icons } from '../pixelAssets'
import { DOMAIN_META, type LifeDomain } from '../domains'
import { discoverPatterns, type Pattern } from './patterns'

export type InsightCategory = 'HELPS_ME' | 'TAKES_ENERGY' | 'MY_RHYTHM' | 'STILL_LEARNING'

export const INSIGHT_CATEGORY_META: Record<
  InsightCategory,
  { label: string; ko: string; icon: PixelAsset; tint: string; accent: string }
> = {
  HELPS_ME: {
    label: 'HELPS ME',
    ko: '도움이 됐던 것',
    icon: fx.sparkle01,
    tint: '#E6F4EA',
    accent: '#7DB994',
  },
  TAKES_ENERGY: {
    label: 'TAKES ENERGY',
    ko: '기운을 쓰는 것',
    icon: fx.cloud,
    tint: '#EFF1FB',
    accent: '#7B7FC0',
  },
  MY_RHYTHM: {
    label: 'MY RHYTHM',
    ko: '내 리듬',
    icon: icons.energy,
    tint: '#FDF4D6',
    accent: '#DFB63F',
  },
  STILL_LEARNING: {
    label: 'STILL LEARNING',
    ko: '아직 배우는 중',
    icon: icons.log,
    tint: '#F3EAE0',
    accent: '#9C7767',
  },
}

export type Confidence = 'low' | 'medium' | 'high'

export interface Insight {
  id: string
  category: InsightCategory
  /** 픽셀 폰트로 쓰는 짧은 라틴 라벨 */
  title: string
  body: string
  icon: PixelAsset
  /** 무엇을 비교한 관찰인지 */
  metric: string
  /** 차이의 크기 (없을 수 있다) */
  effectSize: number | null
  sampleSize: number
  confidence: Confidence
  domain?: LifeDomain
  /** 이어지는 My Manual 챕터 key */
  manualKey?: string
  /** 아직 표본이 모자란 관찰이면, 몇 개가 모였는지 */
  progress?: { have: number; need: number }
}

/**
 * 표본 기준.
 * 각 비교 집단 5개 이상, 전체 12개 이상일 때만 결론을 만든다.
 * (patterns.ts 는 4/4 로 좀 더 느슨하다. 여기서 한 번 더 조인다.)
 */
export const INSIGHT_MIN_GROUP = 5
export const INSIGHT_MIN_TOTAL = 12

function confidenceOf(nA: number, nB: number): Confidence {
  const total = nA + nB
  const small = Math.min(nA, nB)
  if (total >= 30 && small >= 10) return 'high'
  if (total >= 18 && small >= 7) return 'medium'
  return 'low'
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  low: '기록이 조금 쌓였어요',
  medium: '기록이 꽤 쌓였어요',
  high: '기록이 많이 쌓였어요',
}

/** Pattern 하나를 Insight 로 옮긴다 */
function fromPattern(p: Pattern): Insight | null {
  const nA = p.nA ?? 0
  const nB = p.nB ?? 0
  const total = nA + nB

  const category: InsightCategory =
    p.kind === 'buff' ? 'HELPS_ME' : p.kind === 'debuff' ? 'TAKES_ENERGY' : 'MY_RHYTHM'

  // 표본이 모자라면 결론 대신 "아직 배우는 중" 으로 남긴다
  if (Math.min(nA, nB) < INSIGHT_MIN_GROUP || total < INSIGHT_MIN_TOTAL) {
    return {
      id: p.id,
      category: 'STILL_LEARNING',
      title: p.title,
      body: '조금 더 기록하면 패턴을 확인할 수 있어요.',
      icon: p.icon,
      metric: p.id,
      effectSize: null,
      sampleSize: total,
      confidence: 'low',
      domain: p.domain,
      manualKey: p.manualKey,
      progress: { have: total, need: INSIGHT_MIN_TOTAL },
    }
  }

  return {
    id: p.id,
    category,
    title: p.title,
    body: p.body,
    icon: p.icon,
    metric: p.id,
    effectSize: p.diff ?? null,
    sampleSize: total,
    confidence: confidenceOf(nA, nB),
    domain: p.domain,
    manualKey: p.manualKey,
  }
}

export interface InsightInput {
  checkins: Checkin[]
  prefs: Preferences
  lifeEvents?: LifeEvent[]
  mounjaroLogs?: MounjaroLog[]
  eventLog?: Record<string, string[]>
}

/** 모든 화면이 쓰는 하나의 목록 */
export function buildInsightList(input: InsightInput): Insight[] {
  const patterns = discoverPatterns(input)
  const list = patterns.map(fromPattern).filter((i): i is Insight => i !== null)

  list.push(...nextDayInsights(input))

  const order: InsightCategory[] = ['HELPS_ME', 'TAKES_ENERGY', 'MY_RHYTHM', 'STILL_LEARNING']
  return list.sort((a, b) => {
    const d = order.indexOf(a.category) - order.indexOf(b.category)
    return d !== 0 ? d : b.sampleSize - a.sampleSize
  })
}

/**
 * "이런 날 다음날은 어땠나" — MY RHYTHM 쪽 관찰.
 * 클라이밍한 다음날 몸 점수가 어땠는지 같은 것들이다.
 * 여기서도 원인이라고 말하지 않는다. 다음날 기록이 그랬다고만 한다.
 */
const NEXT_DAY_TAGS: { tag: string; icon: PixelAsset; domain: LifeDomain }[] = [
  { tag: '클라이밍', icon: icons.climbing, domain: 'body' },
  { tag: '야근', icon: icons.work, domain: 'create' },
  { tag: '운동', icon: icons.exercise, domain: 'body' },
  { tag: '늦은 카페인', icon: icons.caffeine, domain: 'nourish' },
]

function nextDayInsights(input: InsightInput): Insight[] {
  const eventLog = input.eventLog ?? {}
  const byDate = new Map(input.checkins.map((c) => [c.date, c]))
  const out: Insight[] = []

  for (const { tag, icon, domain } of NEXT_DAY_TAGS) {
    const after: number[] = []
    const other: number[] = []

    for (const c of input.checkins) {
      const value = c.bodyScore ?? null
      if (value == null) continue
      const prev = prevDate(c.date)
      const hadTag = (eventLog[prev] ?? []).includes(tag)
      // 그 전날에 기록 자체가 없으면 비교에서 뺀다 (없는 걸 "안 했다" 로 세지 않는다)
      if (!byDate.has(prev) && !hadTag) continue
      ;(hadTag ? after : other).push(value)
    }

    const total = after.length + other.length
    if (after.length === 0) continue

    if (after.length < INSIGHT_MIN_GROUP || other.length < INSIGHT_MIN_GROUP || total < INSIGHT_MIN_TOTAL) {
      out.push({
        id: `next-day:${tag}`,
        category: 'STILL_LEARNING',
        title: tag.toUpperCase(),
        body: '조금 더 기록하면 다음날 흐름을 확인할 수 있어요.',
        icon,
        metric: 'body-next-day',
        effectSize: null,
        sampleSize: total,
        confidence: 'low',
        domain,
        progress: { have: after.length, need: INSIGHT_MIN_GROUP },
      })
      continue
    }

    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    const diff = Math.round((mean(after) - mean(other)) * 10) / 10
    if (Math.abs(diff) < 5) continue

    out.push({
      id: `next-day:${tag}`,
      category: 'MY_RHYTHM',
      title: tag.toUpperCase(),
      body: `"${tag}" 다음날에는 Body 점수가 평균적으로 ${Math.abs(diff)}점 ${diff > 0 ? '높게' : '낮게'} 기록되는 경향이 있어요. 같이 나타난 흐름이지, 원인을 말해 주는 값은 아니에요.`,
      icon,
      metric: 'body-next-day',
      effectSize: diff,
      sampleSize: total,
      confidence: confidenceOf(after.length, other.length),
      domain,
      manualKey: 'body',
    })
  }

  return out
}

function prevDate(date: string): string {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 결론이 난 것만 (STILL LEARNING 제외) */
export const settledInsights = (list: Insight[]) =>
  list.filter((i) => i.category !== 'STILL_LEARNING')

/** 특정 Manual 챕터에 붙는 Insight */
export const insightsForManual = (list: Insight[], manualKey: string) =>
  settledInsights(list).filter((i) => i.manualKey === manualKey)

/** 특정 영역에 붙는 Insight (Life Tree 가 쓴다) */
export const insightsForDomain = (list: Insight[], domain: LifeDomain) =>
  settledInsights(list).filter((i) => i.domain === domain)

export const domainLabelOf = (i: Insight) => (i.domain ? DOMAIN_META[i.domain].label : null)
