import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchFeedback, sendFeedback } from '@/lib/sync/feedback'
import { isOfflineError, readableError } from '@/lib/sync/client'
import { FEEDBACK_TABLE } from '@/lib/sync/config'
import { createDefaultState } from '@/store/defaultState'

/** insert 로 넘어간 것을 잡아두는 가짜 클라이언트 */
function fakeClient(options: { user?: { id: string } | null; rows?: unknown[] } = {}) {
  const sent: Record<string, unknown>[] = []
  let selected = ''

  const client = {
    auth: {
      getUser: async () => ({ data: { user: options.user ?? null }, error: null }),
    },
    from(table: string) {
      expect(table).toBe(FEEDBACK_TABLE)
      return {
        async insert(payload: Record<string, unknown>) {
          sent.push(payload)
          return { error: null }
        },
        select(columns: string) {
          selected = columns
          return {
            order: () => ({
              limit: async () => ({ data: options.rows ?? [], error: null }),
            }),
          }
        },
      }
    },
  } as unknown as SupabaseClient

  return { client, sent, selectedColumns: () => selected }
}

describe('의견 보내기', () => {
  it('사람이 쓴 것과 앱이 아는 것을 같이 보낸다', async () => {
    const state = createDefaultState()
    state.user.name = '하늘'
    state.user.level = 4

    const { client, sent } = fakeClient({ user: { id: 'u-1' } })
    await sendFeedback(client, { body: '카페에서 튕겨요', state })

    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({
      body: '카페에서 튕겨요',
      nickname: '하늘',
      level: 4,
      user_id: 'u-1',
    })
    // 판 번호가 빠지면 "어느 판에서요?" 를 다시 물어야 한다
    expect(sent[0].build_id).toBeTruthy()
  })

  /**
   * 이 앱은 의견 한 줄 받자고 남의 기록을 통째로 가져오지 않는다.
   * 화면에도 "게임 기록은 안 보내" 라고 적어뒀으니 여기서 지킨다.
   */
  it('게임 기록을 딸려 보내지 않는다', async () => {
    const state = createDefaultState()
    state.user.name = '하늘'

    const { client, sent } = fakeClient()
    await sendFeedback(client, { body: '재밌어요', state })

    expect(Object.keys(sent[0]).sort()).toEqual(
      ['body', 'build_id', 'days', 'level', 'nickname', 'ua', 'user_id'].sort(),
    )

    const wire = JSON.stringify(sent[0])
    for (const key of ['quests', 'inventory', 'collection', 'discovery', 'npcs', 'dailyLog']) {
      expect(wire, key).not.toContain(key)
    }
  })

  it('로그인을 안 했어도 보낸다', async () => {
    const { client, sent } = fakeClient({ user: null })
    await sendFeedback(client, { body: '한 줄', state: createDefaultState() })
    expect(sent[0].user_id).toBeNull()
  })

  /** 이름이 빈 문자열이면 비운다 — 빈 칸을 이름처럼 저장하지 않는다 */
  it('이름이 없으면 비워서 보낸다', async () => {
    const state = createDefaultState()
    const { client, sent } = fakeClient()
    await sendFeedback(client, { body: '한 줄', state })
    expect(sent[0].nickname).toBeNull()
  })
})

describe('받은 의견 읽기', () => {
  it('줄을 화면이 쓰는 모양으로 바꾼다', async () => {
    const { client } = fakeClient({
      rows: [
        {
          id: 'f-1',
          created_at: '2026-09-09T05:11:00Z',
          body: '튕겨요',
          nickname: '하늘',
          build_id: '20260909051100',
          level: 3,
          days: 2,
          ua: 'iPhone',
          user_id: null,
        },
      ],
    })

    const rows = await fetchFeedback(client)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({
      id: 'f-1',
      createdAt: '2026-09-09T05:11:00Z',
      body: '튕겨요',
      nickname: '하늘',
      buildId: '20260909051100',
      level: 3,
      days: 2,
      ua: 'iPhone',
      userId: null,
    })
  })

  /** 예전에 넣은 줄에 칸이 비어 있어도 목록이 안 깨진다 */
  it('빠진 칸이 있어도 안 깨진다', async () => {
    const { client } = fakeClient({ rows: [{ id: 'f-2', created_at: 'x', body: '한 줄' }] })
    const rows = await fetchFeedback(client)
    expect(rows[0].nickname).toBeNull()
    expect(rows[0].level).toBeNull()
  })

  it('읽을 게 없으면 빈 목록이다 — 오류가 아니다', async () => {
    const { client } = fakeClient({ rows: [] })
    await expect(fetchFeedback(client)).resolves.toEqual([])
  })
})

describe('의견함 스키마', () => {
  const sql = readFileSync(resolve(__dirname, '../../../supabase/feedback.sql'), 'utf8')

  it('RLS 를 켠다 — 안 켜면 anon 키로 남의 제보가 다 읽힌다', () => {
    expect(sql).toContain('enable row level security')
  })

  it('로그인 안 한 사람도 보낼 수 있다', () => {
    expect(sql).toMatch(/for insert\s+to anon, authenticated/)
  })

  it('읽기는 로그인한 사람 중에서도 한 명만', () => {
    expect(sql).toMatch(/for select\s+to authenticated/)
    expect(sql).toContain("auth.jwt() ->> 'email'")
  })

  /** 정책이 없으면 RLS 가 전부 막는다. 보낸 걸 남이 고치거나 지울 길이 없다 */
  it('고치기 · 지우기 정책은 아예 만들지 않는다', () => {
    expect(sql).not.toMatch(/for update/)
    expect(sql).not.toMatch(/for delete/)
  })

  /**
   * 이 저장소는 공개다. 자리표를 진짜 이메일로 바꿔서 커밋하면
   * 주소가 그대로 공개된다 — 바꾸는 건 대시보드에서만 한다.
   */
  it('공개 저장소에 진짜 이메일을 두지 않는다', () => {
    expect(sql).toContain('REPLACE_WITH_YOUR_EMAIL')
    const emails = sql.match(/'[^']*@[^']*'/g) ?? []
    expect(emails).toEqual([])
  })

  it('너무 긴 글은 서버가 거절한다', () => {
    expect(sql).toMatch(/char_length\(body\) between 1 and 2000/)
  })
})

describe('오류를 사람 말로', () => {
  /**
   * ⚠️ supabase-js 는 실패를 Error 가 아니라 평범한 객체로 돌려준다.
   * 예전 코드가 그걸 String() 으로 넘겨서 화면에 `[object Object]` 가
   * 떴다. 브라우저 검수에서 실제로 잡힌 것이라 테스트로 못 박아둔다.
   */
  it('평범한 객체로 온 오류도 읽어낸다', () => {
    expect(readableError({ message: 'relation "x" does not exist' })).toContain('schema.sql')
    expect(readableError({ message: '뭔가 이상함' })).toBe('뭔가 이상함')
    expect(readableError({ message: '', details: '자세한 사정' })).toBe('자세한 사정')
    expect(readableError({ message: 'boom' })).not.toContain('[object')
  })

  it('인터넷이 끊긴 것도 객체로 온다', () => {
    expect(isOfflineError({ message: 'TypeError: Failed to fetch' })).toBe(true)
    expect(isOfflineError(new Error('Load failed'))).toBe(true)
    expect(isOfflineError({ message: '비밀번호가 안 맞아' })).toBe(false)
  })

  it('알 수 없는 모양이면 조용히 넘긴다', () => {
    expect(isOfflineError(null)).toBe(false)
    expect(isOfflineError(undefined)).toBe(false)
    expect(readableError(null)).toBe('알 수 없는 문제가 생겼어.')
  })
})
