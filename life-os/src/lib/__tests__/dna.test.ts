import { describe, expect, it } from 'vitest'
import {
  END,
  GROUND_TRUTH,
  START,
  addDays,
  buildChangingUser,
  buildConfoundedUser,
  buildOneDayHeavyUser,
  buildOutlierUser,
  buildPatternedUser,
  buildRandomUser,
  buildSparseUser,
  type UserData,
} from './fixtures/longUser'
import {
  ALL_DNA,
  BASE_COUNT,
  BASE_DNA,
  DISCOVERY_RULE_VERSION,
  EMERGING,
  ESTABLISHED,
  FAMILY_ORDER,
  GROWING,
  PERCEPTION_LABEL,
  STATE_SENTENCE,
  applyChanging,
  bestState,
  buildView,
  consistencyOf,
  evaluateCollection,
  evaluationWindow,
  getDna,
  judge,
  previewLocked,
  sameSide,
  type DiscoveryRecord,
  type Measurement,
} from '@/lib/os2/dna'
import { RARE_DNA } from '@/lib/os2/dna/registry/rare'
import { hasBannedWord } from '@/lib/os2/analytics'

const run = (data: UserData, to = END, previous: DiscoveryRecord[] = []) => {
  const window = evaluationWindow(data.logs, to)
  const input = { ...data, window, today: to }
  return applyChanging(evaluateCollection(input, { previous }), input, previous)
}

const open = (records: readonly DiscoveryRecord[]) =>
  records.filter((r) => r.state !== 'LOCKED')

const stateOf = (records: readonly DiscoveryRecord[], defId: string) =>
  records.find((r) => r.defId === defId)?.state ?? 'LOCKED'

// 무거운 fixture 는 한 번만 만든다
const PATTERNED = run(buildPatternedUser())
const RANDOM = run(buildRandomUser())
const SPARSE = run(buildSparseUser())
const HEAVY = run(buildOneDayHeavyUser())
const CONFOUNDED = run(buildConfoundedUser())
const OUTLIER = run(buildOutlierUser())

// ─────────────────────────────────────────────
// 6A / 6B — 사전
// ─────────────────────────────────────────────

describe('DNA 사전', () => {
  it('기본 DNA 가 정확히 48개다', () => {
    expect(BASE_COUNT).toBe(48)
    expect(BASE_DNA).toHaveLength(48)
  })

  it('RARE 는 48 에 들어가지 않는다', () => {
    for (const rare of RARE_DNA) {
      expect(BASE_DNA.some((d) => d.id === rare.id)).toBe(false)
      expect(rare.type).toBe('RARE')
    }
    expect(ALL_DNA.length).toBe(BASE_COUNT + RARE_DNA.length)
  })

  it('id 가 겹치지 않는다', () => {
    const ids = ALL_DNA.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('모든 DNA 에 이름·설명·아이콘·평가자가 있다', () => {
    for (const def of ALL_DNA) {
      expect(def.displayName.trim().length).toBeGreaterThan(0)
      expect(def.description.trim().length).toBeGreaterThan(0)
      expect(def.icon.trim().length).toBeGreaterThan(0)
      expect(typeof def.evaluator).toBe('function')
      expect(FAMILY_ORDER.includes(def.family) || def.family === 'compound').toBe(true)
    }
  })

  it('BASIC 에는 잠겼을 때 보여 줄 한 줄이 있다', () => {
    for (const def of BASE_DNA.filter((d) => d.type === 'BASIC')) {
      expect(def.teaser, def.id).toBeTruthy()
    }
  })

  it('HIDDEN 에는 teaser 를 두지 않는다 — 칸 자체가 안 보인다', () => {
    for (const def of BASE_DNA.filter((d) => d.type === 'HIDDEN')) {
      expect(def.teaser, def.id).toBeUndefined()
    }
  })

  it('teaser 에 해금 조건을 적지 않는다', () => {
    for (const def of BASE_DNA) {
      if (!def.teaser) continue
      expect(def.teaser).not.toMatch(/\d/)
      expect(def.teaser).not.toContain('개')
    }
  })
})

// ─────────────────────────────────────────────
// 문턱
// ─────────────────────────────────────────────

describe('문턱', () => {
  const def = getDna('evening_bloom')!

  const sample = (over: Partial<Measurement> = {}): Measurement => ({
    metric: 'mood',
    observed: 4.2,
    baseline: 3.5,
    effect: 0.7,
    sampleCount: 40,
    baselineSampleCount: 80,
    distinctDays: 20,
    durationDays: 90,
    consistency: 0.8,
    mean: 4.2,
    median: 4.1,
    weighting: 'day',
    window: { key: 'all', label: '', days: null, from: START, to: END },
    ...over,
  })

  it('충분하면 자리 잡는다', () => {
    expect(judge(def, sample()).state).toBe('ESTABLISHED')
  })

  it('단계마다 문턱이 올라간다', () => {
    expect(EMERGING.minimum.sampleCount).toBeLessThan(GROWING.minimum.sampleCount)
    expect(GROWING.minimum.sampleCount).toBeLessThan(ESTABLISHED.minimum.sampleCount)
    expect(EMERGING.effect).toBeLessThan(ESTABLISHED.effect)
    expect(EMERGING.consistency).toBeLessThan(ESTABLISHED.consistency)
  })

  it('표본이 모자라면 안 열린다', () => {
    const verdict = judge(def, sample({ sampleCount: 3 }))
    expect(verdict.state).toBe('LOCKED')
    expect(verdict.blockedBy).toBe('sample')
  })

  it('하루에 몰려 있으면 안 열린다', () => {
    expect(judge(def, sample({ distinctDays: 1 })).blockedBy).toBe('days')
  })

  it('기간이 짧으면 안 열린다', () => {
    expect(judge(def, sample({ durationDays: 3 })).blockedBy).toBe('duration')
  })

  it('차이가 작으면 안 열린다', () => {
    expect(judge(def, sample({ effect: 0.1 })).blockedBy).toBe('effect')
  })

  it('되풀이되지 않으면 안 열린다', () => {
    expect(judge(def, sample({ consistency: 0.3 })).blockedBy).toBe('consistency')
  })

  it('방향이 반대면 안 열린다', () => {
    expect(judge(def, sample({ effect: -0.7 })).blockedBy).toBe('effect')
  })

  it('평균과 중앙값이 어긋나면 자리 잡지 못한다', () => {
    // 며칠의 극단값이 평균을 끌고 간 경우
    const skewed = sample({ mean: 4.2, median: 3.3 })
    expect(sameSide(skewed)).toBe(false)
    expect(judge(def, skewed).state).not.toBe('ESTABLISHED')
  })

  it('여러 자식 중 가장 높은 단계가 부모의 단계다', () => {
    expect(bestState(['EMERGING', 'ESTABLISHED', 'LOCKED'])).toBe('ESTABLISHED')
    expect(bestState(['LOCKED'])).toBe('LOCKED')
  })
})

describe('되풀이 정도', () => {
  it('매번 같은 방향이면 1', () => {
    const samples = [4, 4, 4].map((value, i) => ({ value, date: addDays(START, i) }))
    expect(consistencyOf(samples, 3, 1)).toBe(1)
  })

  it('절반만 같은 방향이면 0.5', () => {
    const samples = [4, 2, 4, 2].map((value, i) => ({ value, date: addDays(START, i) }))
    expect(consistencyOf(samples, 3, 1)).toBe(0.5)
  })

  it('같은 날 여러 기록은 하루로 접는다', () => {
    const samples = [
      { value: 5, date: START },
      { value: 5, date: START },
      { value: 1, date: addDays(START, 1) },
    ]
    // 하루에 두 번 적었다고 두 표가 되지 않는다
    expect(consistencyOf(samples, 3, 1)).toBe(0.5)
  })
})

// ─────────────────────────────────────────────
// 6G — 열려야 할 것과 열리면 안 될 것
// ─────────────────────────────────────────────

describe('패턴이 뚜렷한 사용자', () => {
  it('심어 둔 패턴이 열린다', () => {
    for (const defId of GROUND_TRUTH.patterned.shouldOpen) {
      expect(stateOf(PATTERNED.records, defId), defId).not.toBe('LOCKED')
    }
  })

  it('심지 않은 반대 패턴은 안 열린다', () => {
    for (const defId of GROUND_TRUTH.patterned.shouldStayLocked) {
      expect(stateOf(PATTERNED.records, defId), defId).toBe('LOCKED')
    }
  })

  it('평가자가 하나도 터지지 않는다', () => {
    expect(PATTERNED.failed).toEqual([])
  })

  it('48개를 전부 열지는 않는다', () => {
    expect(open(PATTERNED.records).length).toBeLessThan(30)
  })

  it('기쁨을 부르는 것에 여러 자식이 담긴다', () => {
    const joy = PATTERNED.records.find((r) => r.defId === 'joy_trigger')!
    expect(joy.children?.length).toBeGreaterThan(0)
    expect(joy.children).toContain('클라이밍')
  })
})

describe('열리면 안 되는 사용자들', () => {
  it('아무 패턴 없는 사용자에게는 아무것도 안 열린다', () => {
    expect(open(RANDOM.records).map((r) => r.defId)).toEqual([])
  })

  it('기록이 거의 없는 사용자에게는 안 열린다', () => {
    expect(open(SPARSE.records).length).toBeLessThanOrEqual(GROUND_TRUTH.sparse.maxOpen)
  })

  it('하루에 몰아 쓴 사용자에게는 안 열린다', () => {
    expect(open(HEAVY.records).length).toBeLessThanOrEqual(GROUND_TRUTH.oneDayHeavy.maxOpen)
  })

  it('이틀만 좋았던 것은 발견이 아니다', () => {
    expect(stateOf(OUTLIER.records, 'joy_trigger')).toBe('LOCKED')
    expect(open(OUTLIER.records).map((r) => r.defId)).toEqual([])
  })
})

describe('교란 변수', () => {
  it('주말 저녁에만 나오는 사람 태그는 열리지 않는다', () => {
    expect(stateOf(CONFOUNDED.records, GROUND_TRUTH.confounded.blocked)).toBe('LOCKED')
  })

  it('시간대에 몰린 문맥은 기쁨의 자식으로도 안 들어간다', () => {
    const joy = CONFOUNDED.records.find((r) => r.defId === 'joy_trigger')
    expect(joy?.state ?? 'LOCKED').toBe('LOCKED')
  })

  it('진짜 시간대 차이는 그대로 열린다', () => {
    // 저녁이 실제로 높은 사용자이므로 이건 열려야 한다
    expect(stateOf(CONFOUNDED.records, 'evening_bloom')).not.toBe('LOCKED')
  })
})

// ─────────────────────────────────────────────
// 6D — 달라지는 중
// ─────────────────────────────────────────────

describe('달라지는 중', () => {
  const data = buildChangingUser()
  const earlyEnd = addDays(START, 219)
  const first = run(data, earlyEnd)
  const second = run(data, END, first.records)

  it('처음엔 저녁형이 자리 잡는다', () => {
    expect(stateOf(first.records, GROUND_TRUTH.changing.was)).toBe('ESTABLISHED')
  })

  it('패턴이 뒤집히면 달라지는 중으로 옮긴다', () => {
    expect(stateOf(second.records, GROUND_TRUTH.changing.was)).toBe('CHANGING')
  })

  it('한 번 도달한 단계는 남는다', () => {
    const record = second.records.find((r) => r.defId === GROUND_TRUTH.changing.was)!
    expect(record.peakState).toBe('ESTABLISHED')
  })

  it('새로 자란 쪽이 자리 잡는다', () => {
    expect(stateOf(second.records, 'morning_bloom')).not.toBe('LOCKED')
  })

  it('무엇에서 무엇으로 바뀌었는지 남긴다', () => {
    const shift = second.shifts.find((s) => s.fromDefId === 'evening_bloom')
    expect(shift).toBeDefined()
    expect(shift!.toDefId).toBe('morning_bloom')
    expect(shift!.previousPeriod.effect).not.toBe(shift!.recentPeriod.effect)
  })

  it('기록이 줄어든 것만으로는 달라졌다고 하지 않는다', () => {
    // 최근에 기록이 거의 없는 상태로 다시 평가
    const thin = {
      ...data,
      logs: data.logs.filter((l) => l.date <= addDays(START, 219)),
    }
    const later = run(thin, END, first.records)
    const record = later.records.find((r) => r.defId === GROUND_TRUTH.changing.was)!
    expect(record.state).not.toBe('CHANGING')
  })
})

// ─────────────────────────────────────────────
// 근거
// ─────────────────────────────────────────────

describe('근거', () => {
  const found = open(PATTERNED.records)[0]

  it('열린 DNA 에는 근거가 붙어 있다', () => {
    expect(found.evidence.length).toBeGreaterThan(0)
  })

  it('근거에 화면이 필요한 값이 전부 있다', () => {
    const e = found.evidence[0]
    expect(e.periodFrom).toBeTruthy()
    expect(e.periodTo).toBeTruthy()
    expect(e.sampleCount).toBeGreaterThan(0)
    expect(e.baselineSampleCount).toBeGreaterThan(0)
    expect(e.distinctDays).toBeGreaterThan(0)
    expect(e.durationDays).toBeGreaterThan(0)
    expect(typeof e.observed).toBe('number')
    expect(typeof e.baseline).toBe('number')
    expect(typeof e.effectSize).toBe('number')
    expect(typeof e.mean).toBe('number')
    expect(typeof e.median).toBe('number')
    expect(e.consistency).toBeGreaterThan(0)
    expect(e.weighting).toBeTruthy()
  })

  it('근거에 판 번호가 전부 찍힌다', () => {
    const e = found.evidence[0]
    expect(e.analysisVersion).toBeGreaterThanOrEqual(1)
    expect(e.taxonomyVersion).toBeGreaterThanOrEqual(1)
    expect(e.ruleVersion).toBeGreaterThanOrEqual(1)
    expect(e.discoveryRuleVersion).toBe(DISCOVERY_RULE_VERSION)
  })

  it('다시 평가해도 예전 근거를 덮어쓰지 않는다', () => {
    const data = buildChangingUser()
    const early = run(data, addDays(START, 219))
    const before = early.records.find((r) => r.defId === 'evening_bloom')!
    const firstEvidence = before.evidence[0]

    const later = run(data, END, early.records)
    const after = later.records.find((r) => r.defId === 'evening_bloom')!

    // 첫 근거가 그대로 남아 있다
    expect(after.evidence[0]).toEqual(firstEvidence)
    expect(after.evidence.length).toBeGreaterThanOrEqual(before.evidence.length)
  })
})

// ─────────────────────────────────────────────
// 6C — 화면에 무엇을 보여 주는가
// ─────────────────────────────────────────────

describe('수집 화면', () => {
  const view = buildView(PATTERNED.records)

  it('전체 칸은 48이다', () => {
    expect(view.totalCount).toBe(48)
  })

  it('RARE 는 48 안에 세지 않는다', () => {
    const rareOpen = PATTERNED.records.filter(
      (r) => RARE_DNA.some((d) => d.id === r.defId) && r.state !== 'LOCKED',
    )
    expect(view.foundCount).toBeLessThanOrEqual(48)
    expect(view.foundCount).toBe(open(PATTERNED.records).length - rareOpen.length)
  })

  it('잠긴 BASIC 은 이름 없이 ??? 로만 보인다', () => {
    for (const family of view.families) {
      for (const locked of family.lockedBasic) {
        expect(locked.teaser).toBeTruthy()
        // 이름이 새어 나가면 안 된다
        const def = getDna(locked.defId)!
        expect(locked.teaser).not.toContain(def.displayName)
      }
    }
  })

  it('HIDDEN 은 이름 없이 수만 보인다', () => {
    const hiddenLocked = view.families.reduce((n, f) => n + f.hiddenRemaining, 0)
    expect(hiddenLocked).toBeGreaterThan(0)

    const shownIds = view.families.flatMap((f) => [
      ...f.found.map((c) => c.defId),
      ...f.lockedBasic.map((c) => c.defId),
    ])
    for (const def of BASE_DNA.filter((d) => d.type === 'HIDDEN')) {
      const isOpen = stateOf(PATTERNED.records, def.id) !== 'LOCKED'
      if (!isOpen) expect(shownIds).not.toContain(def.id)
    }
  })

  it('첫 화면에 잠긴 칸을 다 쏟아 내지 않는다', () => {
    for (const family of view.families) {
      expect(previewLocked(family).length).toBeLessThanOrEqual(2)
    }
  })

  it('아무것도 없으면 RARE 영역이 비어 있다', () => {
    expect(buildView(RANDOM.records).rare).toEqual([])
    expect(buildView(RANDOM.records).foundCount).toBe(0)
  })

  it('자리 잡은 것부터 보여 준다', () => {
    for (const family of view.families) {
      const order = family.found.map((c) => c.state)
      const rank = { ESTABLISHED: 0, GROWING: 1, EMERGING: 2, CHANGING: 3, LOCKED: 4 }
      for (let i = 1; i < order.length; i += 1) {
        expect(rank[order[i]]).toBeGreaterThanOrEqual(rank[order[i - 1]])
      }
    }
  })
})

// ─────────────────────────────────────────────
// 6F — 사용자가 느끼는 것
// ─────────────────────────────────────────────

describe('사용자 반응', () => {
  it('네 가지 반응을 지원한다', () => {
    expect(Object.keys(PERCEPTION_LABEL)).toEqual([
      'agree',
      'somewhat',
      'unsure',
      'disagree',
    ])
  })

  it('아니라고 해도 발견을 지우지 않는다', () => {
    const data = buildPatternedUser()
    const first = run(data)
    const target = open(first.records)[0]

    const marked = first.records.map((r) =>
      r.defId === target.defId ? { ...r, userPerception: 'disagree' as const } : r,
    )

    const second = run(data, END, marked)
    const after = second.records.find((r) => r.defId === target.defId)!

    // 통계는 그대로고 사용자의 느낌만 따로 남는다
    expect(after.state).not.toBe('LOCKED')
    expect(after.userPerception).toBe('disagree')
  })
})

// ─────────────────────────────────────────────
// 말
// ─────────────────────────────────────────────

describe('인과처럼 말하지 않기', () => {
  it('48개 DNA 설명에 단정하는 말이 없다', () => {
    for (const def of ALL_DNA) {
      const bad = hasBannedWord(def.description)
      expect(bad, `${def.id}: "${def.description}" 안의 "${bad}"`).toBeNull()
    }
  })

  it('teaser 에도 없다', () => {
    for (const def of ALL_DNA) {
      if (!def.teaser) continue
      expect(hasBannedWord(def.teaser), def.id).toBeNull()
    }
  })

  it('단계 설명에도 없다', () => {
    for (const sentence of Object.values(STATE_SENTENCE)) {
      expect(hasBannedWord(sentence)).toBeNull()
    }
  })

  it('사람을 규정하지 않는다', () => {
    for (const def of ALL_DNA) {
      expect(def.description).not.toContain('당신은')
      expect(def.description).not.toMatch(/입니다$/)
    }
  })

  it('건강을 판단하지 않는다', () => {
    const health = ['건강', '질환', '병', '위험', '악화']
    for (const def of ALL_DNA) {
      for (const word of health) {
        expect(def.description, def.id).not.toContain(word)
      }
    }
  })

  it('잠에 대해 괜찮다고 말하지 않는다', () => {
    const resilient = getDna('sleep_resilient')!
    expect(resilient.description).toContain('관찰')
    expect(resilient.description).not.toContain('괜찮')
  })
})

// ─────────────────────────────────────────────
// 성능
// ─────────────────────────────────────────────

describe('성능', () => {
  it('1년치 기록에서도 오래 걸리지 않는다', () => {
    const data = buildPatternedUser()
    const started = Date.now()
    run(data)
    const elapsed = Date.now() - started

    console.log(
      `기록 ${data.logs.length}개 · 365일 · DNA ${ALL_DNA.length}개 → 전체 평가 ${elapsed}ms`,
    )
    expect(elapsed).toBeLessThan(3000)
  })

  it('평가자 하나가 터져도 나머지는 돈다', () => {
    const broken = {
      ...getDna('evening_bloom')!,
      id: 'broken_for_test',
      evaluator: () => {
        throw new Error('일부러 터뜨림')
      },
    }
    ALL_DNA.push(broken)
    try {
      const result = run(buildPatternedUser())
      expect(result.failed).toContain('broken_for_test')
      expect(open(result.records).length).toBeGreaterThan(5)
    } finally {
      ALL_DNA.pop()
    }
  })

  it('같은 기록이면 언제나 같은 결과다', () => {
    const data = buildPatternedUser()
    const a = run(data).records.map((r) => `${r.defId}:${r.state}`)
    const b = run(data).records.map((r) => `${r.defId}:${r.state}`)
    expect(a).toEqual(b)
  })
})
