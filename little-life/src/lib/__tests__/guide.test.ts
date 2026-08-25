import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { AppState } from '@/types'
import { createDefaultState } from '@/store/defaultState'
import { sanitizeState } from '@/store/localStorage'
import { GUIDE_PAGES } from '@/lib/guide/pages'
import { COMPANIONS, meetingLabel } from '@/lib/discovery/companions'
import { exportText, parseImport } from '@/lib/sync/file'

const PUBLIC = path.resolve(__dirname, '../../../public')

/**
 * 안내는 틀리면 없느니만 못하다.
 *
 * 여기서 붙잡는 것 두 가지 —
 * 그림이 실제로 있는지, 그리고 조건을 손으로 적어두지 않았는지.
 */

describe('안내 장들', () => {
  it('아홉 장이고 이름이 겹치지 않는다', () => {
    const ids = GUIDE_PAGES.map((p) => p.id)
    expect(ids.length).toBe(9)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('모습 이야기가 들어 있다', () => {
    const page = GUIDE_PAGES.find((p) => p.extra === 'SKINS')
    expect(page).toBeDefined()
    expect(page?.where).toContain('모습')
  })

  it('장마다 제목과 설명이 있다', () => {
    for (const page of GUIDE_PAGES) {
      expect(page.title.trim().length).toBeGreaterThan(0)
      expect(page.lines.length).toBeGreaterThan(0)
      for (const line of page.lines) expect(line.trim().length).toBeGreaterThan(0)
    }
  })

  it('가리키는 그림이 실제로 있다', () => {
    const broken = GUIDE_PAGES.filter(
      (p) => p.art.kind === 'IMAGE' && !existsSync(path.join(PUBLIC, p.art.src)),
    ).map((p) => p.id)

    expect(broken).toEqual([])
  })

  it('동료 이야기가 빠져 있지 않다 — 이게 없어서 만든 안내다', () => {
    const page = GUIDE_PAGES.find((p) => p.extra === 'COMPANIONS')
    expect(page).toBeDefined()
    expect(page?.where).toContain('발견함')
  })

  it('어디를 봐야 하는지 알려주는 장이 여럿 있다', () => {
    expect(GUIDE_PAGES.filter((p) => p.where).length).toBeGreaterThanOrEqual(4)
  })

  it('다그치지 않는다', () => {
    const all = GUIDE_PAGES.flatMap((p) => [p.title, ...p.lines]).join(' ')
    for (const word of ['해야', '반드시', '잊지 마', '놓치면', '연속 기록을']) {
      expect(all).not.toContain(word)
    }
    // "연속 기록 같은 건 없어" 는 안심시키는 말이라 걸리면 안 된다
    expect(all).toContain('연속 기록 같은 건 없어')
  })
})

describe('동료 만나는 조건', () => {
  it('넷 다 사람 말로 나온다', () => {
    for (const def of COMPANIONS) {
      const label = meetingLabel(def.meeting)
      expect(label.trim().length).toBeGreaterThan(0)
      expect(label).not.toContain('undefined')
    }
  })

  it('정의를 바꾸면 안내도 같이 바뀐다 — 손으로 적어두지 않았다', () => {
    const bori = COMPANIONS.find((c) => c.id === 'BORI')!
    expect(bori.meeting.kind).toBe('AREA_ACTIVITY')
    if (bori.meeting.kind !== 'AREA_ACTIVITY') return

    // 실제 숫자가 그대로 문장에 들어간다
    expect(meetingLabel(bori.meeting)).toContain(String(bori.meeting.count))
    expect(meetingLabel(bori.meeting)).toContain('초록 공원')

    // 숫자를 바꾸면 문장도 바뀐다
    expect(meetingLabel({ ...bori.meeting, count: 99 })).toContain('99')
  })

  it('비밀 장소로 만나는 아이는 그 장소 이름이 나온다', () => {
    const luna = COMPANIONS.find((c) => c.id === 'LUNA')!
    expect(meetingLabel(luna.meeting)).toContain('달빛 골목')
  })
})

describe('본 적 있는지 기억하기', () => {
  it('새로 시작하면 아직 안 본 것이다', () => {
    expect(createDefaultState().guideSeenAt).toBeNull()
  })

  it('예전 저장에는 없던 항목이라 없으면 안 본 것으로 본다', () => {
    const old = JSON.parse(JSON.stringify(createDefaultState())) as Record<string, unknown>
    delete old.guideSeenAt
    expect(sanitizeState(old)?.guideSeenAt).toBeNull()
  })

  it('한 번 본 뒤에는 그대로 남는다', () => {
    const seen: AppState = { ...createDefaultState(), guideSeenAt: '2026-08-24T10:00:00.000Z' }
    expect(sanitizeState(JSON.parse(JSON.stringify(seen)))?.guideSeenAt).toBe(
      '2026-08-24T10:00:00.000Z',
    )
  })

  it('파일로 옮겨도 따라간다 — 새 폰에서 또 뜨면 곤란하다', () => {
    const seen: AppState = { ...createDefaultState(), guideSeenAt: '2026-08-24T10:00:00.000Z' }
    const result = parseImport(exportText(seen))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.state.guideSeenAt).toBe('2026-08-24T10:00:00.000Z')
  })
})
