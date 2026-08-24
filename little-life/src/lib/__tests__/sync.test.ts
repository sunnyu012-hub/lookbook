import { beforeEach, describe, expect, it } from 'vitest'
import type { AppState } from '@/types'
import { createDefaultState } from '@/store/defaultState'
import { grantWelcomeGift, WELCOME_GIFT } from '@/store/migrate'
import { decide, isPristine, richer, summarize } from '@/lib/sync/merge'
import { sinceLabel } from '@/lib/sync/format'
import { isSyncConfigured } from '@/lib/sync/config'
import { clearBackup, readBackup, reasonLabel, saveBackup } from '@/lib/sync/backup'
import { patchSyncLocal, readSyncLocal, sanitizeSyncLocal } from '@/lib/sync/local'

/**
 * 여기서 지키려는 것 하나: 애매하면 물어본다.
 *
 * 자동으로 덮어쓰는 경우는 두 가지뿐이어야 한다 —
 * 덮이는 쪽이 덮는 쪽의 예전 모습이거나, 아직 아무것도 안 한 기기이거나.
 * 그 밖에는 전부 ASK 여야 한다. 아래 테스트 대부분이 그걸 붙잡고 있다.
 */

/** node 환경에는 localStorage 가 없다. 필요한 만큼만 흉내 낸다. */
function fakeStorage(failOnSet = false) {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (failOnSet) throw new Error('QuotaExceededError')
      map.set(k, v)
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
  }
}

function installStorage(failOnSet = false) {
  ;(globalThis as { window?: unknown }).window = { localStorage: fakeStorage(failOnSet) }
}

const base = { baseRev: 5, dirty: false, userId: 'u1' }

describe('decide — 어느 쪽으로 갈지', () => {
  it('클라우드가 비어 있으면 올린다', () => {
    expect(
      decide({ hasRemote: false, remoteRev: 0, local: base, userId: 'u1', localPristine: false }),
    ).toEqual({ kind: 'PUSH' })
  })

  it('판본이 같고 이 기기만 바뀌었으면 올린다', () => {
    expect(
      decide({
        hasRemote: true,
        remoteRev: 5,
        local: { ...base, dirty: true },
        userId: 'u1',
        localPristine: false,
      }),
    ).toEqual({ kind: 'PUSH' })
  })

  it('판본이 같고 바뀐 게 없으면 할 일이 없다', () => {
    expect(
      decide({ hasRemote: true, remoteRev: 5, local: base, userId: 'u1', localPristine: false }),
    ).toEqual({ kind: 'IN_SYNC' })
  })

  it('클라우드만 앞섰고 이 기기는 그대로면 받아온다', () => {
    expect(
      decide({ hasRemote: true, remoteRev: 7, local: base, userId: 'u1', localPristine: false }),
    ).toEqual({ kind: 'PULL' })
  })

  it('양쪽 다 바뀌었으면 묻는다 — 여기서 자동으로 고르면 안 된다', () => {
    expect(
      decide({
        hasRemote: true,
        remoteRev: 7,
        local: { ...base, dirty: true },
        userId: 'u1',
        localPristine: false,
      }),
    ).toEqual({ kind: 'ASK', reason: 'DIVERGED' })
  })

  it('클라우드 판본이 오히려 뒤로 갔으면 묻는다', () => {
    expect(
      decide({ hasRemote: true, remoteRev: 3, local: base, userId: 'u1', localPristine: false }),
    ).toEqual({ kind: 'ASK', reason: 'DIVERGED' })
  })

  it('이 기기에서 처음 연결했는데 양쪽 다 기록이 있으면 묻는다', () => {
    expect(
      decide({
        hasRemote: true,
        remoteRev: 4,
        local: { baseRev: 0, dirty: true, userId: null },
        userId: 'u1',
        localPristine: false,
      }),
    ).toEqual({ kind: 'ASK', reason: 'FIRST_LINK' })
  })

  it('갓 깐 기기면 묻지 않고 받아온다 — 잃을 게 없으니까', () => {
    expect(
      decide({
        hasRemote: true,
        remoteRev: 4,
        local: { baseRev: 0, dirty: true, userId: null },
        userId: 'u1',
        localPristine: true,
      }),
    ).toEqual({ kind: 'PULL' })
  })

  it('계정이 바뀌면 판본 번호를 믿지 않는다', () => {
    expect(
      decide({
        hasRemote: true,
        remoteRev: 5,
        local: { baseRev: 5, dirty: false, userId: 'u1' },
        userId: 'u2',
        localPristine: false,
      }),
    ).toEqual({ kind: 'ASK', reason: 'FIRST_LINK' })
  })
})

describe('isPristine — 손댄 적 있는 기록인지', () => {
  it('첫 실행 상태는 백지로 본다', () => {
    expect(isPristine(createDefaultState())).toBe(true)
  })

  it('처음 켤 때 주는 선물은 흔적으로 치지 않는다', () => {
    const gifted = grantWelcomeGift(createDefaultState()).state
    expect(gifted.user.coins).toBe(WELCOME_GIFT.coins)
    expect(gifted.inventory.length).toBe(1)
    expect(isPristine(gifted)).toBe(true)
  })

  it('퀘스트를 하나라도 끝냈으면 백지가 아니다', () => {
    const state: AppState = {
      ...createDefaultState(),
      user: { ...createDefaultState().user, totalCompletedQuests: 1 },
    }
    expect(isPristine(state)).toBe(false)
  })

  it('도감에 뭐가 하나라도 들어 있으면 백지가 아니다', () => {
    const start = createDefaultState()
    const state: AppState = {
      ...start,
      collection: { ...start.collection, owned: { favorite_mug: 1 } },
    }
    expect(isPristine(state)).toBe(false)
  })

  it('기록이 남은 날이 있으면 백지가 아니다', () => {
    const start = createDefaultState()
    const state: AppState = {
      ...start,
      dailyLog: { '2026-08-01': { completed: 2, exp: 30, byCategory: {} } },
    }
    expect(isPristine(state)).toBe(false)
  })
})

describe('summarize — 고를 수 있게 보여주는 숫자', () => {
  it('레벨과 끝낸 개수, 기록한 날을 센다', () => {
    const start = createDefaultState()
    const state: AppState = {
      ...start,
      user: { ...start.user, level: 4, totalCompletedQuests: 31, totalExp: 900, coins: 120 },
      dailyLog: {
        '2026-08-01': { completed: 2, exp: 30, byCategory: {} },
        '2026-08-03': { completed: 1, exp: 15, byCategory: {} },
        // 아무것도 안 끝낸 날은 "기록한 날" 로 세지 않는다
        '2026-08-04': { completed: 0, exp: 0, byCategory: {} },
      },
    }

    const s = summarize(state)
    expect(s.level).toBe(4)
    expect(s.completed).toBe(31)
    expect(s.days).toBe(2)
    expect(s.lastActiveOn).toBe('2026-08-03')
  })

  it('아무 기록이 없으면 마지막 날짜는 없다', () => {
    expect(summarize(createDefaultState()).lastActiveOn).toBeNull()
  })
})

describe('richer — 어느 쪽이 더 많은지', () => {
  const of = (completed: number, days: number) => ({
    level: 1,
    completed,
    totalExp: completed * 20,
    coins: 0,
    discovered: 0,
    days,
    lastActiveOn: null,
  })

  it('한쪽이 확실히 많으면 그쪽을 가리킨다', () => {
    expect(richer(of(80, 40), of(3, 2))).toBe('A')
    expect(richer(of(3, 2), of(80, 40))).toBe('B')
  })

  it('한 끗 차이는 비슷하다고 본다 — 그걸로 고르게 하면 오해를 부른다', () => {
    expect(richer(of(40, 20), of(41, 20))).toBe('SAME')
    expect(richer(of(40, 20), of(40, 20))).toBe('SAME')
  })
})

describe('sinceLabel', () => {
  const now = new Date('2026-08-24T12:00:00.000Z')

  it('한 번도 없으면 그렇게 말한다', () => {
    expect(sinceLabel(null, now)).toBe('아직 없음')
  })

  it('1분 안쪽은 방금', () => {
    expect(sinceLabel('2026-08-24T11:59:30.000Z', now)).toBe('방금')
  })

  it('기기 시계가 앞서 있어도 방금으로 본다', () => {
    expect(sinceLabel('2026-08-24T12:05:00.000Z', now)).toBe('방금')
  })

  it('분 · 시간 · 어제 · 며칠 전', () => {
    expect(sinceLabel('2026-08-24T11:30:00.000Z', now)).toBe('30분 전')
    expect(sinceLabel('2026-08-24T09:00:00.000Z', now)).toBe('3시간 전')
    expect(sinceLabel('2026-08-23T09:00:00.000Z', now)).toBe('어제')
    expect(sinceLabel('2026-08-21T09:00:00.000Z', now)).toBe('3일 전')
  })

  it('일주일이 넘으면 날짜로', () => {
    expect(sinceLabel('2026-07-02T09:00:00.000Z', now)).toContain('7월')
  })
})

describe('덮어쓰기 전 사본', () => {
  beforeEach(() => {
    installStorage()
  })

  it('남겼다가 그대로 꺼낼 수 있다', () => {
    const start = createDefaultState()
    const state: AppState = { ...start, user: { ...start.user, totalCompletedQuests: 12 } }

    expect(saveBackup(state, 'PULL')).toBe(true)
    const back = readBackup()
    expect(back?.state.user.totalCompletedQuests).toBe(12)
    expect(back?.reason).toBe('PULL')
  })

  it('한 벌만 남는다 — 새로 남기면 앞의 것이 갈린다', () => {
    const start = createDefaultState()
    saveBackup({ ...start, user: { ...start.user, level: 2 } }, 'PULL')
    saveBackup({ ...start, user: { ...start.user, level: 9 } }, 'CONFLICT_REMOTE')
    expect(readBackup()?.state.user.level).toBe(9)
  })

  it('지우면 없다', () => {
    saveBackup(createDefaultState(), 'PULL')
    clearBackup()
    expect(readBackup()).toBeNull()
  })

  it('자리가 없어 못 남기면 false 를 돌려준다 — 부르는 쪽이 알려줄 수 있게', () => {
    installStorage(true)
    expect(saveBackup(createDefaultState(), 'PULL')).toBe(false)
  })

  it('어떤 상황이었는지 사람 말로 붙는다', () => {
    expect(reasonLabel('PULL')).toContain('받아오기 전')
    expect(reasonLabel('CONFLICT_REMOTE')).toContain('클라우드')
  })
})

describe('기기별 동기화 기록', () => {
  beforeEach(() => {
    installStorage()
  })

  it('없으면 기본값으로 시작하고 기기 이름이 생긴다', () => {
    const local = readSyncLocal()
    expect(local.baseRev).toBe(0)
    expect(local.dirty).toBe(false)
    expect(local.userId).toBeNull()
    expect(local.deviceId.length).toBeGreaterThan(4)
  })

  it('기기 이름은 다시 읽어도 그대로다', () => {
    const first = readSyncLocal().deviceId
    expect(readSyncLocal().deviceId).toBe(first)
  })

  it('몇 항목만 고쳐도 나머지는 남는다', () => {
    const device = readSyncLocal().deviceId
    patchSyncLocal({ userId: 'u1', baseRev: 3 })
    patchSyncLocal({ dirty: true })

    const local = readSyncLocal()
    expect(local.userId).toBe('u1')
    expect(local.baseRev).toBe(3)
    expect(local.dirty).toBe(true)
    expect(local.deviceId).toBe(device)
  })

  it('저장된 게 깨져 있어도 기본값으로 메운다', () => {
    const clean = sanitizeSyncLocal({ baseRev: -4, dirty: 'yes', userId: 42 })
    expect(clean.baseRev).toBe(0)
    expect(clean.dirty).toBe(false)
    expect(clean.userId).toBeNull()
  })
})

describe('설정이 없을 때', () => {
  it('환경변수가 없으면 기능이 꺼져 있다 — 앱은 예전 그대로 돈다', () => {
    expect(isSyncConfigured()).toBe(false)
  })
})
