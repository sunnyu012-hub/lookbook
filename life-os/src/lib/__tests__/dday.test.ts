import { describe, expect, it } from 'vitest'
import { daysBetween, ddayFrom } from '../dday'

describe('daysBetween', () => {
  it('같은 날은 0', () => {
    expect(daysBetween('2026-08-20', '2026-08-20')).toBe(0)
  })

  it('달을 넘어가도 맞다', () => {
    expect(daysBetween('2026-07-31', '2026-08-01')).toBe(1)
    expect(daysBetween('2026-01-01', '2026-12-31')).toBe(364)
  })

  it('윤년 2월을 지나가도 맞다', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2)
  })

  it('거꾸로 세면 음수', () => {
    expect(daysBetween('2026-08-20', '2026-08-18')).toBe(-2)
  })
})

describe('ddayFrom - since', () => {
  it('시작한 날이 1일째, D-DAY', () => {
    const r = ddayFrom('2026-08-20', 'since', '2026-08-20')
    expect(r.count).toBe(1)
    expect(r.days).toBe(0)
    expect(r.label).toBe('D-DAY')
    expect(r.countLabel).toBe('1일째')
  })

  it('다음 날은 D+1 이고 2일째', () => {
    const r = ddayFrom('2026-08-20', 'since', '2026-08-21')
    expect(r.label).toBe('D+1')
    expect(r.count).toBe(2)
  })

  it('100일째는 시작일 + 99일', () => {
    const r = ddayFrom('2026-01-01', 'since', '2026-04-10')
    expect(r.count).toBe(100)
  })

  it('다음 기념일을 알려준다', () => {
    const r = ddayFrom('2026-01-01', 'since', '2026-01-10')
    expect(r.nextMilestone?.count).toBe(100)
    expect(r.nextMilestone?.remaining).toBe(90)
    expect(r.nextMilestone?.date).toBe('2026-04-10')
  })

  it('1주년은 366일째 (시작일을 1일째로 세므로)', () => {
    const r = ddayFrom('2026-01-01', 'since', '2026-12-01')
    const yearly = r.nextMilestone
    expect(yearly).not.toBeNull()
  })
})

describe('ddayFrom - until', () => {
  it('남은 날을 센다', () => {
    const r = ddayFrom('2026-09-01', 'until', '2026-08-20')
    expect(r.label).toBe('D-12')
    expect(r.isFuture).toBe(true)
  })

  it('당일은 D-DAY', () => {
    expect(ddayFrom('2026-08-20', 'until', '2026-08-20').label).toBe('D-DAY')
  })
})
