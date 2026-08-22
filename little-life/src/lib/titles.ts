/**
 * 레벨 구간에 따른 칭호.
 * 나중에 업적 기반으로 바뀔 수 있어서 표 하나로 떼어뒀다.
 */

interface TitleRange {
  minLevel: number
  title: string
}

/** 높은 레벨부터 확인한다. */
const TITLES: TitleRange[] = [
  { minLevel: 21, title: '생활의 달인' },
  { minLevel: 11, title: '작은 영웅' },
  { minLevel: 6, title: '모험가' },
  { minLevel: 3, title: '탐험가' },
  { minLevel: 1, title: '새내기' },
]

export function titleForLevel(level: number): string {
  const found = TITLES.find((t) => level >= t.minLevel)
  return found ? found.title : '새내기'
}
