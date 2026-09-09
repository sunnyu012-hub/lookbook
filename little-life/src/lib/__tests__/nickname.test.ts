import { describe, expect, it } from 'vitest'
import {
  NICKNAME_MAX,
  isNicknameOk,
  needsNickname,
  normalizeNickname,
} from '@/lib/nickname'
import { createDefaultState } from '@/store/defaultState'
import { sanitizeState } from '@/store/localStorage'

describe('이름 다듬기', () => {
  it('앞뒤 공백을 뗀다', () => {
    expect(normalizeNickname('  하늘  ')).toBe('하늘')
  })

  it('가운데 연속 공백은 하나로 줄인다', () => {
    expect(normalizeNickname('김 　  하늘')).toBe('김 하늘')
  })

  it('안 보이는 글자를 지운다 — 붙여넣기로 딸려 온다', () => {
    expect(normalizeNickname('하​늘')).toBe('하늘')
    expect(normalizeNickname('‎하늘‏')).toBe('하늘')
    expect(normalizeNickname('﻿')).toBe('')
    expect(normalizeNickname('­')).toBe('')
  })

  it('길면 자른다', () => {
    const long = '가'.repeat(30)
    expect(normalizeNickname(long)).toHaveLength(NICKNAME_MAX)
  })

  /** 자르는 걸 먼저 하면 "김 　 　" 같은 입력이 공백만 남기고 잘린다 */
  it('자르고 나서 남은 공백도 뗀다', () => {
    const cut = normalizeNickname('가'.repeat(NICKNAME_MAX - 1) + '   나')
    expect(cut).toBe('가'.repeat(NICKNAME_MAX - 1))
    expect(cut.endsWith(' ')).toBe(false)
  })

  it('한 글자도 된다 — 부담을 주지 않는다', () => {
    expect(isNicknameOk('나')).toBe(true)
    expect(normalizeNickname('나')).toBe('나')
  })

  it('공백만 있으면 쓸 수 없다', () => {
    for (const raw of ['', '   ', '\n', '​​']) {
      expect(isNicknameOk(raw), JSON.stringify(raw)).toBe(false)
    }
  })

  it('이모지도 그대로 쓴다', () => {
    expect(normalizeNickname('🌙달')).toBe('🌙달')
  })
})

describe('처음 켠 사람', () => {
  /**
   * 오래 `'Yuli'` 가 기본값이었다. 남에게 주는 순간 처음 켠 사람에게
   * 만든 사람 이름으로 인사하는 앱이 된다.
   */
  it('새 저장에는 이름이 비어 있다 — 만든 사람 이름이 남아 있지 않다', () => {
    const fresh = createDefaultState()
    expect(fresh.user.name).toBe('')
    expect(needsNickname(fresh.user.name)).toBe(true)
    expect(JSON.stringify(fresh)).not.toContain('Yuli')
  })

  it('이름을 정하면 다시 안 묻는다', () => {
    expect(needsNickname('하늘')).toBe(false)
  })

  it('공백만 적힌 이름은 안 정한 것으로 친다', () => {
    expect(needsNickname('   ')).toBe(true)
    expect(needsNickname('​')).toBe(true)
  })
})

describe('예전 저장', () => {
  it('하던 사람에게는 이름을 다시 묻지 않는다', () => {
    const base = createDefaultState()
    const loaded = sanitizeState({ ...base, user: { ...base.user, name: '유리' } })
    expect(loaded?.user.name).toBe('유리')
    expect(needsNickname(loaded!.user.name)).toBe(false)
  })

  /** 이름 칸이 아예 없던 저장이 와도 앱이 안 깨지고, 물어보는 화면으로 간다 */
  it('이름 칸이 없으면 비운다 — 예전 기본값을 되살리지 않는다', () => {
    const raw = createDefaultState() as unknown as Record<string, unknown>
    const user = { ...(raw.user as Record<string, unknown>) }
    delete user.name
    const loaded = sanitizeState({ ...raw, user })
    expect(loaded?.user.name).toBe('')
    expect(needsNickname(loaded!.user.name)).toBe(true)
  })

  it('읽어들일 때도 같은 규칙으로 다듬는다', () => {
    const base = createDefaultState()
    const loaded = sanitizeState({ ...base, user: { ...base.user, name: '  하늘\u200b  ' } })
    expect(loaded?.user.name).toBe('하늘')
  })
})
