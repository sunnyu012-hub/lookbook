import { isValidKey } from './date'
import { emptyEntry, isBlank, PROMPTS, type DayEntry, type Entries } from './types'

const KEY = 'oneday.entries.v1'

/**
 * 저장된 걸 읽는다.
 *
 * 무슨 일이 있어도 던지지 않는다 — 저장이 한 군데 깨졌다고 앱이 안 열리면
 * 남은 기록까지 같이 못 보게 된다. 이상한 값은 걸러내고 되는 것만 돌려준다.
 */
export function loadEntries(): Entries {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    return sanitizeEntries(JSON.parse(raw))
  } catch {
    return {}
  }
}

export function saveEntries(entries: Entries): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries))
    return true
  } catch {
    // 저장 공간이 꽉 찼거나 사생활 모드. 화면에 알려주는 건 부르는 쪽 몫이다.
    return false
  }
}

/** 모르는 필드와 깨진 날짜를 걸러낸다. 새 필드는 기본값으로 채운다. */
export function sanitizeEntries(input: unknown): Entries {
  if (!input || typeof input !== 'object') return {}

  const out: Entries = {}
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!isValidKey(key)) continue
    const entry = sanitizeEntry(key, value)
    if (entry) out[key] = entry
  }
  return out
}

function sanitizeEntry(date: string, value: unknown): DayEntry | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>

  const entry: DayEntry = {
    ...emptyEntry(date),
    mood: typeof raw.mood === 'number' && raw.mood >= 1 && raw.mood <= 5 ? raw.mood : null,
    did: strings(raw.did, 40),
    tags: strings(raw.tags, 40),
    photos: strings(raw.photos, 30),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
  }
  for (const prompt of PROMPTS) {
    entry[prompt] = typeof raw[prompt] === 'string' ? (raw[prompt] as string) : ''
  }

  // 빈 하루는 없는 것과 같다. 목록에 빈 카드가 끼는 걸 여기서 막는다.
  return isBlank(entry) ? null : entry
}

function strings(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item !== '').slice(0, limit)
}

/**
 * 하루를 넣거나 지운다. 빈 하루는 지운다 —
 * 다 지웠으면 없던 날이 되는 게 맞다.
 */
export function withEntry(entries: Entries, entry: DayEntry): Entries {
  const next = { ...entries }
  if (isBlank(entry)) delete next[entry.date]
  else next[entry.date] = { ...entry, updatedAt: Date.now() }
  return next
}

export function withoutEntry(entries: Entries, date: string): Entries {
  const next = { ...entries }
  delete next[date]
  return next
}

/** 최신 날짜부터. 목록 화면이 쓰는 순서다. */
export function sortedDates(entries: Entries): string[] {
  return Object.keys(entries).sort((a, b) => b.localeCompare(a))
}

/**
 * 가져온 파일을 지금 기록과 합친다.
 *
 * 같은 날짜가 양쪽에 있으면 나중에 고친 쪽을 남긴다 — 폰과 컴퓨터를
 * 번갈아 쓴 사람의 기록을 한쪽이 통째로 덮어쓰지 않게.
 */
export function mergeEntries(current: Entries, incoming: Entries): Entries {
  const out: Entries = { ...current }
  for (const [date, entry] of Object.entries(incoming)) {
    const mine = out[date]
    if (!mine || entry.updatedAt >= mine.updatedAt) out[date] = entry
  }
  return out
}
