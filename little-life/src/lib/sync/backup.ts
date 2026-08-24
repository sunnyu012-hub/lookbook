import type { AppState } from '@/types'

/**
 * 덮어쓰기 전에 남기는 사본.
 *
 * 클라우드 것을 받아오면 이 기기에 있던 기록은 화면에서 사라진다.
 * 사용자가 잘못 골랐을 수도 있고, 우리가 잘못 판단했을 수도 있다.
 * 그래서 덮어쓰기 직전 상태를 통째로 한 벌 남겨두고,
 * 설정 화면에서 "되돌리기" 로 다시 꺼낼 수 있게 한다.
 *
 * 한 벌만 남긴다. 여러 벌 쌓아두면 용량만 먹고,
 * 정작 필요한 건 "방금 덮이기 직전" 하나뿐이다.
 */

const KEY = 'little-life-backup-v1'

export type BackupReason = 'PULL' | 'CONFLICT_REMOTE'

export interface LocalBackup {
  savedAt: string
  reason: BackupReason
  state: AppState
}

const REASON_LABEL: Record<BackupReason, string> = {
  PULL: '클라우드 것을 받아오기 전',
  CONFLICT_REMOTE: '클라우드 쪽을 고르기 전',
}

export function reasonLabel(reason: BackupReason): string {
  return REASON_LABEL[reason] ?? '덮어쓰기 전'
}

/** 사본을 남긴다. 자리가 없어 실패하면 false — 부르는 쪽이 알려줄 수 있게. */
export function saveBackup(state: AppState, reason: BackupReason, now: Date = new Date()): boolean {
  const backup: LocalBackup = { savedAt: now.toISOString(), reason, state }
  try {
    window.localStorage.setItem(KEY, JSON.stringify(backup))
    return true
  } catch {
    return false
  }
}

export function readBackup(): LocalBackup | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LocalBackup>
    if (!parsed || typeof parsed !== 'object') return null
    if (!parsed.state || typeof parsed.state !== 'object') return null
    return {
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
      reason: (parsed.reason as BackupReason) ?? 'PULL',
      state: parsed.state as AppState,
    }
  } catch {
    return null
  }
}

export function clearBackup(): void {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // 못 지워도 다음 덮어쓰기 때 새 것으로 갈린다
  }
}

export { KEY as BACKUP_KEY }
