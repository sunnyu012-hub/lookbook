/**
 * Phase 7 — 나만의 발견 QA.
 *
 * 여기서 가장 중요한 시험은 "열리는 것" 이 아니라 "안 열리는 것" 이다.
 * 조합을 훑는 엔진은 아무 데이터에서나 뭔가를 찾아내기 때문에,
 * 아무 패턴 없는 사람에게서 0이 나오는지가 이 엔진을 믿을 근거다.
 */
import { describe, expect, it, vi } from 'vitest'
import { applyChanging, evaluateCollection, evaluationWindow } from '@/lib/os2/dna'
import type { EvaluationInput } from '@/lib/os2/dna/types'
import {
  ACTIVE_CAP,
  MIN_COMBINATION_LIFT,
  MONTHLY_LIMIT,
  buildCandidates,
  buildPersonalView,
  checkNaming,
  combinationLiftOf,
  descriptionOf,
  emptyBudget,
  evaluatePersonal,
  fallbackDescription,
  fallbackTitle,
  fingerprintOf,
  isKnown,
  jaccard,
  knownFrom,
  nameOne,
  namePending,
  prepare,
  rankCandidates,
  runLifecycle,
  titleOf,
  bannedWordIn,
  type NamingRequest,
  type PersonalCandidate,
  type PersonalContext,
  type PersonalDiscoveryNamingService,
  type PersonalDiscoveryRecord,
} from '@/lib/os2/dna/personal'
import * as F from './fixtures/longUser'

// ─────────────────────────────────────────────

const inputFor = (data: F.UserData, today = F.END): EvaluationInput => ({
  logs: data.logs,
  checkins: data.checkins,
  myTags: data.myTags,
  window: evaluationWindow(data.logs, today),
  today,
})

const nameOfMyTag = (data: F.UserData) => (id: string) =>
  data.myTags.find((t) => t.id === id)?.name

function evaluate(data: F.UserData, today = F.END, previous: PersonalDiscoveryRecord[] = []) {
  const input = inputFor(data, today)
  const dna = applyChanging(evaluateCollection(input, {}), input, [])
  return evaluatePersonal(input, {
    dnaRecords: dna.records,
    previous,
    myTagNameOf: nameOfMyTag(data),
    now: () => '2025-12-31T00:00:00.000Z',
  })
}

const open = (records: readonly PersonalDiscoveryRecord[]) =>
  records.filter((r) => r.state !== 'LOCKED')

// ─────────────────────────────────────────────
// 7A — 후보
// ─────────────────────────────────────────────

describe('7A 개인 조합 후보', () => {
  it('겹쳐야만 보이는 조합을 찾는다', () => {
    const data = F.buildPersonalUser()
    const candidates = buildCandidates(inputFor(data), { myTagNameOf: nameOfMyTag(data) })

    const found = candidates.find(
      (c) =>
        c.metric === 'energy'
        && c.contexts.length === 2
        && c.contexts.some((x) => x.key === 'place:cafe')
        && c.contexts.some((x) => x.key === 'creative:writing'),
    )

    expect(found).toBeDefined()
    expect(found!.direction).toBe(1)
    expect(Math.abs(found!.measurement.effect)).toBeGreaterThan(1)
    expect(found!.measurement.distinctDays).toBeGreaterThanOrEqual(7)
  })

  it('느낌을 나타내는 태그는 조합의 재료로 쓰지 않는다', () => {
    const data = F.buildPatternedUser()
    const candidates = buildCandidates(inputFor(data), { myTagNameOf: nameOfMyTag(data) })

    for (const candidate of candidates) {
      for (const context of candidate.contexts) {
        if (context.kind !== 'tag') continue
        expect(context.key.startsWith('emotion:')).toBe(false)
        expect(context.key.startsWith('mental:')).toBe(false)
        expect(context.key.startsWith('energy:')).toBe(false)
        expect(context.key.startsWith('body:')).toBe(false)
      }
    }
  })

  it('조상과 자손을 같은 조합에 넣지 않는다', () => {
    const data = F.buildPatternedUser()
    const candidates = buildCandidates(inputFor(data), { myTagNameOf: nameOfMyTag(data) })

    const bad = candidates.find(
      (c) =>
        c.contexts.some((x) => x.key === 'sport:climbing')
        && c.contexts.some((x) => x.key === 'activity:exercise'),
    )
    expect(bad).toBeUndefined()
  })

  it('지문은 순서를 타지 않는다', () => {
    const a: PersonalContext = { kind: 'tag', key: 'place:cafe', label: '카페' }
    const b: PersonalContext = { kind: 'dayPart', key: 'morning', label: '아침' }
    expect(fingerprintOf('energy', 1, [a, b])).toBe(fingerprintOf('energy', 1, [b, a]))
    expect(fingerprintOf('energy', 1, [a, b])).not.toBe(fingerprintOf('energy', -1, [a, b]))
  })
})

// ─────────────────────────────────────────────
// 7B — 새로운가
// ─────────────────────────────────────────────

describe('7B 새로움과 중복', () => {
  it('조각 하나만 봐도 나오는 조합은 남기지 않는다', () => {
    const data = F.buildPatternedUser()
    const candidates = buildCandidates(inputFor(data), { myTagNameOf: nameOfMyTag(data) })

    // 이 사용자의 조합은 전부 "클라이밍" 이나 "회의" 하나로 설명된다
    expect(candidates.length).toBeGreaterThan(0)
    for (const candidate of candidates) {
      expect(combinationLiftOf(candidate)).toBeLessThan(MIN_COMBINATION_LIFT)
    }
  })

  it('48개가 이미 말한 이야기는 다시 하지 않는다', () => {
    const data = F.buildPersonalUser()
    const input = inputFor(data)
    const candidates = buildCandidates(input, { myTagNameOf: nameOfMyTag(data) })
    const target = candidates.find((c) => c.contexts.length === 2)!

    const known = [
      {
        metric: target.metric,
        direction: target.direction,
        tagIds: target.contexts.filter((c) => c.kind === 'tag').map((c) => c.key),
      },
    ]

    expect(isKnown(target, known)).toBe(true)
    expect(rankCandidates(candidates, { logs: data.logs, known, existing: [] })).toHaveLength(0)
  })

  it('조각을 더 붙였는데 더 커지지 않으면 버린다', () => {
    const data = F.buildPersonalUser()
    const input = inputFor(data)
    const candidates = buildCandidates(input, { myTagNameOf: nameOfMyTag(data) })

    const two = candidates.find((c) => c.contexts.length === 2)
    const three = candidates.find((c) => c.contexts.length === 3)
    expect(two).toBeDefined()
    expect(three).toBeDefined()

    const ranked = rankCandidates(candidates, { logs: data.logs, known: [], existing: [] })
    expect(ranked).toHaveLength(1)
    expect(ranked[0].contexts).toHaveLength(2)
  })

  it('겹치는 정도를 잰다', () => {
    expect(jaccard(['a', 'b'], ['a', 'b'])).toBe(1)
    expect(jaccard(['a', 'b'], ['a', 'c'])).toBeCloseTo(1 / 3)
    expect(jaccard([], ['a'])).toBe(0)
  })

  it('열려 있는 48개에서 이미 말한 태그를 읽어 온다', () => {
    const data = F.buildPatternedUser()
    const input = inputFor(data)
    const dna = applyChanging(evaluateCollection(input, {}), input, [])
    const known = knownFrom(dna.records)
    expect(known.length).toBeGreaterThan(0)
    for (const k of known) expect(k.tagIds.length).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────
// 열리면 안 되는 사람들 — 이 시험이 제일 중요하다
// ─────────────────────────────────────────────

describe('거짓 발견이 없어야 한다', () => {
  const quiet: Array<[string, () => F.UserData]> = [
    ['아무 패턴 없음', F.buildRandomUser],
    ['기록이 드묾', F.buildSparseUser],
    ['하루에 몰림', F.buildOneDayHeavyUser],
    ['며칠만 튐', F.buildOutlierUser],
    ['교란된 문맥', F.buildConfoundedUser],
    ['패턴이 바뀜', F.buildChangingUser],
    ['48개로 이미 설명됨', F.buildPatternedUser],
  ]

  for (const [name, build] of quiet) {
    it(`${name} — 나만의 발견 0개`, () => {
      expect(open(evaluate(build()).records)).toHaveLength(0)
    })
  }
})

// ─────────────────────────────────────────────
// 7C — 일생
// ─────────────────────────────────────────────

describe('7C 나만의 발견의 일생', () => {
  it('진짜 조합은 하나 열린다', () => {
    const result = evaluate(F.buildPersonalUser())
    const found = open(result.records)

    expect(found).toHaveLength(1)
    expect(found[0].state).not.toBe('LOCKED')
    expect(found[0].evidence).toHaveLength(1)
    expect(found[0].contexts.map((c) => c.key).sort()).toEqual([
      'creative:writing',
      'place:cafe',
    ])
  })

  it('한 바퀴에 하나까지만 연다', () => {
    const data = F.buildPersonalUser()
    const input = inputFor(data)
    // 순위를 매기기 전의 후보를 그대로 넣는다 — 둘 다 문턱은 넘은 것들이다
    const candidates = buildCandidates(input, { myTagNameOf: nameOfMyTag(data) })
    expect(candidates.length).toBeGreaterThanOrEqual(2)

    const result = runLifecycle(input, candidates, { now: () => 'now' })
    expect(result.newlyFound).toHaveLength(1)
    expect(result.waiting).toBeGreaterThanOrEqual(1)
  })

  it('동시에 열려 있는 개수에 상한이 있다', () => {
    const data = F.buildPersonalUser()
    const input = inputFor(data)
    const candidates = buildCandidates(input, { myTagNameOf: nameOfMyTag(data) })

    const filler: PersonalDiscoveryRecord[] = Array.from({ length: ACTIVE_CAP }, (_, i) => ({
      fingerprint: `filler-${i}`,
      metric: 'mood',
      direction: 1,
      // 다시 재도 사라지지 않게, 기록에 없는 조각으로 채운다
      contexts: [{ kind: 'myTag', key: `absent-${i}`, label: '없음' }],
      state: 'GROWING',
      peakState: 'GROWING',
      novelty: 0.5,
      namingStatus: 'fallback',
      componentEffects: [],
      evidence: [],
      firstFoundAt: null,
      stateChangedAt: null,
      lastEvaluatedAt: 'now',
    }))

    const result = runLifecycle(input, candidates, { previous: filler, now: () => 'now' })
    expect(result.newlyFound).toHaveLength(0)
    expect(result.waiting).toBeGreaterThan(0)
  })

  it('다시 평가해도 같은 발견이고 근거가 늘어나지 않는다', () => {
    const data = F.buildPersonalUser()
    const first = evaluate(data)
    const second = evaluate(data, F.END, first.records)

    expect(open(second.records)).toHaveLength(1)
    expect(second.records[0].fingerprint).toBe(first.records[0].fingerprint)
    expect(second.records[0].evidence).toHaveLength(1)
    expect(second.newlyFound).toHaveLength(0)
  })

  it('약해지면 지우지 않고 달라지는 중으로 옮긴다', () => {
    const data = F.buildPersonalChangingUser()
    const before = F.addDays(F.START, 300)

    const settled = evaluate(data, before)
    expect(open(settled.records)).toHaveLength(1)
    expect(settled.records[0].state).toBe('ESTABLISHED')

    const later = evaluate(data, F.END, settled.records)
    const record = later.records[0]

    expect(record.state).toBe('CHANGING')
    // 예전 근거는 그대로 남는다
    expect(record.peakState).toBe('ESTABLISHED')
    expect(record.evidence.length).toBeGreaterThanOrEqual(1)
    expect(record.evidence[0].state).toBe('ESTABLISHED')
  })

  it('사용자가 고친 것은 재평가로 지워지지 않는다', () => {
    const data = F.buildPersonalUser()
    const first = evaluate(data)
    const edited = first.records.map((r) => ({
      ...r,
      userTitle: '카페 아침',
      userPerception: 'agree' as const,
      hidden: true,
    }))

    const second = evaluate(data, F.END, edited)
    expect(second.records[0].userTitle).toBe('카페 아침')
    expect(second.records[0].userPerception).toBe('agree')
    expect(second.records[0].hidden).toBe(true)
  })
})

// ─────────────────────────────────────────────
// 7D / 7G — AI 에 무엇을 보내는가
// ─────────────────────────────────────────────

const CONTEXTS: PersonalContext[] = [
  { kind: 'myTag', key: 'mt-partner', label: '성현' },
  { kind: 'tag', key: 'place:cafe', label: '카페' },
]

const RECORD = { contexts: CONTEXTS, metric: 'mood' as const, direction: 1 as const }

const service = (answer: unknown, spy?: { calls: number }): PersonalDiscoveryNamingService => ({
  async name() {
    if (spy) spy.calls += 1
    return answer as never
  },
})

describe('7D AI 에 보내는 것', () => {
  it('사람 이름처럼 보이는 My Tag 는 자리표로 바꿔서 보낸다', () => {
    const prepared = prepare(RECORD)
    expect(prepared.request.contexts).toEqual(['PERSON_TAG_1', '카페'])
    expect(JSON.stringify(prepared.request)).not.toContain('성현')
  })

  it('원문·사진·날짜·숫자는 보내지 않는다', () => {
    const prepared = prepare(RECORD)
    const keys = Object.keys(prepared.request).sort()
    expect(keys).toEqual(['contexts', 'direction', 'language', 'metric'])
    expect(JSON.stringify(prepared.request)).not.toMatch(/\d{4}-\d{2}-\d{2}/)
  })

  it('돌아온 문장의 자리표는 원래 이름으로 되돌린다', async () => {
    const outcome = await nameOne(
      RECORD,
      service({
        title: 'PERSON_TAG_1과 카페',
        description: 'PERSON_TAG_1과 카페가 함께 적힌 날에 기분이 높게 나타났어요.',
      }),
    )
    expect(outcome.status).toBe('named')
    expect(outcome.title).toBe('성현과 카페')
    expect(outcome.description).toContain('성현')
    expect(outcome.description).not.toContain('PERSON_TAG')
  })
})

describe('7E 안전장치', () => {
  const labels = ['성현', '카페']

  it('규정하는 말을 막는다', () => {
    expect(checkNaming({ title: '카페형 인간', description: '당신은 카페에서 좋아져요.' }, { labels }).ok).toBe(false)
    expect(checkNaming({ title: '카페 시간', description: '타고난 카페 체질이에요.' }, { labels }).reason).toBe('banned-word')
  })

  it('AI 가 숫자를 지어내면 막는다', () => {
    const check = checkNaming(
      { title: '카페 시간', description: '카페에서 기분이 3.8로 기록됐어요.' },
      { labels },
    )
    expect(check.ok).toBe(false)
    expect(check.reason).toBe('invented-number')
  })

  it('준 적 없는 태그 이름을 끌어오면 막는다', () => {
    const check = checkNaming(
      { title: '카페 시간', description: '카페와 클라이밍이 함께 적힌 날이에요.' },
      { labels },
    )
    expect(check.reason).toBe('invented-context')
  })

  it('준 조각을 하나도 말하지 않으면 막는다', () => {
    expect(
      checkNaming({ title: '어떤 무렵', description: '그때는 그랬던 것 같아요.' }, { labels }).reason,
    ).toBe('ungrounded')
  })

  it('길이와 모양을 본다', () => {
    expect(checkNaming({ title: '카', description: '카페' }, { labels }).reason).toBe('too-short')
    expect(checkNaming({ title: '카페'.repeat(20), description: '카페에서요 그랬어요' }, { labels }).reason).toBe('too-long')
    expect(checkNaming({ title: '{카페}', description: '카페에서 그랬어요' }, { labels }).reason).toBe('shape')
    expect(checkNaming({ title: '', description: '' }, { labels }).reason).toBe('empty')
  })

  it('자리표가 그대로 새어 나오면 막는다', () => {
    expect(
      checkNaming(
        { title: '카페 시간', description: 'PERSON_TAG_2와 카페에서 그랬어요.' },
        { labels },
      ).reason,
    ).toBe('placeholder-leak')
  })

  it('앱이 만드는 문장에는 금지어가 없고 조사가 맞는다', () => {
    const text = fallbackDescription(RECORD)
    expect(bannedWordIn(text)).toBeNull()
    expect(text).toContain('성현과 카페가')
    expect(text).toContain('기분이')
    expect(fallbackTitle(RECORD)).toBe('성현 + 카페')
  })

  it('막힌 이름은 앱이 만든 문장으로 대신한다', async () => {
    const spy = { calls: 0 }
    const outcome = await nameOne(
      RECORD,
      service({ title: '카페 체질', description: '당신은 카페에서 좋아져요.' }, spy),
    )
    expect(outcome.status).toBe('fallback')
    expect(outcome.note).toBe('banned-word')
    expect(outcome.title).toBe(fallbackTitle(RECORD))
    // 재시도는 0회다
    expect(spy.calls).toBe(1)
  })

  it('AI 가 죽어도 발견은 그대로 열린다', async () => {
    const dead: PersonalDiscoveryNamingService = {
      async name() {
        throw new Error('502')
      },
    }
    const outcome = await nameOne(RECORD, dead)
    expect(outcome.status).toBe('fallback')
    expect(outcome.note).toBe('threw')
    expect(outcome.description).toBe(fallbackDescription(RECORD))
  })

  it('AI 가 없으면 없는 대로 돈다', async () => {
    const outcome = await nameOne(RECORD, null)
    expect(outcome.status).toBe('fallback')
    expect(outcome.note).toBe('no-service')
  })
})

// ─────────────────────────────────────────────
// 7G — 비용
// ─────────────────────────────────────────────

const pending = (n: number): PersonalDiscoveryRecord[] =>
  Array.from({ length: n }, (_, i) => ({
    fingerprint: `fp-${i}`,
    metric: 'mood',
    direction: 1,
    contexts: CONTEXTS,
    state: 'EMERGING',
    peakState: 'EMERGING',
    novelty: 0.6,
    namingStatus: 'pending',
    componentEffects: [],
    evidence: [],
    firstFoundAt: null,
    stateChangedAt: null,
    lastEvaluatedAt: 'now',
  }))

describe('7G 비용과 재호출', () => {
  const good = {
    title: '성현과 카페',
    description: '성현과 카페가 함께 적힌 날에 기분이 높게 나타났어요.',
  }

  it('한 달 상한을 넘으면 부르지 않는다', async () => {
    const spy = { calls: 0 }
    const result = await namePending(pending(MONTHLY_LIMIT + 3), service(good, spy), {
      budget: emptyBudget('2025-12'),
      now: () => '2025-12-01T00:00:00.000Z',
    })

    expect(spy.calls).toBe(MONTHLY_LIMIT)
    expect(result.calls).toBe(MONTHLY_LIMIT)
    expect(result.records.filter((r) => r.namingStatus === 'named')).toHaveLength(MONTHLY_LIMIT)
    expect(result.records.filter((r) => r.namingStatus === 'skipped')).toHaveLength(3)
  })

  it('한 번 이름이 붙은 발견은 다시 부르지 않는다', async () => {
    const spy = { calls: 0 }
    const first = await namePending(pending(1), service(good, spy), {
      budget: emptyBudget('2025-12'),
      now: () => '2025-12-01T00:00:00.000Z',
    })
    const second = await namePending(first.records, service(good, spy), {
      budget: first.budget,
      now: () => '2025-12-01T00:00:00.000Z',
    })

    expect(spy.calls).toBe(1)
    expect(second.calls).toBe(0)
    expect(second.records[0].generatedTitle).toBe(good.title)
  })

  it('실패한 이름도 다시 부르지 않는다', async () => {
    const spy = { calls: 0 }
    const first = await namePending(pending(1), service({ title: '치료 시간', description: '카페에서 치료가 됐어요.' }, spy), {
      budget: emptyBudget('2025-12'),
      now: () => '2025-12-01T00:00:00.000Z',
    })
    expect(first.records[0].namingStatus).toBe('fallback')

    const second = await namePending(first.records, service({ title: 'x', description: 'y' }, spy), {
      budget: first.budget,
      now: () => '2025-12-01T00:00:00.000Z',
    })
    expect(spy.calls).toBe(1)
    expect(second.calls).toBe(0)
  })

  it('앱을 다시 켜도 같은 조합이면 같은 지문이라 다시 부르지 않는다', () => {
    const data = F.buildPersonalUser()
    const first = evaluate(data)
    const restarted = evaluate(data, F.END, first.records)
    expect(restarted.records[0].fingerprint).toBe(first.records[0].fingerprint)
    expect(restarted.records[0].namingStatus).toBe(first.records[0].namingStatus)
  })

  it('AI 요청을 원문 그대로 로그에 남기지 않는다', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await nameOne(RECORD, {
      async name() {
        throw new Error('nope')
      },
    })
    expect(spy).not.toHaveBeenCalled()
    expect(errors).not.toHaveBeenCalled()
    spy.mockRestore()
    errors.mockRestore()
  })
})

// ─────────────────────────────────────────────
// 7F — 화면
// ─────────────────────────────────────────────

describe('7F 화면에 보이는 것', () => {
  const base = (): PersonalDiscoveryRecord => ({
    fingerprint: 'fp',
    metric: 'mood',
    direction: 1,
    contexts: CONTEXTS,
    state: 'GROWING',
    peakState: 'GROWING',
    novelty: 0.7,
    namingStatus: 'named',
    generatedTitle: 'AI 이름',
    generatedDescription: 'AI 문장',
    componentEffects: [{ label: '카페', effect: 0.3 }],
    evidence: [],
    firstFoundAt: null,
    stateChangedAt: null,
    lastEvaluatedAt: 'now',
  })

  it('사용자가 고친 이름이 언제나 이긴다', () => {
    const record = base()
    expect(titleOf(record)).toBe('AI 이름')
    expect(titleOf({ ...record, userTitle: '내 이름' })).toBe('내 이름')
    expect(titleOf({ ...record, generatedTitle: undefined })).toBe(fallbackTitle(record))
    expect(descriptionOf({ ...record, generatedDescription: undefined })).toBe(
      fallbackDescription(record),
    )
  })

  it('접어 둔 것은 지운 게 아니라 따로 담긴다', () => {
    const view = buildPersonalView([base(), { ...base(), fingerprint: 'fp2', hidden: true }])
    expect(view.cards).toHaveLength(1)
    expect(view.hidden).toHaveLength(1)
  })

  it('AI 가 이름을 지었다는 사실을 감추지 않는다', () => {
    const view = buildPersonalView([base()])
    expect(view.cards[0].aiNamed).toBe(true)
    // 이름 밑에는 언제나 실제 조각이 붙는다
    expect(view.cards[0].contexts).toHaveLength(2)
  })

  it('사용자가 이름을 고치면 AI 이름표를 떼어 낸다', () => {
    const view = buildPersonalView([{ ...base(), userTitle: '내 이름' }])
    expect(view.cards[0].aiNamed).toBe(false)
  })

  it('잠긴 것은 화면에 오지 않는다', () => {
    const view = buildPersonalView([{ ...base(), state: 'LOCKED' }])
    expect(view.cards).toHaveLength(0)
    expect(view.hidden).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────

describe('요청 모양', () => {
  it('NamingRequest 는 한국어를 요구한다', () => {
    const request: NamingRequest = prepare(RECORD).request
    expect(request.language).toBe('ko')
    expect(request.direction).toBe('higher')
    expect(request.metric).toBe('기분')
  })

  it('후보에는 언제나 문맥 보정 결과가 있다', () => {
    const data = F.buildPersonalUser()
    const candidates: PersonalCandidate[] = buildCandidates(inputFor(data), {
      myTagNameOf: nameOfMyTag(data),
    })
    for (const candidate of candidates) {
      expect(candidate.measurement.adjustedEffect).toBeDefined()
    }
  })
})

// ─────────────────────────────────────────────
// 성능 — 조합을 훑는 엔진이라 여기가 제일 무겁다
// ─────────────────────────────────────────────

describe('성능', () => {
  it('1년치 기록에서도 오래 걸리지 않는다', () => {
    const data = F.buildPatternedUser()
    const input = inputFor(data)
    const started = Date.now()
    evaluatePersonal(input, { myTagNameOf: nameOfMyTag(data), now: () => 'now' })
    const elapsed = Date.now() - started

    console.log(`기록 ${data.logs.length}개 · 365일 → 나만의 발견 평가 ${elapsed}ms`)
    expect(elapsed).toBeLessThan(2000)
  })

  it('평가가 통째로 실패해도 48개와 기록은 그대로다', () => {
    const data = F.buildPersonalUser()
    const input = inputFor(data)
    // 태그가 하나도 없는 기록만 넣으면 후보가 아예 안 나온다
    const empty = evaluatePersonal(
      { ...input, logs: data.logs.map((l) => ({ ...l, lifeTags: [], myTagIds: [] })) },
      { now: () => 'now' },
    )
    expect(empty.records).toHaveLength(0)
    expect(empty.newlyFound).toHaveLength(0)
  })
})
