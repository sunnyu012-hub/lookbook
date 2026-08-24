import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppState } from '@/types'
import { sanitizeState } from '@/store/localStorage'
import { SYNC_TABLE } from './config'

/**
 * 클라우드에 있는 줄 하나를 읽고 쓰는 자리.
 *
 * 여기서는 판단하지 않는다. "있는지 · 몇 번 판본인지 · 올렸는지" 만 돌려주고
 * 어느 쪽을 남길지는 merge.ts 와 사용자가 정한다.
 */

export interface RemoteRow {
  rev: number
  /** 저장된 게 깨졌으면 null. 그때는 클라우드가 없는 것처럼 다룬다. */
  state: AppState | null
  updatedAt: string
  deviceId: string | null
}

export type PushResult =
  | { ok: true; rev: number }
  /** 그 사이 다른 기기가 올렸다. 덮어쓰지 않고 물어봐야 한다. */
  | { ok: false; reason: 'CONFLICT' }
  | { ok: false; reason: 'ERROR'; error: unknown }

export async function fetchRemote(
  client: SupabaseClient,
  userId: string,
): Promise<RemoteRow | null> {
  const { data, error } = await client
    .from(SYNC_TABLE)
    .select('rev, state, updated_at, device_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as Record<string, unknown>
  return {
    rev: typeof row.rev === 'number' ? row.rev : 0,
    // 클라우드 것도 로컬 저장과 똑같이 한 번 거른다.
    // 다른 기기가 예전 판본으로 올려뒀을 수 있다.
    state: sanitizeState(row.state),
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString(),
    deviceId: typeof row.device_id === 'string' ? row.device_id : null,
  }
}

/**
 * 올린다 — 단, 내가 알던 판본이 아직 그대로일 때만.
 *
 * rev 조건이 이 함수의 전부다. 조건 없이 올리면 그 사이 다른 기기가
 * 올려둔 걸 소리 없이 덮는다. 0줄이 고쳐졌다는 건 그 사이 누가 올렸다는 뜻이고,
 * 그때는 실패로 돌려서 사용자에게 물어본다.
 */
export async function pushRemote(
  client: SupabaseClient,
  userId: string,
  state: AppState,
  baseRev: number,
  deviceId: string,
): Promise<PushResult> {
  try {
    if (baseRev === 0) {
      const { data, error } = await client
        .from(SYNC_TABLE)
        .insert({ user_id: userId, rev: 1, state, device_id: deviceId })
        .select('rev')

      if (error) {
        // 이미 줄이 있다 (unique_violation). 처음인 줄 알았는데 아니었던 것.
        if ((error as { code?: string }).code === '23505') return { ok: false, reason: 'CONFLICT' }
        return { ok: false, reason: 'ERROR', error }
      }
      return { ok: true, rev: readRev(data, 1) }
    }

    const next = baseRev + 1
    const { data, error } = await client
      .from(SYNC_TABLE)
      .update({ rev: next, state, device_id: deviceId })
      .eq('user_id', userId)
      .eq('rev', baseRev)
      .select('rev')

    if (error) return { ok: false, reason: 'ERROR', error }
    if (!Array.isArray(data) || data.length === 0) return { ok: false, reason: 'CONFLICT' }
    return { ok: true, rev: readRev(data, next) }
  } catch (error) {
    return { ok: false, reason: 'ERROR', error }
  }
}

/**
 * 조건 없이 올린다.
 *
 * 사용자가 충돌 화면에서 "이 기기 것을 남길게" 를 직접 고른 뒤에만 부른다.
 * 그 전까지는 절대 쓰지 않는다.
 */
export async function forcePush(
  client: SupabaseClient,
  userId: string,
  state: AppState,
  remoteRev: number,
  deviceId: string,
): Promise<PushResult> {
  try {
    const next = Math.max(1, remoteRev + 1)
    const { data, error } = await client
      .from(SYNC_TABLE)
      .upsert(
        { user_id: userId, rev: next, state, device_id: deviceId },
        { onConflict: 'user_id' },
      )
      .select('rev')

    if (error) return { ok: false, reason: 'ERROR', error }
    return { ok: true, rev: readRev(data, next) }
  } catch (error) {
    return { ok: false, reason: 'ERROR', error }
  }
}

function readRev(data: unknown, fallback: number): number {
  if (!Array.isArray(data) || data.length === 0) return fallback
  const rev = (data[0] as Record<string, unknown>).rev
  return typeof rev === 'number' ? rev : fallback
}
