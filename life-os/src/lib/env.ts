/** 환경변수 접근을 한 곳에 모아 둔다. 값이 없으면 앱은 로컬 저장소 모드로 동작한다. */

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

/** 인증 붙이기 전까지 쓰는 단일 사용자 ID */
export const DEFAULT_USER_ID =
  (import.meta.env.VITE_DEFAULT_USER_ID ?? '').trim() || '00000000-0000-0000-0000-000000000001'

export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
