import { entryText, type DayEntry, type Entries } from './types'

/**
 * 찾기. 글과 태그를 한 덩어리로 보고, 띄어쓴 낱말을 모두 담은 하루만 남긴다.
 * (두 낱말을 넣었을 때 "둘 다 있는 날" 을 기대하기 때문이다)
 */
export function searchEntries(entries: Entries, query: string, tag: string | null): DayEntry[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)

  return Object.values(entries)
    .filter((entry) => (tag ? entry.tags.includes(tag) : true))
    .filter((entry) => {
      if (words.length === 0) return true
      const haystack = entryText(entry).toLowerCase()
      return words.every((word) => haystack.includes(word))
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** 사진을 최신 날짜부터 한 줄로. 사진첩 화면과 크게 보기가 같은 순서를 쓴다. */
export function photoStream(entries: Entries): { id: string; date: string }[] {
  return Object.values(entries)
    .sort((a, b) => b.date.localeCompare(a.date))
    .flatMap((entry) => entry.photos.map((id) => ({ id, date: entry.date })))
}
