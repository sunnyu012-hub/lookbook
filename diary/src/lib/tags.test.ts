import { describe, expect, it } from 'vitest'
import { normalizeTag, sortedTags, tagCounts, tagPalette } from './tags'
import { emptyEntry, type Entries } from './types'

const entries: Entries = {
  '2026-09-10': { ...emptyEntry('2026-09-10'), tags: ['밥', '산책', '뜨개질'] },
  '2026-09-11': { ...emptyEntry('2026-09-11'), tags: ['산책', '뜨개질'] },
  '2026-09-12': { ...emptyEntry('2026-09-12'), tags: ['산책', '산책'] },
}

describe('태그 세기', () => {
  it('하루에 같은 태그가 둘이어도 하루로 센다', () => {
    expect(tagCounts(entries).get('산책')).toBe(3)
    expect(tagCounts(entries).get('밥')).toBe(1)
  })

  it('많이 쓴 순으로 세운다', () => {
    expect(sortedTags(tagCounts(entries)).map(({ tag }) => tag)).toEqual([
      '산책',
      '뜨개질',
      '밥',
    ])
  })
})

describe('태그 고르는 칸', () => {
  it('두 번 이상 쓴 태그를 앞에 올린다', () => {
    const palette = tagPalette(entries, [])
    expect(palette.slice(0, 2)).toEqual(['산책', '뜨개질'])
  })

  it('직접 만든 태그도 목록에 남는다', () => {
    expect(tagPalette(entries, [])).toContain('뜨개질')
  })

  it('같은 태그가 두 번 나오지 않는다', () => {
    const palette = tagPalette(entries, ['산책', '밥'])
    expect(new Set(palette).size).toBe(palette.length)
  })
})

describe('태그 이름 다듬기', () => {
  it('앞의 # 과 군더더기 공백을 뗀다', () => {
    expect(normalizeTag('  #산책  ')).toBe('산책')
    expect(normalizeTag('아침  산책')).toBe('아침 산책')
  })

  it('빈 이름은 태그가 아니다', () => {
    expect(normalizeTag('   ')).toBe('')
    expect(normalizeTag('#')).toBe('')
  })

  it('너무 긴 이름은 자른다', () => {
    expect(normalizeTag('가'.repeat(30))).toHaveLength(12)
  })
})
