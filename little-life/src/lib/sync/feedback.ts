import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppState } from '@/types'
import { BUILD_ID } from '@/lib/build'
import { FEEDBACK_TABLE } from './config'
import { summarize } from './merge'

/**
 * 의견 보내기.
 *
 * ── 왜 앱 안에서 보내나 ─────────────────────────────────
 *
 * 링크로 내보내면 앱을 닫고, 브라우저가 뜨고, 폼이 열리고, 그 사이에
 * 무엇이 이상했는지가 흐려진다. 제보는 마찰이 하나만 있어도 사라진다.
 * 여기서는 이상하다고 느낀 그 자리에서 쓰고 그 자리에서 끝난다.
 *
 * ── 되묻지 않으려고 같이 붙이는 것 ──────────────────────
 *
 * "튕겨요" 한 줄을 받으면 어느 판인지 · 어떤 기기인지 · 얼마나 한 사람인지를
 * 물어야 하는데, 물어보면 절반은 답이 안 온다. 그래서 앱이 아는 건 앱이 붙인다.
 * 사람이 채워야 하는 칸은 **하나**로 둔다.
 *
 * 붙이는 것은 전부 그 사람이 이 앱 안에서 만든 것뿐이다 —
 * 스스로 지은 이름, 지금 판 번호, 레벨과 기록한 날, 브라우저 종류.
 * 게임 상태 전체를 딸려 보내지 않는다. 의견 한 줄을 받자고 남의 기록을
 * 통째로 가져오는 건 받는 쪽이 원한 것보다 많다.
 */
export interface FeedbackDraft {
  body: string
  state: AppState
}

export interface FeedbackRow {
  id: string
  createdAt: string
  body: string
  nickname: string | null
  buildId: string | null
  level: number | null
  days: number | null
  ua: string | null
  userId: string | null
}

/** 브라우저 종류. 400자를 넘기면 서버가 거절하므로 여기서 자른다. */
function shortUa(): string | null {
  if (typeof navigator === 'undefined') return null
  return navigator.userAgent.slice(0, 400)
}

/**
 * 로그인한 사람이면 누구인지.
 *
 * 부르는 쪽에서 받아오지 않고 여기서 직접 묻는다 — 화면이 uid 를 들고
 * 다니게 하면 안 쓰는 화면까지 그걸 넘겨받아야 한다. 로그인을 안 했으면
 * null 이고, 그래도 보내는 데는 지장이 없다.
 */
async function currentUserId(client: SupabaseClient): Promise<string | null> {
  try {
    const { data } = await client.auth.getUser()
    return data.user?.id ?? null
  } catch {
    // 세션이 만료됐거나 인터넷이 끊긴 것뿐이다. 익명으로 보낸다.
    return null
  }
}

export async function sendFeedback(
  client: SupabaseClient,
  { body, state }: FeedbackDraft,
): Promise<void> {
  const summary = summarize(state)
  const userId = await currentUserId(client)

  const { error } = await client.from(FEEDBACK_TABLE).insert({
    body,
    // 이름을 아직 안 정한 사람은 여기 못 오지만, 빈 문자열을 넣느니 비운다.
    nickname: state.user.name || null,
    build_id: BUILD_ID,
    level: summary.level,
    days: summary.days,
    ua: shortUa(),
    user_id: userId,
  })

  if (error) throw error
}

/**
 * 쌓인 걸 한 번에 본다 (`?dev=feedback`).
 *
 * 막는 건 이 함수가 아니라 서버의 RLS 다. 만든 사람이 아닌 계정으로 열면
 * 오류가 아니라 **빈 목록**이 온다 — RLS 는 못 읽는 줄을 없는 것처럼
 * 다룬다. 그래서 화면에서 "비었다" 와 "권한이 없다" 를 구분해 말할 수 없고,
 * 구분해 주는 척하지 않는다.
 */
export async function fetchFeedback(
  client: SupabaseClient,
  limit = 200,
): Promise<FeedbackRow[]> {
  const { data, error } = await client
    .from(FEEDBACK_TABLE)
    .select('id, created_at, body, nickname, build_id, level, days, ua, user_id')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data ?? []).map((raw) => {
    const row = raw as Record<string, unknown>
    return {
      id: String(row.id),
      createdAt: String(row.created_at),
      body: typeof row.body === 'string' ? row.body : '',
      nickname: typeof row.nickname === 'string' ? row.nickname : null,
      buildId: typeof row.build_id === 'string' ? row.build_id : null,
      level: typeof row.level === 'number' ? row.level : null,
      days: typeof row.days === 'number' ? row.days : null,
      ua: typeof row.ua === 'string' ? row.ua : null,
      userId: typeof row.user_id === 'string' ? row.user_id : null,
    }
  })
}
