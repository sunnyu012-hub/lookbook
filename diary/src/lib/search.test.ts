import { describe, expect, it } from 'vitest'
import { photoStream, searchEntries } from './search'
import { emptyEntry, type Entries } from './types'

const entries: Entries = {
  '2026-09-10': {
    ...emptyEntry('2026-09-10'),
    did: ['국수 먹었다'],
    tags: ['밥', '친구'],
    photos: ['p1'],
  },
  '2026-09-11': {
    ...emptyEntry('2026-09-11'),
    note: '엄마랑 산책했다',
    tags: ['가족'],
    photos: ['p2', 'p3'],
  },
  '2026-09-12': {
    ...emptyEntry('2026-09-12'),
    good: '국수를 직접 만들었다',
    tags: ['요리'],
  },
}

describe('찾기', () => {
  it('어느 칸에 적었든 찾는다', () => {
    expect(searchEntries(entries, '산책', null).map((e) => e.date)).toEqual(['2026-09-11'])
    expect(searchEntries(entries, '국수', null).map((e) => e.date)).toEqual([
      '2026-09-12',
      '2026-09-10',
    ])
  })

  it('태그 이름으로도 찾는다', () => {
    expect(searchEntries(entries, '가족', null).map((e) => e.date)).toEqual(['2026-09-11'])
  })

  it('낱말을 여러 개 넣으면 다 있는 날만 남는다', () => {
    expect(searchEntries(entries, '국수 요리', null).map((e) => e.date)).toEqual(['2026-09-12'])
  })

  it('태그로 걸러낸다', () => {
    expect(searchEntries(entries, '', '밥').map((e) => e.date)).toEqual(['2026-09-10'])
  })

  it('아무것도 안 넣으면 최신 날짜부터 전부', () => {
    expect(searchEntries(entries, '  ', null).map((e) => e.date)).toEqual([
      '2026-09-12',
      '2026-09-11',
      '2026-09-10',
    ])
  })
})

describe('사진첩', () => {
  it('최신 날짜부터 한 줄로 세운다', () => {
    expect(photoStream(entries)).toEqual([
      { id: 'p2', date: '2026-09-11' },
      { id: 'p3', date: '2026-09-11' },
      { id: 'p1', date: '2026-09-10' },
    ])
  })
})
