/** 하루치 기록. 날짜 하나에 하나. */
export type DayEntry = {
  /** 'YYYY-MM-DD' — 그 사람이 사는 곳의 날짜다 (UTC 아님) */
  date: string
  /** 오늘 기분 1~5. 안 고를 수도 있다 */
  mood: number | null
  /** 오늘 뭐 했는지 — 한 줄씩 */
  did: string[]
  /** 눌러둔 태그 이름 */
  tags: string[]
  /** 오늘 잘한 거 */
  good: string
  /** 감사한 거 */
  thanks: string
  /** 내일 기대되는 거 */
  expect: string
  /** 내일의 나에게 — 다음 날 열면 위에 떠 있다 */
  toTomorrow: string
  /** 짧은 일기 */
  note: string
  /** 사진 id. 실제 그림은 IndexedDB 에 있다 (lib/photos.ts) */
  photos: string[]
  updatedAt: number
}

/** 날짜 -> 기록 */
export type Entries = Record<string, DayEntry>

/** 쓰는 칸 다섯 개. 화면 순서도 이 순서다. */
export const PROMPTS = ['good', 'thanks', 'expect', 'toTomorrow', 'note'] as const
export type PromptKey = (typeof PROMPTS)[number]

export function emptyEntry(date: string): DayEntry {
  return {
    date,
    mood: null,
    did: [],
    tags: [],
    good: '',
    thanks: '',
    expect: '',
    toTomorrow: '',
    note: '',
    photos: [],
    updatedAt: 0,
  }
}

/** 아무것도 안 적힌 하루인지. 빈 기록은 저장하지 않고 목록에도 안 띄운다. */
export function isBlank(entry: DayEntry): boolean {
  return (
    entry.mood === null &&
    entry.did.length === 0 &&
    entry.tags.length === 0 &&
    entry.photos.length === 0 &&
    PROMPTS.every((key) => entry[key].trim() === '')
  )
}

/** 이 하루에 적힌 글을 한 덩어리로. 검색과 미리보기가 같은 걸 본다. */
export function entryText(entry: DayEntry): string {
  return [...entry.did, ...entry.tags, ...PROMPTS.map((key) => entry[key])]
    .filter(Boolean)
    .join('\n')
}
