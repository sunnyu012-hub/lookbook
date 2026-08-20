import type { Checkin, CheckinInput } from '@/types'
import { LOCAL_USER_ID } from './env'
import { inputToCheckin } from './mappers'
import type { ScoreContext } from './scoring'

const KEY = 'life-os:checkins:v1'

function readAll(): Checkin[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Checkin[]) : []
  } catch {
    return []
  }
}

function writeAll(items: Checkin[]) {
  localStorage.setItem(KEY, JSON.stringify(items))
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(16).slice(2)}`

export const localStore = {
  list(): Checkin[] {
    return readAll().sort((a, b) => (a.date < b.date ? 1 : -1))
  },

  getByDate(date: string): Checkin | null {
    return readAll().find((c) => c.date === date) ?? null
  },

  upsert(input: CheckinInput, ctx?: ScoreContext): Checkin {
    const items = readAll()
    const existing = items.find((c) => c.date === input.date)
    const next = inputToCheckin(
      input,
      {
        id: existing?.id ?? newId(),
        userId: existing?.userId ?? LOCAL_USER_ID,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      },
      ctx,
    )
    writeAll([...items.filter((c) => c.date !== input.date), next])
    return next
  },

  remove(date: string) {
    writeAll(readAll().filter((c) => c.date !== date))
  },

  replaceAll(items: Checkin[]) {
    writeAll(items)
  },

  clear() {
    localStorage.removeItem(KEY)
  },
}
