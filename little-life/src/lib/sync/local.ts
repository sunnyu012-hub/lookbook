import { createId } from '@/lib/id'

/**
 * 이 기기만 아는 동기화 기록.
 *
 * ── 왜 게임 상태 안에 안 넣는가 ────────────────────────
 *
 * 여기 있는 값들은 "이 기기가 클라우드와 어디까지 맞춰 놨는지" 다.
 * 게임 상태 안에 넣으면 그 상태를 그대로 클라우드에 올리게 되고,
 * 다른 기기가 받아가면 남의 기기 기록을 자기 것으로 착각한다.
 * 그래서 저장 열쇠부터 따로 둔다. 저장 구조 판올림도 필요 없다.
 */

const KEY = 'little-life-sync-v1'

export interface SyncLocal {
  /** 이 기기를 가리키는 이름. 누가 마지막으로 올렸는지 보여줄 때 쓴다. */
  deviceId: string
  /** 지금 로그인해 있는 사람. 계정이 바뀌면 처음 연결처럼 다룬다. */
  userId: string | null
  /** 이 기기의 지금 상태가 클라우드의 몇 번 판본에서 갈라져 나왔는지. 0 이면 아직 한 번도 안 맞춰봤다. */
  baseRev: number
  /** 그 뒤로 이 기기에서 바뀐 게 있는지 */
  dirty: boolean
  /** 마지막으로 성공한 시각 */
  lastSyncedAt: string | null
  /** 마지막으로 쓴 이메일 — 다음 로그인 화면에 미리 채워둔다 */
  lastEmail: string | null
  /** 이 계정에 비밀번호를 걸어둔 적이 있는지. 로그인 화면 기본 모드를 정한다. */
  hasPassword: boolean
  /**
   * 마지막으로 클라우드와 맞춰둔 내용의 지문.
   *
   * 앱을 껐다 켜도 "정말 바뀐 게 있는지" 를 알아야 해서 저장해 둔다.
   * 이게 없으면 열 때마다 바뀐 것으로 쳐서, 다른 기기가 올려둔 게 있을 때
   * 매번 "어느 쪽을 남길까" 를 묻게 된다.
   */
  syncedHash: string | null
}

/**
 * 열쇠 순서에 흔들리지 않게 정렬해서 문자열로 만든다.
 *
 * 그냥 JSON.stringify 를 쓰면 안 된다. 저장했다가 다시 읽으면
 * 걸러내는 쪽(sanitizeState)이 만드는 열쇠 순서가 메모리에 있던 것과
 * 달라서, 내용이 똑같은데도 다른 글자가 나온다. 그러면 앱을 다시 열
 * 때마다 "뭔가 바뀌었다" 로 읽혀서, 다른 기기가 올려둔 게 있을 때
 * 매번 어느 쪽을 남길지 묻게 된다.
 */
function stable(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`

  const source = value as Record<string, unknown>
  const keys = Object.keys(source).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stable(source[k])}`).join(',')}}`
}

/**
 * 내용이 같은지만 알면 되는 자리라 짧은 지문으로 충분하다.
 * 길이와 djb2 를 함께 붙여 우연히 겹칠 자리를 더 좁힌다.
 */
export function fingerprint(value: unknown): string {
  const json = stable(value)
  let h = 5381
  for (let i = 0; i < json.length; i += 1) {
    h = ((h * 33) ^ json.charCodeAt(i)) >>> 0
  }
  return `${json.length.toString(36)}:${h.toString(36)}`
}

export function emptySyncLocal(): SyncLocal {
  return {
    deviceId: createId(),
    userId: null,
    baseRev: 0,
    dirty: false,
    lastSyncedAt: null,
    lastEmail: null,
    hasPassword: false,
    syncedHash: null,
  }
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/** 저장된 게 깨졌어도 앱이 멈추면 안 된다. 모르는 값은 기본값으로 채운다. */
export function sanitizeSyncLocal(raw: unknown): SyncLocal {
  const base = emptySyncLocal()
  if (!raw || typeof raw !== 'object') return base
  const s = raw as Record<string, unknown>

  return {
    deviceId: str(s.deviceId) ?? base.deviceId,
    userId: str(s.userId),
    baseRev:
      typeof s.baseRev === 'number' && Number.isFinite(s.baseRev)
        ? Math.max(0, Math.floor(s.baseRev))
        : 0,
    dirty: s.dirty === true,
    lastSyncedAt: str(s.lastSyncedAt),
    lastEmail: str(s.lastEmail),
    hasPassword: s.hasPassword === true,
    syncedHash: str(s.syncedHash),
  }
}

export function readSyncLocal(): SyncLocal {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) {
      // 기기 이름은 처음 읽을 때 만들어서 바로 박아둔다.
      const fresh = emptySyncLocal()
      writeSyncLocal(fresh)
      return fresh
    }
    return sanitizeSyncLocal(JSON.parse(raw))
  } catch {
    return emptySyncLocal()
  }
}

export function writeSyncLocal(next: SyncLocal): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // 시크릿 모드 등. 저장을 못 해도 이번 세션 안에서는 그대로 돈다.
  }
}

/** 몇 항목만 고친다. 읽고-고치고-쓰기를 매번 적지 않으려고. */
export function patchSyncLocal(patch: Partial<SyncLocal>): SyncLocal {
  const next = { ...readSyncLocal(), ...patch }
  writeSyncLocal(next)
  return next
}

export { KEY as SYNC_LOCAL_KEY }
