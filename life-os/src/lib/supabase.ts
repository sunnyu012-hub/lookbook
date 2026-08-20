import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL, hasSupabaseConfig } from './env'

/**
 * 설정이 없으면 null 을 돌려준다 — 호출부(repository)가 로컬 모드로 자동 전환한다.
 * 나중에 인증을 붙이면 auth.getUser() 로 userId 를 대체하면 된다.
 */
export const supabase: SupabaseClient | null = hasSupabaseConfig
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null

export const CHECKINS_TABLE = 'daily_checkins'
