import { describe, expect, it } from 'vitest'
import {
  dateKey,
  daysBetween,
  formatDay,
  isValidKey,
  monthGrid,
  relativeDay,
  shiftKey,
  shiftMonth,
} from './date'

describe('날짜 열쇠', () => {
  it('그 지역 날짜로 적는다 — UTC 로 밀리지 않는다', () => {
    // 밤 11시. UTC 로 바꾸면 다음 날이 되는 시간대가 있다.
    expect(dateKey(new Date(2026, 8, 12, 23, 30))).toBe('2026-09-12')
    expect(dateKey(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01')
  })

  it('없는 날짜를 걸러낸다', () => {
    expect(isValidKey('2026-09-12')).toBe(true)
    expect(isValidKey('2026-02-30')).toBe(false)
    expect(isValidKey('2026-13-01')).toBe(false)
    expect(isValidKey('20260912')).toBe(false)
    expect(isValidKey(20260912)).toBe(false)
  })

  it('달과 해를 넘어서 옮긴다', () => {
    expect(shiftKey('2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftKey('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-09', -12)).toBe('2025-09')
  })

  it('며칠 차이인지 센다', () => {
    expect(daysBetween('2026-09-10', '2026-09-12')).toBe(2)
    expect(daysBetween('2026-09-12', '2026-09-12')).toBe(0)
    expect(daysBetween('2026-09-13', '2026-09-12')).toBe(-1)
  })

  it('가까운 날은 말로 부른다', () => {
    expect(relativeDay('2026-09-12', '2026-09-12')).toBe('오늘')
    expect(relativeDay('2026-09-11', '2026-09-12')).toBe('어제')
    expect(relativeDay('2026-09-10', '2026-09-12')).toBe('그제')
    expect(relativeDay('2026-09-08', '2026-09-12')).toBe('4일 전')
    expect(relativeDay('2026-08-30', '2026-09-12')).toBe('8월 30일 일요일')
  })

  it('요일을 붙여 읽는다', () => {
    expect(formatDay('2026-09-12')).toBe('9월 12일 토요일')
  })
})

describe('달력 한 판', () => {
  it('42칸을 만들고 그 달이 아닌 칸은 빈자리로 둔다', () => {
    const grid = monthGrid('2026-09')
    expect(grid).toHaveLength(42)
    // 2026년 9월 1일은 화요일 — 앞에 일·월 두 칸이 빈다
    expect(grid.slice(0, 2)).toEqual([null, null])
    expect(grid[2]).toBe('2026-09-01')
    expect(grid.filter(Boolean)).toHaveLength(30)
  })

  it('1일이 일요일인 달은 앞이 안 빈다', () => {
    expect(monthGrid('2026-02')[0]).toBe('2026-02-01')
  })
})
