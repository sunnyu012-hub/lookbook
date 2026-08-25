import { describe, expect, it } from 'vitest'
import {
  CATEGORY_BY_ID,
  TAG_CATEGORIES,
  isKnownCategory,
  makeTagId,
  parseTagId,
} from '../os2/categories'
import {
  DAY_PART_HOURS,
  dateKeyOf,
  dayPartOf,
  deriveFields,
  groupByDate,
  moodOnly,
  toQuickLog,
} from '../os2/quickLog'
import { ANALYSIS_VERSION, SCHEMA_VERSION, TAXONOMY_VERSION, stamp } from '../os2/versions'
import { EVIDENCE_MINIMUM, type Mood, type QuickLog } from '../os2/types'

describe('Life OS 2.0 — 버전', () => {
  it('세 가지 버전이 모두 정의돼 있다', () => {
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(1)
    expect(ANALYSIS_VERSION).toBeGreaterThanOrEqual(1)
    expect(TAXONOMY_VERSION).toBeGreaterThanOrEqual(1)
  })

  it('기록에 버전을 찍어 준다', () => {
    expect(stamp({ a: 1 })).toEqual({ a: 1, schemaVersion: SCHEMA_VERSION })
  })
})

describe('Life OS 2.0 — 태그 카테고리', () => {
  it('계획서의 18개 카테고리가 전부 있다', () => {
    const want = [
      'emotion', 'mental', 'energy', 'body', 'activity', 'work', 'creativity',
      'social', 'relationship', 'place', 'environment', 'food', 'recovery',
      'achievement', 'stressor', 'novelty', 'agency', 'temporal',
    ]
    for (const id of want) expect(isKnownCategory(id)).toBe(true)
    expect(TAG_CATEGORIES).toHaveLength(want.length)
  })

  it('id 가 중복되지 않는다', () => {
    const ids = TAG_CATEGORIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('정렬 순서가 중복되지 않는다', () => {
    const orders = TAG_CATEGORIES.map((c) => c.sortOrder)
    expect(new Set(orders).size).toBe(orders.length)
  })

  it('조회용 색인이 목록과 일치한다', () => {
    expect(Object.keys(CATEGORY_BY_ID)).toHaveLength(TAG_CATEGORIES.length)
  })

  it('태그 id 를 만들고 다시 뜯을 수 있다', () => {
    expect(makeTagId('emotion', 'joy')).toBe('emotion:joy')
    expect(parseTagId('emotion:joy')).toEqual({ categoryId: 'emotion', key: 'joy' })
  })

  it('키에 콜론이 더 있어도 첫 콜론에서만 자른다', () => {
    expect(parseTagId('work:meeting:1on1')).toEqual({
      categoryId: 'work',
      key: 'meeting:1on1',
    })
  })

  it('모양이 아닌 문자열은 거절한다', () => {
    expect(parseTagId('joy')).toBeNull()
    expect(parseTagId(':joy')).toBeNull()
    expect(parseTagId('emotion:')).toBeNull()
  })
})

describe('Life OS 2.0 — Quick Log', () => {
  it('최소 입력은 기분 하나다', () => {
    const input = moodOnly(4 as Mood)
    expect(input.mood).toBe(4)
    expect(Object.keys(input)).toEqual(['mood'])
  })

  it('시간대 구간이 하루 24시간을 빈틈없이 덮는다', () => {
    const covered = new Set<number>()
    for (const r of DAY_PART_HOURS) {
      for (let h = r.from; h < r.to; h += 1) {
        expect(covered.has(h)).toBe(false)
        covered.add(h)
      }
    }
    expect(covered.size).toBe(24)
  })

  it('시각에서 시간대를 뽑는다', () => {
    expect(dayPartOf(new Date(2026, 7, 21, 3))).toBe('dawn')
    expect(dayPartOf(new Date(2026, 7, 21, 8))).toBe('morning')
    expect(dayPartOf(new Date(2026, 7, 21, 14))).toBe('afternoon')
    expect(dayPartOf(new Date(2026, 7, 21, 19))).toBe('evening')
    expect(dayPartOf(new Date(2026, 7, 21, 23))).toBe('night')
  })

  it('날짜는 로컬 기준으로 뽑는다 — 자정 근처가 하루씩 밀리면 안 된다', () => {
    expect(dateKeyOf(new Date(2026, 7, 21, 23, 59))).toBe('2026-08-21')
    expect(dateKeyOf(new Date(2026, 7, 22, 0, 1))).toBe('2026-08-22')
  })

  it('저장 시각 하나에서 파생값이 전부 나온다', () => {
    const d = new Date(2026, 7, 21, 21, 30)
    const f = deriveFields(d.toISOString())
    expect(f.date).toBe('2026-08-21')
    expect(f.dayPart).toBe('evening')
    expect(f.dayOfWeek).toBe(d.getDay())
  })

  it('기분만 넣어도 저장 가능한 모양이 된다', () => {
    const now = new Date(2026, 7, 21, 9, 0).toISOString()
    const log = toQuickLog(moodOnly(5 as Mood), { id: 'q1', userId: 'u', now })
    expect(log.mood).toBe(5)
    expect(log.loggedAt).toBe(now)
    expect(log.date).toBe('2026-08-21')
    expect(log.dayPart).toBe('morning')
    expect(log.myTagIds).toEqual([])
    expect(log.lifeTags).toEqual([])
    expect(log.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('시각을 직접 준 경우 그 시각으로 파생값을 만든다', () => {
    const now = new Date(2026, 7, 21, 9, 0).toISOString()
    const past = new Date(2026, 7, 20, 23, 0).toISOString()
    const log = toQuickLog(
      { mood: 3 as Mood, loggedAt: past },
      { id: 'q2', userId: 'u', now },
    )
    expect(log.date).toBe('2026-08-20')
    expect(log.dayPart).toBe('night')
    // 만든 시각은 지금이 맞다
    expect(log.createdAt).toBe(now)
  })

  it('하루 여러 번 기록을 날짜별로 묶고 시간순으로 정렬한다', () => {
    const at = (h: number) => new Date(2026, 7, 21, h).toISOString()
    const logs = [
      toQuickLog({ mood: 2 as Mood, loggedAt: at(19) }, { id: 'c', userId: 'u', now: at(19) }),
      toQuickLog({ mood: 4 as Mood, loggedAt: at(8) }, { id: 'a', userId: 'u', now: at(8) }),
      toQuickLog({ mood: 3 as Mood, loggedAt: at(13) }, { id: 'b', userId: 'u', now: at(13) }),
    ] as QuickLog[]
    const days = groupByDate(logs)
    expect(days).toHaveLength(1)
    expect(days[0].logs.map((l) => l.id)).toEqual(['a', 'b', 'c'])
  })

  it('최신 날짜가 앞에 온다', () => {
    const mk = (day: number) => {
      const t = new Date(2026, 7, day, 10).toISOString()
      return toQuickLog({ mood: 3 as Mood, loggedAt: t }, { id: `d${day}`, userId: 'u', now: t })
    }
    expect(groupByDate([mk(19), mk(21), mk(20)]).map((d) => d.date)).toEqual([
      '2026-08-21',
      '2026-08-20',
      '2026-08-19',
    ])
  })
})

describe('Life OS 2.0 — 근거 기준', () => {
  it('표본 최소 기준이 정해져 있다', () => {
    expect(EVIDENCE_MINIMUM.sample).toBeGreaterThanOrEqual(5)
    expect(EVIDENCE_MINIMUM.comparisonSample).toBeGreaterThanOrEqual(5)
    expect(EVIDENCE_MINIMUM.distinctDays).toBeGreaterThanOrEqual(3)
  })
})
