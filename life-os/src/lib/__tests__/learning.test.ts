import { beforeEach, describe, expect, it } from 'vitest'
import {
  ALL_EVENTS,
  ALL_SCENARIOS,
  ALMOST_THERE,
  APP_BUILDING,
  BAD_TRIGGERS,
  HIERARCHY_CONTEXT,
  MENTAL_ALIAS,
  NUMERIC_ONLY,
  ONLY_COMMON_WORDS,
  CROWD_REJECTS,
  CROWD_REJECTS_THREE,
  DRAINED_VERIFIED,
  FUTURE_REJECTS,
  GOOD_TRIGGERS,
  INCONSISTENT,
  NEGATED_REJECTS,
  NO_SHARED_CONTEXT,
  ONE_OFF,
  OTHER_PERSON,
  SAME_DAY_BURST,
  SPLIT_CONTEXT,
  WONT_VERIFIED,
  autoTag,
  makeEvent,
  makeLog,
  nextId,
  resetIds,
} from './fixtures/learningScenarios'
import {
  MIN_ACTIVE_CONFIDENCE,
  SUPPRESS_MIN_COUNT,
  analyzeWithPersonal,
  applyReview,
  buildCandidates,
  buildMemories,
  candidatePhrases,
  confidenceOf,
  extractCorrections,
  findMemory,
  isLearnable,
  isLearnableTrigger,
  judge,
  learnableOnly,
  mergeMemory,
  newMemory,
  normalizeTrigger,
  reinforce,
  review,
  sameTrigger,
  skipReason,
  tierOf,
  toRule,
  weaken,
  type Candidate,
  type PersonalRule,
} from '@/lib/os2/learning'
import { analyze } from '@/lib/os2/tagging/engine'
import { retag } from '@/lib/os2/tagging/apply'

beforeEach(resetIds)

/** 후보를 저장된 규칙 모양으로 — 테스트에서 자주 쓴다 */
const asRule = (candidate: Candidate, over: Partial<PersonalRule> = {}): PersonalRule => ({
  ...toRule(candidate),
  id: nextId(),
  userId: 'u1',
  schemaVersion: 1,
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
  ...over,
})

const find = (candidates: Candidate[], tagId: string) =>
  candidates.find((c) => c.tagId === tagId)

// ─────────────────────────────────────────────
// 4A — 손짓 뽑아내기
// ─────────────────────────────────────────────

describe('교정 사건', () => {
  const options = { newId: nextId, now: () => '2026-08-20T12:00:00.000Z' }

  it('맞아요를 잡아낸다', () => {
    const log = makeLog()
    const before = [autoTag('sport:climbing')]
    const after = [autoTag('sport:climbing', { userVerified: true })]

    const events = extractCorrections(log, before, after, options)
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('verified')
  })

  it('이 태그 제외를 잡아낸다', () => {
    const log = makeLog()
    const events = extractCorrections(
      log,
      [autoTag('social:crowd')],
      [autoTag('social:crowd', { userRejected: true })],
      options,
    )
    expect(events[0].kind).toBe('rejected')
  })

  it('직접 넣은 태그를 잡아낸다', () => {
    const log = makeLog()
    const events = extractCorrections(
      log,
      [],
      [autoTag('outcome:achievement', { source: 'user', userVerified: true })],
      options,
    )
    expect(events[0].kind).toBe('added')
  })

  it('안 고친 태그는 사건이 아니다 — 놔뒀다고 맞다고 보지 않는다', () => {
    const log = makeLog()
    const same = [autoTag('sport:climbing')]
    expect(extractCorrections(log, same, same, options)).toEqual([])
  })

  it('같은 판단을 두 번 세지 않는다', () => {
    const log = makeLog()
    const verified = [autoTag('sport:climbing', { userVerified: true })]
    expect(extractCorrections(log, verified, verified, options)).toEqual([])
  })

  it('같이 붙어 있던 태그를 문맥으로 남긴다', () => {
    const log = makeLog({ myTagIds: ['t-climb'] })
    const events = extractCorrections(
      log,
      [autoTag('sport:climbing')],
      [
        autoTag('sport:climbing'),
        autoTag('outcome:achievement', { source: 'user', userVerified: true }),
      ],
      { ...options, myTagNames: ['클라이밍'] },
    )
    expect(events[0].context.lifeTagIds).toContain('sport:climbing')
    expect(events[0].context.myTagNames).toEqual(['클라이밍'])
  })
})

describe('배우면 안 되는 손짓', () => {
  it('미래 이야기에서는 배우지 않는다', () => {
    for (const event of FUTURE_REJECTS) {
      expect(skipReason(event)).toBe('not-present')
    }
    expect(learnableOnly(FUTURE_REJECTS)).toEqual([])
  })

  it('남의 이야기에서는 배우지 않는다', () => {
    const skipped = OTHER_PERSON.filter((e) => skipReason(e) === 'about-someone-else')
    expect(skipped.length).toBeGreaterThanOrEqual(3)
  })

  it('부정문 안에서 나온 거절은 배우지 않는다', () => {
    for (const event of NEGATED_REJECTS) {
      expect(skipReason(event)).toBe('inside-negation')
    }
    expect(learnableOnly(NEGATED_REJECTS)).toEqual([])
  })

  it('본문이 없으면 배울 게 없다', () => {
    const event = makeEvent({ text: '', kind: 'added', tagId: 'emotion:joy', date: '2026-08-01' })
    expect(isLearnable(event)).toBe(false)
  })

  it('평범한 손짓은 배운다', () => {
    for (const event of WONT_VERIFIED) expect(isLearnable(event)).toBe(true)
  })
})

// ─────────────────────────────────────────────
// 배울 말 고르기
// ─────────────────────────────────────────────

describe('배울 말', () => {
  it('조사와 어미를 떼어 낸다', () => {
    expect(normalizeTrigger('원트를')).toBe('원트')
    expect(normalizeTrigger('원트가')).toBe('원트')
    expect(normalizeTrigger('원트함')).toBe('원트')
    expect(normalizeTrigger('원트했다')).toBe('원트')
  })

  it('너무 짧아지면 떼지 않는다', () => {
    expect(normalizeTrigger('가다').length).toBeGreaterThanOrEqual(2)
  })

  it('띄어쓰기가 달라도 같은 말로 본다', () => {
    expect(sameTrigger('기빨림', '기 빨림')).toBe(true)
    expect(sameTrigger('원트', '기 빨림')).toBe(false)
  })

  it('배우면 안 되는 말을 막는다', () => {
    for (const bad of BAD_TRIGGERS) {
      expect(isLearnableTrigger(bad)).toBe(false)
    }
  })

  it('쓸 만한 말은 통과시킨다', () => {
    for (const good of GOOD_TRIGGERS) expect(isLearnableTrigger(good)).toBe(true)
  })

  it('본문에서 후보를 뽑는다', () => {
    const phrases = candidatePhrases('오늘 원트 세 개 했다')
    expect(phrases).toContain('원트')
    // 흔한 말은 후보가 아니다
    expect(phrases).not.toContain('오늘')
  })
})

// ─────────────────────────────────────────────
// 4B — 묶기
// ─────────────────────────────────────────────

describe('후보 묶기', () => {
  it('반복된 표현을 하나로 묶는다', () => {
    const candidate = find(buildCandidates(WONT_VERIFIED), 'outcome:achievement')
    expect(candidate).toBeDefined()
    expect(candidate!.trigger).toBe('원트')
    expect(candidate!.agreeing).toBe(3)
    expect(candidate!.distinctDays).toBe(3)
  })

  it('built-in 이 잡은 말이 같으면 그걸 쓴다', () => {
    const candidate = find(buildCandidates(DRAINED_VERIFIED), 'energy:drained')
    expect(candidate!.trigger).toBe('기 빨림')
  })

  it('매번 같이 있던 문맥만 남긴다', () => {
    const candidate = find(buildCandidates(WONT_VERIFIED), 'outcome:achievement')
    expect(candidate!.context.lifeTagIds).toContain('sport:climbing')
    expect(candidate!.context.temporalContext).toBe('present')
  })

  it('문맥이 매번 다르면 문맥을 걸지 않는다', () => {
    const candidate = find(buildCandidates(NO_SHARED_CONTEXT), 'energy:very_low')
    expect(candidate?.context.lifeTagIds ?? []).toEqual([])
  })

  it('붙이자와 막자를 따로 센다', () => {
    const candidates = buildCandidates(INCONSISTENT)
    const positive = candidates.find((c) => c.type !== 'suppress')
    const negative = candidates.find((c) => c.type === 'suppress')
    expect(positive).toBeDefined()
    expect(negative).toBeDefined()
    expect(positive!.disagreeing).toBeGreaterThan(0)
  })

  it('같은 말이 문맥마다 다른 뜻이면 따로 묶는다', () => {
    const candidates = buildCandidates(SPLIT_CONTEXT)
    const joy = find(candidates, 'emotion:excitement')
    const anger = find(candidates, 'emotion:frustration')

    expect(joy).toBeDefined()
    expect(anger).toBeDefined()
    expect(joy!.context.lifeTagIds).toContain('creative:coding')
    expect(anger!.context.lifeTagIds).toContain('work:work_problem')
    expect(joy!.key).not.toBe(anger!.key)
  })
})

// ─────────────────────────────────────────────
// 4C — 승격
// ─────────────────────────────────────────────

describe('승격', () => {
  it('세 번 · 이틀 · 문맥이 있으면 붙이는 규칙이 된다', () => {
    const candidate = find(buildCandidates(WONT_VERIFIED), 'outcome:achievement')!
    expect(judge(candidate).promote).toBe(true)
    expect(toRule(candidate).status).toBe('active')
  })

  it('한 번만 나온 표현은 규칙이 되지 않는다', () => {
    const candidates = buildCandidates(ONE_OFF)
    for (const candidate of candidates) {
      expect(judge(candidate).promote).toBe(false)
    }
  })

  it('하루에 몰아서 세 번은 모자라다', () => {
    const candidate = find(buildCandidates(SAME_DAY_BURST), 'outcome:achievement')!
    const verdict = judge(candidate)
    expect(verdict.promote).toBe(false)
    expect(verdict.promote === false && verdict.reason).toBe('not-enough-days')
  })

  it('문맥이 없으면 올리지 않는다', () => {
    const candidate = find(buildCandidates(NO_SHARED_CONTEXT), 'energy:very_low')!
    const verdict = judge(candidate)
    expect(verdict.promote).toBe(false)
    expect(verdict.promote === false && verdict.reason).toBe('no-context')
  })

  it('막는 규칙은 세 번으로는 안 된다', () => {
    const three = find(buildCandidates(CROWD_REJECTS_THREE), 'social:crowd')!
    expect(three.type).toBe('suppress')
    expect(judge(three).promote).toBe(false)
  })

  it('막는 규칙은 네 번이 쌓여야 한다', () => {
    const four = find(buildCandidates(CROWD_REJECTS), 'social:crowd')!
    expect(four.agreeing).toBeGreaterThanOrEqual(SUPPRESS_MIN_COUNT)
    expect(judge(four).promote).toBe(true)
    expect(toRule(four).suppressedTagId).toBe('social:crowd')
  })

  it('방향이 오락가락하면 올리지 않는다', () => {
    const candidate = find(buildCandidates(INCONSISTENT), 'body:rested')!
    expect(judge(candidate).promote).toBe(false)
  })

  it('사용자가 직접 정하면 조건을 따지지 않는다', () => {
    const candidate = find(buildCandidates(ONE_OFF), 'outcome:achievement')
    if (!candidate) return
    expect(judge(candidate, true).promote).toBe(true)
    expect(toRule(candidate, { userDefined: true }).status).toBe('active')
  })
})

describe('신뢰도', () => {
  const base = {
    weight: 3,
    distinctDays: 3,
    agreement: 1,
    specificity: 2,
    conflictCount: 0,
  }

  it('0과 1 사이다', () => {
    expect(confidenceOf(base)).toBeGreaterThan(0)
    expect(confidenceOf(base)).toBeLessThanOrEqual(1)
  })

  it('많이 반복될수록 올라간다', () => {
    expect(confidenceOf({ ...base, weight: 8 })).toBeGreaterThan(confidenceOf(base))
  })

  it('여러 날에 걸칠수록 올라간다', () => {
    expect(confidenceOf({ ...base, distinctDays: 6 })).toBeGreaterThan(confidenceOf(base))
  })

  it('반대 교정이 있으면 내려간다', () => {
    expect(confidenceOf({ ...base, conflictCount: 2 })).toBeLessThan(confidenceOf(base))
  })

  it('사용자가 직접 만든 규칙은 계산하지 않는다', () => {
    expect(confidenceOf({ ...base, weight: 0, userDefined: true })).toBeGreaterThan(0.9)
  })

  it('단계로 바꿔서 보여 준다', () => {
    expect(tierOf({ correctionCount: 2, distinctDays: 2, conflictCount: 0, confidence: 0.6 }))
      .toBe('learning')
    expect(tierOf({ correctionCount: 5, distinctDays: 3, conflictCount: 0, confidence: 0.75 }))
      .toBe('reliable')
    expect(tierOf({ correctionCount: 9, distinctDays: 5, conflictCount: 0, confidence: 0.9 }))
      .toBe('strong')
  })
})

// ─────────────────────────────────────────────
// 똑같은 문장 기억
// ─────────────────────────────────────────────

describe('똑같은 문장 기억', () => {
  it('한 번 고치면 바로 기억한다', () => {
    const memories = buildMemories([
      makeEvent({
        text: '오늘 사람 너무 많아서 힘들진 않았음',
        kind: 'rejected',
        tagId: 'social:crowd',
        date: '2026-08-01',
      }),
    ])
    expect(memories).toHaveLength(1)
    expect(memories[0].suppressTagIds).toEqual(['social:crowd'])
  })

  it('짧은 문장은 기억하지 않는다', () => {
    const memories = buildMemories([
      makeEvent({ text: '졸림', kind: 'rejected', tagId: 'energy:sleepy', date: '2026-08-01' }),
    ])
    expect(memories).toEqual([])
  })

  it('글자 하나까지 같아야 꺼낸다', () => {
    const memory = newMemory(
      {
        normalizedText: '오늘 사람 너무 많아서 힘들진 않았음',
        addTagIds: [],
        suppressTagIds: ['social:crowd'],
      },
      { id: 'm1', userId: 'u1', now: '2026-08-01T00:00:00.000Z' },
    )

    expect(findMemory([memory], '오늘 사람 너무 많아서 힘들진 않았음')).toBe(memory)
    // 비슷한 문장까지 끌어다 쓰지 않는다
    expect(findMemory([memory], '오늘 콘서트 사람 너무 많아서 힘들었음')).toBeNull()
  })

  it('나중 판단이 앞선 판단을 덮는다', () => {
    const first = newMemory(
      { normalizedText: '사람 많아서 힘들었다', addTagIds: [], suppressTagIds: ['social:crowd'] },
      { id: 'm1', userId: 'u1', now: '2026-08-01T00:00:00.000Z' },
    )
    const merged = mergeMemory(first, {
      normalizedText: '사람 많아서 힘들었다',
      addTagIds: ['social:crowd'],
      suppressTagIds: [],
    })

    expect(merged.addTagIds).toContain('social:crowd')
    expect(merged.suppressTagIds).not.toContain('social:crowd')
  })
})

// ─────────────────────────────────────────────
// 4D / 4E — 적용
// ─────────────────────────────────────────────

describe('개인 규칙 적용', () => {
  const wontRule = () => asRule(find(buildCandidates(WONT_VERIFIED), 'outcome:achievement')!)
  const crowdRule = () => asRule(find(buildCandidates(CROWD_REJECTS), 'social:crowd')!)

  it('규칙이 없으면 built-in 과 결과가 같다', () => {
    const input = { text: '오늘 클라이밍 갔다' }
    expect(analyzeWithPersonal(input).tags.map((t) => t.tagId))
      .toEqual(analyze(input).tags.map((t) => t.tagId))
  })

  it('배운 표현을 알아듣는다', () => {
    const result = analyzeWithPersonal(
      { text: '오늘 클라이밍 가서 원트 했다', myTagIds: ['t-climb'] },
      { rules: [wontRule()] },
    )
    expect(result.tags.map((t) => t.tagId)).toContain('outcome:achievement')
    expect(result.fromRules).toContain('outcome:achievement')
  })

  it('개인 규칙이 붙인 태그는 built-in 과 구별된다', () => {
    const result = analyzeWithPersonal(
      { text: '오늘 클라이밍 가서 원트 했다', myTagIds: ['t-climb'] },
      { rules: [wontRule()] },
    )
    const tag = result.tags.find((t) => t.tagId === 'outcome:achievement')!
    expect(tag.source).toBe('rule')
    expect(tag.ruleId?.startsWith('personal/')).toBe(true)
  })

  it('문맥이 없으면 적용하지 않는다 — 촬영 원트는 클라이밍이 아니다', () => {
    const result = analyzeWithPersonal(
      { text: '오늘 촬영 원트로 끝남' },
      { rules: [wontRule()] },
    )
    expect(result.tags.map((t) => t.tagId)).not.toContain('outcome:achievement')
  })

  it('부정문에는 적용하지 않는다', () => {
    const result = analyzeWithPersonal(
      { text: '오늘 클라이밍 갔는데 원트 안 했다', myTagIds: ['t-climb'] },
      { rules: [wontRule()] },
    )
    expect(result.fromRules).not.toContain('outcome:achievement')
  })

  it('미래 이야기에는 적용하지 않는다', () => {
    const result = analyzeWithPersonal(
      { text: '내일 클라이밍 가서 원트할 거야', myTagIds: ['t-climb'] },
      { rules: [wontRule()] },
    )
    expect(result.fromRules).not.toContain('outcome:achievement')
  })

  it('멈춘 규칙은 적용하지 않는다', () => {
    const paused = { ...wontRule(), status: 'paused' as const }
    const result = analyzeWithPersonal(
      { text: '오늘 클라이밍 가서 원트 했다', myTagIds: ['t-climb'] },
      { rules: [paused] },
    )
    expect(result.fromRules).toEqual([])
  })

  it('아직 후보인 규칙은 적용하지 않는다', () => {
    const candidate = { ...wontRule(), status: 'candidate' as const }
    const result = analyzeWithPersonal(
      { text: '오늘 클라이밍 가서 원트 했다', myTagIds: ['t-climb'] },
      { rules: [candidate] },
    )
    expect(result.fromRules).toEqual([])
  })

  it('막는 규칙이 built-in 태그를 뺀다', () => {
    const text = '사무실에 사람 많았다'
    const before = analyze({ text }).tags.map((t) => t.tagId)
    const after = analyzeWithPersonal({ text }, { rules: [crowdRule()] })

    if (before.includes('social:crowd')) {
      expect(after.tags.map((t) => t.tagId)).not.toContain('social:crowd')
      expect(after.suppressed).toContain('social:crowd')
    }
  })

  it('똑같은 문장 기억이 규칙보다 세다', () => {
    const memory = newMemory(
      {
        normalizedText: '오늘 클라이밍 가서 원트 했다',
        addTagIds: [],
        suppressTagIds: ['outcome:achievement'],
      },
      { id: 'm1', userId: 'u1', now: '2026-08-01T00:00:00.000Z' },
    )

    const result = analyzeWithPersonal(
      { text: '오늘 클라이밍 가서 원트 했다', myTagIds: ['t-climb'] },
      { rules: [wontRule()], memories: [memory] },
    )
    expect(result.tags.map((t) => t.tagId)).not.toContain('outcome:achievement')
    expect(result.memoryUsed).toBe('m1')
  })

  it('이 기록에서 아니라고 한 태그는 어떤 규칙도 되살리지 못한다', () => {
    const rejected = autoTag('outcome:achievement', { userRejected: true })
    const result = analyzeWithPersonal(
      { text: '오늘 클라이밍 가서 원트 했다', myTagIds: ['t-climb'] },
      { rules: [wontRule()], previous: [rejected] },
    )
    const tag = result.tags.find((t) => t.tagId === 'outcome:achievement')
    expect(tag?.userRejected).toBe(true)
  })

  it('사용자가 직접 고른 태그는 그대로 남는다', () => {
    const picked = autoTag('emotion:pride', { source: 'user', userVerified: true, confidence: 1 })
    const result = analyzeWithPersonal({ text: '오늘 그냥 쉬었다' }, { previous: [picked] })
    expect(result.tags.map((t) => t.tagId)).toContain('emotion:pride')
  })

  it('규칙이 깨져도 built-in 태깅은 살아남는다', () => {
    const broken = { ...wontRule(), context: null as never }
    const result = analyzeWithPersonal({ text: '오늘 클라이밍 갔다' }, { rules: [broken] })
    expect(result.tags.map((t) => t.tagId)).toContain('sport:climbing')
  })

  it('사전에서 사라진 태그는 붙이지 않는다', () => {
    const stale = { ...wontRule(), targetTagId: 'outcome:does_not_exist' }
    const result = analyzeWithPersonal(
      { text: '오늘 클라이밍 가서 원트 했다', myTagIds: ['t-climb'] },
      { rules: [stale] },
    )
    expect(result.fromRules).toEqual([])
  })

  it('구체적인 규칙이 먼저 걸린다', () => {
    const broad = asRule(find(buildCandidates(WONT_VERIFIED), 'outcome:achievement')!, {
      id: 'broad',
      context: { temporalContext: 'present' },
      specificity: 1,
    })
    const narrow = asRule(find(buildCandidates(WONT_VERIFIED), 'outcome:achievement')!, {
      id: 'narrow',
      specificity: 3,
    })

    const result = analyzeWithPersonal(
      { text: '오늘 클라이밍 가서 원트 했다', myTagIds: ['t-climb'] },
      { rules: [broad, narrow] },
    )
    const tag = result.tags.find((t) => t.tagId === 'outcome:achievement')
    expect(tag?.ruleId).toBe('personal/narrow')
  })
})

// ─────────────────────────────────────────────
// 4F — 한살이
// ─────────────────────────────────────────────

describe('규칙 한살이', () => {
  const rule = (over: Partial<PersonalRule> = {}): PersonalRule =>
    asRule(find(buildCandidates(WONT_VERIFIED), 'outcome:achievement')!, over)

  const NOW = new Date('2026-08-20T00:00:00.000Z').getTime()
  const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString()

  it('반대 교정이 쌓이면 멈춘다', () => {
    const r = rule({ conflictCount: 2, status: 'active' })
    expect(review(r, NOW).status).toBe('paused')
  })

  it('멈춰도 지우지는 않는다', () => {
    const r = applyReview(rule({ conflictCount: 3, status: 'active' }), NOW)
    expect(r.status).toBe('paused')
    expect(r.correctionCount).toBeGreaterThan(0)
  })

  it('오래 안 쓰이면 조금씩 힘이 빠진다', () => {
    const r = rule({
      status: 'active',
      lastMatchedAt: daysAgo(70),
      lastCorrectedAt: daysAgo(70),
      updatedAt: daysAgo(70),
    })
    const change = review(r, NOW)
    expect(change.reason).toBe('idle-decay')
    expect(change.confidence).toBeLessThan(r.confidence)
  })

  it('아주 오래되면 물러난다', () => {
    const r = rule({
      status: 'active',
      lastMatchedAt: daysAgo(200),
      lastCorrectedAt: daysAgo(200),
      updatedAt: daysAgo(200),
    })
    expect(review(r, NOW).status).toBe('deprecated')
  })

  it('시간만 지났다고 지우지 않는다', () => {
    const r = applyReview(
      rule({ status: 'active', lastMatchedAt: daysAgo(200), updatedAt: daysAgo(200) }),
      NOW,
    )
    expect(r.trigger).toBe('원트')
    expect(r.correctionCount).toBeGreaterThan(0)
  })

  it('사용자가 직접 만든 규칙은 시스템이 끄지 않는다', () => {
    const r = rule({
      userDefined: true,
      conflictCount: 5,
      status: 'active',
      updatedAt: daysAgo(300),
    })
    expect(review(r, NOW).status).toBe('active')
  })

  it('반대 교정 한 번은 힘만 깎는다', () => {
    const r = rule({ status: 'active' })
    const weaker = weaken(r)
    expect(weaker.conflictCount).toBe(r.conflictCount + 1)
    expect(weaker.confidence).toBeLessThan(r.confidence)
    expect(weaker.status).toBe('active')
  })

  it('충돌이 정리되면 다시 쓴다', () => {
    const r = rule({ status: 'paused', conflictCount: 0, confidence: 0.8 })
    expect(review(r, NOW).status).toBe('active')
  })

  it('힘이 너무 빠지면 적용하지 않는다', () => {
    const r = rule({ status: 'active', confidence: MIN_ACTIVE_CONFIDENCE - 0.1 })
    expect(review(r, NOW).status).toBe('paused')
  })

  it('근거가 더 쌓이면 후보가 규칙이 된다', () => {
    const candidate = find(buildCandidates(WONT_VERIFIED), 'outcome:achievement')!
    const waiting = rule({ status: 'candidate' })
    expect(reinforce(waiting, candidate).status).toBe('active')
  })
})

// ─────────────────────────────────────────────
// 자기 강화 막기 · 저장 흐름
// ─────────────────────────────────────────────

describe('안전장치', () => {
  it('규칙이 자동으로 붙인 태그는 학습 근거가 아니다', () => {
    const log = makeLog()
    const auto = [autoTag('outcome:achievement', { source: 'rule', ruleId: 'personal/r1' })]
    const events = extractCorrections(log, [], auto, { newId: nextId })
    expect(events).toEqual([])
  })

  it('규칙이 있어도 저장 흐름은 그대로다', () => {
    const stamp = retag(
      { mood: 3, text: '오늘 클라이밍 가서 원트 했다', myTagIds: ['t-climb'] },
      { rules: [asRule(find(buildCandidates(WONT_VERIFIED), 'outcome:achievement')!)] },
    )
    expect(stamp.lifeTags.map((t) => t.tagId)).toContain('outcome:achievement')
    expect(stamp.taggedRuleVersion).toBeGreaterThanOrEqual(1)
  })

  it('규칙이 이상해도 저장은 실패하지 않는다', () => {
    expect(() =>
      retag({ mood: 3, text: '클라이밍' }, { rules: [null as never] }),
    ).not.toThrow()
  })

  it('개인 규칙 태그도 사전에 있는 것만 쓴다', () => {
    const rule = asRule(find(buildCandidates(WONT_VERIFIED), 'outcome:achievement')!)
    expect(rule.targetTagId).toBe('outcome:achievement')
  })
})

// ─────────────────────────────────────────────
// 전체 성적
// ─────────────────────────────────────────────

describe('전체 성적', () => {
  const SETS = [
    { name: '원트 (배워야 함)', events: WONT_VERIFIED, shouldPromote: true },
    { name: '기 빨림 (배워야 함)', events: DRAINED_VERIFIED, shouldPromote: true },
    { name: '사무실 사람 많음 (막아야 함)', events: CROWD_REJECTS, shouldPromote: true },
    { name: '한 번만 (배우면 안 됨)', events: ONE_OFF, shouldPromote: false },
    { name: '하루에 몰아서 (배우면 안 됨)', events: SAME_DAY_BURST, shouldPromote: false },
    { name: '오락가락 (배우면 안 됨)', events: INCONSISTENT, shouldPromote: false },
    { name: '문맥 없음 (배우면 안 됨)', events: NO_SHARED_CONTEXT, shouldPromote: false },
    { name: '부정문 (배우면 안 됨)', events: NEGATED_REJECTS, shouldPromote: false },
    { name: '미래 (배우면 안 됨)', events: FUTURE_REJECTS, shouldPromote: false },
    { name: '남의 이야기 (배우면 안 됨)', events: OTHER_PERSON, shouldPromote: false },
    { name: '세 번 거절 (아직 안 됨)', events: CROWD_REJECTS_THREE, shouldPromote: false },
  ]

  const measured = SETS.map((set) => {
    const candidates = buildCandidates(learnableOnly(set.events))
    const promoted = candidates.filter((c) => judge(c).promote)
    return { ...set, candidates: candidates.length, promoted: promoted.length }
  })

  for (const set of measured) {
    it(set.name, () => {
      if (set.shouldPromote) expect(set.promoted).toBeGreaterThan(0)
      else expect(set.promoted).toBe(0)
    })
  }

  it('잘못 올라간 규칙이 하나도 없다', () => {
    const wrong = measured.filter((s) => !s.shouldPromote && s.promoted > 0)
    expect(wrong.map((s) => s.name)).toEqual([])
  })

  it('성적표', () => {
    const total = measured.reduce((n, s) => n + s.candidates, 0)
    const promoted = measured.reduce((n, s) => n + s.promoted, 0)
    const shouldNot = measured.filter((s) => !s.shouldPromote)
    const falsePromotions = shouldNot.reduce((n, s) => n + s.promoted, 0)

    console.log(
      `시나리오 ${measured.length}개 · 후보 ${total}개 · 승격 ${promoted}개`
        + ` · 잘못 승격 ${falsePromotions}건`,
    )
    expect(falsePromotions).toBe(0)
  })
})

// ─────────────────────────────────────────────
// 나머지 시나리오
// ─────────────────────────────────────────────

describe('줄기 일반화', () => {
  it('종목이 달라도 같은 줄기면 그 위에서 만난다', () => {
    const candidate = find(buildCandidates(HIERARCHY_CONTEXT), 'body:rested')!
    // 러닝·자전거·요가는 전부 활동:운동 아래다
    expect(candidate.context.lifeTagIds).toContain('activity:exercise')
    expect(candidate.context.lifeTagIds).not.toContain('sport:running')
  })

  it('줄기 문맥으로도 규칙이 걸린다', () => {
    const rule = asRule(find(buildCandidates(HIERARCHY_CONTEXT), 'body:rested')!)
    const result = analyzeWithPersonal({ text: '수영하고 나니 개운함' }, { rules: [rule] })
    // 수영은 activity:exercise 아래라 문맥이 성립한다
    expect(result.tags.map((t) => t.tagId)).toContain('body:rested')
  })
})

describe('표현 매핑', () => {
  it('내가 자주 쓰는 말을 뜻에 이어 준다', () => {
    const candidate = find(buildCandidates(MENTAL_ALIAS), 'mental:overwhelmed')!
    expect(candidate.type).toBe('alias')
    expect(candidate.trigger.replace(/\s/g, '')).toBe('멘탈갈림')
    expect(judge(candidate).promote).toBe(true)
  })

  it('띄어쓰기가 달라도 같은 규칙 하나다', () => {
    const candidates = buildCandidates(MENTAL_ALIAS)
    expect(candidates.filter((c) => c.tagId === 'mental:overwhelmed')).toHaveLength(1)
  })
})

describe('배울 게 없는 반복', () => {
  it('흔한 말만 겹치면 규칙을 만들지 않는다', () => {
    const candidates = buildCandidates(ONLY_COMMON_WORDS)
    for (const candidate of candidates) expect(judge(candidate).promote).toBe(false)
  })

  it('숫자만 다른 문장에서는 배우지 않는다', () => {
    const candidates = buildCandidates(NUMERIC_ONLY)
    for (const candidate of candidates) {
      expect(isLearnableTrigger(candidate.trigger)).toBe(true)
      // 숫자 부분은 후보가 되지 않는다
      expect(/\d/.test(candidate.trigger)).toBe(false)
    }
  })

  it('두 번은 아직 모자라다', () => {
    const candidate = find(buildCandidates(ALMOST_THERE), 'energy:high')!
    expect(candidate.agreeing).toBe(2)
    expect(judge(candidate).promote).toBe(false)
  })
})

describe('직접 넣은 태그가 반복될 때', () => {
  it('사용자가 채워 넣은 것은 센 신호다', () => {
    const candidate = find(buildCandidates(APP_BUILDING), 'creative:building')!
    expect(candidate.type).toBe('positive')
    // added 는 무게 1.0, verified 는 0.8 — 같은 횟수면 added 쪽이 더 무겁다
    expect(candidate.weight).toBe(3)
    expect(judge(candidate).promote).toBe(true)
  })
})

describe('사전 판이 바뀌어도', () => {
  it('규칙은 태그 id 로 저장돼서 이름이 바뀌어도 살아 있다', () => {
    const rule = asRule(find(buildCandidates(MENTAL_ALIAS), 'mental:overwhelmed')!)
    expect(rule.targetTagId).toBe('mental:overwhelmed')
    // 화면에 보여 줄 이름을 저장해 두지 않는다
    expect(JSON.stringify(rule)).not.toContain('벅참')
  })

  it('예전 판으로 만든 규칙도 그대로 적용된다', () => {
    const old = asRule(find(buildCandidates(MENTAL_ALIAS), 'mental:overwhelmed')!, {
      taxonomyVersion: 0,
      ruleVersion: 0,
    })
    const result = analyzeWithPersonal(
      { text: '오늘 멘탈 갈림 진짜 마감 때문에' },
      { rules: [old] },
    )
    expect(result.tags.map((t) => t.tagId)).toContain('mental:overwhelmed')
  })
})

describe('QA 규모', () => {
  it('시나리오 자료가 충분하다', () => {
    const events = ALL_EVENTS.length
    const fixtures = events + BAD_TRIGGERS.length + GOOD_TRIGGERS.length
    console.log(
      `학습 시나리오 ${ALL_SCENARIOS.length}묶음 · 교정 사건 ${events}개`
        + ` · 표현 검사 ${BAD_TRIGGERS.length + GOOD_TRIGGERS.length}개 · 합계 ${fixtures}`,
    )
    expect(fixtures).toBeGreaterThanOrEqual(80)
  })

  it('모든 시나리오에서 잘못 배운 규칙이 없다', () => {
    // 배워도 되는 묶음만 승격돼야 한다
    const shouldLearn = new Set([
      'outcome:achievement',
      'energy:drained',
      'social:crowd',
      'emotion:excitement',
      'emotion:frustration',
      'body:rested',
      'mental:overwhelmed',
      'creative:building',
      'work:deep_work',
      'mental:deep_focus',
      'energy:very_low',
    ])

    for (const events of ALL_SCENARIOS) {
      for (const candidate of buildCandidates(learnableOnly(events))) {
        if (!judge(candidate).promote) continue
        expect(shouldLearn.has(candidate.tagId)).toBe(true)
      }
    }
  })
})
