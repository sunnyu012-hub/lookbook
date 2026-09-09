import { describe, expect, it } from 'vitest'
import { BUILD_ID, buildLabel } from '@/lib/build'
import { RESET_KEYS, clearLocalData } from '@/lib/reset'
import { STORAGE_KEY } from '@/store/localStorage'
import { SYNC_LOCAL_KEY } from '@/lib/sync/local'
import { BACKUP_KEY } from '@/lib/sync/backup'
import { AUTH_STORAGE_KEY } from '@/lib/sync/config'

describe('판 이름', () => {
  it('열네 자리를 사람이 읽는 모양으로 바꾼다', () => {
    expect(buildLabel('20260909044236')).toBe('2026-09-09 04:42')
  })

  /** 개발 중에는 빌드가 아니라서 값이 없다. 그때도 뭔가는 보여야 한다 */
  it('열네 자리가 아니면 그대로 보여준다', () => {
    expect(buildLabel('dev')).toBe('dev')
    expect(buildLabel('2026-09-09')).toBe('2026-09-09')
    expect(buildLabel('202609090442')).toBe('202609090442')
  })

  it('테스트에서는 빌드 값이 없어서 dev 로 떨어진다', () => {
    expect(BUILD_ID).toBe('dev')
    expect(buildLabel()).toBe('dev')
  })
})

describe('처음부터 다시', () => {
  it('우리 열쇠 넷을 전부 지운다', () => {
    expect([...RESET_KEYS].sort()).toEqual(
      [STORAGE_KEY, SYNC_LOCAL_KEY, BACKUP_KEY, AUTH_STORAGE_KEY].sort(),
    )
  })

  /** 같은 도메인에 다른 앱이 얹힐 수 있어서 clear() 를 안 쓴다 */
  it('남의 열쇠는 안 건드린다', () => {
    const box = new Map<string, string>()
    for (const key of RESET_KEYS) box.set(key, 'mine')
    box.set('life-os-something', 'theirs')

    clearLocalData({ removeItem: (k) => void box.delete(k) })

    for (const key of RESET_KEYS) expect(box.has(key), key).toBe(false)
    expect(box.get('life-os-something')).toBe('theirs')
  })

  /** 사파리 프라이빗 모드에서는 저장이 막혀서 던진다. 거기서 앱이 죽으면 안 된다 */
  it('저장이 막힌 기기에서도 안 던진다', () => {
    expect(() =>
      clearLocalData({
        removeItem: () => {
          throw new Error('denied')
        },
      }),
    ).not.toThrow()
  })
})
