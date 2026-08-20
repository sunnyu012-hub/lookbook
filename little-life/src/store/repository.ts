import type { AppState } from '@/types'

/**
 * 저장소 인터페이스.
 *
 * 화면과 훅은 이 인터페이스만 보고, 실제 구현이 localStorage 인지
 * Supabase 인지 모른다. 나중에 로그인을 붙일 때
 * SupabaseRepository 를 하나 더 만들어 갈아끼우면 된다.
 *
 * 비동기로 선언해 둔 이유도 같다 — localStorage 는 동기지만
 * 네트워크 저장소로 바뀌어도 호출부를 안 고치려고.
 */
export interface StateRepository {
  load(): Promise<AppState | null>
  save(state: AppState): Promise<void>
  clear(): Promise<void>
}
