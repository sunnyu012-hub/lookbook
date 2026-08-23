import { describe, expect, it } from 'vitest'
import type { Category, QuestUsageProfile, UsageProfiles } from '@/types'
import {
  FRESH_SLOTS,
  categoryHunger,
  pickFresh,
  recentCategoryDays,
} from '@/lib/library/fresh'
import {
  RECOMMEND_COUNT,
  coldStartEntries,
  makeContext,
  recommendQuests,
} from '@/lib/library/recommend'
import { ALL_PRESETS, QUEST_PACKS } from '@/lib/library/packs'
import { emptyBandCounts, emptyDayCounts } from '@/lib/library/usage'

function dayAfter(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00`)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/** 내가 직접 적은 퀘스트 기록 하나 */
function profile(over: Partial<QuestUsageProfile> & { questKey: string }): QuestUsageProfile {
  return {
    title: over.questKey,
    category: 'LIFE',
    difficulty: 'NORMAL',
    presetId: null,
    sourcePackIds: [],
    totalAdded: 5,
    totalCompleted: 4,
    lastAddedAt: '2026-09-13T09:00:00.000Z',
    lastCompletedAt: '2026-09-13T09:00:00.000Z',
    addedByDayOfWeek: emptyDayCounts(),
    addedByBand: emptyBandCounts(),
    completedByDayOfWeek: emptyDayCounts(),
    completedByBand: emptyBandCounts(),
    recentCompletionDates: [],
    favorite: false,
    dismissCount: 0,
    hiddenOn: null,
    ...over,
  }
}

/** 생활·일만 하는 사람 */
function choreOnly(count: number, day: string): UsageProfiles {
  const dates = [0, 1, 2, 3, 4, 5, 6].map((d) => dayAfter(day, -d))
  const out: UsageProfiles = {}
  for (let i = 0; i < count; i += 1) {
    const key = `mine_${i}`
    out[key] = profile({
      questKey: key,
      title: `내가 적은 일 ${i}`,
      category: i % 3 === 0 ? 'WORK' : 'LIFE',
      lastCompletedAt: `${dates[0]}T09:00:00.000Z`,
      recentCompletionDates: dates,
    })
  }
  return out
}

// ── 목록이 묻혀 있지 않은가 ────────────────────────────

describe('준비된 퀘스트가 다 닿는다', () => {
  it('어느 시간대에든 후보에서 통째로 빠지는 세트가 없다', () => {
    // 예전에는 시간대가 안 적힌 세트 11개(112개 중 65개)가 한 번도 안 나왔다
    const shown = new Set<string>()
    for (const day of ['2026-09-14', '2026-09-19']) {
      for (let h = 0; h < 24; h += 1) {
        const ctx = makeContext(new Date(`${day}T${String(h).padStart(2, '0')}:00:00`))
        for (const e of coldStartEntries(ctx)) shown.add(e.pack.id)
      }
    }
    const buried = QUEST_PACKS.filter((p) => !shown.has(p.id))
    expect(buried.map((p) => p.id)).toEqual([])
  })

  it('시간대에 걸린 세트가 앞에 온다', () => {
    // 아침에는 아침 세트가 먼저 나와야 한다. 섞여 있기만 하면 소용이 없다.
    const ctx = makeContext(new Date('2026-09-14T08:00:00'))
    const entries = coldStartEntries(ctx)
    const first = entries[0].pack
    expect(first.bands?.includes('MORNING') ?? false).toBe(true)
  })

  it('하고 싶은 것 쪽 목록이 충분히 있다', () => {
    // "딱히 하고 싶은 것도 없어" 에 답하려면 목록에 하고 싶은 게 있어야 한다
    const count = (c: Category) => ALL_PRESETS.filter((e) => e.preset.category === c).length
    expect(count('PLAY')).toBeGreaterThanOrEqual(15)
    expect(count('HEART')).toBeGreaterThanOrEqual(10)
    expect(count('MIND')).toBeGreaterThanOrEqual(15)
  })
})

// ── 새로 해볼 것 ────────────────────────────────────────

describe('오늘 새로 해볼 것', () => {
  const ctx = makeContext(new Date('2026-09-14T09:00:00'))

  it('한 번도 안 해본 것에서 고른다', () => {
    const profiles = choreOnly(10, '2026-09-14')
    const picked = pickFresh(profiles, ctx, new Set())

    expect(picked.length).toBe(FRESH_SLOTS)
    for (const p of picked) {
      expect(profiles[p.questKey]).toBeUndefined()
      expect(p.reason).toBe('FRESH')
      expect(p.presetId).not.toBeNull()
    }
  })

  it('같은 날이면 몇 번을 봐도 같은 것이 나온다', () => {
    const profiles = choreOnly(10, '2026-09-14')
    const a = pickFresh(profiles, ctx, new Set())
    const b = pickFresh(profiles, ctx, new Set())
    expect(b.map((r) => r.questKey)).toEqual(a.map((r) => r.questKey))
  })

  it('날이 바뀌면 다른 것이 온다', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 14; i += 1) {
      const day = dayAfter('2026-09-14', i)
      const c = makeContext(new Date(`${day}T09:00:00`))
      for (const r of pickFresh(choreOnly(10, day), c, new Set())) seen.add(r.questKey)
    }
    // 2주 동안 최소 열 가지는 서로 달라야 "새것" 이라 할 만하다
    expect(seen.size).toBeGreaterThanOrEqual(10)
  })

  it('두 칸이 같은 분야로 차지 않는다', () => {
    const picked = pickFresh(choreOnly(10, '2026-09-14'), ctx, new Set())
    expect(new Set(picked.map((r) => r.category)).size).toBe(picked.length)
  })

  it('빼라고 한 것은 안 고른다', () => {
    const skip = new Set(ALL_PRESETS.slice(0, 100).map((e) => e.key))
    for (const r of pickFresh({}, ctx, skip)) {
      expect(skip.has(r.questKey)).toBe(false)
    }
  })

  it('덜 보겠다고 한 것은 새것으로도 안 내민다', () => {
    const target = ALL_PRESETS[0]
    const profiles: UsageProfiles = {
      [target.key]: profile({ questKey: target.key, dismissCount: 3 }),
    }
    for (let i = 0; i < 30; i += 1) {
      const day = dayAfter('2026-09-14', i)
      const c = makeContext(new Date(`${day}T09:00:00`))
      const keys = pickFresh(profiles, c, new Set()).map((r) => r.questKey)
      expect(keys).not.toContain(target.key)
    }
  })

  it('오늘 숨긴 것도 안 내민다', () => {
    const target = ALL_PRESETS[0]
    const profiles: UsageProfiles = {
      [target.key]: profile({ questKey: target.key, hiddenOn: '2026-09-14' }),
    }
    const keys = pickFresh(profiles, ctx, new Set()).map((r) => r.questKey)
    expect(keys).not.toContain(target.key)
  })

  it('최근에 한 것은 새것이 아니다', () => {
    // 전부 어제 한 것으로 만들면 고를 게 없다
    const profiles: UsageProfiles = {}
    for (const e of ALL_PRESETS) {
      profiles[e.key] = profile({
        questKey: e.key,
        lastCompletedAt: '2026-09-13T09:00:00.000Z',
      })
    }
    expect(pickFresh(profiles, ctx, new Set())).toEqual([])
  })

  it('한 달 넘게 안 한 것은 다시 새것이 된다', () => {
    const profiles: UsageProfiles = {}
    for (const e of ALL_PRESETS) {
      profiles[e.key] = profile({
        questKey: e.key,
        lastCompletedAt: '2026-06-01T09:00:00.000Z',
      })
    }
    expect(pickFresh(profiles, ctx, new Set()).length).toBe(FRESH_SLOTS)
  })
})

// ── 요즘 안 한 분야 ─────────────────────────────────────

describe('요즘 안 한 쪽으로 기운다', () => {
  it('며칠 손댔는지로 센다 — 하루에 몰아서 한 것을 크게 치지 않는다', () => {
    const ctx = makeContext(new Date('2026-09-14T09:00:00'))
    // 하루에 다섯 개
    const burst: UsageProfiles = {}
    for (let i = 0; i < 5; i += 1) {
      burst[`b${i}`] = profile({
        questKey: `b${i}`,
        category: 'LIFE',
        recentCompletionDates: ['2026-09-13'],
      })
    }
    // 닷새에 걸쳐 하나씩
    const spread: UsageProfiles = {
      s0: profile({
        questKey: 's0',
        category: 'LIFE',
        recentCompletionDates: ['2026-09-13', '2026-09-12', '2026-09-11', '2026-09-10', '2026-09-09'],
      }),
    }

    expect(recentCategoryDays(burst, ctx).LIFE).toBe(1)
    expect(recentCategoryDays(spread, ctx).LIFE).toBe(5)
  })

  it('오래된 기록은 안 센다', () => {
    const ctx = makeContext(new Date('2026-09-14T09:00:00'))
    const old: UsageProfiles = {
      a: profile({ questKey: 'a', category: 'PLAY', recentCompletionDates: ['2026-01-01'] }),
    }
    expect(recentCategoryDays(old, ctx).PLAY).toBeUndefined()
  })

  it('손 안 댄 분야가 더 반갑다', () => {
    expect(categoryHunger('PLAY', {})).toBeGreaterThan(categoryHunger('PLAY', { PLAY: 5 }))
    // 그래도 0 은 아니다 — 좋아하는 걸 계속 하는 사람에게 그만하라고 하지 않는다
    expect(categoryHunger('LIFE', { LIFE: 14 })).toBeGreaterThan(0)
  })

  it('생활·일만 하는 사람에게는 다른 것을 내민다', () => {
    const byCategory: Record<string, number> = {}
    for (let i = 0; i < 30; i += 1) {
      const day = dayAfter('2026-09-14', i)
      const c = makeContext(new Date(`${day}T09:00:00`))
      for (const r of pickFresh(choreOnly(10, day), c, new Set())) {
        byCategory[r.category] = (byCategory[r.category] ?? 0) + 1
      }
    }
    const chores = (byCategory.LIFE ?? 0) + (byCategory.WORK ?? 0)
    const rest = Object.values(byCategory).reduce((a, b) => a + b, 0) - chores
    // 새것의 절반 넘게는 하던 것 말고 다른 쪽이어야 한다
    expect(rest).toBeGreaterThan(chores)
  })
})

// ── 추천 전체 ───────────────────────────────────────────

describe('추천에 새것 자리가 남는다', () => {
  it('기록이 많아도 여섯 칸이 전부 예전 것으로 차지 않는다', () => {
    // 예전에는 기록이 여섯 개만 넘으면 새것이 0칸이었다
    for (let i = 0; i < 30; i += 1) {
      const day = dayAfter('2026-09-14', i)
      const now = new Date(`${day}T09:00:00`)
      const recs = recommendQuests({
        profiles: choreOnly(20, day),
        quests: [],
        routines: [],
        now,
      })
      const fresh = recs.filter((r) => r.reason === 'FRESH')
      expect(fresh.length, day).toBeGreaterThan(0)
    }
  })

  it('그래도 대부분은 내가 하던 것이다', () => {
    // 새것이 절반을 넘으면 그건 추천이 아니라 남의 목록이다
    const recs = recommendQuests({
      profiles: choreOnly(20, '2026-09-14'),
      quests: [],
      routines: [],
      now: new Date('2026-09-14T09:00:00'),
    })
    const fresh = recs.filter((r) => r.reason === 'FRESH')
    expect(fresh.length).toBeLessThan(recs.length / 2)
  })

  it('한 달이면 마흔 가지 넘게 서로 다른 새것을 본다', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 30; i += 1) {
      const day = dayAfter('2026-09-14', i)
      const recs = recommendQuests({
        profiles: choreOnly(20, day),
        quests: [],
        routines: [],
        now: new Date(`${day}T09:00:00`),
      })
      for (const r of recs) if (r.reason === 'FRESH') seen.add(r.title)
    }
    expect(seen.size).toBeGreaterThanOrEqual(40)
  })

  it('기록이 적으면 자리를 떼지 않는다', () => {
    // 어차피 아래에서 준비된 퀘스트로 채워진다. 두 번 뗄 이유가 없다.
    const recs = recommendQuests({
      profiles: choreOnly(2, '2026-09-14'),
      quests: [],
      routines: [],
      now: new Date('2026-09-14T09:00:00'),
    })
    expect(recs.length).toBe(RECOMMEND_COUNT)
    expect(recs.filter((r) => r.reason === 'FRESH')).toHaveLength(0)
  })

  it('처음 쓰는 사람에게도 여섯 칸이 찬다', () => {
    const recs = recommendQuests({
      profiles: {},
      quests: [],
      routines: [],
      now: new Date('2026-09-14T09:00:00'),
    })
    expect(recs).toHaveLength(RECOMMEND_COUNT)
  })

  it('개인화를 꺼도 새것은 나온다', () => {
    // 끈 것은 "내 기록으로 순서를 정하는 것" 이지 "새로운 걸 보여주지 마" 가 아니다
    const recs = recommendQuests({
      profiles: choreOnly(20, '2026-09-14'),
      quests: [],
      routines: [],
      personalized: false,
      now: new Date('2026-09-14T09:00:00'),
    })
    expect(recs).toHaveLength(RECOMMEND_COUNT)
    // 개인화를 껐으니 내가 적은 것은 하나도 안 나온다
    expect(recs.every((r) => r.presetId !== null)).toBe(true)
  })

  it('오늘 이미 있는 것은 새것으로도 안 올라온다', () => {
    const target = ALL_PRESETS[0]
    const recs = recommendQuests({
      profiles: choreOnly(20, '2026-09-14'),
      quests: [
        {
          id: 'x',
          title: target.preset.title,
          category: target.preset.category,
          difficulty: target.preset.difficulty,
          exp: 10,
          completed: false,
          createdAt: '2026-09-14T08:00:00.000Z',
          completedAt: null,
        },
      ],
      routines: [],
      now: new Date('2026-09-14T09:00:00'),
    })
    expect(recs.map((r) => r.title)).not.toContain(target.preset.title)
  })

  it('추천 안에 같은 것이 두 번 없다', () => {
    for (let i = 0; i < 20; i += 1) {
      const day = dayAfter('2026-09-14', i)
      const recs = recommendQuests({
        profiles: choreOnly(20, day),
        quests: [],
        routines: [],
        now: new Date(`${day}T09:00:00`),
      })
      expect(new Set(recs.map((r) => r.questKey)).size, day).toBe(recs.length)
      expect(new Set(recs.map((r) => r.title)).size, day).toBe(recs.length)
    }
  })
})
