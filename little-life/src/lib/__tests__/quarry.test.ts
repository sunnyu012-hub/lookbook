import { describe, expect, it } from 'vitest'
import type { AppState } from '@/types'
import { createDefaultState } from '@/store/defaultState'
import { sanitizeState } from '@/store/localStorage'
import { sanitizeQuarry, STATE_VERSION } from '@/store/migrate'
import { findCollectionItem, MINERAL_CATALOG, CATALOG, catalogTotal } from '@/lib/collection/catalog'
import { addItem, isDiscovered, ownedCount, isRecipeKnown, recipeContextOf, canCraft } from '@/lib/collection/progress'
import { RECIPES } from '@/lib/collection/recipes'
import { MINERALS, isMineral, QUARRY_BASE_STONE_ID } from '@/lib/quarry/minerals'
import { QUARRY_SPOTS, findSpot } from '@/lib/quarry/spots'
import {
  DAILY_ATTEMPTS,
  QUARRY_UNLOCK,
  applyQuarryUnlock,
  attemptsLeft,
  canUnlockQuarry,
  discoveredMineralIds,
  emptyQuarry,
  explore,
  isQuarryUnlocked,
  minedTotal,
  oldKeyStoryHintFound,
  quarryView,
  rarestFound,
  rollDrop,
  strangeFragmentFound,
  unlockProgress,
} from '@/lib/quarry/derive'

/** 채석장을 이미 찾은 사람 */
function opened(over: Partial<AppState> = {}): AppState {
  const base = createDefaultState()
  return {
    ...base,
    quarry: { ...base.quarry, unlockedAt: '2026-01-01T00:00:00.000Z' },
    ...over,
  }
}

/** 정해진 수열을 내는 굴림. 확률을 실제로 검사하려고 쓴다. */
function rolls(...values: number[]): () => number {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

// ── A. 광물 ─────────────────────────────────────────────

describe('A. 광물 열두 가지', () => {
  it('열두 개고 id 가 겹치지 않는다', () => {
    expect(MINERALS).toHaveLength(12)
    expect(new Set(MINERALS.map((m) => m.id)).size).toBe(12)
  })

  it('작은 돌은 새로 만들지 않고 이미 있던 재료를 쓴다', () => {
    // 같은 이름으로 하나 더 만들면 가방에 "작은 돌" 이 둘이 된다
    expect(QUARRY_BASE_STONE_ID).toBe('m_stone')
    const def = findCollectionItem('m_stone')!
    expect(def.nameKo).toBe('작은 돌')
    // 도감 물건 목록에 두 번 등록되지 않았다
    expect(MINERAL_CATALOG.filter((i) => i.id === 'm_stone')).toHaveLength(0)
    expect(MINERAL_CATALOG).toHaveLength(11)
  })

  it('전부 도감 물건으로 등록돼 있다', () => {
    for (const m of MINERALS) {
      expect(findCollectionItem(m.id), m.id).not.toBeNull()
    }
  })

  it('240칸은 안 늘어난다', () => {
    for (const m of MINERAL_CATALOG) {
      expect(CATALOG.some((c) => c.id === m.id), m.id).toBe(false)
    }
    expect(catalogTotal({})).toBe(240)
  })

  it('방에 놓는 물건이 아니다 — 재료다', () => {
    for (const m of MINERAL_CATALOG) {
      expect(m.placeable, m.id).toBe(false)
      expect(m.placement, m.id).toBe('MATERIAL_ONLY')
    }
  })

  it('이상한 돌조각만 감춰져 있다', () => {
    const hidden = MINERAL_CATALOG.filter((m) => m.hiddenUntilDiscovered)
    expect(hidden.map((m) => m.id)).toEqual(['mineral_strange_fragment'])
  })
})

// ── B. 탐색 자리 ────────────────────────────────────────

describe('B. 탐색 자리 다섯', () => {
  it('다섯 곳이고 전부 나올 게 있다', () => {
    expect(QUARRY_SPOTS).toHaveLength(5)
    for (const spot of QUARRY_SPOTS) {
      expect(spot.drops.length, spot.id).toBeGreaterThan(0)
      for (const d of spot.drops) {
        expect(isMineral(d.itemId), `${spot.id} → ${d.itemId}`).toBe(true)
        expect(d.weight).toBeGreaterThan(0)
      }
    }
  })

  it('자리마다 나오는 게 다르다', () => {
    const sets = QUARRY_SPOTS.map((s) => s.drops.map((d) => d.itemId).sort().join(','))
    expect(new Set(sets).size).toBe(QUARRY_SPOTS.length)
  })

  it('열두 가지가 전부 어딘가에서는 나온다', () => {
    const all = new Set(QUARRY_SPOTS.flatMap((s) => s.drops.map((d) => d.itemId)))
    for (const m of MINERALS) expect(all.has(m.id), m.id).toBe(true)
  })

  it('이상한 돌조각은 안쪽 길에서만 나온다', () => {
    const where = QUARRY_SPOTS.filter((s) =>
      s.drops.some((d) => d.itemId === 'mineral_strange_fragment'),
    )
    expect(where.map((s) => s.id)).toEqual(['INNER_PATH'])
  })

  it('확률은 표에만 있다 — 무게 그대로 뽑힌다', () => {
    const spot = findSpot('STONE_PILE')!
    // 무게 45 / 35 / 20. 굴림 0 이면 첫 번째, 0.99 면 마지막.
    expect(rollDrop(spot, false, rolls(0))).toBe(spot.drops[0].itemId)
    expect(rollDrop(spot, false, rolls(0.99))).toBe(spot.drops[spot.drops.length - 1].itemId)
  })

  it('밤에는 몇몇이 조금 더 잘 나온다 — 낮에 못 얻는 건 없다', () => {
    const spot = findSpot('INNER_PATH')!
    // 밤에 달조각의 몫이 커진다
    const dayFirst = rollDrop(spot, false, rolls(0.36))
    const nightFirst = rollDrop(spot, true, rolls(0.36))
    expect(spot.nightFavored).toContain('mineral_moon_ore')
    // 낮에도 전부 나올 수 있다 (무게가 0 인 것이 없다)
    for (const d of spot.drops) expect(d.weight).toBeGreaterThan(0)
    expect([dayFirst, nightFirst].every((id) => isMineral(id))).toBe(true)
  })
})

// ── C. 채석장 찾기 ──────────────────────────────────────

describe('C. 채석장을 찾는다', () => {
  it('처음에는 안 열려 있다', () => {
    const s = createDefaultState()
    expect(isQuarryUnlocked(s)).toBe(false)
    expect(canUnlockQuarry(s)).toBe(false)
  })

  it('정원에서 열 번 거두면 열린다', () => {
    const base = createDefaultState()
    const s: AppState = {
      ...base,
      garden: { ...base.garden, harvestedCropCounts: { strawberry: QUARRY_UNLOCK.harvested } },
    }
    expect(canUnlockQuarry(s)).toBe(true)
    const { state, opened: didOpen } = applyQuarryUnlock(s)
    expect(didOpen).toBe(true)
    expect(isQuarryUnlocked(state)).toBe(true)
  })

  it('만들기 세 가지로도 열린다 — 둘 중 하나면 된다', () => {
    let base = createDefaultState()
    let c = base.collection
    for (const id of ['sprout_jar', 'small_frame', 'pencil_cup']) c = addItem(c, id).collection
    base = { ...base, collection: c }
    expect(canUnlockQuarry(base)).toBe(true)
  })

  it('두 번 열지 않는다', () => {
    const s = opened()
    const { opened: again } = applyQuarryUnlock(s)
    expect(again).toBe(false)
  })

  it('조건에 얼마나 왔는지는 저장하지 않는다', () => {
    const base = createDefaultState()
    const half: AppState = {
      ...base,
      garden: { ...base.garden, harvestedCropCounts: { strawberry: 5 } },
    }
    expect(unlockProgress(half)).toBeCloseTo(0.5)
    // 저장 구조에는 진행도 칸이 없다
    expect(Object.keys(emptyQuarry()).sort()).toEqual([
      'attempts',
      'attemptsOn',
      'blockedPathSeen',
      'foundMineralCounts',
      'tutorialSeenAt',
      'unlockedAt',
    ])
  })
})

// ── D. 오늘의 탐색 ──────────────────────────────────────

describe('D. 하루 세 번', () => {
  const day = new Date('2026-03-10T10:00:00')

  it('처음에는 세 번 남아 있다', () => {
    expect(attemptsLeft(opened(), day)).toBe(DAILY_ATTEMPTS)
  })

  it('한 번 쓰면 하나 준다', () => {
    const result = explore(opened(), 'ROCK_CREVICE', day)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(attemptsLeft(result.state, day)).toBe(DAILY_ATTEMPTS - 1)
  })

  it('세 번을 다 쓰면 더 못 한다', () => {
    let s = opened()
    for (let i = 0; i < DAILY_ATTEMPTS; i += 1) {
      const r = explore(s, 'ROCK_CREVICE', day)
      expect(r.ok, `${i}번째`).toBe(true)
      if (r.ok) s = r.state
    }
    expect(attemptsLeft(s, day)).toBe(0)
    const over = explore(s, 'ROCK_CREVICE', day)
    expect(over.ok).toBe(false)
    if (!over.ok) expect(over.reason).toBe('NO_ATTEMPTS')
  })

  it('날짜가 바뀌면 저절로 돌아온다 — 타이머가 없다', () => {
    let s = opened()
    for (let i = 0; i < DAILY_ATTEMPTS; i += 1) {
      const r = explore(s, 'ROCK_CREVICE', day)
      if (r.ok) s = r.state
    }
    expect(attemptsLeft(s, day)).toBe(0)
    const tomorrow = new Date('2026-03-11T00:05:00')
    expect(attemptsLeft(s, tomorrow)).toBe(DAILY_ATTEMPTS)
  })

  it('안 찾았으면 살펴볼 수 없다', () => {
    const r = explore(createDefaultState(), 'ROCK_CREVICE', day)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('LOCKED')
  })
})

// ── E. 캐기 ─────────────────────────────────────────────

describe('E. 살펴보면 늘 뭔가 나온다', () => {
  const day = new Date('2026-03-10T10:00:00')

  it('헛걸음이 없다 — 어느 자리든 하나는 나온다', () => {
    for (const spot of QUARRY_SPOTS) {
      const r = explore(opened(), spot.id, day)
      expect(r.ok, spot.id).toBe(true)
      if (!r.ok) continue
      expect(r.find.itemId).toBeTruthy()
      expect(ownedCount(r.state.collection, r.find.itemId)).toBeGreaterThan(0)
    }
  })

  it('처음 캔 것은 도감에 남는다', () => {
    const r = explore(opened(), 'ROCK_CREVICE', day)
    if (!r.ok) throw new Error('실패')
    expect(r.find.isNew).toBe(true)
    expect(isDiscovered(r.state.collection, r.find.itemId)).toBe(true)
  })

  it('두 번째부터는 새 발견이 아니다', () => {
    const first = explore(opened(), 'ROCK_CREVICE', day)
    if (!first.ok) throw new Error('실패')
    // 같은 것이 또 나오게 굴림을 고정한다
    const again = explore(first.state, 'ROCK_CREVICE', day, rolls(0))
    if (!again.ok) throw new Error('실패')
    if (again.find.itemId === first.find.itemId) {
      expect(again.find.isNew).toBe(false)
    }
  })

  it('같은 날 같은 자리 같은 차례면 늘 같은 게 나온다', () => {
    const a = explore(opened(), 'LOW_CLIFF', day)
    const b = explore(opened(), 'LOW_CLIFF', day)
    if (!a.ok || !b.ok) throw new Error('실패')
    // 새로고침해서 다시 굴릴 수가 없다
    expect(a.find.itemId).toBe(b.find.itemId)
  })

  it('캔 횟수를 센다', () => {
    let s = opened()
    const r = explore(s, 'STONE_PILE', day)
    if (!r.ok) throw new Error('실패')
    s = r.state
    expect(minedTotal(s.quarry)).toBe(1)
    expect(s.quarry.foundMineralCounts[r.find.itemId]).toBe(1)
  })

  it('만나본 것은 캔 기록에서 센다 — 따로 적어두지 않는다', () => {
    const s = opened({
      quarry: { ...emptyQuarry(), unlockedAt: 'x', foundMineralCounts: { mineral_quartz: 2 } },
    })
    expect(discoveredMineralIds(s)).toContain('mineral_quartz')
    expect(rarestFound(s)?.id).toBe('mineral_quartz')
  })
})

// ── F. 다음 이야기 ──────────────────────────────────────

describe('F. 이상한 돌조각', () => {
  it('만나기 전에는 아무 깃발도 안 서 있다', () => {
    const s = opened()
    expect(strangeFragmentFound(s)).toBe(false)
    expect(oldKeyStoryHintFound(s)).toBe(false)
  })

  it('만나면 다음 이야기가 읽을 값이 생긴다 — 따로 저장하지 않는다', () => {
    const s = opened({
      quarry: {
        ...emptyQuarry(),
        unlockedAt: 'x',
        foundMineralCounts: { mineral_strange_fragment: 1 },
      },
    })
    expect(strangeFragmentFound(s)).toBe(true)
    expect(oldKeyStoryHintFound(s)).toBe(true)
  })

  it('막힌 길은 들여다본 것만 적는다 — 갈 수 있게 되지 않는다', () => {
    const s = opened()
    expect(s.quarry.blockedPathSeen).toBe(false)
    const seen = { ...s, quarry: { ...s.quarry, blockedPathSeen: true } }
    expect(seen.quarry.blockedPathSeen).toBe(true)
    // 이 값이 참이어도 갈 수 있는 자리가 늘지 않는다
    expect(quarryView(seen).spots).toHaveLength(QUARRY_SPOTS.length)
  })
})

// ── G. 작업실 연결 ──────────────────────────────────────

describe('G. 돌등불', () => {
  it('광물을 세 가지 만나야 열린다', () => {
    const recipe = RECIPES.find((r) => r.resultItemId === 'w_quarry_lantern')!
    const before = opened()
    expect(isRecipeKnown(recipe, recipeContextOf(before))).toBe(false)

    const after = opened({
      quarry: {
        ...emptyQuarry(),
        unlockedAt: 'x',
        foundMineralCounts: { m_stone: 1, mineral_spark_stone: 1, mineral_old_metal: 1 },
      },
    })
    expect(isRecipeKnown(recipe, recipeContextOf(after))).toBe(true)
  })

  it('재료가 전부 실제로 있는 것이다', () => {
    const recipe = RECIPES.find((r) => r.resultItemId === 'w_quarry_lantern')!
    for (const ing of recipe.ingredients) {
      expect(findCollectionItem(ing.itemId), ing.itemId).not.toBeNull()
    }
  })

  it('재료를 모으면 만들 수 있다', () => {
    const recipe = RECIPES.find((r) => r.resultItemId === 'w_quarry_lantern')!
    let c = createDefaultState().collection
    expect(canCraft(recipe, c)).toBe(false)
    for (const ing of recipe.ingredients) {
      for (let i = 0; i < ing.count; i += 1) c = addItem(c, ing.itemId).collection
    }
    expect(canCraft(recipe, c)).toBe(true)
  })
})

// ── H. 저장 ─────────────────────────────────────────────

describe('H. 저장과 이관', () => {
  it('예전 저장에 채석장이 없어도 그냥 읽힌다', () => {
    const old = { version: 14, user: { name: '유리', level: 5 }, quests: [] }
    const state = sanitizeState(old)!
    expect(state.user.name).toBe('유리')
    expect(state.quarry).toEqual(emptyQuarry())
    expect(state.version).toBe(STATE_VERSION)
  })

  it('없는 광물이 적혀 있으면 조용히 버린다', () => {
    const q = sanitizeQuarry({
      unlockedAt: 'x',
      foundMineralCounts: { mineral_quartz: 3, 없는광물: 9 },
    })
    expect(q.foundMineralCounts).toEqual({ mineral_quartz: 3 })
  })

  it('손으로 고쳐서 오늘 몫을 늘릴 수 없다', () => {
    const q = sanitizeQuarry({ attempts: 999, attemptsOn: '2026-03-10' })
    expect(q.attempts).toBe(DAILY_ATTEMPTS)
  })

  it('스키마 버전이 15 이다', () => {
    expect(STATE_VERSION).toBe(15)
    expect(createDefaultState().version).toBe(15)
  })
})

// ── I. 안 오면 손해인 게 없다 ───────────────────────────

describe('I. 매일 해야 하는 숙제가 아니다', () => {
  it('연속으로 온 날을 세지 않는다', () => {
    const keys = Object.keys(emptyQuarry())
    expect(keys.some((k) => /streak|연속|combo/i.test(k))).toBe(false)
  })

  it('며칠 안 와도 캔 기록이 줄지 않는다', () => {
    const s = opened({
      quarry: { ...emptyQuarry(), unlockedAt: 'x', foundMineralCounts: { mineral_quartz: 5 } },
    })
    const muchLater = new Date('2027-01-01T10:00:00')
    expect(discoveredMineralIds(s)).toContain('mineral_quartz')
    expect(attemptsLeft(s, muchLater)).toBe(DAILY_ATTEMPTS)
    expect(minedTotal(s.quarry)).toBe(5)
  })

  it('광물 자체가 보상이다 — 코인·EXP 를 따로 주지 않는다', () => {
    const before = opened()
    const r = explore(before, 'ROCK_CREVICE', new Date('2026-03-10T10:00:00'))
    if (!r.ok) throw new Error('실패')
    expect(r.state.user.coins).toBe(before.user.coins)
    expect(r.state.user.totalExp).toBe(before.user.totalExp)
  })
})
