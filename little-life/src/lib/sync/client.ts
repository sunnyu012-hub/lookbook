import type { SupabaseClient } from '@supabase/supabase-js'
import { AUTH_STORAGE_KEY, SUPABASE_ANON_KEY, SUPABASE_URL, isSyncConfigured } from './config'

/**
 * Supabase 클라이언트.
 *
 * ── 왜 지연 로딩인가 ───────────────────────────────────
 *
 * supabase-js 는 gzip 으로도 40KB 쯤 된다. 백업을 안 쓰는 사람에게까지
 * 첫 화면에서 받게 할 이유가 없다. import() 로 두면 vite 가 따로
 * 잘라내서, 로그인 화면을 열거나 이미 로그인해 있을 때만 받는다.
 *
 * ── 흐름 방식 ──────────────────────────────────────────
 *
 * flowType 을 implicit 으로 둔다. 메일 링크를 눌렀을 때 폰이 어떤
 * 브라우저로 열지 우리가 정할 수 없는데, pkce 는 링크를 보낸 그
 * 브라우저에 남겨둔 값이 있어야 해서 다른 데서 열면 바로 실패한다.
 * implicit 은 주소에 붙어 온 토큰만으로 들어갈 수 있다.
 * (그래도 앱이 아닌 브라우저에서 열리는 문제는 남아서,
 *  로그인 화면에서 6자리 코드 입력도 같이 받는다.)
 */

let pending: Promise<SupabaseClient> | null = null

export function getClient(): Promise<SupabaseClient> | null {
  if (!isSyncConfigured()) return null

  if (!pending) {
    pending = import('@supabase/supabase-js')
      .then(({ createClient }) =>
        createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'implicit',
            storageKey: AUTH_STORAGE_KEY,
          },
        }),
      )
      .catch((error) => {
        // 한 번 실패했다고 영영 못 쓰게 두지 않는다. 다음에 다시 시도한다.
        pending = null
        throw error
      })
  }

  return pending
}

/**
 * 그냥 인터넷이 안 닿는 것인지.
 *
 * 이건 잘못된 게 아니라 지금 못 하는 것뿐이다. 앱은 원래 오프라인에서도
 * 돌아가게 만들어 뒀는데, 지하철에서 열 때마다 빨간 칸이 뜨면
 * 뭔가 고장 난 것처럼 보인다. 조용히 넘기고 다음에 다시 해본다.
 */
export function isOfflineError(error: unknown): boolean {
  const raw = (error instanceof Error ? error.message : String(error ?? '')).toLowerCase()
  return (
    raw.includes('failed to fetch') ||
    raw.includes('networkerror') ||
    raw.includes('network request failed') ||
    raw.includes('load failed') ||
    raw.includes('err_internet_disconnected')
  )
}

/**
 * 오류 메시지를 사람 말로.
 *
 * Supabase 는 영어로 답한다. 그대로 띄우면 뭘 하라는 건지 알기 어렵다.
 * 아는 것만 바꿔주고 모르는 건 그대로 보여준다 — 감추면 물어볼 수도 없다.
 */
export function readableError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '')
  const lower = raw.toLowerCase()

  if (lower.includes('invalid login credentials')) return '이메일이나 비밀번호가 안 맞아.'
  if (lower.includes('email not confirmed')) return '메일로 온 링크를 먼저 눌러줘.'
  if (lower.includes('token has expired') || lower.includes('expired'))
    return '시간이 지나서 코드가 만료됐어. 다시 받아줘.'
  if (lower.includes('invalid token') || lower.includes('otp'))
    return '코드가 안 맞아. 메일에 온 숫자를 다시 확인해줘.'
  if (lower.includes('should be at least') || lower.includes('password'))
    return '비밀번호가 조건에 안 맞아. 여덟 자 이상으로 해줘.'
  if (lower.includes('rate limit') || lower.includes('too many'))
    return '조금 뒤에 다시 해줘. 너무 자주 보냈어.'
  if (lower.includes('failed to fetch') || lower.includes('network'))
    return '인터넷이 안 닿아. 잠시 뒤에 다시 해볼게.'
  if (lower.includes('relation') && lower.includes('does not exist'))
    return '서버에 표가 아직 없어. supabase/schema.sql 을 한 번 실행해줘.'

  return raw || '알 수 없는 문제가 생겼어.'
}
