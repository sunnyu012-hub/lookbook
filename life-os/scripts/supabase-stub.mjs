/**
 * Supabase 스텁 서버 (개발 검증용).
 *
 * 실제 Supabase 프로젝트 없이도 앱의 인증·저장 경로가 제대로 붙었는지 확인하려고 만든 것이다.
 * supabase-js 가 실제로 호출하는 엔드포인트만 최소한으로 흉내낸다. 운영에는 쓰지 않는다.
 *
 *   node scripts/supabase-stub.mjs 54321
 */
import { createServer } from 'node:http'

const PORT = Number(process.argv[2] ?? 54321)
const USER = { id: '11111111-2222-3333-4444-555555555555', email: 'me@example.com' }
const rows = []
const quests = []

/** 확장 테이블 — 전부 메모리에만 산다 */
const weightLogs = []
const mounjaroLogs = []
const ddayEvents = []
const lifeEvents = []
const userPreferences = []

const TABLES = {
  weight_logs: weightLogs,
  mounjaro_logs: mounjaroLogs,
  dday_events: ddayEvents,
  life_events: lifeEvents,
  user_preferences: userPreferences,
}

/** 같은 행으로 볼 기준 (upsert 의 onConflict 와 같다) */
const KEYS = {
  weight_logs: ['user_id', 'date'],
  mounjaro_logs: ['user_id', 'date'],
  dday_events: ['id'],
  life_events: ['id'],
  user_preferences: ['user_id'],
}

const json = (res, status, body) => {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-expose-headers': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  })
  res.end(JSON.stringify(body))
}

const session = () => ({
  access_token: 'stub-access-token',
  refresh_token: 'stub-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { ...USER, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
})

const readBody = (req) =>
  new Promise((resolve) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => resolve(raw ? JSON.parse(raw) : {}))
  })

/** ?column=eq.value 형태의 PostgREST 필터를 아주 단순하게 해석한다 */
const matches = (row, params) => {
  for (const [key, value] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(key)) continue
    if (!value.startsWith('eq.')) continue
    if (String(row[key]) !== value.slice(3)) return false
  }
  return true
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const params = [...url.searchParams.entries()]

  if (req.method === 'OPTIONS') return json(res, 200, {})

  // ── auth
  if (url.pathname === '/auth/v1/otp') {
    const body = await readBody(req)
    console.log('[stub] magic link 요청:', body.email)
    return json(res, 200, {})
  }
  if (url.pathname === '/auth/v1/token') return json(res, 200, session())
  if (url.pathname === '/auth/v1/user') return json(res, 200, session().user)
  if (url.pathname === '/auth/v1/logout') return json(res, 204, {})

  // ── rest
  if (url.pathname === '/rest/v1/daily_quests') {
    if (req.method === 'GET') return json(res, 200, quests.filter((r) => matches(r, params)))
    if (req.method === 'POST') {
      const body = await readBody(req)
      const incoming = Array.isArray(body) ? body : [body]
      incoming.forEach((item) => {
        const idx = quests.findIndex((r) => r.user_id === item.user_id && r.date === item.date)
        if (idx >= 0) quests[idx] = { ...quests[idx], ...item }
        else quests.push(item)
      })
      console.log('[stub] quest upsert', incoming.map((r) => `${r.date}:${(r.quest_ids || []).join('|')}`).join(', '))
      return json(res, 201, incoming)
    }
  }

  if (url.pathname === '/rest/v1/daily_checkins') {
    if (req.method === 'GET') {
      return json(res, 200, rows.filter((r) => matches(r, params)))
    }
    if (req.method === 'POST') {
      const body = await readBody(req)
      const incoming = Array.isArray(body) ? body : [body]
      const saved = incoming.map((item) => {
        const idx = rows.findIndex((r) => r.user_id === item.user_id && r.date === item.date)
        const row = {
          id: idx >= 0 ? rows[idx].id : crypto.randomUUID(),
          created_at: idx >= 0 ? rows[idx].created_at : new Date().toISOString(),
          ...item,
        }
        if (idx >= 0) rows[idx] = row
        else rows.push(row)
        return row
      })
      console.log('[stub] upsert', saved.map((r) => `${r.date}=${r.energy_score}`).join(', '))
      return json(res, 201, saved)
    }
    if (req.method === 'DELETE') {
      const before = rows.length
      for (let i = rows.length - 1; i >= 0; i--) if (matches(rows[i], params)) rows.splice(i, 1)
      console.log('[stub] delete', before - rows.length, '건')
      return json(res, 200, [])
    }
  }

  // ── 확장 테이블 (체중 / 투약 / D-Day / 라이프 이벤트 / 설정)
  const table = url.pathname.startsWith('/rest/v1/') ? url.pathname.slice('/rest/v1/'.length) : null
  if (table && TABLES[table]) {
    const store = TABLES[table]
    const key = KEYS[table]

    if (req.method === 'GET') return json(res, 200, store.filter((r) => matches(r, params)))

    if (req.method === 'POST') {
      const body = await readBody(req)
      const incoming = Array.isArray(body) ? body : [body]
      const saved = incoming.map((item) => {
        const idx = store.findIndex((r) => key.every((k) => r[k] === item[k]))
        const row = {
          id: idx >= 0 ? store[idx].id : item.id || crypto.randomUUID(),
          created_at: idx >= 0 ? store[idx].created_at : new Date().toISOString(),
          ...item,
        }
        if (idx >= 0) store[idx] = row
        else store.push(row)
        return row
      })
      console.log(`[stub] ${table} upsert`, saved.length, '건')
      return json(res, 201, saved)
    }

    if (req.method === 'DELETE') {
      const before = store.length
      for (let i = store.length - 1; i >= 0; i--) if (matches(store[i], params)) store.splice(i, 1)
      console.log(`[stub] ${table} delete`, before - store.length, '건')
      return json(res, 200, [])
    }
  }

  json(res, 404, { message: `stub: ${req.method} ${url.pathname} 없음` })
}).listen(PORT, '127.0.0.1', () => console.log(`Supabase 스텁: http://127.0.0.1:${PORT}`))
