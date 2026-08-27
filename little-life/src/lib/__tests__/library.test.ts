import { describe, expect, it } from 'vitest'
import type { Quest, Routine, UsageProfiles } from '@/types'
import { CATEGORIES, DIFFICULTIES } from '@/types'
import { ALL_PRESETS, QUEST_PACKS, findPack, findPreset, presetKey } from '@/lib/library/packs'
import {
  backfillProfiles,
  emptyProfile,
  hideForToday,
  questKeyOf,
  recordAdded,
  recordCompleted,
  recordDismiss,
  reverseCompleted,
  toggleFavorite,
  type ProfileSeed,
} from '@/lib/library/usage'
import {
  MAX_PER_CATEGORY,
  completionScore,
  diversify,
  frequencyScore,
  hasEnoughHistory,
  makeContext,
  pickReason,
  quickAdd,
  recencyScore,
  recommendQuests,
  scoreProfile,
  difficultyMix,
  difficultyScore,
  DIFFICULTY_WEIGHT,
  timeOfDayScore,
  weekdayScore,
} from '@/lib/library/recommend'
import { searchLibrary } from '@/lib/library/search'
import { needsMoreThisWeek, describeRule, isUsableRule, matchesToday } from '@/lib/routines'

const seed = (over: Partial<ProfileSeed> = {}): ProfileSeed => ({
  questKey: 'water',
  title: '물 마시기',
  category: 'BODY',
  difficulty: 'EASY',
  ...over,
})

const quest = (over: Partial<Quest> = {}): Quest => ({
  id: over.id ?? 'q1',
  title: over.title ?? '물 마시기',
  category: over.category ?? 'BODY',
  difficulty: over.difficulty ?? 'EASY',
  exp: 10,
  completed: over.completed ?? false,
  createdAt: over.createdAt ?? '2026-08-20T09:00:00.000Z',
  completedAt: over.completedAt ?? null,
  ...over,
})

// ── 세트 ────────────────────────────────────────────────
describe('퀘스트 세트', () => {
  it('27개가 있고 id 가 겹치지 않는다', () => {
    expect(QUEST_PACKS).toHaveLength(27)
    expect(new Set(QUEST_PACKS.map((p) => p.id)).size).toBe(27)
  })

  it('모든 세트가 항목을 가지고 있다', () => {
    for (const pack of QUEST_PACKS) {
      expect(pack.items.length, pack.id).toBeGreaterThanOrEqual(5)
    }
  })

  it('모든 항목이 실제 분야·난이도를 쓴다', () => {
    for (const { pack, preset } of ALL_PRESETS) {
      expect(CATEGORIES, `${pack.id}/${preset.id}`).toContain(preset.category)
      expect(DIFFICULTIES, `${pack.id}/${preset.id}`).toContain(preset.difficulty)
      expect(preset.title.trim().length).toBeGreaterThan(0)
    }
  })

  it('준비된 퀘스트 key 가 전체에서 고유하다', () => {
    const keys = ALL_PRESETS.map((e) => e.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('아무것도 하기 싫은 날 세트도 EXP 를 깎지 않는다', () => {
    const low = findPack('low_energy')!
    // 다른 세트와 같은 난이도 체계를 쓴다 — 쉬운 날이라고 보상을 줄이지 않는다
    expect(low.items.every((i) => DIFFICULTIES.includes(i.difficulty))).toBe(true)
  })

  it('쉬움에만 몰려 있지 않다', () => {
    // 예전에는 142개 중 119개(84%)가 쉬움이었다. 그래서 무엇을 골라도 하루가
    // "물 마시기 · 창문 열기" 로 채워졌고, 정작 미뤄둔 일은 앱 밖에 남았다.
    const by = { EASY: 0, NORMAL: 0, HARD: 0 }
    for (const { preset } of ALL_PRESETS) by[preset.difficulty] += 1

    expect(by.NORMAL).toBeGreaterThanOrEqual(70)
    expect(by.HARD).toBeGreaterThanOrEqual(40)
    // 쉬움도 여전히 남아 있어야 한다 — 하루가 무너진 날에 내밀 게 있어야 한다
    expect(by.EASY).toBeGreaterThan(30)
    expect(by.EASY / ALL_PRESETS.length).toBeLessThan(0.5)
  })

  it('아무것도 하기 싫은 날 세트는 전부 쉬움으로 남아 있다', () => {
    const low = findPack('low_energy')!
    expect(low.items.every((i) => i.difficulty === 'EASY')).toBe(true)
  })

  it('미뤄둔 일과 하면 좋은 것을 다루는 세트가 있다', () => {
    // 이 앱을 만든 이유가 여기 있다. 하루를 잘 굴리는 세트만 있으면
    // "몇 주째 그대로인 것" 은 영영 목록에 안 올라온다.
    for (const id of ['backlog', 'good_for_me', 'organize', 'finish_it']) {
      expect(findPack(id), id).not.toBeNull()
    }
    const backlog = findPack('backlog')!
    expect(backlog.items.filter((i) => i.difficulty === 'HARD').length).toBeGreaterThanOrEqual(4)
  })

  it('key 로 다시 찾을 수 있다', () => {
    const key = presetKey('wellness', 'water')
    expect(findPreset(key)?.preset.title).toBe('물 챙겨 마시기')
    expect(findPreset('없는:것')).toBeNull()
    expect(findPack('없음')).toBeNull()
  })
})

// ── 사용 기록 ───────────────────────────────────────────
describe('사용 기록', () => {
  it('추가하면 횟수와 요일·시간대가 쌓인다', () => {
    // 2026-08-22 는 토요일, 22시 = 밤
    const at = new Date('2026-08-22T22:00:00')
    const p = recordAdded({}, seed(), at).water

    expect(p.totalAdded).toBe(1)
    expect(p.addedByDayOfWeek[5]).toBe(1) // 토요일
    expect(p.addedByBand.NIGHT).toBe(1)
    expect(p.lastAddedAt).toBeTruthy()
  })

  it('완료하면 따로 쌓인다', () => {
    const at = new Date('2026-08-22T22:00:00')
    let profiles = recordAdded({}, seed(), at)
    profiles = recordCompleted(profiles, seed(), at)

    expect(profiles.water.totalCompleted).toBe(1)
    expect(profiles.water.completedByBand.NIGHT).toBe(1)
    expect(profiles.water.completedByDayOfWeek[5]).toBe(1)
    expect(profiles.water.recentCompletionDates).toEqual(['2026-08-22'])
  })

  it('같은 날 두 번 완료해도 날짜는 하나만 남는다', () => {
    const at = new Date('2026-08-22T22:00:00')
    let profiles = recordCompleted({}, seed(), at)
    profiles = recordCompleted(profiles, seed(), new Date('2026-08-22T23:00:00'))
    expect(profiles.water.recentCompletionDates).toEqual(['2026-08-22'])
    expect(profiles.water.totalCompleted).toBe(2)
  })

  it('되돌리면 그때 올린 만큼만 정확히 내려간다', () => {
    const at = new Date('2026-08-22T22:00:00')
    let profiles = recordAdded({}, seed(), at)
    profiles = recordCompleted(profiles, seed(), at)
    profiles = reverseCompleted(profiles, 'water', at.toISOString())

    const p = profiles.water
    expect(p.totalCompleted).toBe(0)
    expect(p.completedByBand.NIGHT).toBe(0)
    expect(p.completedByDayOfWeek[5]).toBe(0)
    expect(p.recentCompletionDates).toEqual([])
    // 추가한 기록은 그대로 — 되돌린 건 완료지 추가가 아니다
    expect(p.totalAdded).toBe(1)
  })

  it('되돌리기를 반복해도 음수가 되지 않는다', () => {
    const at = new Date('2026-08-22T22:00:00')
    let profiles = recordCompleted({}, seed(), at)
    profiles = reverseCompleted(profiles, 'water', at.toISOString())
    profiles = reverseCompleted(profiles, 'water', at.toISOString())
    expect(profiles.water.totalCompleted).toBe(0)
  })

  it('없는 항목을 되돌려도 아무 일이 없다', () => {
    expect(reverseCompleted({}, 'nope', null)).toEqual({})
  })

  it('즐겨찾기는 켜고 끌 수 있다', () => {
    let profiles = toggleFavorite({}, seed())
    expect(profiles.water.favorite).toBe(true)
    profiles = toggleFavorite(profiles, seed())
    expect(profiles.water.favorite).toBe(false)
  })

  it('덜 보기와 오늘 숨기기가 따로 기록된다', () => {
    let profiles = recordDismiss({}, seed())
    expect(profiles.water.dismissCount).toBe(1)
    profiles = hideForToday(profiles, seed(), new Date('2026-08-22T10:00:00'))
    expect(profiles.water.hiddenOn).toBe('2026-08-22')
  })

  it('준비된 퀘스트는 preset id 로, 직접 만든 것은 제목으로 묶는다', () => {
    expect(questKeyOf({ title: '물 마시기', sourcePresetId: 'wellness:water' })).toBe(
      'wellness:water',
    )
    expect(questKeyOf({ title: '  물  마시기 ' })).toBe(questKeyOf({ title: '물 마시기' }))
  })

  it('비슷하지만 다른 제목은 합치지 않는다', () => {
    expect(questKeyOf({ title: '물 마시기' })).not.toBe(questKeyOf({ title: '물 챙겨 마시기' }))
  })

  it('세트 출처가 여러 개면 모아둔다', () => {
    let profiles = recordAdded({}, seed({ packId: 'wellness' }))
    profiles = recordAdded(profiles, seed({ packId: 'eat_well' }))
    expect(profiles.water.sourcePackIds).toEqual(['wellness', 'eat_well'])
  })
})

// ── 과거 기록으로 채우기 ────────────────────────────────
describe('backfill', () => {
  it('지난 퀘스트에서 사용 기록을 만든다', () => {
    const profiles = backfillProfiles([
      quest({ id: 'a', completed: true, completedAt: '2026-08-20T22:00:00.000Z' }),
      quest({ id: 'b', createdAt: '2026-08-21T09:00:00.000Z' }),
    ])

    const key = questKeyOf({ title: '물 마시기' })
    expect(profiles[key].totalAdded).toBe(2)
    expect(profiles[key].totalCompleted).toBe(1)
  })

  it('완료하지 않은 것도 추가로는 센다', () => {
    const profiles = backfillProfiles([quest({ id: 'a' })])
    const key = questKeyOf({ title: '물 마시기' })
    expect(profiles[key].totalAdded).toBe(1)
    expect(profiles[key].totalCompleted).toBe(0)
  })

  it('퀘스트가 없으면 빈 기록', () => {
    expect(backfillProfiles([])).toEqual({})
  })
})

// ── 점수 ────────────────────────────────────────────────
describe('추천 점수', () => {
  const ctx = makeContext(new Date('2026-08-22T22:00:00')) // 토요일 밤

  it('자주 추가할수록 오르지만 위가 막혀 있다', () => {
    const few = { ...emptyProfile(seed()), totalAdded: 3 }
    const many = { ...emptyProfile(seed()), totalAdded: 100 }
    expect(frequencyScore(few)).toBe(6)
    expect(frequencyScore(many)).toBe(20)
  })

  it('표본이 적으면 완료율을 과하게 믿지 않는다', () => {
    const one = { ...emptyProfile(seed()), totalAdded: 1, totalCompleted: 1 }
    const many = { ...emptyProfile(seed()), totalAdded: 10, totalCompleted: 10 }
    expect(completionScore(one)).toBeLessThan(completionScore(many))
    expect(completionScore(many)).toBe(15)
  })

  it('완료한 적 없어도 후보에서 빠지지 않는다', () => {
    const never = { ...emptyProfile(seed()), totalAdded: 4 }
    expect(frequencyScore(never)).toBeGreaterThan(0)
  })

  it('최근에 한 것에 가산점이 붙는다', () => {
    const today = { ...emptyProfile(seed()), lastCompletedAt: '2026-08-22T09:00:00' }
    const twoDays = { ...emptyProfile(seed()), lastCompletedAt: '2026-08-20T09:00:00' }
    const longAgo = { ...emptyProfile(seed()), lastCompletedAt: '2026-05-01T09:00:00' }

    expect(recencyScore(twoDays, ctx)).toBeGreaterThan(recencyScore(today, ctx))
    expect(recencyScore(longAgo, ctx)).toBe(0)
  })

  it('한 번도 완료 안 했으면 최근 점수가 0', () => {
    expect(recencyScore(emptyProfile(seed()), ctx)).toBe(0)
  })

  it('같은 요일에 몰려 있으면 점수가 오른다', () => {
    const saturday = {
      ...emptyProfile(seed()),
      completedByDayOfWeek: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 5, 6: 0 },
    }
    const spread = {
      ...emptyProfile(seed()),
      completedByDayOfWeek: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 },
    }
    expect(weekdayScore(saturday, ctx)).toBeGreaterThan(weekdayScore(spread, ctx))
  })

  it('다른 요일에만 했으면 0', () => {
    const monday = {
      ...emptyProfile(seed()),
      completedByDayOfWeek: { 0: 9, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
    }
    expect(weekdayScore(monday, ctx)).toBe(0)
  })

  it('같은 시간대에 몰려 있으면 점수가 오른다', () => {
    const night = {
      ...emptyProfile(seed()),
      completedByBand: { MORNING: 0, DAY: 0, EVENING: 0, NIGHT: 6 },
    }
    const morning = {
      ...emptyProfile(seed()),
      completedByBand: { MORNING: 6, DAY: 0, EVENING: 0, NIGHT: 0 },
    }
    expect(timeOfDayScore(night, ctx)).toBeGreaterThan(0)
    expect(timeOfDayScore(morning, ctx)).toBe(0)
  })

  it('이유는 가장 큰 것 하나만 고른다', () => {
    expect(pickReason({ routine: 30, favorite: 14, frequency: 20 })).toBe('ROUTINE')
    expect(pickReason({ routine: 0, favorite: 14, frequency: 4 })).toBe('FAVORITE')
    expect(pickReason({ routine: 0, favorite: 0, weekday: 9, timeOfDay: 3 })).toBe('DAY_OF_WEEK')
    expect(pickReason({ routine: 0, favorite: 0, frequency: 0 })).toBe('PACK')
  })
})

// ── 다양성 ──────────────────────────────────────────────
describe('다양성', () => {
  const item = (i: number, category: Quest['category']) => ({
    questKey: `k${i}`,
    title: `t${i}`,
    category,
    difficulty: 'EASY' as const,
    presetId: null,
    score: 100 - i,
    reason: 'FREQUENT' as const,
    parts: {},
  })

  it('한 분야가 전부를 가져가지 않는다', () => {
    const all = Array.from({ length: 8 }, (_, i) => item(i, 'LIFE'))
    all.push(item(99, 'WORK'))
    const picked = diversify(all, 6)
    const life = picked.filter((p) => p.category === 'LIFE').length
    expect(life).toBeLessThanOrEqual(MAX_PER_CATEGORY + 2)
    expect(picked.some((p) => p.category === 'WORK')).toBe(true)
  })

  it('자리가 남으면 밀어뒀던 것도 채운다', () => {
    const all = Array.from({ length: 6 }, (_, i) => item(i, 'LIFE'))
    // 빈칸으로 두는 것보다 같은 분야라도 채우는 게 낫다
    expect(diversify(all, 6)).toHaveLength(6)
  })
})

// ── 추천 ────────────────────────────────────────────────
describe('추천', () => {
  const night = new Date('2026-08-22T22:00:00')

  it('A. 기록이 없으면 시간대 기본 추천이 나온다', () => {
    const out = recommendQuests({ profiles: {}, quests: [], routines: [], now: night })
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((r) => r.reason === 'PACK')).toBe(true)
  })

  it('A. 아침에는 아침 세트가 나온다', () => {
    const morning = new Date('2026-08-22T07:00:00')
    const out = recommendQuests({ profiles: {}, quests: [], routines: [], now: morning })
    expect(out.some((r) => r.presetId?.startsWith('good_morning'))).toBe(true)
  })

  it('B. 반복해서 쓰면 위로 올라온다', () => {
    let profiles: UsageProfiles = {}
    for (let i = 0; i < 5; i += 1) {
      profiles = recordAdded(profiles, seed(), night)
      profiles = recordCompleted(profiles, seed(), night)
    }
    const out = recommendQuests({ profiles, quests: [], routines: [], now: night })
    expect(out[0].questKey).toBe('water')
  })

  it('C. 토요일에 반복한 것은 토요일에 더 위로 온다', () => {
    let profiles: UsageProfiles = {}
    // 토요일마다 빨래
    for (const day of ['2026-08-01', '2026-08-08', '2026-08-15']) {
      profiles = recordCompleted(
        profiles,
        seed({ questKey: 'laundry', title: '빨래', category: 'LIFE' }),
        new Date(`${day}T14:00:00`),
      )
    }
    const sat = recommendQuests({ profiles, quests: [], routines: [], now: new Date('2026-08-22T14:00:00') })
    const wed = recommendQuests({ profiles, quests: [], routines: [], now: new Date('2026-08-19T14:00:00') })

    const satScore = sat.find((r) => r.questKey === 'laundry')?.score ?? 0
    const wedScore = wed.find((r) => r.questKey === 'laundry')?.score ?? 0
    expect(satScore).toBeGreaterThan(wedScore)
  })

  it('D. 밤에 반복한 것은 밤에 더 위로 온다', () => {
    let profiles: UsageProfiles = {}
    for (let i = 0; i < 4; i += 1) {
      profiles = recordCompleted(
        profiles,
        seed({ questKey: 'teeth', title: '양치', category: 'LIFE' }),
        new Date(`2026-08-${10 + i}T22:30:00`),
      )
    }
    const atNight = recommendQuests({ profiles, quests: [], routines: [], now: new Date('2026-08-22T22:30:00') })
    const atNoon = recommendQuests({ profiles, quests: [], routines: [], now: new Date('2026-08-22T13:00:00') })

    expect((atNight.find((r) => r.questKey === 'teeth')?.score ?? 0)).toBeGreaterThan(
      atNoon.find((r) => r.questKey === 'teeth')?.score ?? 0,
    )
  })

  it('E. 즐겨찾기는 자주 안 써도 올라오지만 1등을 고정하지는 않는다', () => {
    let profiles = toggleFavorite({}, seed({ questKey: 'rare', title: '가끔 하는 것' }))
    for (let i = 0; i < 10; i += 1) {
      profiles = recordAdded(profiles, seed(), night)
      profiles = recordCompleted(profiles, seed(), night)
    }
    const out = recommendQuests({ profiles, quests: [], routines: [], now: night })
    expect(out.some((r) => r.questKey === 'rare')).toBe(true)
    expect(out[0].questKey).toBe('water')
  })

  it('F. 오늘 이미 있는 퀘스트는 추천에서 빠진다', () => {
    let profiles: UsageProfiles = {}
    for (let i = 0; i < 5; i += 1) profiles = recordAdded(profiles, seed(), night)

    const today = quest({ title: '물 마시기', createdAt: night.toISOString() })
    const out = recommendQuests({ profiles, quests: [today], routines: [], now: night })
    expect(out.some((r) => r.questKey === 'water')).toBe(false)
  })

  it('F. 오늘 이미 완료한 것도 빠진다', () => {
    let profiles: UsageProfiles = {}
    for (let i = 0; i < 5; i += 1) profiles = recordAdded(profiles, seed(), night)

    const done = quest({
      title: '물 마시기',
      completed: true,
      completedAt: night.toISOString(),
    })
    const out = recommendQuests({ profiles, quests: [done], routines: [], now: night })
    expect(out.some((r) => r.questKey === 'water')).toBe(false)
  })

  it('G. 덜 보기를 누르면 순위가 내려간다', () => {
    let profiles: UsageProfiles = {}
    for (let i = 0; i < 5; i += 1) {
      profiles = recordAdded(profiles, seed(), night)
      profiles = recordAdded(profiles, seed({ questKey: 'other', title: '다른 것' }), night)
    }
    const before = recommendQuests({ profiles, quests: [], routines: [], now: night })
    const beforeScore = before.find((r) => r.questKey === 'water')!.score

    profiles = recordDismiss(profiles, seed())
    const after = recommendQuests({ profiles, quests: [], routines: [], now: night })
    const afterScore = after.find((r) => r.questKey === 'water')?.score ?? 0

    expect(afterScore).toBeLessThan(beforeScore)
  })

  it('G. 계속 덜 보기를 누르면 추천에서 빠진다', () => {
    let profiles: UsageProfiles = {}
    for (let i = 0; i < 5; i += 1) profiles = recordAdded(profiles, seed(), night)
    for (let i = 0; i < 4; i += 1) profiles = recordDismiss(profiles, seed())

    const out = recommendQuests({ profiles, quests: [], routines: [], now: night })
    // 점수가 0 아래로 내려가면 후보에서 아예 빠진다
    expect(out.some((r) => r.questKey === 'water' && r.score > 0)).toBe(false)
  })

  it('오늘 숨기기를 누르면 오늘은 안 보인다', () => {
    let profiles: UsageProfiles = {}
    for (let i = 0; i < 5; i += 1) profiles = recordAdded(profiles, seed(), night)
    profiles = hideForToday(profiles, seed(), night)

    const out = recommendQuests({ profiles, quests: [], routines: [], now: night })
    expect(out.some((r) => r.questKey === 'water' && r.score > 0)).toBe(false)
  })

  it('H. 직접 만든 퀘스트도 학습해서 추천에 올린다', () => {
    let profiles: UsageProfiles = {}
    const custom = seed({
      questKey: '클라이밍 가방 챙기기',
      title: '클라이밍 가방 챙기기',
      category: 'PLAY',
    })
    for (let i = 0; i < 6; i += 1) {
      profiles = recordAdded(profiles, custom, night)
      profiles = recordCompleted(profiles, custom, night)
    }
    const out = recommendQuests({ profiles, quests: [], routines: [], now: night })
    expect(out[0].title).toBe('클라이밍 가방 챙기기')
  })

  it('I. 오늘 이미 만들어진 반복은 다시 추천하지 않는다', () => {
    const routine: Routine = {
      id: 'r1',
      title: '영양제',
      category: 'LIFE',
      difficulty: 'EASY',
      rule: { kind: 'daily' },
      createdAt: '2026-08-01T00:00:00.000Z',
      lastSpawnedOn: '2026-08-22',
      paused: false,
    }
    const made = quest({ id: 'q9', title: '영양제', routineId: 'r1', createdAt: night.toISOString() })
    const out = recommendQuests({ profiles: {}, quests: [made], routines: [routine], now: night })
    expect(out.some((r) => r.title === '영양제')).toBe(false)
  })

  it('아직 안 만들어진 반복은 최우선으로 올라온다', () => {
    const routine: Routine = {
      id: 'r1',
      title: '영양제',
      category: 'LIFE',
      difficulty: 'EASY',
      rule: { kind: 'daily' },
      createdAt: '2026-08-01T00:00:00.000Z',
      lastSpawnedOn: null,
      paused: false,
    }
    let profiles = recordAdded({}, seed({ questKey: '영양제', title: '영양제', category: 'LIFE' }), night)
    for (let i = 0; i < 8; i += 1) profiles = recordAdded(profiles, seed(), night)

    const out = recommendQuests({ profiles, quests: [], routines: [routine], now: night })
    expect(out[0].title).toBe('영양제')
    expect(out[0].reason).toBe('ROUTINE')
  })

  it('추천을 끄면 기본 추천만 나온다', () => {
    let profiles: UsageProfiles = {}
    for (let i = 0; i < 9; i += 1) profiles = recordAdded(profiles, seed(), night)

    const off = recommendQuests({
      profiles,
      quests: [],
      routines: [],
      now: night,
      personalized: false,
    })
    expect(off.every((r) => r.reason === 'PACK')).toBe(true)
  })

  it('개인화가 시작되는 시점을 알려준다', () => {
    expect(hasEnoughHistory({})).toBe(false)
    let profiles: UsageProfiles = {}
    for (let i = 0; i < 5; i += 1) profiles = recordAdded(profiles, seed(), night)
    expect(hasEnoughHistory(profiles)).toBe(true)
  })
})

// ── 빠른 추가 ───────────────────────────────────────────
describe('빠른 추가', () => {
  const at = new Date('2026-08-22T22:00:00')

  it('자주 / 최근 / 즐겨찾기가 따로 나온다', () => {
    let profiles = recordAdded({}, seed(), new Date('2026-08-01T09:00:00'))
    profiles = recordAdded(profiles, seed(), new Date('2026-08-02T09:00:00'))
    profiles = recordAdded(profiles, seed({ questKey: 'new', title: '새로 만든 것' }), at)
    profiles = toggleFavorite(profiles, seed({ questKey: 'fav', title: '즐겨찾기' }))

    expect(quickAdd(profiles, 'FREQUENT')[0].questKey).toBe('water')
    expect(quickAdd(profiles, 'RECENT')[0].questKey).toBe('new')
    expect(quickAdd(profiles, 'FAVORITE').map((p) => p.questKey)).toEqual(['fav'])
  })

  it('개수를 넘기지 않는다', () => {
    let profiles: UsageProfiles = {}
    for (let i = 0; i < 20; i += 1) {
      profiles = recordAdded(profiles, seed({ questKey: `k${i}`, title: `t${i}` }), at)
    }
    expect(quickAdd(profiles, 'FREQUENT', 8)).toHaveLength(8)
  })
})

// ── 검색 ────────────────────────────────────────────────
describe('검색', () => {
  it('세트와 준비된 퀘스트를 같이 찾는다', () => {
    const out = searchLibrary('빨래', {}, [])
    expect(out.packs.map((p) => p.id)).toContain('home_reset')
    expect(out.packs.map((p) => p.id)).toContain('weekend_reset')
    expect(out.quests.some((q) => q.title.includes('빨래'))).toBe(true)
  })

  it('내가 만든 것을 먼저 보여준다', () => {
    const profiles = recordAdded({}, seed({ questKey: '빨래 돌리기', title: '빨래 돌리기' }))
    const out = searchLibrary('빨래', profiles, [])
    expect(out.quests[0].kind).toBe('HISTORY')
  })

  it('반복도 찾는다', () => {
    const routine: Routine = {
      id: 'r1',
      title: '빨래 널기',
      category: 'LIFE',
      difficulty: 'EASY',
      rule: { kind: 'daily' },
      createdAt: '2026-08-01T00:00:00.000Z',
      lastSpawnedOn: null,
      paused: false,
    }
    const out = searchLibrary('빨래 널기', {}, [routine])
    expect(out.quests.some((q) => q.kind === 'ROUTINE')).toBe(true)
  })

  it('빈 검색어는 아무것도 안 준다', () => {
    expect(searchLibrary('   ', {}, [])).toEqual({ packs: [], quests: [] })
  })
})

// ── 주 N회 반복 ─────────────────────────────────────────
describe('주 N회 반복', () => {
  const routine: Routine = {
    id: 'r1',
    title: '운동',
    category: 'BODY',
    difficulty: 'NORMAL',
    rule: { kind: 'timesPerWeek', times: 3 },
    createdAt: '2026-08-01T00:00:00.000Z',
    lastSpawnedOn: null,
    paused: false,
  }

  it('사람이 읽는 문구가 나온다', () => {
    expect(describeRule({ kind: 'timesPerWeek', times: 3 })).toBe('주 3회')
  })

  it('0회는 쓸 수 없는 규칙이다', () => {
    expect(isUsableRule({ kind: 'timesPerWeek', times: 0 })).toBe(false)
    expect(isUsableRule({ kind: 'timesPerWeek', times: 2 })).toBe(true)
  })

  it('요일과 상관없이 해당한다', () => {
    expect(matchesToday({ kind: 'timesPerWeek', times: 3 }, new Date('2026-08-19T09:00:00'))).toBe(
      true,
    )
  })

  it('이번 주에 아직 덜 채웠으면 더 만든다', () => {
    // 2026-08-22 는 토요일 → 이번 주 월요일은 08-17
    const made = [
      quest({ id: 'a', routineId: 'r1', createdAt: '2026-08-17T09:00:00.000Z' }),
      quest({ id: 'b', routineId: 'r1', createdAt: '2026-08-19T09:00:00.000Z' }),
    ]
    expect(needsMoreThisWeek(routine, made, new Date('2026-08-22T09:00:00'))).toBe(true)
  })

  it('이번 주 몫을 다 채웠으면 쉰다', () => {
    const made = ['2026-08-17', '2026-08-19', '2026-08-21'].map((d, i) =>
      quest({ id: `q${i}`, routineId: 'r1', createdAt: `${d}T09:00:00.000Z` }),
    )
    expect(needsMoreThisWeek(routine, made, new Date('2026-08-22T09:00:00'))).toBe(false)
  })

  it('지난 주에 만든 것은 이번 주 몫에 안 들어간다', () => {
    const made = ['2026-08-10', '2026-08-11', '2026-08-12'].map((d, i) =>
      quest({ id: `q${i}`, routineId: 'r1', createdAt: `${d}T09:00:00.000Z` }),
    )
    expect(needsMoreThisWeek(routine, made, new Date('2026-08-22T09:00:00'))).toBe(true)
  })

  it('다른 규칙에는 영향을 주지 않는다', () => {
    const daily: Routine = { ...routine, rule: { kind: 'daily' } }
    expect(needsMoreThisWeek(daily, [], new Date())).toBe(true)
  })
})

// ── 저장된 기록이 어긋났을 때 ───────────────────────────
describe('sanitizeUsageProfiles 의 key 바로잡기', () => {
  it('key 가 제목과 어긋나 있으면 바로잡는다', async () => {
    const { sanitizeUsageProfiles } = await import('@/store/migrate')
    // 손으로 고친 저장소에서 올 수 있는 모양 — 띄어쓰기가 남은 key
    const out = sanitizeUsageProfiles({
      '물 마시기': {
        title: '물 마시기',
        category: 'BODY',
        difficulty: 'EASY',
        totalAdded: 6,
      },
    })
    expect(Object.keys(out)).toEqual(['물마시기'])
    expect(out['물마시기'].totalAdded).toBe(6)
  })

  it('같은 퀘스트로 갈렸던 둘을 합친다', async () => {
    const { sanitizeUsageProfiles } = await import('@/store/migrate')
    const out = sanitizeUsageProfiles({
      '물 마시기': { title: '물 마시기', category: 'BODY', difficulty: 'EASY', totalAdded: 6, totalCompleted: 2 },
      물마시기: { title: '물마시기', category: 'BODY', difficulty: 'EASY', totalAdded: 1, totalCompleted: 1, favorite: true },
    })
    expect(Object.keys(out)).toHaveLength(1)
    expect(out['물마시기'].totalAdded).toBe(7)
    expect(out['물마시기'].totalCompleted).toBe(3)
    expect(out['물마시기'].favorite).toBe(true)
  })

  it('준비된 퀘스트는 preset id 를 그대로 쓴다', async () => {
    const { sanitizeUsageProfiles } = await import('@/store/migrate')
    const out = sanitizeUsageProfiles({
      'wellness:water': {
        title: '물 챙겨 마시기',
        category: 'BODY',
        difficulty: 'EASY',
        presetId: 'wellness:water',
        totalAdded: 3,
      },
    })
    expect(Object.keys(out)).toEqual(['wellness:water'])
  })
})

// ── 추천 난이도 ─────────────────────────────────────────
describe('추천 난이도 기울기', () => {
  const profileOf = (difficulty: 'EASY' | 'NORMAL' | 'HARD', completed: number) => ({
    ...emptyProfile({ questKey: `k-${difficulty}-${completed}`, title: 't', category: 'LIFE' as const, difficulty }),
    totalCompleted: completed,
  })

  it('기록이 없으면 보통이 제일 반갑다', () => {
    const mix = difficultyMix({})
    expect(mix.NORMAL).toBeGreaterThan(mix.EASY)
    expect(mix.NORMAL).toBeGreaterThan(mix.HARD)
    expect(difficultyScore('NORMAL', mix)).toBe(DIFFICULTY_WEIGHT)
  })

  it('자주 끝낸 난이도가 더 잘 올라온다', () => {
    const mix = difficultyMix({ a: profileOf('HARD', 20) })
    expect(difficultyScore('HARD', mix)).toBeGreaterThan(difficultyScore('EASY', mix))
  })

  it('한 번도 안 해본 난이도라도 0 이 되지는 않는다', () => {
    // 안 해봤다는 게 앞으로도 싫다는 뜻은 아니다.
    // 계속 밀어내고 싶은 사람에게는 "덜 보기" 가 따로 있다.
    const mix = difficultyMix({ a: profileOf('EASY', 50) })
    expect(difficultyScore('HARD', mix)).toBeGreaterThan(0)
  })

  it('처음 쓰는 사람 화면이 쉬움으로만 차지 않는다', () => {
    const picked = recommendQuests({
      profiles: {},
      quests: [],
      routines: [],
      now: new Date('2026-08-24T09:00:00'),
    })
    const easy = picked.filter((r) => r.difficulty === 'EASY').length
    expect(picked).toHaveLength(6)
    expect(easy).toBeLessThanOrEqual(3)
    expect(picked.some((r) => r.difficulty === 'HARD')).toBe(true)
    expect(picked.some((r) => r.difficulty === 'NORMAL')).toBe(true)
  })

  it('덜 보기는 난이도 기울기보다 세다 — 밀어낸 건 밀려나야 한다', () => {
    const p = emptyProfile({ questKey: 'x', title: '싫은 것', category: 'LIFE', difficulty: 'NORMAL' })
    const pushed = { ...p, totalAdded: 3, dismissCount: 4 }
    const { score } = scoreProfile({
      profile: pushed,
      ctx: makeContext(new Date('2026-08-24T09:00:00')),
      routineDue: false,
      packFit: false,
    })
    expect(score).toBeLessThanOrEqual(0)
  })
})
