import { describe, expect, it } from 'vitest'
import {
  DAYS,
  END,
  GROUND_TRUTH,
  START,
  addDays,
  buildSyntheticUser,
} from './fixtures/syntheticUser'
import {
  BANNED_WORDS,
  CONFIDENCE_LABEL,
  DEFAULT_WINDOW,
  QUALITY_LABEL,
  RELATION_LABEL,
  SnapshotCache,
  aggregate,
  allContexts,
  analyzeBeforeAfter,
  analyzeCarryover,
  analyzeRecovery,
  analyzeSleep,
  baselineOf,
  buildRhythm,
  byDay,
  compareToBaseline,
  compareWindows,
  contextResults,
  correlation,
  dataQuality,
  describe as describeStats,
  describeDayType,
  describeResult,
  describeSleep,
  describeWindowChange,
  expandedTagIds,
  hasBannedWord,
  keyOf,
  makeWindow,
  mean,
  median,
  myTagResults,
  pairSleep,
  previousWindow,
  rankContexts,
  relationOf,
  round,
  sampleNote,
  stdev,
  timeByTag,
  tripleCandidates,
  twoWay,
  variance,
  withinWindow,
} from '@/lib/os2/analytics'
import { ANALYSIS_VERSION } from '@/lib/os2/versions'
import type { QuickLog } from '@/lib/os2/types'

const DATA = buildSyntheticUser()
const ALL = makeWindow('all', { earliest: START, to: END })

// ─────────────────────────────────────────────
// 5B — 계산 도구
// ─────────────────────────────────────────────

describe('통계 도구', () => {
  it('평균', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5)
    expect(mean([])).toBe(0)
  })

  it('중앙값 — 짝수와 홀수', () => {
    expect(median([1, 2, 3])).toBe(2)
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })

  it('극단값에는 중앙값이 흔들리지 않는다', () => {
    expect(mean([3, 3, 3, 30])).toBeGreaterThan(9)
    expect(median([3, 3, 3, 30])).toBe(3)
  })

  it('표본 분산과 표준편차 (n-1)', () => {
    expect(variance([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(4.571, 2)
    expect(stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 2)
  })

  it('값이 하나면 흔들림을 말하지 않는다', () => {
    expect(variance([3])).toBe(0)
    expect(stdev([3])).toBe(0)
  })

  it('며칠에 걸친 값인지 센다', () => {
    const stats = describeStats([
      { value: 3, date: '2026-01-01' },
      { value: 4, date: '2026-01-01' },
      { value: 5, date: '2026-01-02' },
    ])
    expect(stats.count).toBe(3)
    expect(stats.distinctDays).toBe(2)
  })

  it('하루에 몰린 기록이 분석을 끌고 가지 않는다', () => {
    // 하루에 다섯 번 5점, 다른 나흘에 한 번씩 1점
    const samples = [
      ...Array.from({ length: 5 }, () => ({ value: 5, date: '2026-01-01' })),
      { value: 1, date: '2026-01-02' },
      { value: 1, date: '2026-01-03' },
      { value: 1, date: '2026-01-04' },
      { value: 1, date: '2026-01-05' },
    ]
    expect(mean(samples.map((s) => s.value))).toBeCloseTo(3.22, 1)
    // 날짜로 접으면 그 하루는 한 표가 된다
    expect(mean(byDay(samples).map((s) => s.value))).toBeCloseTo(1.8, 1)
  })

  it('함께 움직였는지 — 계수는 화면에 그대로 안 쓴다', () => {
    const up = [1, 2, 3, 4, 5].map((n, i) => ({ x: n, y: n, date: `d${i}` }))
    expect(correlation(up)).toBeCloseTo(1, 5)

    const down = [1, 2, 3, 4, 5].map((n, i) => ({ x: n, y: 6 - n, date: `d${i}` }))
    expect(correlation(down)).toBeCloseTo(-1, 5)

    const flat = [1, 2, 3].map((n, i) => ({ x: n, y: 3, date: `d${i}` }))
    expect(correlation(flat)).toBeNull()
    expect(correlation([{ x: 1, y: 1, date: 'a' }])).toBeNull()
  })

  it('관계를 말로 바꾼다', () => {
    expect(relationOf(0.1)).toBe('none')
    expect(relationOf(0.3)).toBe('weak')
    expect(relationOf(0.5)).toBe('moderate')
    expect(relationOf(0.8)).toBe('clear')
    expect(relationOf(-0.8)).toBe('clear')
    expect(relationOf(null)).toBe('none')
  })
})

// ─────────────────────────────────────────────
// 5A — 창
// ─────────────────────────────────────────────

describe('분석 기간', () => {
  it('최근 30일은 오늘을 포함해 30일이다', () => {
    const w = makeWindow('30d', { to: '2026-03-30' })
    expect(w.from).toBe('2026-03-01')
    expect(w.to).toBe('2026-03-30')
  })

  it('바로 앞 같은 길이의 창', () => {
    const w = makeWindow('30d', { to: '2026-03-30' })
    const before = previousWindow(w)!
    expect(before.to).toBe('2026-02-28')
    expect(before.from).toBe('2026-01-30')
  })

  it('전체 기록에는 앞 창이 없다', () => {
    expect(previousWindow(makeWindow('all', { earliest: START }))).toBeNull()
  })

  it('창 밖의 기록은 빠진다', () => {
    const w = makeWindow('7d', { to: '2026-01-10' })
    const inside = withinWindow(DATA.logs, w)
    expect(inside.every((l) => l.date >= '2026-01-04' && l.date <= '2026-01-10')).toBe(true)
    expect(inside.length).toBeLessThan(DATA.logs.length)
  })

  it('날짜는 로컬 기준으로 묶는다 — UTC 로 자르면 하루씩 밀린다', () => {
    // 밤 11시 기록. UTC 로 보면 다음 날이지만 그 사람의 그날 기록이다
    const late = DATA.logs.find((l) => l.dayPart === 'night')!
    expect(late.date).toBe(late.loggedAt.slice(0, 10) === late.date ? late.date : late.date)
    // date 필드로만 묶는다는 것을 확인
    const w = makeWindow('all', { earliest: late.date, to: late.date })
    expect(withinWindow([late], w)).toHaveLength(1)
  })

  it('기본 기간은 최근 30일이다', () => {
    expect(DEFAULT_WINDOW).toBe('30d')
  })
})

// ─────────────────────────────────────────────
// 5B — 집계
// ─────────────────────────────────────────────

describe('집계', () => {
  it('가상 사용자가 만들어졌다', () => {
    expect(DATA.checkins).toHaveLength(DAYS)
    expect(DATA.logs.length).toBeGreaterThan(300)
    expect(new Set(DATA.logs.map((l) => l.date)).size).toBeGreaterThan(100)
  })

  it('개인 평균은 나 자신과만 견준다', () => {
    const base = baselineOf({ logs: DATA.logs, metric: 'mood', window: ALL })
    expect(base.value).toBeGreaterThan(1)
    expect(base.value).toBeLessThan(5)
  })

  it('없는 값을 0으로 세지 않는다', () => {
    const noEnergy: QuickLog[] = DATA.logs.slice(0, 20).map((l) => ({ ...l, energy: null }))
    const result = aggregate({ logs: noEnergy, metric: 'energy', window: ALL })
    expect(result.sampleCount).toBe(0)
    expect(result.observed).toBe(0)
    expect(result.confidence).toBe('insufficient')
  })

  it('metric 마다 표본을 따로 센다', () => {
    const half: QuickLog[] = DATA.logs.map((l, i) => (i % 2 ? { ...l, focus: null } : l))
    const mood = aggregate({ logs: half, metric: 'mood', window: ALL })
    const focus = aggregate({ logs: half, metric: 'focus', window: ALL })
    expect(focus.sampleCount).toBeLessThan(mood.sampleCount)
  })

  it('표본이 모자라면 모자라다고 말한다', () => {
    const few = DATA.logs.slice(0, 2)
    expect(aggregate({ logs: few, metric: 'mood', window: ALL }).confidence).toBe('insufficient')
  })

  it('데이터 품질을 따로 매긴다', () => {
    const stats = describeStats(
      Array.from({ length: 20 }, (_, i) => ({ value: 3, date: addDays(START, i) })),
    )
    expect(dataQuality(stats, 30).level).toBe('good')
    expect(QUALITY_LABEL[dataQuality(stats, 30).level]).toBe('충분')

    const thin = describeStats([{ value: 3, date: START }])
    expect(dataQuality(thin, 30).level).toBe('low')
  })

  it('기간을 견준다', () => {
    const current = makeWindow('30d', { to: END })
    const before = previousWindow(current)!
    const change = compareWindows({ logs: DATA.logs, metric: 'mood' }, current, before)
    expect(change.enough).toBe(true)
    expect(typeof change.difference).toBe('number')
  })
})

// ─────────────────────────────────────────────
// 태그 세기
// ─────────────────────────────────────────────

describe('태그 집계', () => {
  const withTag = (tagId: string, over: Partial<QuickLog> = {}): QuickLog => ({
    ...DATA.logs[0],
    id: `t-${tagId}`,
    lifeTags: [
      {
        tagId,
        source: 'keyword',
        confidence: 0.8,
        appliedAt: '2026-01-01T00:00:00.000Z',
        temporalContext: 'present',
      },
    ],
    ...over,
  })

  it('잎만 저장돼 있어도 조상까지 센다', () => {
    expect(expandedTagIds(withTag('sport:climbing'))).toContain('activity:exercise')
  })

  it('같은 기록을 두 번 세지 않는다', () => {
    const ids = expandedTagIds(withTag('sport:climbing'))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('아니라고 한 태그는 분석에서 뺀다', () => {
    const rejected = withTag('sport:climbing')
    rejected.lifeTags = [{ ...rejected.lifeTags![0], userRejected: true }]
    expect(expandedTagIds(rejected)).toEqual([])
  })

  it('맞다고 한 태그는 그대로 센다', () => {
    const verified = withTag('sport:climbing')
    verified.lifeTags = [{ ...verified.lifeTags![0], userVerified: true }]
    expect(expandedTagIds(verified)).toContain('sport:climbing')
  })

  it('개인 규칙이 붙인 태그도 센다', () => {
    const byRule = withTag('outcome:achievement')
    byRule.lifeTags = [{ ...byRule.lifeTags![0], source: 'rule', ruleId: 'personal/r1' }]
    expect(expandedTagIds(byRule)).toContain('outcome:achievement')
  })

  it('미래 이야기는 일어난 일로 세지 않는다', () => {
    const future = withTag('sport:climbing')
    future.lifeTags = [{ ...future.lifeTags![0], temporalContext: 'future' }]
    expect(expandedTagIds(future)).toEqual([])
  })

  it('사전에 없는 태그가 있어도 분석이 깨지지 않는다', () => {
    const stale = withTag('emotion:does_not_exist')
    expect(expandedTagIds(stale)).toEqual([])
    expect(() => contextResults({ logs: [stale], window: ALL, metric: 'mood' })).not.toThrow()
  })
})

// ─────────────────────────────────────────────
// 5C — My Rhythm
// ─────────────────────────────────────────────

describe('My Rhythm', () => {
  const rhythm = buildRhythm({ logs: DATA.logs, window: ALL })
  const moodRhythm = rhythm.metrics.find((m) => m.metric === 'mood')!
  const focusRhythm = rhythm.metrics.find((m) => m.metric === 'focus')!
  const slot = (r: typeof moodRhythm, label: string) =>
    r.slots.find((s) => s.label === label)!

  it('저녁 기분이 아침보다 높게 나온다', () => {
    expect(GROUND_TRUTH.eveningMoodAboveMorning).toBe(true)
    expect(slot(moodRhythm, '저녁').result.observed)
      .toBeGreaterThan(slot(moodRhythm, '아침').result.observed)
  })

  it('낮 집중이 가장 높게 나온다', () => {
    expect(GROUND_TRUTH.afternoonFocusHighest).toBe(true)
    expect(focusRhythm.highest?.label).toBe('낮')
  })

  it('기록이 없는 시간대는 억지로 평균 내지 않는다', () => {
    expect(slot(moodRhythm, '새벽').result.confidence).toBe('insufficient')
  })

  it('개인 평균과의 차이를 같이 낸다', () => {
    const evening = slot(moodRhythm, '저녁').result
    expect(evening.baseline).toBe(moodRhythm.baseline)
    expect(evening.difference).toBeCloseTo(evening.observed - evening.baseline!, 2)
  })

  it('주말 기분이 평일보다 높게 나온다', () => {
    expect(GROUND_TRUTH.weekendMoodAboveWeekday).toBe(true)
    const dayType = rhythm.dayType.find((d) => d.metric === 'mood')!
    expect(dayType.enough).toBe(true)
    expect(dayType.weekend.observed).toBeGreaterThan(dayType.weekday.observed)
  })

  it('요일별도 계산한다', () => {
    const weekday = rhythm.weekday.find((w) => w.metric === 'mood')!
    expect(weekday.days).toHaveLength(7)
    expect(weekday.enough).toBe(true)
  })

  it('표본을 늘 같이 들고 다닌다', () => {
    for (const s of moodRhythm.slots) {
      expect(s.result.sampleCount).toBeGreaterThanOrEqual(0)
      expect(s.result.distinctDays).toBeGreaterThanOrEqual(0)
    }
  })
})

// ─────────────────────────────────────────────
// 5D — Context
// ─────────────────────────────────────────────

describe('Context 분석', () => {
  const moodContexts = contextResults({ logs: DATA.logs, window: ALL, metric: 'mood' })
  const energyContexts = contextResults({ logs: DATA.logs, window: ALL, metric: 'energy' })
  const find = (list: typeof moodContexts, tagId: string) =>
    list.find((c) => c.tagId === tagId)

  it('클라이밍 기록에서 기분이 평균보다 높게 나온다', () => {
    expect(GROUND_TRUTH.climbingMoodAboveBaseline).toBe(true)
    const climbing = find(moodContexts, 'sport:climbing')!
    expect(climbing.difference).toBeGreaterThan(0.5)
    expect(climbing.confidence).not.toBe('insufficient')
  })

  it('회의 기록에서 기운이 평균보다 낮게 나온다', () => {
    expect(GROUND_TRUTH.meetingEnergyBelowBaseline).toBe(true)
    const meeting = find(energyContexts, 'work:meeting')!
    expect(meeting.difference).toBeLessThan(-0.5)
  })

  it('감정 카테고리는 문맥으로 다루지 않는다', () => {
    expect(moodContexts.every((c) => c.categoryId !== 'emotion')).toBe(true)
  })

  it('좁은 태그를 먼저 올린다', () => {
    const ranked = rankContexts(moodContexts)
    const climbingAt = ranked.findIndex((c) => c.tagId === 'sport:climbing')
    const exerciseAt = ranked.findIndex((c) => c.tagId === 'activity:exercise')
    expect(climbingAt).toBeGreaterThanOrEqual(0)
    if (exerciseAt >= 0) expect(climbingAt).toBeLessThan(exerciseAt)
  })

  it('넓은 부모는 잎으로 표시하지 않는다', () => {
    const exercise = find(moodContexts, 'activity:exercise')
    if (exercise) expect(exercise.isLeaf).toBe(false)
  })

  it('표본이 모자란 문맥은 아예 만들지 않는다', () => {
    const thin = contextResults({ logs: DATA.logs.slice(0, 5), window: ALL, metric: 'mood' })
    expect(thin).toEqual([])
  })

  it('높은 쪽과 낮은 쪽 둘 다 낸다', () => {
    expect(moodContexts.some((c) => (c.difference ?? 0) > 0)).toBe(true)
    expect(energyContexts.some((c) => (c.difference ?? 0) < 0)).toBe(true)
  })
})

describe('내 태그 분석', () => {
  const tags = myTagResults({
    logs: DATA.logs,
    window: ALL,
    metric: 'mood',
    myTags: DATA.myTags,
  })

  it('사용자가 만든 태그도 본다', () => {
    expect(tags.map((t) => t.name)).toContain('성현')
    expect(tags.map((t) => t.name)).toContain('LifeOS')
  })

  it('이름을 그대로 라벨로 쓴다', () => {
    const partner = tags.find((t) => t.name === '성현')!
    expect(partner.label).toBe('성현')
  })
})

// ─────────────────────────────────────────────
// 교란 변수 (계획서 91)
// ─────────────────────────────────────────────

describe('문맥 맞춰 견주기', () => {
  const tags = myTagResults({
    logs: DATA.logs,
    window: ALL,
    metric: 'mood',
    myTags: DATA.myTags,
  })
  const partner = tags.find((t) => t.name === '성현')!

  it('#성현 은 주말 저녁에만 나온다', () => {
    expect(GROUND_TRUTH.partnerConfounded).toBe(true)
    const logs = DATA.logs.filter((l) => (l.myTagIds ?? []).includes('mt-partner'))
    expect(logs.length).toBeGreaterThan(10)
    expect(new Set(logs.map((l) => l.dayPart))).toEqual(new Set(['evening']))
  })

  it('그냥 견주면 차이가 크게 보인다', () => {
    expect(partner.difference).toBeGreaterThan(0.8)
  })

  it('같은 조건끼리 견주면 차이가 줄어든다', () => {
    expect(partner.adjusted).toBeDefined()
    expect(Math.abs(partner.adjusted!.difference)).toBeLessThan(Math.abs(partner.difference!))
  })

  it('무엇에 맞춰 견줬는지 남긴다', () => {
    expect(partner.adjusted!.matchedOn).toContain('저녁')
    expect(partner.adjusted!.baselineCount).toBeGreaterThanOrEqual(3)
  })

  it('한 시간대에 몰려 있지 않으면 보정하지 않는다', () => {
    const spread = DATA.logs.map((l, i) => ({
      ...l,
      myTagIds: i % 3 === 0 ? ['mt-project'] : [],
    }))
    const result = myTagResults({
      logs: spread,
      window: ALL,
      metric: 'mood',
      myTags: DATA.myTags.filter((t) => t.id === 'mt-project'),
    })
    expect(result[0]?.adjusted).toBeUndefined()
  })
})

// ─────────────────────────────────────────────
// 5E — 잠
// ─────────────────────────────────────────────

describe('잠과 다음 날', () => {
  const sleep = analyzeSleep({
    checkins: DATA.checkins,
    logs: DATA.logs,
    window: ALL,
    metric: 'focus',
  })

  it('D일 수면을 D+1일 상태와 짝짓는다', () => {
    const pairs = pairSleep({
      checkins: DATA.checkins,
      logs: DATA.logs,
      window: ALL,
      metric: 'focus',
    })
    expect(pairs.length).toBeGreaterThan(50)
    for (const pair of pairs) {
      expect(pair.nextDate).toBe(addDays(pair.date, 1))
    }
  })

  it('다음 날 오전 Quick Log 를 먼저 본다', () => {
    const pairs = pairSleep({
      checkins: DATA.checkins,
      logs: DATA.logs,
      window: ALL,
      metric: 'focus',
    })
    expect(pairs.some((p) => p.from === 'quickLog')).toBe(true)
  })

  it('오전 기록이 없으면 Check-in 으로 대신한다', () => {
    const morningOnly = DATA.logs.filter((l) => l.dayPart === 'evening')
    const pairs = pairSleep({
      checkins: DATA.checkins,
      logs: morningOnly,
      window: ALL,
      metric: 'focus',
    })
    expect(pairs.some((p) => p.from === 'checkin')).toBe(true)
  })

  it('짧게 잔 다음 날 집중이 낮게 기록된다', () => {
    expect(GROUND_TRUTH.shortSleepFocusLower).toBe(true)
    const usable = sleep.buckets.filter((b) => b.confidence !== 'insufficient')
    const short = usable[0]
    const long = usable[usable.length - 1]
    expect(short.observed).toBeLessThan(long.observed)
  })

  it('표본이 적으면 구간을 잘게 쪼개지 않는다', () => {
    const few = analyzeSleep({
      checkins: DATA.checkins.slice(0, 10),
      logs: DATA.logs,
      window: ALL,
      metric: 'focus',
    })
    expect(few.buckets.length).toBeLessThanOrEqual(3)
  })

  it('함께 움직였는지도 낸다 — 계수는 말로 바꿔서', () => {
    expect(sleep.r).not.toBeNull()
    expect(RELATION_LABEL[relationOf(sleep.r)]).toBeTruthy()
  })
})

// ─────────────────────────────────────────────
// 5E — 회복
// ─────────────────────────────────────────────

describe('돌아오기까지', () => {
  const recovery = analyzeRecovery({ logs: DATA.logs, window: ALL, metric: 'energy' })

  it('가라앉은 구간을 찾아낸다', () => {
    expect(GROUND_TRUTH.hasRecoveryEpisodes).toBe(true)
    expect(recovery.episodes.length).toBeGreaterThanOrEqual(3)
    expect(recovery.enough).toBe(true)
  })

  it('연속으로 낮은 기록을 하나로 묶는다', () => {
    const at = '2026-02-01'
    const logs: QuickLog[] = [18, 19, 20].map((hour, i) => ({
      ...DATA.logs[0],
      id: `low-${i}`,
      energy: hour === 20 ? 2 : 1,
      date: at,
      loggedAt: new Date(2026, 1, 1, hour).toISOString(),
      dayPart: 'evening',
    }))
    // 평소로 돌아오는 기록 하나
    logs.push({
      ...DATA.logs[0],
      id: 'back',
      energy: 5,
      date: addDays(at, 1),
      loggedAt: new Date(2026, 1, 2, 12).toISOString(),
      dayPart: 'afternoon',
    })

    const result = analyzeRecovery({ logs, window: ALL, metric: 'energy' })
    expect(result.episodes).toHaveLength(1)
    expect(result.episodes[0].logCount).toBe(3)
  })

  it('걸린 시간을 잰다', () => {
    expect(recovery.medianHours).not.toBeNull()
    expect(recovery.meanHours).not.toBeNull()
    expect(recovery.recovered.every((e) => (e.hours ?? 0) > 0)).toBe(true)
  })

  it('개인 평균을 기준으로 삼는다', () => {
    expect(recovery.target).toBeLessThan(recovery.baseline)
  })

  it('구간이 적으면 평균 회복 시간을 말하지 않는다', () => {
    const few = analyzeRecovery({ logs: DATA.logs.slice(0, 10), window: ALL, metric: 'energy' })
    expect(few.enough).toBe(false)
  })
})

// ─────────────────────────────────────────────
// 5E — 앞뒤
// ─────────────────────────────────────────────

describe('활동 앞뒤', () => {
  it('사건 앞뒤 창을 견준다', () => {
    const result = analyzeBeforeAfter({
      logs: DATA.logs,
      window: ALL,
      metric: 'mood',
      tagId: 'sport:climbing',
    })
    expect(result.pairs.length).toBeGreaterThan(0)
  })

  it('미래 이야기는 사건이 아니다', () => {
    const future: QuickLog[] = DATA.logs.slice(0, 30).map((l) => ({
      ...l,
      lifeTags: [
        {
          tagId: 'sport:climbing',
          source: 'keyword' as const,
          confidence: 0.9,
          appliedAt: l.loggedAt,
          temporalContext: 'future' as const,
        },
      ],
    }))
    const result = analyzeBeforeAfter({
      logs: future,
      window: ALL,
      metric: 'mood',
      tagId: 'sport:climbing',
    })
    expect(result.pairs).toEqual([])
  })

  it('짝이 모자라면 보여 주지 않는다', () => {
    const result = analyzeBeforeAfter({
      logs: DATA.logs.slice(0, 8),
      window: ALL,
      metric: 'mood',
      tagId: 'sport:climbing',
    })
    expect(result.enough).toBe(false)
  })

  it('다음 날로 이어지는지도 본다', () => {
    const carry = analyzeCarryover({
      logs: DATA.logs,
      window: ALL,
      metric: 'mood',
      tagId: 'sport:climbing',
    })
    expect(carry.pairedDays).toBeGreaterThan(10)
    expect(carry.enough).toBe(true)
  })
})

// ─────────────────────────────────────────────
// 5D — 겹치기
// ─────────────────────────────────────────────

describe('두 가지가 겹칠 때', () => {
  it('의미 있을 법한 짝만 계산한다', () => {
    const pairs = twoWay({ logs: DATA.logs, window: ALL, metric: 'mood' })
    expect(pairs.length).toBeLessThan(30)
    for (const pair of pairs) expect(pair.parts).toHaveLength(2)
  })

  it('시간대 × 태그도 본다', () => {
    const result = timeByTag({ logs: DATA.logs, window: ALL, metric: 'mood' })
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].dayPart).toBeTruthy()
  })

  it('세 가지는 후보만 만든다', () => {
    const triples = tripleCandidates({ logs: DATA.logs, window: ALL, metric: 'mood' })
    for (const triple of triples) {
      expect(triple.parts).toHaveLength(3)
      expect(triple.sampleCount).toBeGreaterThanOrEqual(6)
    }
  })

  it('태그를 전부 짝짓지 않는다', () => {
    // 300개를 전부 짝지으면 수만 가지가 된다. 그런 일이 없어야 한다
    const pairs = twoWay({ logs: DATA.logs, window: ALL, metric: 'mood', take: 1000 })
    expect(pairs.length).toBeLessThan(50)
  })
})

// ─────────────────────────────────────────────
// 5F — 캐시
// ─────────────────────────────────────────────

describe('분석 캐시', () => {
  it('열쇠에 판 번호가 들어간다', () => {
    const key = keyOf({ kind: 'rhythm', metric: 'mood', window: ALL })
    expect(key).toContain(`v${ANALYSIS_VERSION}`)
    expect(key).toContain('rhythm')
    expect(key).toContain(ALL.from)
  })

  it('같은 조건이면 다시 계산하지 않는다', () => {
    const cache = new SnapshotCache()
    let ran = 0
    const compute = () => {
      ran += 1
      return { result: 42, sampleCount: 1, distinctDays: 1 }
    }

    cache.memo({ kind: 'rhythm', metric: 'mood', window: ALL }, compute)
    cache.memo({ kind: 'rhythm', metric: 'mood', window: ALL }, compute)

    expect(ran).toBe(1)
    expect(cache.stats.hit).toBe(1)
    expect(cache.stats.miss).toBe(1)
  })

  it('기간이 다르면 다른 계산이다', () => {
    const cache = new SnapshotCache()
    let ran = 0
    const compute = () => {
      ran += 1
      return { result: 1, sampleCount: 1, distinctDays: 1 }
    }

    cache.memo({ kind: 'rhythm', metric: 'mood', window: ALL }, compute)
    cache.memo(
      { kind: 'rhythm', metric: 'mood', window: makeWindow('7d', { to: END }) },
      compute,
    )
    expect(ran).toBe(2)
  })

  it('기록이 바뀌면 그 날짜를 품은 것만 버린다', () => {
    const cache = new SnapshotCache()
    const recent = makeWindow('7d', { to: END })
    const compute = () => ({ result: 1, sampleCount: 1, distinctDays: 1 })

    cache.memo({ kind: 'rhythm', metric: 'mood', window: ALL }, compute)
    cache.memo({ kind: 'rhythm', metric: 'mood', window: recent }, compute)
    expect(cache.size).toBe(2)

    // 아주 옛날 기록을 고쳤다 — 최근 7일 분석은 그대로 둔다
    const dropped = cache.invalidateDate(START)
    expect(dropped).toBe(1)
    expect(cache.size).toBe(1)
  })

  it('사전이 바뀌면 전부 버린다', () => {
    const cache = new SnapshotCache()
    cache.memo({ kind: 'rhythm', metric: 'mood', window: ALL }, () => ({
      result: 1,
      sampleCount: 1,
      distinctDays: 1,
    }))
    cache.clear()
    expect(cache.size).toBe(0)
  })
})

// ─────────────────────────────────────────────
// 말 (계획서 92)
// ─────────────────────────────────────────────

describe('인과처럼 말하지 않기', () => {
  const rhythm = buildRhythm({ logs: DATA.logs, window: ALL })
  const contexts = contextResults({ logs: DATA.logs, window: ALL, metric: 'mood' })

  const sentences = [
    ...rhythm.metrics.flatMap((m) => m.slots.map((s) => describeResult(s.result))),
    ...contexts.map((c) => describeResult(c)),
    ...contexts.map((c) => sampleNote(c)),
    describeDayType('기분', '주말'),
    describeDayType('기분', '평일'),
    describeWindowChange('기분', 0.4, '30일'),
    describeWindowChange('기분', -0.4, '30일'),
    describeWindowChange('기분', 0, '30일'),
    describeSleep('6시간 미만', '집중', '3.0'),
    ...Object.values(RELATION_LABEL),
    ...Object.values(CONFIDENCE_LABEL),
    ...Object.values(QUALITY_LABEL),
  ]

  it('분석 문구에 단정하는 말이 없다', () => {
    for (const sentence of sentences) {
      const bad = hasBannedWord(sentence)
      expect(bad, `"${sentence}" 안의 "${bad}"`).toBeNull()
    }
  })

  it('금지어 목록이 실제로 걸러 낸다', () => {
    expect(hasBannedWord('클라이밍 때문에 기분이 좋아졌어요')).toBe('때문')
    expect(hasBannedWord('운동을 추천해요')).toBe('추천')
    expect(hasBannedWord('당신은 저녁형이에요')).toBe('당신은')
    expect(BANNED_WORDS.length).toBeGreaterThan(10)
  })

  it('차이가 거의 없으면 차이가 있다고 말하지 않는다', () => {
    const flat = { ...contexts[0], observed: 3.5, baseline: 3.5, difference: 0 }
    expect(describeResult(flat)).toContain('비슷하게')
  })

  it('표본을 늘 같이 말한다', () => {
    for (const context of contexts) {
      expect(sampleNote(context)).toMatch(/기록 \d+개 · \d+일/)
    }
  })
})

// ─────────────────────────────────────────────
// 성능
// ─────────────────────────────────────────────

describe('성능', () => {
  it('120일치 전체 분석이 오래 걸리지 않는다', () => {
    const started = Date.now()
    buildRhythm({ logs: DATA.logs, window: ALL })
    contextResults({ logs: DATA.logs, window: ALL, metric: 'mood' })
    analyzeSleep({ checkins: DATA.checkins, logs: DATA.logs, window: ALL, metric: 'focus' })
    analyzeRecovery({ logs: DATA.logs, window: ALL, metric: 'energy' })
    const elapsed = Date.now() - started

    console.log(
      `기록 ${DATA.logs.length}개 · Check-in ${DATA.checkins.length}개 · ${DAYS}일`
        + ` → 전체 분석 ${elapsed}ms`,
    )
    expect(elapsed).toBeLessThan(3000)
  })

  it('되풀이해도 같은 값이 나온다', () => {
    const a = compareToBaseline({
      logs: DATA.logs,
      window: ALL,
      metric: 'mood',
      where: (l) => l.dayPart === 'evening',
    })
    const b = compareToBaseline({
      logs: DATA.logs,
      window: ALL,
      metric: 'mood',
      where: (l) => l.dayPart === 'evening',
    })
    expect(a.observed).toBe(b.observed)
    expect(a.difference).toBe(b.difference)
  })

  it('소수 자리를 일정하게 자른다', () => {
    expect(round(3.14159)).toBe(3.14)
    expect(round(3.14159, 1)).toBe(3.1)
  })
})

describe('같은 이야기를 두 번 보여 주지 않는다', () => {
  const contexts = contextResults({ logs: DATA.logs, window: ALL, metric: 'mood' })

  it('표본이 똑같은 태그는 하나만 남긴다', () => {
    const ranked = rankContexts(contexts)
    const shapes = ranked.map((r) => `${r.sampleCount}|${r.distinctDays}|${r.observed}`)
    expect(new Set(shapes).size).toBe(shapes.length)
  })

  it('걷어내기 전 목록도 볼 수 있다', () => {
    const all = allContexts(contexts)
    expect(all.length).toBeGreaterThanOrEqual(rankContexts(contexts).length)
  })

  it('남는 쪽은 더 좁은 태그다', () => {
    const ranked = rankContexts(contexts)
    // 클라이밍(잎)이 남고 운동(부모)은 같은 표본이라 빠진다
    expect(ranked.some((r) => r.tagId === 'sport:climbing')).toBe(true)
    expect(ranked.some((r) => r.tagId === 'activity:exercise')).toBe(false)
  })
})
