import { describe, expect, it } from 'vitest'
import {
  ALL_FIXTURES,
  EDGE_CASES,
  EVERYDAY_CASES,
  QUIET_CASES,
  TRAP_CASES,
  type Fixture,
} from './fixtures/koreanLogs'
import { CONFIDENCE_THRESHOLD, analyze } from '@/lib/os2/tagging/engine'
import {
  activeTags,
  addUserTag,
  needsRetag,
  rejectTag,
  retag,
  verifyTag,
  withTags,
} from '@/lib/os2/tagging/apply'
import {
  LIFE_TAGS,
  expandForAnalysis,
  getAncestors,
  isDescendantOf,
  validateTaxonomy,
} from '@/lib/os2/taxonomy'
import { TAG_BY_ID, taxonomyStats } from '@/lib/os2/taxonomy/registry'
import { CONFLICT_AXES, conflicts } from '@/lib/os2/tagging/conflicts'
import { findTerm, makeView, splitClauses } from '@/lib/os2/tagging/normalize'
import { isNegated } from '@/lib/os2/tagging/negation'
import { contextOfClause } from '@/lib/os2/tagging/temporal'
import { pendingLogs, retagOne, runBackfill } from '@/lib/os2/tagging/backfill'
import type { AppliedLifeTag, QuickLog } from '@/lib/os2/types'

const run = (f: Fixture) =>
  analyze({
    text: f.text,
    mood: f.mood ?? null,
    energy: f.energy ?? null,
    myTagNames: f.myTagNames ?? [],
  }).tags

const idsOf = (f: Fixture) => run(f).map((t) => t.tagId)

describe('LIFE TAGS 사전', () => {
  it('깨진 곳이 없다', () => {
    expect(validateTaxonomy()).toEqual([])
  })

  it('잎 태그 수가 계획한 범위 안이다', () => {
    const { leaves } = taxonomyStats()
    expect(leaves).toBeGreaterThanOrEqual(230)
    expect(leaves).toBeLessThanOrEqual(300)
  })

  it('모든 태그에 한글 이름이 있다 — 영문 key 를 화면에 내보내지 않는다', () => {
    for (const tag of LIFE_TAGS) {
      expect(tag.displayName.trim().length).toBeGreaterThan(0)
      expect(tag.displayName).not.toBe(tag.key)
    }
  })

  it('병명을 태그로 만들지 않는다', () => {
    const diagnoses = ['편두통', '디스크', '우울증', '공황장애', '불면증', '위염', '역류성', 'adhd']
    for (const tag of LIFE_TAGS) {
      const haystack = [tag.displayName, ...(tag.keywords ?? []), ...(tag.phrases ?? [])]
        .join(' ')
        .toLowerCase()
      for (const word of diagnoses) expect(haystack).not.toContain(word)
    }
  })

  it('체중·용량을 성취로 읽는 태그가 없다', () => {
    const banned = ['체중', '몸무게', '살 빠', '감량', '용량', 'mg', '주사']
    for (const tag of LIFE_TAGS) {
      const haystack = [...(tag.keywords ?? []), ...(tag.phrases ?? [])].join(' ').toLowerCase()
      for (const word of banned) expect(haystack).not.toContain(word)
    }
  })

  it('계층을 위아래로 오갈 수 있다', () => {
    expect(getAncestors('emotion:happiness')).toContain('emotion:joy')
    expect(isDescendantOf('emotion:happiness', 'emotion:joy')).toBe(true)
    expect(isDescendantOf('emotion:joy', 'emotion:happiness')).toBe(false)
    expect(isDescendantOf('emotion:joy', 'emotion:joy')).toBe(false)
  })

  it('분석용으로 펼치면 조상이 따라온다 — 그리고 두 번 세지 않는다', () => {
    const out = expandForAnalysis(['emotion:happiness', 'emotion:joy'])
    expect(out).toContain('emotion:happiness')
    expect(out).toContain('emotion:joy')
    expect(new Set(out).size).toBe(out.length)
  })

  it('운동 종목은 전부 활동:운동 아래로 모인다', () => {
    expect(expandForAnalysis(['sport:climbing'])).toContain('activity:exercise')
    expect(expandForAnalysis(['sport:yoga'])).toContain('activity:exercise')
  })

  it('충돌 규칙에 적힌 태그가 전부 사전에 있다', () => {
    for (const group of CONFLICT_AXES) {
      for (const tagId of group) expect(TAG_BY_ID.has(tagId)).toBe(true)
    }
  })
})

describe('글자 다듬기', () => {
  it('띄어쓰기가 달라도 찾는다', () => {
    expect(findTerm(makeView('기분좋다'), '기분 좋')).toHaveLength(1)
    expect(findTerm(makeView('기분 좋다'), '기분 좋')).toHaveLength(1)
  })

  it('짧은 낱말은 붙어 있는 글자 사이에서 찾지 않는다', () => {
    expect(findTerm(makeView('안 아팠어'), '안아', false)).toHaveLength(0)
    expect(findTerm(makeView('안아줬다'), '안아', false)).toHaveLength(1)
  })

  it('찾은 자리로 원문을 그대로 잘라낼 수 있다', () => {
    const view = makeView('오늘 클라이밍 갔다')
    const [span] = findTerm(view, '클라이밍')
    expect(view.raw.slice(span.start, span.end)).toBe('클라이밍')
  })

  it('문장을 자른다', () => {
    expect(splitClauses(makeView('어제는 힘들었다. 오늘은 괜찮다')).length).toBeGreaterThan(1)
  })
})

describe('부정', () => {
  const negated = (text: string, term: string) => {
    const view = makeView(text)
    const [span] = findTerm(view, term)
    return isNegated(view, span, term).negated
  }

  it('앞에 오는 부정을 잡는다', () => {
    expect(negated('안 아팠어', '아팠')).toBe(true)
    expect(negated('별로 안 좋았어', '좋았')).toBe(true)
  })

  it('뒤에 오는 부정을 잡는다', () => {
    expect(negated('좋지 않았다', '좋')).toBe(true)
  })

  it('멀쩡한 문장을 부정으로 읽지 않는다', () => {
    expect(negated('오늘 진짜 좋았다', '좋았')).toBe(false)
  })

  it('낱말 자체가 부정을 품고 있으면 건드리지 않는다', () => {
    expect(negated('기운 없다', '기운 없')).toBe(false)
  })
})

describe('시제', () => {
  const ctx = (text: string) => contextOfClause({ start: 0, end: text.length, text })

  it('내일 이야기는 미래다', () => expect(ctx('내일 클라이밍 갈 거야')).toBe('future'))
  it('어제 이야기는 과거다', () => expect(ctx('어제 러닝했다')).toBe('past'))
  it('바람은 가정이다', () => expect(ctx('운동 갔으면 좋겠다')).toBe('hypothetical'))
  it('그냥 한 일은 현재다', () => expect(ctx('클라이밍 갔다')).toBe('present'))
})

describe('충돌', () => {
  it('같은 눈금의 반대쪽은 부딪힌다', () => {
    expect(conflicts('energy:very_high', 'energy:very_low')).toBe(true)
  })
  it('같은 쪽끼리는 부딪히지 않는다', () => {
    expect(conflicts('energy:low', 'energy:very_low')).toBe(false)
  })
  it('상관없는 태그는 부딪히지 않는다', () => {
    expect(conflicts('emotion:joy', 'place:cafe')).toBe(false)
  })
})

describe('반드시 피해야 하는 오분류', () => {
  for (const fixture of TRAP_CASES) {
    it(fixture.trap ?? fixture.text, () => {
      const tags = run(fixture)
      const ids = tags.map((t) => t.tagId)

      for (const banned of fixture.never ?? []) expect(ids).not.toContain(banned)
      for (const wanted of fixture.want ?? []) expect(ids).toContain(wanted)

      for (const [tagId, when] of Object.entries(fixture.when ?? {})) {
        expect(tags.find((t) => t.tagId === tagId)?.temporalContext).toBe(when)
      }
    })
  }
})

describe('그 밖의 함정', () => {
  for (const fixture of EDGE_CASES) {
    it(fixture.trap ?? fixture.text, () => {
      const tags = run(fixture)
      const ids = tags.map((t) => t.tagId)
      for (const banned of fixture.never ?? []) expect(ids).not.toContain(banned)
      for (const wanted of fixture.want ?? []) expect(ids).toContain(wanted)
      for (const [tagId, when] of Object.entries(fixture.when ?? {})) {
        expect(tags.find((t) => t.tagId === tagId)?.temporalContext).toBe(when)
      }
    })
  }
})

describe('짧거나 애매한 기록', () => {
  for (const fixture of QUIET_CASES) {
    it(`"${fixture.text}" 에는 아무것도 안 붙인다`, () => {
      expect(idsOf(fixture)).toEqual([])
    })
  }
})

describe('전체 성적', () => {
  const measured = EVERYDAY_CASES.filter((f) => f.want?.length)

  const stats = (() => {
    let hit = 0
    let want = 0
    let banned = 0
    let total = 0

    for (const fixture of ALL_FIXTURES) {
      const ids = idsOf(fixture)
      total += ids.length
      for (const wanted of fixture.want ?? []) {
        want += 1
        if (ids.includes(wanted)) hit += 1
      }
      for (const forbidden of fixture.never ?? []) {
        if (ids.includes(forbidden)) banned += 1
      }
    }

    return {
      recall: want ? hit / want : 1,
      bannedHits: banned,
      avgTags: total / ALL_FIXTURES.length,
      cases: ALL_FIXTURES.length,
    }
  })()

  it('붙으면 안 되는 태그가 하나도 안 붙는다', () => {
    expect(stats.bannedHits).toBe(0)
  })

  it('붙어야 할 태그를 대부분 붙인다', () => {
    expect(stats.recall).toBeGreaterThanOrEqual(0.85)
  })

  it('한 기록에 태그가 너무 많이 붙지 않는다', () => {
    expect(stats.avgTags).toBeLessThanOrEqual(3.5)
  })

  it('붙은 태그는 전부 문턱을 넘는다', () => {
    for (const fixture of measured) {
      for (const tag of run(fixture)) {
        expect(tag.confidence).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLD)
      }
    }
  })

  it('같은 글을 넣으면 언제나 같은 태그가 나온다', () => {
    for (const fixture of ALL_FIXTURES.slice(0, 30)) {
      expect(idsOf(fixture)).toEqual(idsOf(fixture))
    }
  })

  it('사전에 없는 태그를 지어내지 않는다', () => {
    for (const fixture of ALL_FIXTURES) {
      for (const id of idsOf(fixture)) expect(TAG_BY_ID.has(id)).toBe(true)
    }
  })

  it('시간대 태그는 저장하지 않는다 — 이미 컬럼에 있다', () => {
    for (const fixture of ALL_FIXTURES) {
      for (const id of idsOf(fixture)) expect(id.startsWith('time:')).toBe(false)
    }
  })

  it('성적표', () => {
    console.log(
      `케이스 ${stats.cases}개 · recall ${(stats.recall * 100).toFixed(1)}%`
        + ` · 금지 태그 ${stats.bannedHits}건 · 평균 ${stats.avgTags.toFixed(2)}개`,
    )
    expect(stats.cases).toBeGreaterThanOrEqual(100)
  })
})

describe('저장할 때 태그 붙이기', () => {
  it('태깅이 실패해도 저장은 막지 않는다', () => {
    expect(() => withTags({ mood: 3, text: ' '.repeat(50) })).not.toThrow()
  })

  it('본문이 없으면 태그도 없다', () => {
    expect(retag({ mood: 3 }).lifeTags).toEqual([])
  })

  it('판 번호를 남긴다 — 나중에 다시 돌릴지 판단하려고', () => {
    const stamp = retag({ mood: 3, text: '클라이밍 갔다' })
    expect(stamp.taggedRuleVersion).toBeGreaterThanOrEqual(1)
    expect(stamp.taggedTaxonomyVersion).toBeGreaterThanOrEqual(1)
  })

  it('아직 안 돌린 기록을 찾아낸다', () => {
    expect(needsRetag({})).toBe(true)
    expect(needsRetag({ taggedRuleVersion: 1, taggedTaxonomyVersion: 1 })).toBe(false)
  })

  it('사용자가 아니라고 한 태그는 다시 붙지 않는다', () => {
    const first = retag({ mood: 3, text: '클라이밍 갔다' })
    const corrected = rejectTag(first.lifeTags, 'sport:climbing')

    const second = retag({ mood: 3, text: '클라이밍 갔다' }, { previous: corrected })
    const climbing = second.lifeTags.filter((t) => t.tagId === 'sport:climbing')

    expect(climbing).toHaveLength(1)
    expect(climbing[0].userRejected).toBe(true)
    expect(activeTags(second.lifeTags).map((t) => t.tagId)).not.toContain('sport:climbing')
  })

  it('맞다고 한 태그는 그대로 남는다', () => {
    const first = retag({ mood: 3, text: '클라이밍 갔다' })
    const confirmed = verifyTag(first.lifeTags, 'sport:climbing')
    const second = retag({ mood: 3, text: '오늘은 그냥 쉬었다' }, { previous: confirmed })

    expect(second.lifeTags.map((t) => t.tagId)).toContain('sport:climbing')
  })

  it('직접 고른 태그는 신뢰도가 1이다', () => {
    const [added] = addUserTag([], 'emotion:joy')
    expect(added.source).toBe('user')
    expect(added.confidence).toBe(1)
    expect(added.userVerified).toBe(true)
  })

  it('내가 만든 태그 이름을 사전 태그가 가로채지 않는다', () => {
    const withMine = analyze({ text: '하은이랑 놀았다', myTagNames: ['하은'] }).tags
    expect(withMine.map((t) => t.tagId)).not.toContain('relationship:friend')
  })

  it('AI 가 붙인 것으로 표시되는 태그는 없다', () => {
    for (const fixture of ALL_FIXTURES) {
      for (const tag of run(fixture)) expect(tag.source).not.toBe('ai')
    }
  })
})

// ─────────────────────────────────────────────
// 예전 기록에 태그 붙이기
// ─────────────────────────────────────────────

describe('백필', () => {
  const makeLog = (over: Partial<QuickLog> = {}): QuickLog => ({
    id: over.id ?? 'l1',
    userId: 'u1',
    mood: 3,
    text: '클라이밍 갔다',
    energy: null,
    focus: null,
    fatigue: null,
    photoPath: null,
    myTagIds: [],
    lifeTags: [],
    loggedAt: '2026-08-20T03:00:00.000Z',
    date: '2026-08-20',
    dayOfWeek: 4,
    dayPart: 'morning',
    schemaVersion: 1,
    createdAt: '2026-08-20T03:00:00.000Z',
    updatedAt: '2026-08-20T03:00:00.000Z',
    ...over,
  })

  it('아직 안 돌린 기록만 고른다', () => {
    const old = makeLog({ id: 'a' })
    const fresh = makeLog({ id: 'b', taggedRuleVersion: 1, taggedTaxonomyVersion: 1 })
    expect(pendingLogs([old, fresh]).map((l) => l.id)).toEqual(['a'])
  })

  it('본문이 없는 기록은 건드리지 않는다', () => {
    expect(pendingLogs([makeLog({ text: null })])).toEqual([])
    expect(pendingLogs([makeLog({ text: '   ' })])).toEqual([])
  })

  it('결과가 같으면 다시 쓰지 않는다', () => {
    const tagged = makeLog({ lifeTags: retag({ mood: 3, text: '클라이밍 갔다' }).lifeTags })
    expect(retagOne(tagged)).toBeNull()
  })

  it('사용자가 고친 태그는 백필해도 그대로다', () => {
    const first = retag({ mood: 3, text: '클라이밍 갔다' })
    const log = makeLog({ lifeTags: rejectTag(first.lifeTags, 'sport:climbing') })

    const next = retagOne(log) ?? log.lifeTags ?? []
    expect(next.find((t) => t.tagId === 'sport:climbing')?.userRejected).toBe(true)
  })

  it('돌린 기록에는 판 번호를 찍어서 두 번 돌지 않게 한다', async () => {
    const logs = [makeLog({ id: 'a' }), makeLog({ id: 'b', text: '커피 마셨다' })]
    const saved = new Map<string, AppliedLifeTag[]>()

    const result = await runBackfill(logs, async (id, tags, stamp) => {
      saved.set(id, tags)
      const at = logs.findIndex((l) => l.id === id)
      logs[at] = {
        ...logs[at],
        lifeTags: tags,
        taggedRuleVersion: stamp.ruleVersion,
        taggedTaxonomyVersion: stamp.taxonomyVersion,
      }
    })

    expect(result.updated + result.unchanged).toBe(2)
    expect(result.failed).toBe(0)
    expect(pendingLogs(logs)).toEqual([])
  })

  it('저장이 실패한 기록은 다음에 다시 잡힌다', async () => {
    const logs = [makeLog({ id: 'a' })]
    const result = await runBackfill(logs, async () => {
      throw new Error('네트워크')
    })

    expect(result.failed).toBe(1)
    expect(pendingLogs(logs)).toHaveLength(1)
  })

  it('한 번에 몇 개까지만 돌릴 수 있다', async () => {
    const logs = ['a', 'b', 'c'].map((id) => makeLog({ id }))
    let calls = 0
    await runBackfill(logs, async () => { calls += 1 }, { limit: 2 })
    expect(calls).toBe(2)
  })

  it('중간에 멈출 수 있다', async () => {
    const logs = ['a', 'b', 'c'].map((id) => makeLog({ id }))
    let calls = 0
    await runBackfill(logs, async () => { calls += 1 }, { shouldStop: () => calls >= 1 })
    expect(calls).toBe(1)
  })
})
