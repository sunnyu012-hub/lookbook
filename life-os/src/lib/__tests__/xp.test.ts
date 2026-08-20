import { describe, expect, it } from 'vitest'
import type { Checkin, LifeEvent, MounjaroLog, WeightLog } from '@/types'
import { XP_RULES, loggingStreak, xpBreakdown } from '../xp'
import { levelFromXp, xpForLevel } from '../level'
import { withParticle } from '../korean'

const c = (date: string, entryMode: 'quick' | 'detailed' = 'detailed'): Checkin => ({
  id: date,
  userId: 'u',
  date,
  entryMode,
  energyScore: 70,
  mode: 'NORMAL',
  createdAt: '',
  updatedAt: '',
})

describe('xpBreakdown', () => {
  it('기록한 행동에만 XP 를 준다', () => {
    const xp = xpBreakdown({
      checkins: [c('2026-08-20'), c('2026-08-19', 'quick')],
      weights: [{ id: 'w', userId: 'u', date: '2026-08-20', weightKg: 60, createdAt: '', updatedAt: '' } as WeightLog],
      mounjaro: [{ id: 'm', userId: 'u', date: '2026-08-20', doseMg: 5, sideEffects: [], createdAt: '', updatedAt: '' } as MounjaroLog],
      lifeEvents: [{ id: 'e', userId: 'u', date: '2026-08-20', title: 't', category: 'note', createdAt: '', updatedAt: '' } as LifeEvent],
      questLog: { '2026-08-20': ['water'] },
    })
    expect(xp.checkin).toBe(XP_RULES.checkinDetailed + XP_RULES.checkinQuick)
    expect(xp.weight).toBe(XP_RULES.weightLog)
    expect(xp.mounjaro).toBe(XP_RULES.mounjaroLog)
    expect(xp.lifeEvent).toBe(XP_RULES.lifeEvent)
    expect(xp.quest).toBeGreaterThan(0)
    expect(xp.total).toBe(xp.checkin + xp.weight + xp.mounjaro + xp.lifeEvent + xp.quest)
  })

  it('체중이 줄어든 것에는 XP 가 붙지 않는다 — 기록 횟수만 본다', () => {
    const light = xpBreakdown({
      checkins: [],
      weights: [{ id: 'a', userId: 'u', date: '2026-08-20', weightKg: 50, createdAt: '', updatedAt: '' } as WeightLog],
    })
    const heavy = xpBreakdown({
      checkins: [],
      weights: [{ id: 'a', userId: 'u', date: '2026-08-20', weightKg: 90, createdAt: '', updatedAt: '' } as WeightLog],
    })
    expect(light.total).toBe(heavy.total)
  })

  it('아무것도 없으면 0', () => {
    expect(xpBreakdown({ checkins: [] }).total).toBe(0)
  })
})

describe('loggingStreak', () => {
  it('오늘부터 이어진 날을 센다', () => {
    expect(loggingStreak(['2026-08-20', '2026-08-19', '2026-08-18'], '2026-08-20')).toBe(3)
  })

  it('오늘 아직 안 적었으면 어제부터 센다', () => {
    expect(loggingStreak(['2026-08-19', '2026-08-18'], '2026-08-20')).toBe(2)
  })

  it('끊긴 곳에서 멈춘다', () => {
    expect(loggingStreak(['2026-08-20', '2026-08-18', '2026-08-17'], '2026-08-20')).toBe(1)
  })

  it('아무 기록도 없으면 0', () => {
    expect(loggingStreak([], '2026-08-20')).toBe(0)
  })
})

describe('레벨', () => {
  it('레벨이 오를수록 필요한 XP 가 늘어난다', () => {
    expect(xpForLevel(1)).toBe(100)
    expect(xpForLevel(2)).toBe(115)
  })

  it('XP 를 레벨로 바꾼다', () => {
    expect(levelFromXp(0).level).toBe(1)
    expect(levelFromXp(99).level).toBe(1)
    expect(levelFromXp(100).level).toBe(2)
    expect(levelFromXp(100).into).toBe(0)
    expect(levelFromXp(214).level).toBe(2)
    expect(levelFromXp(215).level).toBe(3)
  })

  it('ratio 는 0~1', () => {
    const s = levelFromXp(150)
    expect(s.ratio).toBeGreaterThanOrEqual(0)
    expect(s.ratio).toBeLessThan(1)
  })
})

describe('조사', () => {
  it('받침에 따라 와/과를 고른다', () => {
    expect(withParticle('성현', '와')).toBe('성현과')
    expect(withParticle('민지', '와')).toBe('민지와')
    expect(withParticle('Alex', '와')).toBe('Alex와')
  })
})
