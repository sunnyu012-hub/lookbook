import { describe, expect, it } from 'vitest'
import { QUEST_POOL } from '../quests/pool'
import { CATEGORIES } from '../quests/categories'
import {
  COMBO_STEPS,
  FIRST_QUEST_BONUS,
  dayXp,
  emptyDay,
  featuredOf,
  quickXpQuests,
  recommend,
  searchQuests,
  willEarnXp,
  xpFor,
  xpLimitOf,
} from '../quests/master'
import { XP_BY_DIFFICULTY, questTitle, questXp, type Quest } from '../quests/types'

const byId = (id: string) => QUEST_POOL.find((q) => q.id === id)!

describe('퀘스트 풀', () => {
  it('150개 이상 있다', () => {
    expect(QUEST_POOL.length).toBeGreaterThanOrEqual(150)
  })

  it('id 가 겹치지 않는다', () => {
    expect(new Set(QUEST_POOL.map((q) => q.id)).size).toBe(QUEST_POOL.length)
  })

  it('제목이 겹치지 않는다 — 숫자만 바꾼 가짜 다양성 방지', () => {
    expect(new Set(QUEST_POOL.map((q) => q.title)).size).toBe(QUEST_POOL.length)
  })

  it('빈 카테고리가 없고, 모두 5개 이상이다', () => {
    CATEGORIES.forEach((c) => {
      const n = QUEST_POOL.filter((q) => q.category === c.key).length
      expect(n, c.key).toBeGreaterThanOrEqual(5)
    })
  })

  it('모든 퀘스트가 알려진 카테고리에 속한다', () => {
    const known = new Set(CATEGORIES.map((c) => c.key))
    QUEST_POOL.forEach((q) => expect(known.has(q.category), q.id).toBe(true))
  })

  it('체중 감량이나 적게 먹기를 퀘스트로 만들지 않는다', () => {
    const banned = ['감량', '살 빼', '체중 줄', '덜 먹', '적게 먹', '굶', '칼로리', '참기']
    QUEST_POOL.forEach((q) => {
      banned.forEach((word) => expect(q.title.includes(word), `${q.id}: ${q.title}`).toBe(false))
    })
  })
})

describe('XP', () => {
  it('난이도가 XP 를 정한다', () => {
    expect(questXp(byId('water'))).toBe(XP_BY_DIFFICULTY.tiny)
    expect(questXp(byId('fold-laundry'))).toBe(XP_BY_DIFFICULTY.normal)
  })

  it('반복 퀘스트는 정해진 횟수까지만 XP 를 준다', () => {
    const water = byId('water')
    const limit = xpLimitOf(water)
    expect(limit).toBeGreaterThan(1)
    expect(willEarnXp(water, { water: limit - 1 })).toBe(true)
    expect(willEarnXp(water, { water: limit })).toBe(false)
    expect(xpFor(water, { water: limit }, null).total).toBe(0)
  })

  it('반복이 아닌 퀘스트는 한 번만 XP 를 준다', () => {
    const q = byId('shower')
    expect(xpLimitOf(q)).toBe(1)
    expect(xpFor(q, { shower: 1 }, null).total).toBe(0)
  })

  it('오늘 첫 퀘스트에는 보너스가 붙는다', () => {
    const gain = xpFor(byId('shower'), {}, null)
    expect(gain.firstOfDay).toBe(true)
    expect(gain.total).toBe(XP_BY_DIFFICULTY.easy + FIRST_QUEST_BONUS)
  })

  it('추천 퀘스트는 1.5배', () => {
    const q = byId('fold-laundry')
    const plain = xpFor(q, { x: 1 }, null).total
    const featured = xpFor(q, { x: 1 }, q.id).total
    expect(featured).toBe(Math.round(plain * 1.5))
  })

  it('5개째에 콤보 보너스가 붙는다', () => {
    const done = { a: 1, b: 1, c: 1, d: 1 }
    const gain = xpFor(byId('shower'), done, null)
    expect(gain.combo?.bonus).toBe(COMBO_STEPS[0].bonus)
  })

  it('하루치를 다시 계산해도 같은 값이 나온다', () => {
    const day = { picks: [], completions: { water: 2, shower: 1 } }
    const xp = dayXp(day, null, QUEST_POOL)
    // 물 2회 + 샤워 1회 + 첫 퀘스트 보너스
    expect(xp).toBe(XP_BY_DIFFICULTY.tiny * 2 + XP_BY_DIFFICULTY.easy + FIRST_QUEST_BONUS)
  })

  it('한도를 넘긴 반복은 XP 에 안 들어간다', () => {
    const limit = xpLimitOf(byId('water'))
    const day = { picks: [], completions: { water: limit + 5 } }
    const xp = dayXp(day, null, QUEST_POOL)
    const expected =
      XP_BY_DIFFICULTY.tiny * limit +
      FIRST_QUEST_BONUS +
      COMBO_STEPS.filter((c) => c.at <= limit + 5).reduce((s, c) => s + c.bonus, 0)
    expect(xp).toBe(expected)
  })
})

describe('추천', () => {
  const base = { events: [] as string[], exclude: [] as string[], seed: 42 }

  it('요청한 개수만큼 준다', () => {
    expect(recommend({ ...base, mode: 'NORMAL' }, 5)).toHaveLength(5)
  })

  it('같은 씨앗이면 같은 추천이 나온다', () => {
    const a = recommend({ ...base, mode: 'EASY' }, 5).map((q) => q.id)
    const b = recommend({ ...base, mode: 'EASY' }, 5).map((q) => q.id)
    expect(a).toEqual(b)
  })

  it('이미 고른 퀘스트는 다시 추천하지 않는다', () => {
    const first = recommend({ ...base, mode: 'NORMAL' }, 5).map((q) => q.id)
    const next = recommend({ ...base, mode: 'NORMAL', exclude: first }, 5)
    next.forEach((q) => expect(first).not.toContain(q.id))
  })

  it('한 카테고리에서 2개를 넘게 뽑지 않는다', () => {
    const picks = recommend({ ...base, mode: 'NORMAL' }, 5)
    const counts = picks.reduce<Record<string, number>>((acc, q) => {
      acc[q.category] = (acc[q.category] ?? 0) + 1
      return acc
    }, {})
    Object.values(counts).forEach((n) => expect(n).toBeLessThanOrEqual(2))
  })

  it('RECOVERY 에는 큰 퀘스트를 거의 주지 않는다', () => {
    const picks = recommend({ ...base, mode: 'RECOVERY' }, 5)
    expect(picks.filter((q) => q.difficulty === 'big').length).toBeLessThanOrEqual(1)
  })

  it('몸이 아픈 날에는 운동 퀘스트를 밀지 않는다', () => {
    const picks = recommend({ ...base, mode: 'NORMAL', events: ['근육통', '피곤함'] }, 5)
    expect(picks.filter((q) => q.category === 'move' || q.category === 'climbing').length).toBe(0)
  })

  it('클라이밍한 날에는 클라이밍 퀘스트가 올라온다', () => {
    const picks = recommend({ ...base, mode: 'NORMAL', events: ['클라이밍'] }, 6)
    expect(picks.some((q) => q.category === 'climbing')).toBe(true)
  })
})

describe('Quick XP / 검색', () => {
  it('Quick XP 는 1~2분짜리만 준다', () => {
    quickXpQuests([], 20).forEach((q) => expect(q.difficulty).toBe('tiny'))
  })

  it('제목으로 찾는다', () => {
    expect(searchQuests('청소').length).toBeGreaterThan(0)
    expect(searchQuests('클라이밍').length).toBeGreaterThan(0)
    expect(searchQuests('없는말말말')).toHaveLength(0)
  })
})

describe('이름 바꾸기', () => {
  it('{partner} 를 설정한 이름으로 바꾼다', () => {
    const q: Quest = { id: 'x', title: '{partner}에게 하트 보내기', category: 'love', difficulty: 'tiny' }
    expect(questTitle(q, '성현')).toBe('성현에게 하트 보내기')
    expect(questTitle(q, null)).toBe('그 사람에게 하트 보내기')
  })
})

describe('기본값', () => {
  it('빈 하루는 완료가 없다', () => {
    expect(emptyDay().completions).toEqual({})
    expect(featuredOf([])).toBeNull()
  })
})
