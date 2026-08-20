import { describe, expect, it } from 'vitest'
import type { Checkin } from '@/types'
import { MIN_GROUP, discoverPatterns, goodDayTraits } from '../analytics/patterns'
import { DEFAULT_PREFERENCES } from '../repositories/preferences'

const prefs = DEFAULT_PREFERENCES

const c = (date: string, energyScore: number, over: Partial<Checkin> = {}): Checkin => ({
  id: date,
  userId: 'u',
  date,
  energyScore,
  mode: null,
  createdAt: '',
  updatedAt: '',
  ...over,
})

const days = (n: number, from = 1) =>
  Array.from({ length: n }, (_, i) => `2026-08-${String(from + i).padStart(2, '0')}`)

describe('discoverPatterns 표본 게이트', () => {
  it('기록이 없으면 아무 패턴도 만들지 않는다', () => {
    expect(discoverPatterns({ checkins: [], prefs })).toEqual([])
  })

  it('한쪽 그룹이 최소 표본보다 적으면 만들지 않는다', () => {
    const checkins = [
      ...days(3).map((d) => c(d, 90, { exercise: true })),
      ...days(10, 10).map((d) => c(d, 40, { exercise: false })),
    ]
    const found = discoverPatterns({ checkins, prefs })
    expect(found.find((p) => p.id === 'exercise')).toBeUndefined()
  })

  it('양쪽 표본이 충분하고 차이가 크면 패턴이 나온다', () => {
    const checkins = [
      ...days(MIN_GROUP).map((d) => c(d, 90, { exercise: true })),
      ...days(MIN_GROUP, 10).map((d) => c(d, 40, { exercise: false })),
    ]
    const found = discoverPatterns({ checkins, prefs })
    const ex = found.find((p) => p.id === 'exercise')
    expect(ex).toBeDefined()
    expect(ex!.sample).toBe(`${MIN_GROUP}일 vs ${MIN_GROUP}일`)
  })

  it('차이가 작으면 노이즈로 보고 만들지 않는다', () => {
    const checkins = [
      ...days(6).map((d) => c(d, 62, { exercise: true })),
      ...days(6, 10).map((d) => c(d, 60, { exercise: false })),
    ]
    expect(discoverPatterns({ checkins, prefs }).find((p) => p.id === 'exercise')).toBeUndefined()
  })

  it('값이 비어 있는 날은 비교에서 빠진다', () => {
    const checkins = [
      ...days(MIN_GROUP).map((d) => c(d, 90, { exercise: true })),
      // exercise 를 안 적은 날들 — 어느 쪽에도 넣지 않는다
      ...days(10, 10).map((d) => c(d, 40)),
    ]
    expect(discoverPatterns({ checkins, prefs }).find((p) => p.id === 'exercise')).toBeUndefined()
  })

  it('문장이 인과가 아니라 관찰로 쓰여 있다', () => {
    const checkins = [
      ...days(MIN_GROUP).map((d) => c(d, 90, { exercise: true })),
      ...days(MIN_GROUP, 10).map((d) => c(d, 40, { exercise: false })),
    ]
    const body = discoverPatterns({ checkins, prefs }).find((p) => p.id === 'exercise')!.body
    expect(body).toContain('날은')
    expect(body).not.toMatch(/때문|하세요|해야/)
  })
})

describe('goodDayTraits', () => {
  it('기록이 적으면 아무것도 내지 않는다', () => {
    const r = goodDayTraits(days(5).map((d) => c(d, 70)), prefs)
    expect(r.traits).toEqual([])
    expect(r.threshold).toBeNull()
  })

  it('좋았던 날에 더 자주 있던 특징을 찾는다', () => {
    const checkins = [
      ...days(8).map((d) => c(d, 90, { exercise: true, sleepHours: 8 })),
      ...days(12, 10).map((d) => c(d, 40, { exercise: false, sleepHours: 5 })),
    ]
    const r = goodDayTraits(checkins, prefs)
    expect(r.traits.length).toBeGreaterThan(0)
    expect(r.traits[0].goodRate).toBeGreaterThan(r.traits[0].otherRate)
  })
})
