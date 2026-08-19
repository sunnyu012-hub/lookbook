/** 환경변수 접근을 한 곳에 모아 둔다. 값이 없으면 앱은 로컬 저장소 모드로 동작한다. */

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

/** 로컬 저장소 모드에서만 쓰는 소유자 id (Supabase 를 붙이면 세션의 사용자 id 를 쓴다) */
export const LOCAL_USER_ID = 'local-user'

export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
