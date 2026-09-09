import { STORAGE_KEY } from '@/store/localStorage'
import { SYNC_LOCAL_KEY } from '@/lib/sync/local'
import { BACKUP_KEY } from '@/lib/sync/backup'
import { AUTH_STORAGE_KEY } from '@/lib/sync/config'

/**
 * 처음부터 다시.
 *
 * ── 왜 필요한가 ─────────────────────────────────────────
 *
 * 베타 테스터는 반드시 "처음부터 다시 해보고 싶어요" 라고 한다.
 * 초반 흐름을 다시 보려고, 아니면 이것저것 눌러보다 엉킨 걸 정리하려고.
 * 그 길이 없으면 브라우저 설정에서 사이트 데이터를 지우라고 해야 하는데,
 * 그건 앱이 할 말이 아니다.
 *
 * ── 로그아웃까지 같이 한다 ──────────────────────────────
 *
 * 지우고 로그인 상태로 두면, 다음 순간 클라우드에 있던 게 그대로 내려와서
 * 지운 게 없던 일이 된다. 사람은 "리셋이 안 되네" 라고 느끼고 한 번 더
 * 누른다. 그래서 세션도 같이 지운다.
 *
 * ── 클라우드는 안 건드린다 ──────────────────────────────
 *
 * 서버에 올려둔 줄은 그대로 남는다. 지우는 건 이 기기뿐이다 —
 * 그래서 잘못 눌러도 다시 로그인하면 돌아온다. 되돌릴 수 없는 버튼을
 * 설정 안에 두지 않는다.
 */
export const RESET_KEYS = [
  STORAGE_KEY,
  SYNC_LOCAL_KEY,
  BACKUP_KEY,
  AUTH_STORAGE_KEY,
] as const

/**
 * 이 기기에 남은 것을 지운다.
 *
 * 열쇠를 하나하나 지우고 `localStorage.clear()` 를 쓰지 않는 이유는,
 * 같은 도메인에 다른 앱이 얹힐 수 있어서다. 우리 것만 치운다.
 */
export function clearLocalData(storage: Pick<Storage, 'removeItem'>): void {
  for (const key of RESET_KEYS) {
    try {
      storage.removeItem(key)
    } catch {
      // 사파리 프라이빗 모드처럼 저장이 막힌 데서는 던진다.
      // 어차피 지울 게 없는 상태라 조용히 넘어간다.
    }
  }
}
