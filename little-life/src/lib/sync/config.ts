/**
 * 클라우드 백업 설정.
 *
 * 두 값이 다 있어야 기능이 켜진다. 하나라도 비어 있으면
 * 동기화 화면 자체가 안 나오고 앱은 예전처럼 폰 안에만 저장한다.
 * 오류를 띄우지 않는 게 중요하다 — 안 쓰는 사람에게는
 * 이 기능이 있는지도 보일 필요가 없다.
 */

function envOf(key: string): string {
  const value = (import.meta.env as Record<string, unknown>)[key]
  return typeof value === 'string' ? value.trim() : ''
}

export const SUPABASE_URL = envOf('VITE_SUPABASE_URL')
export const SUPABASE_ANON_KEY = envOf('VITE_SUPABASE_ANON_KEY')

/** 백업 기능을 켤 수 있는 상태인지 */
export function isSyncConfigured(): boolean {
  return SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 20
}

/** 상태를 담아두는 표 (supabase/schema.sql) */
export const SYNC_TABLE = 'little_life_states'

/**
 * 베타 의견함 (supabase/feedback.sql).
 *
 * 백업과 같은 Supabase 프로젝트를 쓴다 — 의견 하나 받자고 서비스를
 * 하나 더 붙이면 관리할 게 둘이 된다. 대신 권한 모양이 정반대라
 * (백업은 자기 것만, 의견은 누구나 쓰고 만든 사람만 읽는다)
 * 표는 따로 둔다.
 */
export const FEEDBACK_TABLE = 'little_life_feedback'

/**
 * 로그인 세션을 담는 localStorage 열쇠.
 *
 * 기본값을 그대로 쓰면 같은 도메인의 다른 앱과 섞인다.
 * 게임 상태를 담는 'little-life-v1' 과도 겹치지 않게 따로 둔다.
 */
export const AUTH_STORAGE_KEY = 'little-life-auth-v1'
