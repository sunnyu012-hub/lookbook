import { describe, expect, it } from 'vitest'
import type { Quest, RepeatRule, Routine } from '@/types'
import {
  describeRule,
  isUsableRule,
  matchesToday,
  spawnDueQuests,
  weekdayIndex,
} from '../routines'

// 2026-08-24 는 월요일
const MON = new Date(2026, 7, 24, 9)
const WED = new Date(2026, 7, 26, 9)
const SAT = new Date(2026, 7, 29, 9)
const SUN = new Date(2026, 7, 30, 9)

let seq = 0
function routine(partial: Partial<Routine> & { title: string }): Routine {
  seq += 1
  return {
    id: `r${seq}`,
    category: 'LIFE',
    difficulty: 'EASY',
    rule: { kind: 'daily' },
    createdAt: '2026-08-01T00:00:00.000Z',
    lastSpawnedOn: null,
    paused: false,
    ...partial,
  }
}

function quest(partial: Partial<Quest> & { title: string }): Quest {
  seq += 1
  return {
    id: `q${seq}`,
    category: 'LIFE',
    difficulty: 'EASY',
    exp: 10,
    completed: false,
    createdAt: '2026-08-24T00:00:00.000Z',
    completedAt: null,
    ...partial,
  }
}

let idSeq = 0
const makeId = () => `new${(idSeq += 1)}`

describe('weekdayIndex — 월요일이 0', () => {
  it.each([
    [MON, 0],
    [WED, 2],
    [SAT, 5],
    [SUN, 6],
  ])('%s → %i', (date, expected) => {
    expect(weekdayIndex(date)).toBe(expected)
  })
})

describe('matchesToday', () => {
  it('매일은 언제나', () => {
    expect(matchesToday({ kind: 'daily' }, SUN)).toBe(true)
  })

  it('평일은 월~금만', () => {
    expect(matchesToday({ kind: 'weekdays' }, WED)).toBe(true)
    expect(matchesToday({ kind: 'weekdays' }, SAT)).toBe(false)
    expect(matchesToday({ kind: 'weekdays' }, SUN)).toBe(false)
  })

  it('요일 지정은 고른 날만', () => {
    const rule: RepeatRule = { kind: 'days', days: [0, 2, 4] } // 월수금
    expect(matchesToday(rule, MON)).toBe(true)
    expect(matchesToday(rule, WED)).toBe(true)
    expect(matchesToday(rule, SAT)).toBe(false)
  })
})

describe('describeRule / isUsableRule', () => {
  it('사람이 읽는 문구로 바꾼다', () => {
    expect(describeRule({ kind: 'daily' })).toBe('매일')
    expect(describeRule({ kind: 'weekdays' })).toBe('평일')
    expect(describeRule({ kind: 'days', days: [4, 0, 2] })).toBe('월·수·금')
  })

  it('요일을 하나도 안 고르면 쓸 수 없는 규칙', () => {
    expect(isUsableRule({ kind: 'days', days: [] })).toBe(false)
    expect(isUsableRule({ kind: 'daily' })).toBe(true)
  })
})

describe('spawnDueQuests', () => {
  it('오늘 해당하는 반복에서 퀘스트를 만든다', () => {
    const result = spawnDueQuests([routine({ title: '설거지' })], [], MON, makeId)

    expect(result?.quests).toHaveLength(1)
    expect(result?.quests[0]).toMatchObject({ title: '설거지', completed: false })
    expect(result?.routines[0].lastSpawnedOn).toBe('2026-08-24')
  })

  it('만든 퀘스트에 원본 id 를 남긴다', () => {
    const r = routine({ title: '설거지' })
    const result = spawnDueQuests([r], [], MON, makeId)

    expect(result?.quests[0].routineId).toBe(r.id)
  })

  it('난이도에 맞는 EXP 를 굳혀 넣는다', () => {
    const result = spawnDueQuests(
      [routine({ title: '운동', difficulty: 'HARD' })],
      [],
      MON,
      makeId,
    )
    expect(result?.quests[0].exp).toBe(40)
  })

  it('같은 날 두 번 돌려도 한 번만 만든다', () => {
    const first = spawnDueQuests([routine({ title: '설거지' })], [], MON, makeId)
    const second = spawnDueQuests(first!.routines, first!.quests, MON, makeId)

    expect(second).toBeNull()
  })

  it('오늘 해당하지 않는 요일이면 만들지 않는다', () => {
    const weekdayOnly = routine({ title: '출근 준비', rule: { kind: 'weekdays' } })
    expect(spawnDueQuests([weekdayOnly], [], SAT, makeId)).toBeNull()
  })

  it('멈춰둔 반복은 만들지 않는다', () => {
    expect(spawnDueQuests([routine({ title: '설거지', paused: true })], [], MON, makeId)).toBeNull()
  })

  it('요일을 하나도 안 고른 규칙은 만들지 않는다', () => {
    const empty = routine({ title: '뭔가', rule: { kind: 'days', days: [] } })
    expect(spawnDueQuests([empty], [], MON, makeId)).toBeNull()
  })

  it('같은 제목이 이미 목록에 있으면 또 만들지 않는다', () => {
    const existing = [quest({ title: '설거지 하기' })] // 띄어쓰기만 다름
    const result = spawnDueQuests([routine({ title: '설거지하기' })], existing, MON, makeId)

    // 날짜는 찍어두되 퀘스트는 만들지 않는다
    expect(result?.quests).toHaveLength(0)
    expect(result?.routines[0].lastSpawnedOn).toBe('2026-08-24')
  })

  it('오늘 이미 완료한 것도 다시 띄우지 않는다', () => {
    const done = [
      quest({ title: '설거지', completed: true, completedAt: '2026-08-24T01:00:00.000Z' }),
    ]
    const result = spawnDueQuests([routine({ title: '설거지' })], done, MON, makeId)

    expect(result?.quests).toHaveLength(0)
  })

  it('어제 완료한 것은 오늘 다시 만든다', () => {
    const yesterday = [
      quest({ title: '설거지', completed: true, completedAt: '2026-08-23T01:00:00.000Z' }),
    ]
    const result = spawnDueQuests([routine({ title: '설거지' })], yesterday, MON, makeId)

    expect(result?.quests).toHaveLength(1)
  })

  it('며칠 안 열었어도 밀린 걸 몰아서 만들지 않는다', () => {
    // 지난주 월요일에 마지막으로 만들어졌고 오늘은 이번 주 수요일
    const stale = routine({ title: '설거지', lastSpawnedOn: '2026-08-17' })
    const result = spawnDueQuests([stale], [], WED, makeId)

    expect(result?.quests).toHaveLength(1) // 오늘 것 하나뿐
    expect(result?.routines[0].lastSpawnedOn).toBe('2026-08-26')
  })

  it('여러 반복을 한 번에 처리한다', () => {
    const result = spawnDueQuests(
      [
        routine({ title: '설거지' }),
        routine({ title: '출근 준비', rule: { kind: 'weekdays' } }),
        routine({ title: '주말 청소', rule: { kind: 'days', days: [5, 6] } }),
      ],
      [],
      MON,
      makeId,
    )

    expect(result?.quests.map((q) => q.title)).toEqual(['설거지', '출근 준비'])
  })

  it('만들 게 없으면 null — 괜히 저장을 다시 하지 않게', () => {
    expect(spawnDueQuests([], [], MON, makeId)).toBeNull()
  })
})
