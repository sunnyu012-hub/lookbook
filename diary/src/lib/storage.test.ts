import { describe, expect, it } from 'vitest'
import { mergeEntries, sanitizeEntries, sortedDates, withEntry, withoutEntry } from './storage'
import { emptyEntry, type Entries } from './types'

function entry(date: string, over: Partial<ReturnType<typeof emptyEntry>> = {}) {
  return { ...emptyEntry(date), ...over }
}

describe('저장된 걸 읽을 때', () => {
  it('깨진 값이 섞여 있어도 되는 것만 돌려준다', () => {
    const result = sanitizeEntries({
      '2026-09-12': { note: '국수 먹었다', tags: ['밥'], mood: 4 },
      '2026-02-30': { note: '없는 날' },
      'not-a-date': { note: '엉뚱한 열쇠' },
      '2026-09-11': '문자열',
    })

    expect(Object.keys(result)).toEqual(['2026-09-12'])
    expect(result['2026-09-12'].note).toBe('국수 먹었다')
    expect(result['2026-09-12'].mood).toBe(4)
  })

  it('없는 필드는 기본값으로 채우고 모르는 필드는 버린다', () => {
    const result = sanitizeEntries({ '2026-09-12': { good: '일찍 일어났다', 옛필드: 1 } })
    const day = result['2026-09-12']

    expect(day.did).toEqual([])
    expect(day.photos).toEqual([])
    expect(day.mood).toBeNull()
    expect(day.thanks).toBe('')
    expect('옛필드' in day).toBe(false)
  })

  it('범위를 벗어난 기분은 안 고른 것으로 둔다', () => {
    expect(sanitizeEntries({ '2026-09-12': { mood: 9, note: 'ㅇ' } })['2026-09-12'].mood).toBeNull()
  })

  it('빈 하루는 아예 안 읽는다', () => {
    expect(sanitizeEntries({ '2026-09-12': { note: '   ', tags: [] } })).toEqual({})
  })
})

describe('하루를 넣고 뺄 때', () => {
  it('넣으면 고친 시각이 찍힌다', () => {
    const next = withEntry({}, entry('2026-09-12', { note: '한 줄' }))
    expect(next['2026-09-12'].updatedAt).toBeGreaterThan(0)
  })

  it('다 지운 하루는 없던 날로 돌아간다', () => {
    const filled = withEntry({}, entry('2026-09-12', { note: '한 줄' }))
    const cleared = withEntry(filled, { ...filled['2026-09-12'], note: '' })
    expect(cleared['2026-09-12']).toBeUndefined()
  })

  it('지우면 그 날짜만 빠진다', () => {
    const two: Entries = {
      '2026-09-11': entry('2026-09-11', { note: 'ㄱ', updatedAt: 1 }),
      '2026-09-12': entry('2026-09-12', { note: 'ㄴ', updatedAt: 1 }),
    }
    expect(Object.keys(withoutEntry(two, '2026-09-11'))).toEqual(['2026-09-12'])
  })

  it('목록은 최신 날짜부터', () => {
    const three: Entries = {
      '2026-09-01': entry('2026-09-01', { note: 'ㄱ' }),
      '2026-10-02': entry('2026-10-02', { note: 'ㄴ' }),
      '2026-09-30': entry('2026-09-30', { note: 'ㄷ' }),
    }
    expect(sortedDates(three)).toEqual(['2026-10-02', '2026-09-30', '2026-09-01'])
  })
})

describe('가져온 파일을 합칠 때', () => {
  it('같은 날짜는 나중에 고친 쪽을 남긴다', () => {
    const current: Entries = { '2026-09-12': entry('2026-09-12', { note: '폰', updatedAt: 200 }) }
    const incoming: Entries = {
      '2026-09-12': entry('2026-09-12', { note: '컴퓨터', updatedAt: 100 }),
      '2026-09-11': entry('2026-09-11', { note: '없던 날', updatedAt: 100 }),
    }

    const merged = mergeEntries(current, incoming)
    expect(merged['2026-09-12'].note).toBe('폰')
    expect(merged['2026-09-11'].note).toBe('없던 날')
  })

  it('쓴 게 통째로 사라지지 않는다', () => {
    const current: Entries = { '2026-09-12': entry('2026-09-12', { note: '오늘', updatedAt: 5 }) }
    expect(Object.keys(mergeEntries(current, {}))).toEqual(['2026-09-12'])
  })
})
