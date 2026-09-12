import { describe, expect, it } from 'vitest'
import { diaryStats, echoesForToday, letterForToday } from './messages'
import { emptyEntry, type Entries } from './types'

function day(date: string, over: Partial<ReturnType<typeof emptyEntry>> = {}): Entries {
  return { [date]: { ...emptyEntry(date), ...over } }
}

describe('내일의 나에게 남긴 쪽지', () => {
  it('어제 쓴 쪽지를 오늘 보여준다', () => {
    const entries = day('2026-09-11', { toTomorrow: '아침에 물 한 잔' })
    expect(letterForToday(entries, '2026-09-12')).toEqual({
      date: '2026-09-11',
      text: '아침에 물 한 잔',
    })
  })

  it('하루 건너뛰어도 가장 가까운 쪽지를 찾는다', () => {
    const entries = { ...day('2026-09-09', { toTomorrow: '쉬어도 돼' }) }
    expect(letterForToday(entries, '2026-09-12')?.date).toBe('2026-09-09')
  })

  it('이레보다 오래된 쪽지는 꺼내지 않는다', () => {
    const entries = day('2026-09-01', { toTomorrow: '오래된 말' })
    expect(letterForToday(entries, '2026-09-12')).toBeNull()
  })

  it('공백만 쓴 쪽지는 쪽지가 아니다', () => {
    expect(letterForToday(day('2026-09-11', { toTomorrow: '   ' }), '2026-09-12')).toBeNull()
  })

  it('오늘 쓴 쪽지는 오늘 안 보여준다 — 내일 볼 글이다', () => {
    expect(letterForToday(day('2026-09-12', { toTomorrow: '내일 보자' }), '2026-09-12')).toBeNull()
  })
})

describe('그때의 오늘', () => {
  it('한 달 전·1년 전에 쓴 날이 있으면 알려준다', () => {
    const entries: Entries = {
      ...day('2026-08-12', { note: '한 달 전' }),
      ...day('2025-09-12', { note: '1년 전' }),
    }
    expect(echoesForToday(entries, '2026-09-12')).toEqual([
      { label: '한 달 전 오늘', date: '2026-08-12' },
      { label: '1년 전 오늘', date: '2025-09-12' },
    ])
  })

  it('없는 날은 조용히 넘어간다', () => {
    expect(echoesForToday({}, '2026-09-12')).toEqual([])
  })
})

describe('쌓인 기록', () => {
  it('며칠치인지, 마지막이 언제인지 세기만 한다', () => {
    const entries: Entries = {
      ...day('2026-09-01', { note: 'ㄱ' }),
      ...day('2026-09-10', { note: 'ㄴ' }),
    }
    const stats = diaryStats(entries, '2026-09-12')

    expect(stats.days).toBe(2)
    expect(stats.first).toBe('2026-09-01')
    expect(stats.last).toBe('2026-09-10')
    expect(stats.sinceLast).toBe(2)
  })

  it('아무것도 없으면 0일', () => {
    expect(diaryStats({}, '2026-09-12')).toEqual({
      days: 0,
      first: null,
      last: null,
      sinceLast: null,
    })
  })
})
