import { describe, expect, it } from 'vitest'
import type { CheckinInput } from '@/types'
import { scoreCheckin, scoreToMode, sleepHoursScore } from '../scoring'
import { band, down, toGoal, up } from '../scoring/normalize'

const day = (over: Partial<CheckinInput> = {}): CheckinInput => ({ date: '2026-08-20', ...over })

describe('정규화', () => {
  it('up 은 큰 값이 100', () => {
    expect(up(5, 1, 5)).toBe(100)
    expect(up(1, 1, 5)).toBe(0)
    expect(up(3, 1, 5)).toBe(50)
  })

  it('down 은 작은 값이 100', () => {
    expect(down(1, 1, 5)).toBe(100)
    expect(down(5, 1, 5)).toBe(0)
  })

  it('band 는 구간 안이면 100', () => {
    expect(band(3, 2, 4, 2, 3, 30)).toBe(100)
    expect(band(2, 2, 4, 2, 3, 30)).toBe(100)
    expect(band(0, 2, 4, 2, 3, 30)).toBe(30)
  })

  it('toGoal 은 목표를 넘겨도 100 에서 멈춘다', () => {
    expect(toGoal(2000, 2000)).toBe(100)
    expect(toGoal(4000, 2000)).toBe(100)
    expect(toGoal(1000, 2000)).toBe(50)
  })
})

describe('sleepHoursScore', () => {
  it('목표 ±1시간은 100점', () => {
    expect(sleepHoursScore(8, 8)).toBe(100)
    expect(sleepHoursScore(7, 8)).toBe(100)
    expect(sleepHoursScore(9, 8)).toBe(100)
  })

  it('모자라면 가파르게 떨어진다', () => {
    expect(sleepHoursScore(5, 8)).toBe(50)
    expect(sleepHoursScore(3, 8)).toBe(0)
  })

  it('과수면은 완만하게 깎이고 45점 아래로 안 간다', () => {
    expect(sleepHoursScore(10, 8)).toBe(88)
    expect(sleepHoursScore(20, 8)).toBe(45)
  })

  it('목표 시간이 바뀌면 만점 구간도 따라 움직인다', () => {
    expect(sleepHoursScore(7, 7)).toBe(100)
    expect(sleepHoursScore(9, 7)).toBeLessThan(100)
  })
})

describe('scoreCheckin', () => {
  it('아무것도 안 적으면 점수가 없다', () => {
    const r = scoreCheckin(day())
    expect(r.overall).toBeNull()
    expect(r.mode).toBeNull()
    expect(r.confidence).toBe(0)
  })

  it('빠진 항목은 0점이 아니라 계산에서 빠진다', () => {
    // 기분만 최고로 적은 날 → 100 에 가까워야 한다 (나머지를 0 으로 치지 않는다)
    const r = scoreCheckin(day({ mood: 5 }))
    expect(r.overall).toBe(100)
    expect(r.filled).toBe(1)
  })

  it('같은 값이면 항목 수가 달라도 점수는 같다', () => {
    const a = scoreCheckin(day({ mood: 3 }))
    const b = scoreCheckin(day({ mood: 3, focus: 3, sleepQuality: 3 }))
    expect(a.overall).toBe(b.overall)
  })

  it('confidence 는 채운 만큼 올라간다', () => {
    const few = scoreCheckin(day({ mood: 3 }))
    const many = scoreCheckin(day({ mood: 3, focus: 3, fatigue: 3, sleepHours: 8, bodyPain: 0 }))
    expect(many.confidence).toBeGreaterThan(few.confidence)
    expect(many.confidence).toBeLessThanOrEqual(1)
  })

  it('전부 채우면 confidence 가 1', () => {
    const r = scoreCheckin(
      day({
        sleepHours: 8, sleepQuality: 5, fatigue: 1,
        bodyPain: 0, headache: 0, nausea: 0, bloating: 0, digestion: 5,
        mood: 5, focus: 5, stress: 1, anxiety: 1, motivation: 5, socialEnergy: 5,
        appetite: 5, mealsCount: 3, mealQuality: 5, waterMl: 2000,
      }),
    )
    expect(r.confidence).toBe(1)
    expect(r.overall).toBe(100)
  })

  it('축별 점수를 따로 낸다', () => {
    const r = scoreCheckin(day({ sleepHours: 8, mood: 1, focus: 1 }))
    expect(r.dimensions.recovery).toBe(100)
    expect(r.dimensions.mind).toBe(0)
    expect(r.dimensions.body).toBeNull()
    expect(r.dimensions.fuel).toBeNull()
  })

  it('나쁜 날은 낮고 좋은 날은 높다', () => {
    const bad = scoreCheckin(day({ sleepHours: 3, fatigue: 5, mood: 1, focus: 1, bodyPain: 5 }))
    const good = scoreCheckin(day({ sleepHours: 8, fatigue: 1, mood: 5, focus: 5, bodyPain: 0 }))
    expect(bad.overall).toBeLessThan(25)
    expect(good.overall).toBeGreaterThan(90)
  })

  it('목표 수면 시간 설정이 점수에 반영된다', () => {
    const ctx = { sleepGoalHours: 6, waterGoalMl: 2000 }
    expect(scoreCheckin(day({ sleepHours: 6 }), ctx).overall).toBe(100)
    expect(scoreCheckin(day({ sleepHours: 6 })).overall).toBeLessThan(100)
  })
})

describe('scoreToMode', () => {
  it('경계값이 명세대로다', () => {
    expect(scoreToMode(0)).toBe('RECOVERY')
    expect(scoreToMode(39)).toBe('RECOVERY')
    expect(scoreToMode(40)).toBe('EASY')
    expect(scoreToMode(59)).toBe('EASY')
    expect(scoreToMode(60)).toBe('NORMAL')
    expect(scoreToMode(79)).toBe('NORMAL')
    expect(scoreToMode(80)).toBe('POWER')
    expect(scoreToMode(100)).toBe('POWER')
  })
})
