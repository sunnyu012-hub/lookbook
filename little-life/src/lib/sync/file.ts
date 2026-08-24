import type { AppState } from '@/types'
import { STATE_VERSION } from '@/store/migrate'
import { sanitizeState } from '@/store/localStorage'
import { summarize, type StateSummary } from './merge'
import { toDayKey } from '@/lib/date'

/**
 * 파일 한 장으로 옮기기.
 *
 * ── 왜 이게 따로 있나 ──────────────────────────────────
 *
 * 클라우드 백업은 계정이 있어야 한다. 계정을 안 만들거나 못 만드는 경우에도
 * 폰을 바꿀 때 기록이 날아가면 안 된다. 그래서 계정도 서버도 없이
 * 파일 한 장으로 통째로 옮기는 길을 따로 뒀다.
 *
 * 클라우드를 같이 쓰더라도 이건 그대로 쓸모가 있다 —
 * 큰일 하기 전에 손으로 남겨두는 사본.
 *
 * ── 파일 모양 ──────────────────────────────────────────
 *
 * 안을 열어봤을 때 이게 뭔지 알 수 있어야 한다. 상태만 덜렁 넣지 않고
 * 언제 어디서 나온 건지, 안에 뭐가 들었는지를 위에 적어둔다.
 * 요약은 읽을 때 쓰지 않는다 — 사람이 눈으로 보라고 넣는 것뿐이다.
 */

/** 파일 자체의 판올림. 게임 상태 판올림(STATE_VERSION)과 다른 것이다. */
export const FILE_FORMAT_VERSION = 1

const APP_TAG = 'little-life'

export interface BackupFile {
  app: string
  kind: 'backup'
  formatVersion: number
  stateVersion: number
  exportedAt: string
  /** 사람이 열어봤을 때 뭔지 알라고 적어두는 것. 읽을 때는 안 쓴다. */
  summary: StateSummary
  state: AppState
}

export function buildExport(state: AppState, now: Date = new Date()): BackupFile {
  return {
    app: APP_TAG,
    kind: 'backup',
    formatVersion: FILE_FORMAT_VERSION,
    stateVersion: state.version ?? STATE_VERSION,
    exportedAt: now.toISOString(),
    summary: summarize(state),
    state,
  }
}

export function exportText(state: AppState, now: Date = new Date()): string {
  // 사람이 열어볼 수도 있으니 줄을 나눠 둔다. 크기 차이는 얼마 안 난다.
  return JSON.stringify(buildExport(state, now), null, 2)
}

/**
 * 내보낼 파일 이름.
 *
 * 한글을 쓰지 않는다. 크롬은 blob 로 만든 파일에 한글 이름을 붙이면
 * download 속성을 통째로 버리고 확장자도 없는 "download" 로 저장해버린다.
 * 그러면 나중에 가져오려고 할 때 목록에서 고를 수조차 없다.
 * 메일로 자기한테 보내거나 다른 운영체제로 옮길 때 깨지지 않는 것도 덤이다.
 */
export function exportFileName(now: Date = new Date()): string {
  return `little-life-backup-${toDayKey(now)}.json`
}

export type ParseResult =
  | { ok: true; state: AppState; summary: StateSummary; exportedAt: string | null }
  | { ok: false; message: string }

/**
 * 골라온 파일을 읽는다.
 *
 * 남의 파일이나 깨진 파일을 그대로 앉히면 앱이 흰 화면이 된다.
 * 저장된 것을 읽을 때와 똑같은 문(sanitizeState)을 지나게 해서,
 * 예전 판본으로 내보낸 파일도 지금 판본으로 끌어올려 받는다.
 *
 * 안 되는 이유는 숨기지 않는다 — 뭐가 문제인지 알아야 다시 해볼 수 있다.
 */
export function parseImport(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, message: '이 파일은 읽을 수 없는 모양이야. 내보낸 파일이 맞을까?' }
  }

  if (!raw || typeof raw !== 'object') {
    return { ok: false, message: '이 파일은 읽을 수 없는 모양이야.' }
  }

  const file = raw as Record<string, unknown>

  // 상태만 통째로 저장한 파일(예전에 직접 꺼내둔 것)도 받아준다
  const body = file.app === APP_TAG || file.kind === 'backup' ? file.state : raw

  if (file.app !== undefined && file.app !== APP_TAG) {
    return { ok: false, message: '다른 앱에서 나온 파일 같아.' }
  }

  const state = sanitizeState(body)
  if (!state) {
    return { ok: false, message: '안에 기록이 없거나 깨져 있어.' }
  }

  return {
    ok: true,
    state,
    summary: summarize(state),
    exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : null,
  }
}
