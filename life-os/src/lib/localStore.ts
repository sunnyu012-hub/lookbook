import type { Checkin, CheckinInput } from '@/types'
import { calcEnergyScore, scoreToMode } from './energy'
import { DEFAULT_USER_ID } from './env'

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

  upsert(input: CheckinInput): Checkin {
    const items = readAll()
    const now = new Date().toISOString()
    const energyScore = calcEnergyScore(input)
    const existing = items.find((c) => c.date === input.date)

    const next: Checkin = {
      ...input,
      caffeineTime: input.caffeineConsumed ? input.caffeineTime || null : null,
      exerciseType: input.exercise ? input.exerciseType || null : null,
      memo: input.memo?.trim() || null,
      id: existing?.id ?? newId(),
      userId: existing?.userId ?? DEFAULT_USER_ID,
      energyScore,
      mode: scoreToMode(energyScore),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }

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
