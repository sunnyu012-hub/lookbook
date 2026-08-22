import { describe, expect, it } from 'vitest'
import type { AppState } from '@/types'
import { createDefaultState } from '@/store/defaultState'
import { weekKey } from '@/lib/date'
import { claimableGoals, goalKey, goalProgress, weeklyGoals } from '@/lib/goals'
import { applyCollectionDerived } from '@/lib/collection/derive'

/** 2026-03-04 는 수요일. 그 주 월요일은 2026-03-02, 일요일은 2026-03-08. */
const WED = new Date('2026-03-04T12:00:00')
/** 진행도는 "오늘까지" 만 센다. 한 주치를 다 세려면 그 주 끝에서 봐야 한다. */
const SUN = new Date('2026-03-08T22:00:00')

function base(): AppState {
  return { ...createDefaultState(), claimedWeeklyGoals: [] }
}

describe('이번 주 목표', () => {
  it('세 개 나온다', () => {
    expect(weeklyGoals(WED)).toHaveLength(3)
  })

  it('같은 주면 몇 번을 봐도 같다', () => {
    const mon = weeklyGoals(new Date('2026-03-02T09:00:00'))
    const sun = weeklyGoals(new Date('2026-03-08T23:00:00'))
    expect(sun).toEqual(mon)
  })

  it('주가 바뀌면 바뀐다', () => {
    const a = weeklyGoals(WED).map((g) => g.id)
    const b = weeklyGoals(new Date('2026-03-11T12:00:00')).map((g) => g.id)
    const c = weeklyGoals(new Date('2026-03-18T12:00:00')).map((g) => g.id)
    expect([a.join(), b.join(), c.join()].length).toBe(3)
    expect(a.join() === b.join() && b.join() === c.join()).toBe(false)
  })

  it('결이 겹치지 않는다', () => {
    for (const day of ['2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23']) {
      const kinds = weeklyGoals(new Date(`${day}T12:00:00`)).map((g) => g.kind)
      expect(new Set(kinds).size, day).toBe(kinds.length)
    }
  })

  it('목표는 저장하지 않는다 — 주 월요일에서 나온다', () => {
    expect(weekKey(WED)).toBe('2026-03-02')
    expect(goalKey(weeklyGoals(WED)[0], WED)).toMatch(/^2026-03-02:/)
  })
})

describe('진행도', () => {
  it('이번 주 기록만 센다', () => {
    const state: AppState = {
      ...base(),
      dailyLog: {
        // 지난 주 — 세면 안 된다
        '2026-02-25': { completed: 9, exp: 90, byCategory: { BODY: 90 } },
        '2026-03-03': { completed: 2, exp: 20, byCategory: { BODY: 20 } },
        '2026-03-04': { completed: 3, exp: 30, byCategory: { BODY: 30 } },
      },
    }
    const quests = { id: 'q8', kind: 'QUESTS' as const, label: '', coins: 0, target: 8 }
    expect(goalProgress(state, quests, WED).now).toBe(5)
  })

  it('카테고리는 개수가 아니라 며칠인지 센다', () => {
    const state: AppState = {
      ...base(),
      dailyLog: {
        // 하루에 몰아서 열 개 — 그래도 하루다
        '2026-03-04': { completed: 10, exp: 200, byCategory: { BODY: 200 } },
      },
    }
    const goal = {
      id: 'cat_body',
      kind: 'CATEGORY_DAYS' as const,
      label: '',
      coins: 0,
      target: 3,
      category: 'BODY' as const,
    }
    expect(goalProgress(state, goal, WED).now).toBe(1)
    expect(goalProgress(state, goal, WED).done).toBe(false)
  })

  it('목표를 넘겨도 목표까지만 보여준다', () => {
    const state: AppState = {
      ...base(),
      dailyLog: { '2026-03-04': { completed: 30, exp: 300, byCategory: {} } },
    }
    const goal = { id: 'q8', kind: 'QUESTS' as const, label: '', coins: 0, target: 8 }
    const p = goalProgress(state, goal, WED)
    expect(p.now).toBe(8)
    expect(p.done).toBe(true)
  })
})

describe('보상', () => {
  /** 이번 주 목표를 전부 채운 상태 */
  function filled(): AppState {
    const days = ['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07']
    const dailyLog = Object.fromEntries(
      days.map((d) => [
        d,
        {
          completed: 5,
          exp: 100,
          byCategory: { LIFE: 20, WORK: 20, BODY: 20, PLAY: 20, MIND: 10, HEART: 10 },
        },
      ]),
    )
    const discovered = Object.fromEntries(
      ['cream_bed', 'wood_bed', 'cloud_bed', 'daybed', 'check_sofa', 'pink_sofa', 'my_mug'].map(
        (id, i) => [id, `2026-03-0${(i % 6) + 2}T10:00:00.000Z`],
      ),
    )
    const purchases = Object.fromEntries(
      ['2026-03-02:HOME_ATELIER:a', '2026-03-03:HOME_ATELIER:b', '2026-03-04:HOME_ATELIER:c',
       '2026-03-05:HOME_ATELIER:d', '2026-03-06:HOME_ATELIER:e'].map((k) => [k, 1]),
    )
    return {
      ...base(),
      dailyLog,
      collection: { ...base().collection, discovered, purchases },
    }
  }

  it('채우면 받아갈 게 생긴다', () => {
    expect(claimableGoals(filled(), SUN).length).toBe(3)
  })

  it('주 중간에는 아직 다 못 채운다', () => {
    // 진행도는 오늘까지만 센다. 수요일에 한 주치가 채워져 있을 수는 없다.
    expect(claimableGoals(filled(), WED).length).toBeLessThan(3)
  })

  it('앱을 열면 알아서 들어온다', () => {
    const before = filled()
    const after = applyCollectionDerived(before, SUN)
    const earned = weeklyGoals(SUN).reduce((sum, g) => sum + g.coins, 0)

    expect(after.state.user.coins).toBe(before.user.coins + earned)
    expect(after.state.claimedWeeklyGoals).toHaveLength(3)
  })

  it('두 번 열어도 두 번 주지 않는다', () => {
    const once = applyCollectionDerived(filled(), SUN)
    const twice = applyCollectionDerived(once.state, SUN)
    expect(twice.state.user.coins).toBe(once.state.user.coins)
    expect(twice.state.claimedWeeklyGoals).toHaveLength(3)
  })

  it('아직 못 채웠으면 안 준다', () => {
    const after = applyCollectionDerived(base(), SUN)
    expect(after.state.user.coins).toBe(base().user.coins)
    expect(after.state.claimedWeeklyGoals).toEqual([])
  })

  it('다음 주가 되면 새로 받을 수 있다', () => {
    const thisWeek = applyCollectionDerived(filled(), SUN)
    // 지난 주에 받은 기록이 남아 있어도 새 주의 목표를 막지 않는다
    const nextWeek = weeklyGoals(new Date('2026-03-11T12:00:00'))
    for (const goal of nextWeek) {
      expect(thisWeek.state.claimedWeeklyGoals).not.toContain(
        goalKey(goal, new Date('2026-03-11T12:00:00')),
      )
    }
  })
})
