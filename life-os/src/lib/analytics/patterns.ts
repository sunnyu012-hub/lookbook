/**
 * DISCOVERED — 저장된 기록에서만 뽑아내는 패턴.
 *
 * 지키는 것
 *   · 표본이 부족하면 아예 만들지 않는다.
 *   · 상관을 인과처럼 말하지 않는다. 문장은 항상 "~한 날은 ~였어요" 형태다.
 *   · 무엇을 하라고 말하지 않는다. 관찰만 적는다.
 */
import type { Checkin, LifeEvent, MounjaroLog, Preferences } from '@/types'
import type { PixelAsset } from '../pixelAssets.generated'
import { effects as fx, gear, icons, items } from '../pixelAssets'
import { fromDateKey } from '../date'
import { compareGroups, mean, type GroupComparison } from './stats'
import { comparePhases } from './mounjaro'
import { iconOfTag } from '../events'

export interface Pattern {
  id: string
  /** 라틴 라벨 (픽셀 폰트) */
  title: string
  icon: PixelAsset
  kind: 'buff' | 'debuff' | 'neutral'
  /** 한 줄 설명 */
  body: string
  /** 표본 수 — 화면에 같이 보여줘서 과신하지 않게 한다 */
  sample: string
}

/** 두 집단을 비교하려면 각각 이만큼은 있어야 한다 */
export const MIN_GROUP = 4

/** 이보다 작은 차이는 노이즈로 본다 (100점 만점 기준) */
const MIN_SCORE_DIFF = 5

/** HH:MM 을 분으로 */
const minutes = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

const scored = (list: Checkin[]) => list.filter((c) => c.energyScore != null)
const score = (c: Checkin) => c.energyScore as number

interface FactorSpec {
  id: string
  title: { on: string; off: string }
  icon: PixelAsset
  /** true / false / null(판단 불가 — 비교에서 제외) */
  test: (c: Checkin, ctx: PatternContext) => boolean | null
  /** 비교할 값 */
  pick?: (c: Checkin) => number | null
  unit?: string
  body: (diff: number, ctx: PatternContext) => string
  minDiff?: number
}

export interface PatternContext {
  prefs: Preferences
  loveDates: Set<string>
}

const FACTORS: FactorSpec[] = [
  {
    id: 'sleep',
    title: { on: 'GOOD SLEEP BUFF', off: 'SLEEP PATTERN' },
    icon: icons.sleep,
    test: (c, ctx) =>
      c.sleepHours == null ? null : c.sleepHours >= ctx.prefs.sleepGoalHours - 1,
    body: (diff, ctx) => {
      const h = ctx.prefs.sleepGoalHours - 1
      return diff > 0
        ? `${h}시간 이상 잔 날은 컨디션 점수가 평균 ${Math.round(diff)} 높았어요.`
        : `${h}시간 이상 잔 날의 점수가 오히려 평균 ${Math.abs(Math.round(diff))} 낮았어요.`
    },
  },
  {
    id: 'exercise',
    title: { on: 'MOVED BUFF', off: 'MOVE PATTERN' },
    icon: gear.sneakers,
    test: (c) => (c.exercise == null ? null : Boolean(c.exercise)),
    body: (diff) =>
      diff > 0
        ? `몸을 움직인 날은 점수가 평균 ${Math.round(diff)} 높았어요.`
        : `움직인 날의 점수가 평균 ${Math.abs(Math.round(diff))} 낮았어요.`,
  },
  {
    id: 'outdoor',
    title: { on: 'OUTSIDE BUFF', off: 'INDOOR PATTERN' },
    icon: fx.rainbow,
    test: (c) => (c.outdoor == null ? null : Boolean(c.outdoor)),
    body: (diff) =>
      diff > 0
        ? `밖에 나간 날은 점수가 평균 ${Math.round(diff)} 높았어요.`
        : `밖에 나간 날의 점수가 평균 ${Math.abs(Math.round(diff))} 낮았어요.`,
  },
  {
    id: 'alcohol',
    title: { on: 'DRINKS PATTERN', off: 'DRINKS PATTERN' },
    icon: items.smoothie,
    test: (c) => (c.alcohol == null ? null : Boolean(c.alcohol)),
    body: (diff) =>
      diff > 0
        ? `술을 마신 날의 점수가 평균 ${Math.round(diff)} 높게 기록됐어요.`
        : `술을 마신 날은 점수가 평균 ${Math.abs(Math.round(diff))} 낮게 기록됐어요.`,
  },
  {
    id: 'late-caffeine',
    title: { on: 'LATE COFFEE', off: 'LATE COFFEE' },
    icon: icons.caffeine,
    test: (c) =>
      c.caffeineConsumed == null
        ? null
        : Boolean(c.caffeineConsumed && c.caffeineTime && minutes(c.caffeineTime) >= 15 * 60),
    pick: (c) => c.sleepQuality ?? null,
    unit: '수면의 질',
    minDiff: 0.5,
    body: (diff) =>
      diff < 0
        ? `오후 3시 이후에 카페인을 마신 날은 수면의 질이 평균 ${Math.abs(diff).toFixed(1)} 낮게 기록됐어요.`
        : `오후 3시 이후에 카페인을 마신 날의 수면의 질이 평균 ${diff.toFixed(1)} 높게 기록됐어요.`,
  },
  {
    id: 'stress',
    title: { on: 'HIGH STRESS', off: 'HIGH STRESS' },
    icon: icons.work,
    test: (c) => (c.stress == null ? null : c.stress >= 4),
    body: (diff) =>
      diff < 0
        ? `스트레스를 4 이상으로 적은 날은 점수가 평균 ${Math.abs(Math.round(diff))} 낮았어요.`
        : `스트레스가 높다고 적은 날의 점수가 평균 ${Math.round(diff)} 높았어요.`,
  },
  {
    id: 'weekend',
    title: { on: 'WEEKEND', off: 'WEEKEND' },
    icon: icons.home,
    test: (c) => {
      const d = fromDateKey(c.date).getDay()
      return d === 0 || d === 6
    },
    body: (diff) =>
      diff > 0
        ? `주말에는 점수가 평균 ${Math.round(diff)} 높았어요.`
        : `주말에는 점수가 평균 ${Math.abs(Math.round(diff))} 낮았어요.`,
  },
  {
    id: 'love',
    title: { on: 'TOGETHER', off: 'TOGETHER' },
    icon: fx.heart,
    test: (c, ctx) => ctx.loveDates.has(c.date),
    body: (diff) =>
      diff > 0
        ? `함께한 날로 적어 둔 날은 점수가 평균 ${Math.round(diff)} 높았어요.`
        : `함께한 날로 적어 둔 날의 점수가 평균 ${Math.abs(Math.round(diff))} 낮았어요.`,
  },
]

function runFactor(spec: FactorSpec, checkins: Checkin[], ctx: PatternContext): Pattern | null {
  const pick = spec.pick ?? ((c: Checkin) => c.energyScore ?? null)
  const on: number[] = []
  const off: number[] = []

  for (const c of checkins) {
    const t = spec.test(c, ctx)
    if (t === null) continue
    const v = pick(c)
    if (v === null || v === undefined) continue
    ;(t ? on : off).push(v)
  }

  const cmp = compareGroups(on, off, spec.title.on, spec.title.off, MIN_GROUP)
  if (!cmp.enough) return null

  const minDiff = spec.minDiff ?? MIN_SCORE_DIFF
  if (Math.abs(cmp.diff) < minDiff) return null

  const up = cmp.diff > 0
  return {
    id: spec.id,
    title: up ? spec.title.on : spec.title.off,
    icon: spec.icon,
    kind: up ? 'buff' : 'debuff',
    body: spec.body(cmp.diff, ctx),
    sample: `${cmp.nA}일 vs ${cmp.nB}일`,
  }
}

export interface DiscoverInput {
  checkins: Checkin[]
  prefs: Preferences
  lifeEvents?: LifeEvent[]
  mounjaroLogs?: MounjaroLog[]
  /** 날짜별 "오늘 있었던 일" 태그 */
  eventLog?: Record<string, string[]>
}

/** 태그 패턴은 아무리 많아도 이만큼만 보여 준다 — 화면이 넘치면 아무것도 안 읽힌다 */
const MAX_TAG_PATTERNS = 3

export function discoverPatterns({
  checkins,
  prefs,
  lifeEvents = [],
  mounjaroLogs = [],
  eventLog = {},
}: DiscoverInput): Pattern[] {
  const ctx: PatternContext = {
    prefs,
    loveDates: new Set(lifeEvents.filter((e) => e.category === 'love').map((e) => e.date)),
  }

  const out = FACTORS.map((f) => runFactor(f, checkins, ctx)).filter(
    (p): p is Pattern => p !== null,
  )

  // Mounjaro 사이클 구간 비교 — 켜져 있고 기록이 충분할 때만
  if (prefs.mounjaroEnabled && mounjaroLogs.length >= 2) {
    const { comparison } = comparePhases(checkins, mounjaroLogs, prefs.mounjaroIntervalDays, MIN_GROUP)
    if (comparison.enough && Math.abs(comparison.diff) >= MIN_SCORE_DIFF) {
      out.push({
        id: 'mounjaro-phase',
        title: 'CYCLE PATTERN',
        icon: icons.log,
        kind: 'neutral',
        body: `${comparison.labelA} 며칠과 ${comparison.labelB} 며칠을 비교하면 점수 평균이 ${Math.abs(comparison.diff)} 차이로 관찰됐어요. 원인을 말해 주는 값은 아니에요.`,
        sample: `${comparison.nA}일 vs ${comparison.nB}일`,
      })
    }
  }

  out.push(...tagPatterns(checkins, eventLog))

  return out.sort((a, b) => (a.kind === 'neutral' ? 1 : 0) - (b.kind === 'neutral' ? 1 : 0))
}

/**
 * "오늘 있었던 일" 태그가 적힌 날과 그렇지 않은 날의 점수를 비교한다.
 * 인과가 아니라 같이 적혀 있었다는 뜻이고, 문구도 그렇게만 쓴다.
 */
function tagPatterns(checkins: Checkin[], eventLog: Record<string, string[]>): Pattern[] {
  const list = scored(checkins)
  if (list.length < MIN_GROUP * 2) return []

  const counts = new Map<string, number>()
  for (const c of list) {
    for (const tag of eventLog[c.date] ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }

  const found: Pattern[] = []
  for (const [tag, n] of counts) {
    if (n < MIN_GROUP) continue
    const on = list.filter((c) => (eventLog[c.date] ?? []).includes(tag)).map(score)
    const off = list.filter((c) => !(eventLog[c.date] ?? []).includes(tag)).map(score)
    const cmp = compareGroups(on, off, tag, '그 외', MIN_GROUP)
    if (!cmp.enough || Math.abs(cmp.diff) < MIN_SCORE_DIFF) continue

    const up = cmp.diff > 0
    found.push({
      id: `tag:${tag}`,
      title: tag.toUpperCase(),
      icon: iconOfTag(tag),
      kind: 'neutral',
      body: `"${tag}"를 적은 날에는 Overall 이 평균 ${Math.abs(cmp.diff)}점 ${up ? '높게' : '낮게'} 나타났어요. 같이 적혀 있었다는 뜻이지, 원인은 아니에요.`,
      sample: `${cmp.nA}일 vs ${cmp.nB}일`,
    })
  }

  return found
    .sort((a, b) => Number(b.sample?.split('일')[0]) - Number(a.sample?.split('일')[0]))
    .slice(0, MAX_TAG_PATTERNS)
}

// ─────────────────────────────────────────────
// 좋았던 날의 공통점
// ─────────────────────────────────────────────
export interface GoodDayTrait {
  label: string
  goodRate: number
  otherRate: number
  nGood: number
  nOther: number
}

const TRAITS: { label: string; test: (c: Checkin, ctx: PatternContext) => boolean | null }[] = [
  { label: '7시간 넘게 잔 날', test: (c, x) => (c.sleepHours == null ? null : c.sleepHours >= x.prefs.sleepGoalHours - 1) },
  { label: '몸을 움직인 날', test: (c) => (c.exercise == null ? null : Boolean(c.exercise)) },
  { label: '밖에 나간 날', test: (c) => (c.outdoor == null ? null : Boolean(c.outdoor)) },
  { label: '끼니를 챙긴 날', test: (c) => (c.mealsCount == null ? null : c.mealsCount >= 2) },
  { label: '통증이 거의 없던 날', test: (c) => (c.bodyPain == null ? null : c.bodyPain <= 1) },
  { label: '스트레스가 낮던 날', test: (c) => (c.stress == null ? null : c.stress <= 2) },
  { label: '함께한 날', test: (c, x) => x.loveDates.has(c.date) },
]

/** 상위 30% 점수의 날들이 어떤 특징을 더 자주 갖고 있었는지 */
export function goodDayTraits(
  checkins: Checkin[],
  prefs: Preferences,
  lifeEvents: LifeEvent[] = [],
  minDays = 10,
): { traits: GoodDayTrait[]; threshold: number | null; nGood: number } {
  const list = scored(checkins)
  if (list.length < minDays) return { traits: [], threshold: null, nGood: 0 }

  const sortedScores = list.map(score).sort((a, b) => b - a)
  const threshold = sortedScores[Math.max(0, Math.floor(sortedScores.length * 0.3) - 1)]
  const good = list.filter((c) => score(c) >= threshold)
  const other = list.filter((c) => score(c) < threshold)
  if (good.length < 3 || other.length < 3) return { traits: [], threshold: null, nGood: good.length }

  const ctx: PatternContext = {
    prefs,
    loveDates: new Set(lifeEvents.filter((e) => e.category === 'love').map((e) => e.date)),
  }

  const rate = (list2: Checkin[], t: (typeof TRAITS)[number]) => {
    const vals = list2.map((c) => t.test(c, ctx)).filter((v): v is boolean => v !== null)
    return vals.length >= 3 ? mean(vals.map((v) => (v ? 1 : 0))) : null
  }

  const traits = TRAITS.map((t) => {
    const g = rate(good, t)
    const o = rate(other, t)
    if (g === null || o === null) return null
    return {
      label: t.label,
      goodRate: Math.round(g * 100),
      otherRate: Math.round(o * 100),
      nGood: good.length,
      nOther: other.length,
    }
  })
    .filter((t): t is GoodDayTrait => t !== null && Math.abs(t.goodRate - t.otherRate) >= 15)
    .sort((a, b) => b.goodRate - b.otherRate - (a.goodRate - a.otherRate))

  return { traits, threshold: Math.round(threshold), nGood: good.length }
}

/** 점수를 끌어내린 항목 — 낮은 점수 날에서 자주 낮게 적힌 지표 */
export function lowScoreDrivers(checkins: Checkin[], take = 3): GroupComparison[] {
  const list = scored(checkins)
  if (list.length < 8) return []

  const sortedScores = list.map(score).sort((a, b) => a - b)
  const threshold = sortedScores[Math.max(0, Math.floor(sortedScores.length * 0.3) - 1)]
  const low = list.filter((c) => score(c) <= threshold)
  const rest = list.filter((c) => score(c) > threshold)

  const fields: { label: string; get: (c: Checkin) => number | null | undefined }[] = [
    { label: '수면 시간', get: (c) => c.sleepHours },
    { label: '피로도', get: (c) => c.fatigue },
    { label: '몸 통증', get: (c) => c.bodyPain },
    { label: '기분', get: (c) => c.mood },
    { label: '집중력', get: (c) => c.focus },
    { label: '스트레스', get: (c) => c.stress },
    { label: '식욕', get: (c) => c.appetite },
  ]

  return fields
    .map((f) => {
      const a = low.map(f.get).filter((v): v is number => v != null)
      const b = rest.map(f.get).filter((v): v is number => v != null)
      return compareGroups(a, b, `${f.label} (낮은 날)`, `${f.label} (그 외)`, MIN_GROUP)
    })
    .filter((c) => c.enough && Math.abs(c.diff) >= 0.4)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, take)
}
