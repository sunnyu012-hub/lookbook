/**
 * 데이터 접근 계층.
 * Supabase 설정이 있으면 원격, 없으면 localStorage 를 쓴다 — 화면 코드는 어느 쪽인지 몰라도 된다.
 */
import type { Checkin, CheckinInput, CheckinRow } from '@/types'
import { DEFAULT_USER_ID, hasSupabaseConfig } from './env'
import { localStore } from './localStore'
import { inputToRow, rowToCheckin } from './mappers'
import { CHECKINS_TABLE, supabase } from './supabase'

export type StorageMode = 'supabase' | 'local'
export const storageMode: StorageMode = hasSupabaseConfig ? 'supabase' : 'local'

/** 인증을 붙이면 이 함수만 auth 세션 기반으로 바꾸면 된다. */
async function currentUserId(): Promise<string> {
  if (!supabase) return DEFAULT_USER_ID
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? DEFAULT_USER_ID
}

export const checkinRepository = {
  async list(limit = 400): Promise<Checkin[]> {
    if (!supabase) return localStore.list()

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(CHECKINS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    return (data as CheckinRow[]).map(rowToCheckin)
  },

  async getByDate(date: string): Promise<Checkin | null> {
    if (!supabase) return localStore.getByDate(date)

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(CHECKINS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data ? rowToCheckin(data as CheckinRow) : null
  },

  /** 같은 날짜는 덮어쓴다 (user_id + date 유니크) */
  async save(input: CheckinInput): Promise<Checkin> {
    if (!supabase) return localStore.upsert(input)

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(CHECKINS_TABLE)
      .upsert(inputToRow(input, userId), { onConflict: 'user_id,date' })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return rowToCheckin(data as CheckinRow)
  },

  async remove(date: string): Promise<void> {
    if (!supabase) return localStore.remove(date)

    const userId = await currentUserId()
    const { error } = await supabase
      .from(CHECKINS_TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('date', date)

    if (error) throw new Error(error.message)
  },
}
