import { describe, expect, it } from 'vitest'
import type { AppState } from '@/types'
import { createDefaultState } from '@/store/defaultState'
import { STATE_VERSION } from '@/store/migrate'
import { buildExport, exportFileName, exportText, parseImport } from '@/lib/sync/file'

/**
 * 여기서 지키려는 것: 넣은 게 그대로 나오고, 이상한 걸 넣으면 이유를 말해준다.
 * 조용히 빈 기록으로 시작해버리는 경우가 하나도 없어야 한다.
 */

function played(): AppState {
  const start = createDefaultState()
  return {
    ...start,
    user: { ...start.user, level: 7, totalExp: 1240, totalCompletedQuests: 63, coins: 380 },
    dailyLog: {
      '2026-08-20': { completed: 3, exp: 45, byCategory: { LIFE: 45 } },
      '2026-08-22': { completed: 2, exp: 30, byCategory: { WORK: 30 } },
    },
    collection: { ...start.collection, owned: { picnic_mat: 2 }, discovered: { picnic_mat: '2026-08-20T00:00:00.000Z' } },
  }
}

describe('내보내기', () => {
  it('안을 열어봤을 때 뭔지 알 수 있게 적어둔다', () => {
    const file = buildExport(played(), new Date('2026-08-24T10:00:00.000Z'))
    expect(file.app).toBe('little-life')
    expect(file.kind).toBe('backup')
    expect(file.stateVersion).toBe(STATE_VERSION)
    expect(file.exportedAt).toBe('2026-08-24T10:00:00.000Z')
    expect(file.summary.completed).toBe(63)
    expect(file.summary.level).toBe(7)
  })

  it('파일 이름에 날짜가 들어간다', () => {
    expect(exportFileName(new Date('2026-08-24T10:00:00.000Z'))).toBe(
      'little-life-backup-2026-08-24.json',
    )
  })

  // 한글 이름을 붙이면 크롬이 download 속성을 버리고 확장자 없는
  // "download" 로 저장해버린다. 그러면 가져올 때 고를 수가 없다.
  it('이름에 한글이 들어가지 않는다', () => {
    expect(/^[\x20-\x7e]+$/.test(exportFileName())).toBe(true)
  })
})

describe('내보냈다 가져오기', () => {
  it('넣은 게 그대로 나온다', () => {
    const before = played()
    const result = parseImport(exportText(before))

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.state.user.level).toBe(7)
    expect(result.state.user.totalCompletedQuests).toBe(63)
    expect(result.state.user.coins).toBe(380)
    expect(result.state.collection.owned.picnic_mat).toBe(2)
    expect(Object.keys(result.state.dailyLog).sort()).toEqual(['2026-08-20', '2026-08-22'])
    expect(result.summary.days).toBe(2)
  })

  it('언제 내보낸 건지도 같이 나온다', () => {
    const result = parseImport(exportText(played(), new Date('2026-08-24T10:00:00.000Z')))
    expect(result.ok && result.exportedAt).toBe('2026-08-24T10:00:00.000Z')
  })

  it('예전에 상태만 통째로 꺼내둔 파일도 받아준다', () => {
    const result = parseImport(JSON.stringify(played()))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.state.user.level).toBe(7)
  })

  it('예전 판본으로 내보낸 파일도 지금 판본으로 끌어올린다', () => {
    const old = JSON.parse(exportText(played())) as Record<string, unknown>
    const state = old.state as Record<string, unknown>
    delete state.discovery
    delete state.collection
    state.version = 5

    const result = parseImport(JSON.stringify(old))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.version).toBe(STATE_VERSION)
    expect(result.state.discovery.companions).toEqual({})
    expect(result.state.user.level).toBe(7)
  })
})

describe('이상한 파일', () => {
  it('글자가 깨져 있으면 이유를 말해준다', () => {
    const result = parseImport('{ 이건 json 이 아니야')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('읽을 수 없는')
  })

  it('다른 앱에서 나온 파일은 거른다', () => {
    const result = parseImport(JSON.stringify({ app: 'something-else', state: {} }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('다른 앱')
  })

  it('안이 비어 있으면 거른다 — 조용히 백지로 시작하면 안 된다', () => {
    expect(parseImport('null').ok).toBe(false)
    expect(parseImport('123').ok).toBe(false)
    expect(parseImport(JSON.stringify({ app: 'little-life', kind: 'backup' })).ok).toBe(false)
  })

  it('내용이 깨져 있어도 앱이 멈추지 않게 걸러서 채운다', () => {
    const result = parseImport(
      JSON.stringify({
        app: 'little-life',
        kind: 'backup',
        state: { user: { name: '유리', level: 'ㅋㅋ' }, quests: 'nope' },
      }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.user.name).toBe('유리')
    expect(result.state.user.level).toBe(1)
    expect(result.state.quests).toEqual([])
  })
})
