import type { AppState, Category, Difficulty, Quest } from '@/types'
import { CATEGORIES, DIFFICULTIES } from '@/types'
import type { StateRepository } from './repository'
import { STATE_VERSION, createDefaultState } from './defaultState'

const STORAGE_KEY = 'little-life:state:v1'

/**
 * 저장된 JSON 은 사용자가 손댈 수도 있고 예전 버전일 수도 있다.
 * 깨진 값 하나 때문에 앱 전체가 흰 화면이 되면 안 되니까
 * 읽을 때 한 번 걸러낸다.
 */
function sanitizeQuest(raw: unknown): Quest | null {
  if (!raw || typeof raw !== 'object') return null
  const q = raw as Record<string, unknown>

  const id = typeof q.id === 'string' ? q.id : null
  const title = typeof q.title === 'string' ? q.title.trim() : ''
  if (!id || !title) return null

  const category = CATEGORIES.includes(q.category as Category) ? (q.category as Category) : 'LIFE'
  const difficulty = DIFFICULTIES.includes(q.difficulty as Difficulty)
    ? (q.difficulty as Difficulty)
    : 'NORMAL'
  const exp = typeof q.exp === 'number' && Number.isFinite(q.exp) ? Math.max(0, q.exp) : 0
  const completed = q.completed === true
  const createdAt = typeof q.createdAt === 'string' ? q.createdAt : new Date().toISOString()
  const completedAt = typeof q.completedAt === 'string' ? q.completedAt : null

  return {
    id,
    title,
    category,
    difficulty,
    exp,
    completed,
    createdAt,
    // 완료 표시는 있는데 시각이 없으면 생성 시각으로 메운다.
    completedAt: completed ? (completedAt ?? createdAt) : null,
  }
}

function sanitizeState(raw: unknown): AppState | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  const base = createDefaultState()

  const user = (s.user ?? {}) as Record<string, unknown>
  const quests = Array.isArray(s.quests)
    ? s.quests.map(sanitizeQuest).filter((q): q is Quest => q !== null)
    : []

  return {
    version: STATE_VERSION,
    user: {
      name: typeof user.name === 'string' && user.name.trim() ? user.name.trim() : base.user.name,
      level: numberOr(user.level, 1, 1),
      currentExp: numberOr(user.currentExp, 0, 0),
      totalExp: numberOr(user.totalExp, 0, 0),
    },
    quests,
  }
}

function numberOr(value: unknown, fallback: number, min: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(min, Math.floor(value))
}

export class LocalStorageRepository implements StateRepository {
  async load(): Promise<AppState | null> {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      return sanitizeState(JSON.parse(raw))
    } catch {
      // 시크릿 모드 등 localStorage 를 못 쓰는 경우에도 앱은 그냥 돌아가야 한다.
      return null
    }
  }

  async save(state: AppState): Promise<void> {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* 저장 실패는 조용히 넘긴다 — 사용자를 혼내지 않는다 */
    }
  }

  async clear(): Promise<void> {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* noop */
    }
  }
}

/** 앱 전체가 쓰는 단일 저장소. Supabase 로 바꿀 때 이 한 줄만 교체한다. */
export const repository: StateRepository = new LocalStorageRepository()
