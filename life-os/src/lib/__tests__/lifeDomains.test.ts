import { describe, expect, it } from 'vitest'
import type { Checkin, LifeEvent, NightCheckout, Preferences } from '@/types'
import { DOMAIN_KEYS, addWeights, rankDomains, totalWeight } from '../domains'
import { CATEGORY_DOMAINS, QUEST_DOMAIN_OVERRIDES, domainsOfQuest, mappingOfQuest } from '../quests/domains'
import { QUEST_POOL } from '../quests/pool'
import { domainsOfTag } from '../events'
import { computeLifeBalance, dayDomains, MIN_BALANCE_TOTAL } from '../analytics/lifeBalance'
import { buildLifeTree, statusOf, TREE_NODES, STAGE_STEPS } from '../analytics/lifeTree'
import { recoveryCurve, MIN_CURVE_POINTS } from '../analytics/recoveryCurve'
import { todayCapacity } from '../wellness/capacity'
import { buildArchive, searchArchive, timelineEntries } from '../analytics/archive'
import { weekStartOf, weekEndOf, weekSummary, activeFocusDomains } from '../analytics/weeklyReset'
import { buildInsightList, INSIGHT_MIN_GROUP, INSIGHT_MIN_TOTAL } from '../analytics/insightEntity'
import { DEFAULT_PREFERENCES } from '../repositories/preferences'
import { nextUnlocks } from '../analytics/nextUnlock'

const prefs: Preferences = DEFAULT_PREFERENCES

const c = (date: string, over: Partial<Checkin> = {}): Checkin => ({
  id: date,
  userId: 'u',
  date,
  energyScore: 60,
  mode: 'NORMAL',
  createdAt: '',
  updatedAt: '',
  ...over,
})

const days = (n: number, from = 1, month = '08') =>
  Array.from({ length: n }, (_, i) => `2026-${month}-${String(from + i).padStart(2, '0')}`)

const emptyInput = {
  checkins: [] as Checkin[],
  nights: [] as NightCheckout[],
  lifeEvents: [] as LifeEvent[],
  eventLog: {} as Record<string, string[]>,
  questLog: {},
}

// ─────────────────────────────────────────────
// Quest → Domain 매핑
// ─────────────────────────────────────────────
describe('Quest → Life Domain 매핑', () => {
  it('모든 퀘스트가 하나의 영역으로 매핑된다', () => {
    for (const q of QUEST_POOL) {
      const m = mappingOfQuest(q)
      expect(DOMAIN_KEYS).toContain(m.primary)
    }
  })

  it('한 행동은 최대 2개 영역까지만 연결된다', () => {
    for (const q of QUEST_POOL) {
      expect(Object.keys(domainsOfQuest(q)).length).toBeLessThanOrEqual(2)
    }
  })

  it('보조 영역은 주 영역과 다르다', () => {
    for (const q of QUEST_POOL) {
      const m = mappingOfQuest(q)
      if (m.secondary) expect(m.secondary).not.toBe(m.primary)
    }
  })

  it('예외 매핑은 전부 실제 퀘스트를 가리킨다', () => {
    const ids = new Set(QUEST_POOL.map((q) => q.id))
    for (const id of Object.keys(QUEST_DOMAIN_OVERRIDES)) {
      expect(ids.has(id)).toBe(true)
    }
  })

  it('모든 카테고리에 기본 매핑이 있다', () => {
    const categories = new Set(QUEST_POOL.map((q) => q.category))
    for (const cat of categories) {
      expect(CATEGORY_DOMAINS[cat]).toBeDefined()
    }
  })

  it('주 영역이 보조 영역보다 큰 값을 갖는다', () => {
    const w = domainsOfQuest({ id: 'climb-log', category: 'climbing' })
    const ranked = rankDomains(w)
    expect(ranked[0].value).toBeGreaterThan(ranked[1].value)
  })

  it('직접 만든 퀘스트도 카테고리만으로 매핑된다', () => {
    const w = domainsOfQuest({ id: 'custom-uuid-1234', category: 'home' })
    expect(w.home).toBeGreaterThan(0)
  })
})

describe('이벤트 태그 → Life Domain', () => {
  it('클라이밍은 몸과 즐거움에 걸친다', () => {
    const w = domainsOfTag('클라이밍')
    expect(w.body).toBeGreaterThan(0)
    expect(w.joy).toBeGreaterThan(0)
  })

  it('처음 보는 태그도 그룹 기본값으로 매핑된다', () => {
    const w = domainsOfTag('내가 만든 태그')
    expect(totalWeight(w)).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────
// Life Balance
// ─────────────────────────────────────────────
describe('Life Balance 집계', () => {
  it('퀘스트 완료 횟수만큼 그 영역에 쌓인다', () => {
    const w = dayDomains('2026-08-20', {
      ...emptyInput,
      questLog: { '2026-08-20': { picks: [], completions: { water: 3 } } },
    })
    expect(w.nourish).toBe(3)
  })

  it('보조 영역이 있는 퀘스트는 두 영역에 나뉘어 쌓인다', () => {
    const w = dayDomains('2026-08-20', {
      ...emptyInput,
      questLog: { '2026-08-20': { picks: [], completions: { 'climb-log': 2 } } },
    })
    expect(w.body).toBe(2)
    expect(w.create).toBe(1)
  })

  it('기록이 없는 날은 아무 영역도 만들지 않는다', () => {
    expect(totalWeight(dayDomains('2026-08-20', emptyInput))).toBe(0)
  })

  it('기록이 적으면 결론 대신 아직 배우는 중으로 남는다', () => {
    const balance = computeLifeBalance({ ...emptyInput, days: 7, today: '2026-08-20' })
    expect(balance.learning).toBe(true)
    expect(balance.headline).toContain('기록이 적어요')
  })

  it('가장 많이 쌓인 영역과 조용했던 영역을 알려 준다', () => {
    const balance = computeLifeBalance({
      ...emptyInput,
      questLog: Object.fromEntries(
        days(4, 17).map((d) => [d, { picks: [], completions: { 'tidy-5': 3 } }]),
      ),
      days: 7,
      today: '2026-08-20',
    })
    expect(balance.loudest).toBe('home')
    expect(balance.learning).toBe(false)
  })

  it('낮은 영역을 부족하다고 표현하지 않는다', () => {
    const balance = computeLifeBalance({
      ...emptyInput,
      questLog: Object.fromEntries(
        days(4, 17).map((d) => [d, { picks: [], completions: { 'idea-note': 3 } }]),
      ),
      days: 7,
      today: '2026-08-20',
    })
    for (const banned of ['부족', '실패', '못했', '더 해야', '개선']) {
      expect(balance.headline).not.toContain(banned)
    }
    expect(balance.headline).toContain('조용')
  })

  it('기간 밖의 기록은 세지 않는다', () => {
    const balance = computeLifeBalance({
      ...emptyInput,
      questLog: { '2026-07-01': { picks: [], completions: { water: 20 } } },
      days: 7,
      today: '2026-08-20',
    })
    expect(balance.total).toBe(0)
  })

  it('8개 영역이 모두 결과에 들어간다 (기록 없는 영역도 0 으로)', () => {
    const balance = computeLifeBalance({ ...emptyInput, days: 7, today: '2026-08-20' })
    expect(balance.slices).toHaveLength(DOMAIN_KEYS.length)
  })

  it('최소 표본 기준이 있다', () => {
    expect(MIN_BALANCE_TOTAL).toBeGreaterThan(0)
  })
})

describe('DomainWeights 합치기', () => {
  it('한쪽에만 있는 키도 살린다', () => {
    expect(addWeights({ body: 1 }, { mind: 2 })).toEqual({ body: 1, mind: 2 })
  })

  it('값이 0 인 영역은 순위에서 빠진다', () => {
    expect(rankDomains({ body: 0, mind: 3 })).toEqual([{ key: 'mind', value: 3 }])
  })
})

// ─────────────────────────────────────────────
// Life Tree
// ─────────────────────────────────────────────
describe('Life Tree', () => {
  const treeBase = {
    checkins: [],
    nights: [],
    lifeEvents: [],
    weights: [],
    mounjaro: [],
    eventLog: {},
    questLog: {},
  }

  it('기록이 없으면 아무 Node 도 열리지 않는다', () => {
    const tree = buildLifeTree(treeBase)
    expect(tree.discovered).toBe(0)
  })

  it('Node key 는 중복되지 않는다', () => {
    const keys = TREE_NODES.map((n) => n.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('모든 잎이 실제 가지에 붙어 있다', () => {
    const keys = new Set(TREE_NODES.map((n) => n.key))
    for (const node of TREE_NODES) {
      if (node.parent) expect(keys.has(node.parent)).toBe(true)
    }
  })

  it('클라이밍을 3번 적으면 CLIMBING 이 열린다', () => {
    const tree = buildLifeTree({
      ...treeBase,
      eventLog: Object.fromEntries(days(3).map((d) => [d, ['클라이밍']])),
    })
    const climbing = tree.branches
      .find((b) => b.key === 'body')!
      .children.find((n) => n.key === 'climbing')!
    expect(climbing.status).not.toBe('HIDDEN')
  })

  it('잎이 열리면 가지도 같이 열린다', () => {
    const tree = buildLifeTree({
      ...treeBase,
      eventLog: Object.fromEntries(days(3).map((d) => [d, ['클라이밍']])),
    })
    expect(tree.branches.find((b) => b.key === 'body')!.status).not.toBe('HIDDEN')
  })

  it('XP 로는 열리지 않는다 — 관련 기록만 센다', () => {
    // 퀘스트를 아무리 많이 해도 다른 영역의 Node 는 열리지 않는다
    const tree = buildLifeTree({
      ...treeBase,
      questLog: { '2026-08-20': { picks: [], completions: { 'tidy-5': 200 } } },
    })
    const climbing = tree.branches
      .find((b) => b.key === 'body')!
      .children.find((n) => n.key === 'climbing')!
    expect(climbing.status).toBe('HIDDEN')
  })

  it('기록이 쌓일수록 단계가 올라간다', () => {
    expect(statusOf(2, 3)).toBe('HIDDEN')
    expect(statusOf(3, 3)).toBe('DISCOVERED')
    expect(statusOf(3 * STAGE_STEPS.growing, 3)).toBe('GROWING')
    expect(statusOf(3 * STAGE_STEPS.known, 3)).toBe('KNOWN')
    expect(statusOf(3 * STAGE_STEPS.deep, 3)).toBe('DEEP')
  })

  it('잠긴 Node 의 진행도는 0~1 사이다', () => {
    const tree = buildLifeTree({
      ...treeBase,
      eventLog: { '2026-08-20': ['클라이밍'] },
    })
    const climbing = tree.branches
      .find((b) => b.key === 'body')!
      .children.find((n) => n.key === 'climbing')!
    expect(climbing.progress).toBeGreaterThan(0)
    expect(climbing.progress).toBeLessThanOrEqual(1)
  })
})

// ─────────────────────────────────────────────
// Today's Capacity
// ─────────────────────────────────────────────
describe("Today's Capacity", () => {
  it('오늘 기록이 없으면 만들지 않는다', () => {
    expect(todayCapacity({ checkin: null })).toBeNull()
  })

  it('점수가 하나도 없으면 만들지 않는다', () => {
    const checkin = c('2026-08-20', {
      energyScore: null,
      recoveryScore: null,
      bodyScore: null,
      mindScore: null,
      fuelScore: null,
      fatigue: null,
      sleepHours: null,
    })
    expect(todayCapacity({ checkin })).toBeNull()
  })

  it('전체적으로 낮으면 쉬어가는 날이 된다', () => {
    const checkin = c('2026-08-20', {
      recoveryScore: 20,
      bodyScore: 25,
      mindScore: 30,
      fuelScore: 25,
      fatigue: 5,
      sleepHours: 4,
    })
    expect(todayCapacity({ checkin })!.type).toBe('REST')
  })

  it('전체적으로 높으면 여유 있는 날이 된다', () => {
    const checkin = c('2026-08-20', {
      recoveryScore: 85,
      bodyScore: 88,
      mindScore: 90,
      fuelScore: 85,
      fatigue: 1,
      sleepHours: 8,
    })
    expect(todayCapacity({ checkin })!.type).toBe('OPEN')
  })

  it('몸이 힘든 태그가 있으면 한 단계 낮춰 본다', () => {
    const checkin = c('2026-08-20', {
      recoveryScore: 58,
      bodyScore: 58,
      mindScore: 58,
      fuelScore: 58,
      fatigue: 3,
      sleepHours: 7,
    })
    const plain = todayCapacity({ checkin })!
    const sore = todayCapacity({ checkin, events: ['근육통'] })!
    const order = ['REST', 'GENTLE', 'STEADY', 'OPEN']
    expect(order.indexOf(sore.type)).toBeLessThanOrEqual(order.indexOf(plain.type))
  })

  it('없는 값은 계산에서 빼고 남은 값으로만 정한다', () => {
    const checkin = c('2026-08-20', {
      recoveryScore: 80,
      bodyScore: null,
      mindScore: null,
      fuelScore: null,
      fatigue: null,
      sleepHours: null,
    })
    const capacity = todayCapacity({ checkin })
    expect(capacity).not.toBeNull()
    expect(capacity!.basis).toBe(1)
  })

  it('하루 일정을 짜 주지 않는다 — 시간 표현이 없다', () => {
    const checkin = c('2026-08-20', { recoveryScore: 60, bodyScore: 60, mindScore: 60, fuelScore: 60 })
    const capacity = todayCapacity({ checkin })!
    const text = [capacity.message, ...capacity.goodFor, ...capacity.goEasyOn].join(' ')
    for (const banned of ['시에', '일정', '스케줄', '분 동안 하세요', '순서대로']) {
      expect(text).not.toContain(banned)
    }
  })
})

// ─────────────────────────────────────────────
// Recovery Curve
// ─────────────────────────────────────────────
describe('Recovery Curve', () => {
  it('기록이 모자라면 흐름을 말하지 않는다', () => {
    const curve = recoveryCurve({
      checkins: days(2).map((d) => c(d)),
      days: 7,
      today: '2026-08-07',
    })
    expect(curve.trend).toBe('LEARNING')
    expect(curve.count).toBeLessThan(MIN_CURVE_POINTS)
  })

  it('올라가는 흐름을 RECOVERING 으로 본다', () => {
    const scores = [30, 34, 38, 52, 60, 68, 72]
    const checkins = days(7).map((d, i) => c(d, { energyScore: scores[i] }))
    expect(recoveryCurve({ checkins, days: 7, today: '2026-08-07' }).trend).toBe('RECOVERING')
  })

  it('내려가는 흐름을 DIPPING 으로 본다', () => {
    const scores = [78, 74, 70, 55, 48, 40, 36]
    const checkins = days(7).map((d, i) => c(d, { energyScore: scores[i] }))
    expect(recoveryCurve({ checkins, days: 7, today: '2026-08-07' }).trend).toBe('DIPPING')
  })

  it('비슷하게 유지되면 STABLE 로 본다', () => {
    const checkins = days(7).map((d, i) => c(d, { energyScore: 60 + (i % 2) }))
    expect(recoveryCurve({ checkins, days: 7, today: '2026-08-07' }).trend).toBe('STABLE')
  })

  it('오르내림이 크면 VARIABLE 로 본다', () => {
    const scores = [20, 85, 25, 90, 30, 88, 28]
    const checkins = days(7).map((d, i) => c(d, { energyScore: scores[i] }))
    expect(recoveryCurve({ checkins, days: 7, today: '2026-08-07' }).trend).toBe('VARIABLE')
  })

  it('기록이 없는 날을 0 으로 채우지 않는다', () => {
    const checkins = [c('2026-08-01', { energyScore: 70 })]
    const curve = recoveryCurve({ checkins, days: 7, today: '2026-08-07' })
    const missing = curve.points.filter((p) => p.date !== '2026-08-01')
    expect(missing.every((p) => p.value === null)).toBe(true)
    expect(curve.count).toBe(1)
  })

  it('3일 이동평균으로 노이즈를 줄인다 — 전날 대비만 보지 않는다', () => {
    // 마지막 하루만 크게 떨어졌지만 흐름 전체는 안정적이다
    const scores = [60, 61, 60, 62, 61, 60, 20]
    const checkins = days(7).map((d, i) => c(d, { energyScore: scores[i] }))
    const curve = recoveryCurve({ checkins, days: 7, today: '2026-08-07' })
    expect(curve.trend).not.toBe('DIPPING')
  })

  it('의료적 표현을 쓰지 않는다', () => {
    const scores = [78, 74, 70, 55, 48, 40, 36]
    const checkins = days(7).map((d, i) => c(d, { energyScore: scores[i] }))
    const curve = recoveryCurve({ checkins, days: 7, today: '2026-08-07' })
    for (const banned of ['정상', '비정상', '위험', '진단', '치료', '질환', '증상이 악화']) {
      expect(curve.message).not.toContain(banned)
    }
  })
})

// ─────────────────────────────────────────────
// Archive
// ─────────────────────────────────────────────
describe('My Archive', () => {
  const archiveBase = {
    checkins: [c('2026-08-20', { highlight: '클라이밍 다녀왔다', energyScore: 81 })],
    nights: [],
    weights: [{ id: 'w', userId: 'u', date: '2026-08-20', weightKg: 62.4, createdAt: '', updatedAt: '' }],
    mounjaro: [],
    lifeEvents: [],
    eventLog: { '2026-08-20': ['클라이밍', '야근'] },
    questLog: { '2026-08-20': { picks: [], completions: { water: 3, 'climb-log': 1 } } },
    prefs,
  }

  it('여러 종류의 기록이 한 목록으로 합쳐진다', () => {
    const entries = buildArchive(archiveBase)
    const kinds = new Set(entries.map((e) => e.kind))
    expect(kinds.has('day')).toBe(true)
    expect(kinds.has('weight')).toBe(true)
    expect(kinds.has('quest')).toBe(true)
    expect(kinds.has('climbing')).toBe(true)
  })

  it('검색어로 여러 종류를 한 번에 찾는다', () => {
    const entries = buildArchive(archiveBase)
    const found = searchArchive(entries, { text: '클라이밍', today: '2026-08-20' })
    const kinds = new Set(found.map((e) => e.kind))
    expect(kinds.size).toBeGreaterThan(1)
  })

  it('검색은 대소문자를 가리지 않는다', () => {
    const entries = buildArchive(archiveBase)
    expect(searchArchive(entries, { text: 'WEIGHT', today: '2026-08-20' }).length).toBeGreaterThan(0)
  })

  it('종류로 걸러낼 수 있다', () => {
    const entries = buildArchive(archiveBase)
    const found = searchArchive(entries, { kinds: ['weight'], today: '2026-08-20' })
    expect(found.every((e) => e.kind === 'weight')).toBe(true)
  })

  it('영역으로 걸러낼 수 있다', () => {
    const entries = buildArchive(archiveBase)
    const found = searchArchive(entries, { domains: ['body'], today: '2026-08-20' })
    expect(found.length).toBeGreaterThan(0)
    expect(found.every((e) => e.domain === 'body')).toBe(true)
  })

  it('기간으로 걸러낼 수 있다', () => {
    const entries = buildArchive({
      ...archiveBase,
      checkins: [...archiveBase.checkins, c('2026-01-01')],
    })
    const recent = searchArchive(entries, { period: 7, today: '2026-08-20' })
    expect(recent.some((e) => e.date === '2026-01-01')).toBe(false)
    const all = searchArchive(entries, { period: 'all', today: '2026-08-20' })
    expect(all.some((e) => e.date === '2026-01-01')).toBe(true)
  })

  it('퀘스트는 하루 요약으로 묶여서 타임라인을 도배하지 않는다', () => {
    const many = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [`q${i}`, 1]),
    )
    const entries = buildArchive({
      ...archiveBase,
      questLog: { '2026-08-20': { picks: [], completions: { ...many, water: 3 } } },
    })
    const timeline = timelineEntries(entries)
    const questRows = timeline.filter((e) => e.kind === 'quest')
    // 하루 요약 한 줄만 남는다 (모르는 id 는 아예 줄이 안 생긴다)
    expect(questRows.length).toBeLessThanOrEqual(2)
  })

  it('즐겨찾는 퀘스트는 타임라인에 따로 선다', () => {
    const entries = buildArchive({ ...archiveBase, favoriteQuests: ['climb-log'] })
    const timeline = timelineEntries(entries)
    expect(timeline.some((e) => e.id === 'quest:2026-08-20:climb-log')).toBe(true)
  })

  it('날짜가 없는 줄은 만들지 않는다', () => {
    const entries = buildArchive(archiveBase)
    expect(entries.every((e) => e.date)).toBe(true)
  })
})

// ─────────────────────────────────────────────
// Weekly Reset
// ─────────────────────────────────────────────
describe('Weekly Reset', () => {
  it('주는 월요일에 시작한다', () => {
    expect(weekStartOf('2026-08-20')).toBe('2026-08-17') // 목요일
    expect(weekStartOf('2026-08-17')).toBe('2026-08-17') // 월요일
    expect(weekStartOf('2026-08-23')).toBe('2026-08-17') // 일요일
  })

  it('주는 일요일에 끝난다', () => {
    expect(weekEndOf('2026-08-17')).toBe('2026-08-23')
  })

  it('그 주의 기록만 요약한다', () => {
    const summary = weekSummary({
      ...emptyInput,
      checkins: [
        ...days(7, 17).map((d) => c(d, { energyScore: 70, sleepHours: 7 })),
        c('2026-08-10', { energyScore: 10, sleepHours: 3 }),
      ],
      weekStart: '2026-08-17',
    })
    expect(summary.checkinDays).toBe(7)
    expect(summary.avgEnergy).toBe(70)
    expect(summary.avgSleepHours).toBe(7)
  })

  it('기록이 없어도 터지지 않는다', () => {
    const summary = weekSummary({ ...emptyInput, weekStart: '2026-08-17' })
    expect(summary.avgEnergy).toBeNull()
    expect(summary.checkinDays).toBe(0)
  })

  it('지난주에 고른 영역이 이번 주 추천에 반영된다', () => {
    const resets = [
      {
        userId: 'u',
        weekStart: '2026-08-10',
        weekEnd: '2026-08-16',
        avgEnergy: null,
        avgSleep: null,
        focusDomains: ['recovery', 'joy'],
        createdAt: '',
        updatedAt: '',
      },
    ]
    expect(activeFocusDomains(resets, '2026-08-20')).toEqual(['recovery', 'joy'])
  })

  it('알 수 없는 영역 문자열은 걸러낸다', () => {
    const resets = [
      {
        userId: 'u',
        weekStart: '2026-08-10',
        weekEnd: '2026-08-16',
        avgEnergy: null,
        avgSleep: null,
        focusDomains: ['recovery', '알 수 없는 것'],
        createdAt: '',
        updatedAt: '',
      },
    ]
    expect(activeFocusDomains(resets, '2026-08-20')).toEqual(['recovery'])
  })
})

// ─────────────────────────────────────────────
// Insight
// ─────────────────────────────────────────────
describe('Insight 표본 기준과 말투', () => {
  it('표본이 모자라면 결론 대신 STILL LEARNING 으로 남는다', () => {
    const checkins = [
      ...days(5).map((d) => c(d, { energyScore: 85, sleepHours: 8 })),
      ...days(5, 10).map((d) => c(d, { energyScore: 40, sleepHours: 4 })),
    ]
    const list = buildInsightList({ checkins, prefs })
    const sleep = list.find((i) => i.id === 'sleep')
    if (sleep) expect(sleep.category).toBe('STILL_LEARNING')
  })

  it('표본이 충분하면 결론을 만든다', () => {
    const checkins = [
      ...days(12).map((d) => c(d, { energyScore: 85, sleepHours: 8 })),
      ...days(12, 13).map((d) => c(d, { energyScore: 40, sleepHours: 4 })),
    ]
    const list = buildInsightList({ checkins, prefs })
    const sleep = list.find((i) => i.id === 'sleep')
    expect(sleep).toBeDefined()
    expect(sleep!.category).not.toBe('STILL_LEARNING')
    expect(sleep!.sampleSize).toBeGreaterThanOrEqual(INSIGHT_MIN_TOTAL)
  })

  it('어떤 Insight 도 인과로 말하지 않는다', () => {
    const checkins = [
      ...days(12).map((d) => c(d, { energyScore: 85, sleepHours: 8 })),
      ...days(12, 13).map((d) => c(d, { energyScore: 40, sleepHours: 4 })),
    ]
    for (const i of buildInsightList({ checkins, prefs })) {
      for (const banned of ['때문에', '원인이다', '문제입니다', '치료', '고쳐야', '진단']) {
        expect(i.body).not.toContain(banned)
      }
    }
  })

  it('최소 표본 기준이 patterns 보다 엄격하다', () => {
    expect(INSIGHT_MIN_GROUP).toBeGreaterThanOrEqual(5)
    expect(INSIGHT_MIN_TOTAL).toBeGreaterThanOrEqual(12)
  })

  it('빈 기록에서도 터지지 않는다', () => {
    expect(buildInsightList({ checkins: [], prefs })).toEqual([])
  })
})

// ─────────────────────────────────────────────
// null 처리
// ─────────────────────────────────────────────
describe('없는 값과 0 을 구분한다', () => {
  it('Life Balance 는 미기록을 0 으로 세지 않는다', () => {
    const w = dayDomains('2026-08-20', {
      ...emptyInput,
      checkins: [c('2026-08-20', { sleepHours: null, mealsCount: null, appetite: null })],
    })
    // 아침을 적은 것 자체는 MIND 에 쌓이지만 잠·끼니는 쌓이지 않는다
    expect(w.recovery).toBeUndefined()
    expect(w.nourish).toBeUndefined()
    expect(w.mind).toBeGreaterThan(0)
  })

  it('Recovery Curve 는 미기록 날을 평균에서 뺀다', () => {
    const checkins = [
      c('2026-08-01', { energyScore: 80 }),
      c('2026-08-05', { energyScore: 80 }),
    ]
    const curve = recoveryCurve({ checkins, days: 7, today: '2026-08-07' })
    expect(curve.average).toBe(80)
  })

  it('실제 0 은 값으로 센다', () => {
    const checkins = days(5).map((d) => c(d, { energyScore: 0 }))
    const curve = recoveryCurve({ checkins, days: 7, today: '2026-08-05' })
    expect(curve.count).toBe(5)
    expect(curve.average).toBe(0)
  })
})

// ─────────────────────────────────────────────
// Next Unlock
// ─────────────────────────────────────────────
describe('Next Unlock', () => {
  const tree = buildLifeTree({
    checkins: [],
    nights: [],
    lifeEvents: [],
    weights: [],
    mounjaro: [],
    eventLog: {},
    questLog: {},
  })

  it('비밀 배지는 미리 알려 주지 않는다', () => {
    const badges = [
      { id: 's', name: '???', hint: '???', group: 'secret', icon: TREE_NODES[0].icon, goal: 1, secret: true, earned: false, progress: 0 },
    ]
    const out = nextUnlocks({ tree, badges: badges as never, chapters: [] }, 5)
    expect(out.some((u) => u.id === 'badge:s')).toBe(false)
  })

  it('이미 열린 것은 넣지 않는다', () => {
    const badges = [
      { id: 'e', name: 'DONE', hint: '', group: 'start', icon: TREE_NODES[0].icon, goal: 1, earned: true, progress: 1 },
    ]
    const out = nextUnlocks({ tree, badges: badges as never, chapters: [] }, 5)
    expect(out.some((u) => u.id === 'badge:e')).toBe(false)
  })

  it('가까운 것부터 보여 준다', () => {
    const chapters = [
      { no: 1, key: 'a', title: 'A', ko: 'a', icon: TREE_NODES[0].icon, need: 10, have: 9, unlocked: false, lines: [] },
      { no: 2, key: 'b', title: 'B', ko: 'b', icon: TREE_NODES[0].icon, need: 10, have: 1, unlocked: false, lines: [] },
    ]
    const out = nextUnlocks({ tree, badges: [], chapters }, 2)
    expect(out[0].id).toBe('manual:a')
  })

  it('개수를 넘겨서 보여 주지 않는다', () => {
    expect(nextUnlocks({ tree, badges: [], chapters: [] }, 3).length).toBeLessThanOrEqual(3)
  })

  it('서두르게 하는 표현을 쓰지 않는다', () => {
    for (const u of nextUnlocks({ tree, badges: [], chapters: [] }, 3)) {
      for (const banned of ['서둘', '빨리', '지금 당장', '남은 시간']) {
        expect(u.hint).not.toContain(banned)
      }
    }
  })
})
