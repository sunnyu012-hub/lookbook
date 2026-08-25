import { beforeEach, describe, expect, it } from 'vitest'
import type { Mood, QuickLogInput } from '../os2/types'
import { deriveFields, groupByDate, moodOnly, toQuickLog } from '../os2/quickLog'
import { quickLogRepository } from '../repositories/quickLog'
import { isActive, myTagRepository, sameName, sortTags } from '../repositories/myTag'
import { photoPathFor, checkFile, MAX_EDGE } from '../os2/photo'
import type { MyTag } from '../os2/types'

/**
 * 테스트 환경이 node 라 localStorage 가 없다.
 * jsdom 을 끌어오는 대신 필요한 만큼만 대역을 세운다 — 저장소가 쓰는 건 네 개뿐이다.
 */
const memory = new Map<string, string>()
;(globalThis as { localStorage?: Storage }).localStorage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k),
  clear: () => memory.clear(),
  key: (i: number) => [...memory.keys()][i] ?? null,
  get length() {
    return memory.size
  },
} as Storage

/** 로컬 시각 하나를 ISO 로 — 테스트가 실행 지역에 흔들리지 않게 Date 로 만든다 */
const at = (y: number, m: number, d: number, h: number, min = 0) =>
  new Date(y, m - 1, d, h, min).toISOString()

beforeEach(() => {
  localStorage.clear()
})

// ─────────────────────────────────────────────
// 모델
// ─────────────────────────────────────────────
describe('Quick Log 모델', () => {
  it('기분 하나만으로 만들어진다', () => {
    const log = toQuickLog(moodOnly(4 as Mood), { id: 'a', userId: 'u', now: at(2026, 8, 21, 9) })
    expect(log.mood).toBe(4)
    expect(log.text).toBeUndefined()
    expect(log.energy).toBeUndefined()
    expect(log.photoPath).toBeUndefined()
  })

  it('선택 항목을 같이 넣어도 된다', () => {
    const input: QuickLogInput = {
      mood: 2 as Mood,
      text: '회의가 길었다',
      energy: 2,
      myTagIds: ['t1', 't2'],
    }
    const log = toQuickLog(input, { id: 'b', userId: 'u', now: at(2026, 8, 21, 15) })
    expect(log.text).toBe('회의가 길었다')
    expect(log.energy).toBe(2)
    expect(log.myTagIds).toEqual(['t1', 't2'])
  })

  it('만든 시각과 기록 시각을 따로 둔다', () => {
    const now = at(2026, 8, 21, 9)
    const past = at(2026, 8, 20, 22)
    const log = toQuickLog({ mood: 3 as Mood, loggedAt: past }, { id: 'c', userId: 'u', now })
    expect(log.loggedAt).toBe(past)
    expect(log.createdAt).toBe(now)
    expect(log.date).toBe('2026-08-20')
  })
})

// ─────────────────────────────────────────────
// 날짜 경계 — 여기가 틀어지면 Phase 5 분석이 통째로 망가진다
// ─────────────────────────────────────────────
describe('날짜 경계와 timezone', () => {
  it('밤 11시 59분 기록은 그날 것이다', () => {
    expect(deriveFields(at(2026, 8, 21, 23, 59)).date).toBe('2026-08-21')
  })

  it('자정 1분 뒤 기록은 다음날 것이다', () => {
    expect(deriveFields(at(2026, 8, 22, 0, 1)).date).toBe('2026-08-22')
  })

  it('자정 직전과 직후는 다른 날로 갈린다', () => {
    const before = deriveFields(at(2026, 8, 21, 23, 59))
    const after = deriveFields(at(2026, 8, 22, 0, 1))
    expect(before.date).not.toBe(after.date)
    expect(before.dayPart).toBe('night')
    expect(after.dayPart).toBe('dawn')
  })

  it('저장은 UTC ISO 로, 날짜 묶기는 로컬 기준으로 한다', () => {
    const iso = at(2026, 8, 21, 23, 30)
    // ISO 문자열은 Z 로 끝나는 UTC 다
    expect(iso.endsWith('Z')).toBe(true)
    // 그래도 날짜는 사용자의 그날이다
    expect(deriveFields(iso).date).toBe('2026-08-21')
  })

  it('요일이 로컬 기준으로 나온다', () => {
    const d = new Date(2026, 7, 21, 12)
    expect(deriveFields(d.toISOString()).dayOfWeek).toBe(d.getDay())
  })

  it('하루 여러 개를 날짜별로 묶고 시간순으로 세운다', () => {
    const mk = (id: string, h: number) =>
      toQuickLog({ mood: 3 as Mood, loggedAt: at(2026, 8, 21, h) }, { id, userId: 'u', now: at(2026, 8, 21, h) })
    const days = groupByDate([mk('c', 21), mk('a', 8), mk('b', 14)])
    expect(days).toHaveLength(1)
    expect(days[0].logs.map((l) => l.id)).toEqual(['a', 'b', 'c'])
  })
})

// ─────────────────────────────────────────────
// 저장소 (localStorage fallback)
// ─────────────────────────────────────────────
describe('Quick Log 저장소 — 로컬', () => {
  it('만들고 다시 읽는다', async () => {
    const log = await quickLogRepository.create({ mood: 5 as Mood, text: '신남' })
    const found = await quickLogRepository.getById(log.id)
    expect(found?.text).toBe('신남')
  })

  it('빈 문자열은 null 로 저장한다', async () => {
    const log = await quickLogRepository.create({ mood: 3 as Mood, text: '   ' })
    expect(log.text).toBeNull()
  })

  it('날짜로 찾는다', async () => {
    await quickLogRepository.create({ mood: 3 as Mood, loggedAt: at(2026, 8, 20, 10) })
    await quickLogRepository.create({ mood: 4 as Mood, loggedAt: at(2026, 8, 21, 10) })
    await quickLogRepository.create({ mood: 5 as Mood, loggedAt: at(2026, 8, 21, 20) })

    expect(await quickLogRepository.listByDate('2026-08-21')).toHaveLength(2)
    expect(await quickLogRepository.listByDate('2026-08-20')).toHaveLength(1)
    expect(await quickLogRepository.listByDate('2026-08-19')).toHaveLength(0)
  })

  it('날짜로 찾을 때 시간순으로 준다', async () => {
    await quickLogRepository.create({ mood: 5 as Mood, text: '밤', loggedAt: at(2026, 8, 21, 21) })
    await quickLogRepository.create({ mood: 1 as Mood, text: '아침', loggedAt: at(2026, 8, 21, 8) })
    const list = await quickLogRepository.listByDate('2026-08-21')
    expect(list.map((l) => l.text)).toEqual(['아침', '밤'])
  })

  it('기간으로 찾는다 — 양 끝을 포함한다', async () => {
    for (const d of [19, 20, 21, 22]) {
      await quickLogRepository.create({ mood: 3 as Mood, loggedAt: at(2026, 8, d, 12) })
    }
    expect(await quickLogRepository.listByRange('2026-08-20', '2026-08-21')).toHaveLength(2)
  })

  it('고치면 updatedAt 이 남고 파생값도 따라 바뀐다', async () => {
    const log = await quickLogRepository.create({ mood: 3 as Mood, loggedAt: at(2026, 8, 21, 10) })
    const next = await quickLogRepository.update(log.id, {
      mood: 5 as Mood,
      text: '고침',
      loggedAt: at(2026, 8, 22, 23),
    })
    expect(next.mood).toBe(5)
    expect(next.date).toBe('2026-08-22')
    expect(next.dayPart).toBe('night')
    expect(new Date(next.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(next.createdAt).getTime(),
    )
  })

  it('지운다', async () => {
    const log = await quickLogRepository.create({ mood: 3 as Mood })
    await quickLogRepository.remove(log.id)
    expect(await quickLogRepository.getById(log.id)).toBeNull()
  })

  it('사진만 나중에 붙일 수 있다', async () => {
    const log = await quickLogRepository.create({ mood: 4 as Mood })
    expect(log.photoPath).toBeUndefined()
    await quickLogRepository.attachPhoto(log.id, 'u/2026/08/x.jpg')
    expect((await quickLogRepository.getById(log.id))?.photoPath).toBe('u/2026/08/x.jpg')
  })

  it('id 를 밖에서 정해 줄 수 있다 — 사진 경로에 필요하다', async () => {
    const log = await quickLogRepository.create({ mood: 3 as Mood }, 'fixed-id')
    expect(log.id).toBe('fixed-id')
  })
})

// ─────────────────────────────────────────────
// My Tag
// ─────────────────────────────────────────────
describe('My Tag', () => {
  it('만들고 읽는다', async () => {
    await myTagRepository.create({ name: '클라이밍' })
    const list = await myTagRepository.list()
    expect(list.map((t) => t.name)).toContain('클라이밍')
  })

  it('앞뒤 공백을 없앤다', async () => {
    const tag = await myTagRepository.create({ name: '  회사  ' })
    expect(tag.name).toBe('회사')
  })

  it('같은 이름을 두 번 만들면 원래 것을 돌려준다', async () => {
    const a = await myTagRepository.create({ name: '클라이밍' })
    const b = await myTagRepository.create({ name: '클라이밍' })
    expect(b.id).toBe(a.id)
    expect(await myTagRepository.list()).toHaveLength(1)
  })

  it('대소문자와 공백이 달라도 같은 이름으로 본다', async () => {
    const a = await myTagRepository.create({ name: 'Climbing' })
    const b = await myTagRepository.create({ name: ' climbing ' })
    expect(b.id).toBe(a.id)
  })

  it('빈 이름은 거절한다', async () => {
    await expect(myTagRepository.create({ name: '   ' })).rejects.toThrow()
  })

  it('여러 태그를 기록에 붙인다', async () => {
    const a = await myTagRepository.create({ name: '클라이밍' })
    const b = await myTagRepository.create({ name: '성현' })
    const log = await quickLogRepository.create({ mood: 5 as Mood, myTagIds: [a.id, b.id] })
    expect(log.myTagIds).toEqual([a.id, b.id])
  })

  it('붙인 태그를 뗀다', async () => {
    const a = await myTagRepository.create({ name: '클라이밍' })
    const b = await myTagRepository.create({ name: '성현' })
    const log = await quickLogRepository.create({ mood: 5 as Mood, myTagIds: [a.id, b.id] })
    const next = await quickLogRepository.update(log.id, { mood: 5 as Mood, myTagIds: [a.id] })
    expect(next.myTagIds).toEqual([a.id])
  })

  it('쓸 때마다 횟수가 올라간다', async () => {
    const tag = await myTagRepository.create({ name: '카페' })
    await myTagRepository.touch([tag.id])
    await myTagRepository.touch([tag.id])
    const found = (await myTagRepository.list()).find((t) => t.id === tag.id)
    expect(found?.useCount).toBe(2)
    expect(found?.lastUsedAt).not.toBeNull()
  })

  it('지우지 않고 보관한다 — 과거 기록의 태그가 사라지면 안 된다', async () => {
    const tag = await myTagRepository.create({ name: '옛날태그' })
    await myTagRepository.archive(tag.id)
    const all = await myTagRepository.list()
    const found = all.find((t) => t.id === tag.id)
    expect(found).toBeDefined()
    expect(isActive(found!)).toBe(false)
  })

  it('즐겨찾기 → 자주 쓴 순으로 정렬한다', () => {
    const mk = (over: Partial<MyTag>): MyTag => ({
      id: over.name ?? 'x',
      userId: 'u',
      name: 'x',
      color: null,
      emoji: null,
      isFavorite: false,
      useCount: 0,
      lastUsedAt: null,
      schemaVersion: 1,
      createdAt: '',
      updatedAt: '',
      ...over,
    })
    const sorted = sortTags([
      mk({ name: 'a', useCount: 1 }),
      mk({ name: 'b', useCount: 9 }),
      mk({ name: 'c', useCount: 0, isFavorite: true }),
    ])
    expect(sorted.map((t) => t.name)).toEqual(['c', 'b', 'a'])
  })

  it('이름 비교는 공백·대소문자를 무시한다', () => {
    expect(sameName(' Climbing ', 'climbing')).toBe(true)
    expect(sameName('회사', '집')).toBe(false)
  })
})

// ─────────────────────────────────────────────
// 사진
// ─────────────────────────────────────────────
describe('사진', () => {
  it('경로 맨 앞이 user_id 다 — Storage 정책이 폴더로 막는다', () => {
    const path = photoPathFor('user-1', 'log-9', new Date(2026, 7, 21))
    expect(path.startsWith('user-1/')).toBe(true)
    expect(path).toBe('user-1/2026/08/log-9.jpg')
  })

  it('월을 두 자리로 채운다', () => {
    expect(photoPathFor('u', 'l', new Date(2026, 0, 5))).toBe('u/2026/01/l.jpg')
  })

  it('사진이 아닌 파일은 거절한다', () => {
    const file = new File(['x'], 'a.txt', { type: 'text/plain' })
    expect(checkFile(file)?.userMessage).toContain('사진 파일만')
  })

  it('사진 파일은 통과한다', () => {
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
    expect(checkFile(file)).toBeNull()
  })

  it('긴 변 제한이 정해져 있다', () => {
    expect(MAX_EDGE).toBeGreaterThan(0)
  })
})
