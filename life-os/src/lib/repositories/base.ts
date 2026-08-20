/**
 * 저장소 공통 뼈대.
 *
 * Supabase 설정이 있으면 원격, 없으면 localStorage 를 쓴다 — 화면 코드는 어느 쪽인지 몰라도 된다.
 * 원격 쿼리는 항상 user_id 로 걸러서 보낸다. RLS 도 같은 조건으로 서버에서 한 번 더 막는다.
 */
import { supabase } from '../supabase'

export class NotSignedInError extends Error {
  constructor() {
    super('로그인이 필요해요.')
    this.name = 'NotSignedInError'
  }
}

export async function currentUserId(): Promise<string> {
  const { data } = await supabase!.auth.getSession()
  const id = data.session?.user.id
  if (!id) throw new NotSignedInError()
  return id
}

/** 로그인 안 된 상태에서도 조용히 넘어가야 하는 읽기용 */
export async function currentUserIdOrNull(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

export const nowIso = () => new Date().toISOString()

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(16).slice(2)}`

/** localStorage 배열 저장소 (Supabase 가 없을 때의 대역) */
export function localCollection<T>(key: string) {
  return {
    all(): T[] {
      try {
        const raw = localStorage.getItem(key)
        const parsed = raw ? JSON.parse(raw) : []
        return Array.isArray(parsed) ? (parsed as T[]) : []
      } catch {
        return []
      }
    },
    write(items: T[]) {
      localStorage.setItem(key, JSON.stringify(items))
    },
  }
}

/** localStorage 단일 객체 저장소 */
export function localObject<T>(key: string) {
  return {
    read(): T | null {
      try {
        const raw = localStorage.getItem(key)
        return raw ? (JSON.parse(raw) as T) : null
      } catch {
        return null
      }
    },
    write(value: T) {
      localStorage.setItem(key, JSON.stringify(value))
    },
  }
}

export const num = (v: unknown): number | null =>
  v === null || v === undefined || v === '' ? null : Number(v)
