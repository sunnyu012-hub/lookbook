import { describe, expect, it } from 'vitest'
import type { AppState } from '@/types'
import { createDefaultState } from '@/store/defaultState'
import { sanitizeState } from '@/store/localStorage'
import { sanitizeGarden, sanitizeEnergy, STATE_VERSION } from '@/store/migrate'
import { CATALOG, catalogTotal, findCollectionItem } from '@/lib/collection/catalog'
import { addItem, ownedCount, isDiscovered } from '@/lib/collection/progress'
import { CROPS, PLANTABLE_CROPS, findCrop, GARDEN_DEW_ITEM_ID } from '@/lib/garden/crops'
import {
  GARDEN_LEVELS,
  GARDEN_UNLOCK,
  applyGardenUnlock,
  canUnlockGarden,
  discoveredCropIds,
  emptyGarden,
  gardenLevel,
  gardenView,
  gardenXp,
  harvestPlot,
  harvestedTotal,
  isGardenUnlocked,
  plantSeed,
  plotsForLevel,
  readyCount,
  seedStock,
  unlockProgress,
  useDew,
} from '@/lib/garden/derive'
import {
  ENERGY_BY_DIFFICULTY,
  GROWTH_BONUS_SECONDS,
  MAX_ADVENTURE_ENERGY,
  applyGrowthBonus,
  gainEnergy,
  revertGrowthBonus,
  rollGardenDrops,
} from '@/lib/garden/quest'
import { applyDevGarden } from '@/lib/garden/dev'

/**
 * 작은 정원.
 *
 * 여기서 제일 중요한 검사는 "아무것도 죽지 않는다" 다.
 * 시간이 얼마나 지나든, 앱을 몇 번 껐다 켜든, 심어둔 것은 그대로 있어야 한다.
 */

function base(): AppState {
  return createDefaultState()
}

function opened(): AppState {
  const s = base()
  return { ...s, garden: { ...emptyGarden(), unlockedAt: '2026-01-01T00:00:00.000Z' } }
}

/**
 * 굴림을 순서대로 돌려준다.
 *
 * 거두기는 굴림을 두 번 쓴다 — 개수 하나, 섞여 나오는 것 하나.
 * 0 만 돌려주면 황금 딸기가 늘 같이 나와서 개수 검사가 흔들린다.
 */
function rolls(...values: number[]): () => number {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

/** 씨앗을 n개 쥐어준다 */
function withSeeds(state: AppState, cropId: string, n: number): AppState {
  const crop = findCrop(cropId)!
  let collection = state.collection
  for (let i = 0; i < n; i += 1) collection = addItem(collection, crop.seedItemId).collection
  return { ...state, collection }
}

// ── A. 이관 ─────────────────────────────────────────────

describe('A. 기존 저장이 다치지 않는다', () => {
  it('정원이 없던 저장에도 빈 정원이 생긴다', () => {
    const old = { version: 11, user: { name: '유리', level: 5 }, quests: [] }
    const state = sanitizeState(old)!
    expect(state.garden.unlockedAt).toBeNull()
    expect(state.garden.plots).toHaveLength(8)
    expect(state.version).toBe(STATE_VERSION)
    // 원래 있던 값은 그대로다
    expect(state.user.name).toBe('유리')
    expect(state.user.level).toBe(5)
  })

  it('심어둔 것은 다시 읽어도 그대로다', () => {
    const planted = {
      unlockedAt: '2026-01-01T00:00:00.000Z',
      tutorialSeenAt: '2026-01-01T00:00:00.000Z',
      plots: [
        {
          id: 'plot-1',
          cropId: 'strawberry',
          plantedAt: '2026-01-02T00:00:00.000Z',
          readyAt: '2026-01-02T04:00:00.000Z',
        },
      ],
      harvestedCropCounts: { tomato: 3 },
      plantedCount: 7,
    }
    const garden = sanitizeGarden(planted)
    expect(garden.plots[0]).toEqual(planted.plots[0])
    expect(garden.harvestedCropCounts).toEqual({ tomato: 3 })
    expect(garden.plantedCount).toBe(7)
  })

  it('반쯤 깨진 칸은 빈 칸으로 본다', () => {
    const garden = sanitizeGarden({
      plots: [
        { id: 'plot-1', cropId: 'strawberry' }, // 언제 심었는지가 없다
        { id: 'plot-2', cropId: '없는작물', plantedAt: 'x', readyAt: 'y' },
      ],
      harvestedCropCounts: { 없는작물: 5 },
    })
    expect(garden.plots[0].cropId).toBeUndefined()
    expect(garden.plots[1].cropId).toBeUndefined()
    expect(garden.harvestedCropCounts).toEqual({})
  })

  it('도감 240칸은 그대로다 — 작물이 총계를 늘리지 않는다', () => {
    expect(CATALOG).toHaveLength(240)
    expect(catalogTotal({})).toBe(240)
    // 씨앗도 작물도 이름으로는 찾힌다 (안 그러면 가질 수가 없다)
    expect(findCollectionItem('seed_strawberry')).not.toBeNull()
    expect(findCollectionItem('crop_strawberry')).not.toBeNull()
    expect(findCollectionItem(GARDEN_DEW_ITEM_ID)).not.toBeNull()
  })
})

// ── B. 해금 ─────────────────────────────────────────────

describe('B. 정원을 찾는 조건', () => {
  it('처음에는 잠겨 있다', () => {
    expect(isGardenUnlocked(base())).toBe(false)
    expect(canUnlockGarden(base())).toBe(false)
  })

  it('하나만 채우면 아직이다 — 평균이 아니라 제일 덜 온 것을 본다', () => {
    const half: AppState = {
      ...base(),
      reputation: { ...base().reputation, GREEN_PARK: 99 },
    }
    expect(unlockProgress(half)).toBe(0)
    expect(canUnlockGarden(half)).toBe(false)
  })

  it('둘 다 채우면 열린다', () => {
    const ready: AppState = {
      ...base(),
      reputation: { ...base().reputation, GREEN_PARK: GARDEN_UNLOCK.parkReputation },
      categoryCompleted: { ...base().categoryCompleted, LIFE: 4, BODY: 3, MIND: 3 },
    }
    expect(canUnlockGarden(ready)).toBe(true)
    const result = applyGardenUnlock(ready)
    expect(result.opened).toBe(true)
    expect(isGardenUnlocked(result.state)).toBe(true)
  })

  it('두 번 열리지 않는다', () => {
    const once = applyGardenUnlock(opened())
    expect(once.opened).toBe(false)
  })

  it('조건은 되돌아가지 않는 값만 본다', () => {
    // 평판과 분야별 완료 수는 둘 다 "지금까지 몇 번" 이라 내려갈 수가 없다.
    // 연속 며칠 · 이번 주 같은 값이 섞이면 쉬었을 때 조건이 멀어진다.
    expect(GARDEN_UNLOCK.quietCategories).toEqual(['LIFE', 'BODY', 'MIND'])
  })
})

// ── C. 심기 · 자라기 · 거두기 ───────────────────────────

describe('C. 심고 자라고 거둔다', () => {
  const now = new Date('2026-03-01T09:00:00.000Z')

  it('씨앗이 없으면 못 심는다', () => {
    const { state, result } = plantSeed(opened(), 0, 'strawberry', now)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('NO_SEED')
    expect(state.garden.plots[0].cropId).toBeUndefined()
  })

  it('심으면 씨앗이 하나 줄고 다 자랄 시각이 굳는다', () => {
    const before = withSeeds(opened(), 'strawberry', 2)
    const { state, result } = plantSeed(before, 0, 'strawberry', now)

    expect(result.ok).toBe(true)
    expect(ownedCount(state.collection, 'seed_strawberry')).toBe(1)
    expect(state.garden.plots[0].cropId).toBe('strawberry')
    expect(state.garden.plots[0].plantedAt).toBe(now.toISOString())
    // 딸기는 네 시간
    expect(state.garden.plots[0].readyAt).toBe('2026-03-01T13:00:00.000Z')
    expect(state.garden.plantedCount).toBe(1)
  })

  it('잠긴 칸에는 못 심는다', () => {
    const before = withSeeds(opened(), 'strawberry', 1)
    const { result } = plantSeed(before, 7, 'strawberry', now)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('LOCKED')
  })

  it('이미 심어둔 칸에는 또 못 심는다', () => {
    const planted = plantSeed(withSeeds(opened(), 'strawberry', 2), 0, 'strawberry', now).state
    const { result } = plantSeed(planted, 0, 'strawberry', now)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('BUSY')
  })

  it('앱을 닫아둬도 시간은 흐른다 — 다시 읽어도 그대로 자란다', () => {
    const planted = plantSeed(withSeeds(opened(), 'strawberry', 1), 0, 'strawberry', now).state

    // 저장했다 다시 읽는다
    const reloaded = sanitizeState(JSON.parse(JSON.stringify(planted)))!
    expect(reloaded.garden.plots[0].readyAt).toBe(planted.garden.plots[0].readyAt)

    // 두 시간 뒤 — 아직 자라는 중
    const half = gardenView(reloaded, new Date('2026-03-01T11:00:00.000Z'))
    expect(half.plots[0].state).toBe('GROWING')
    expect(half.plots[0].stage).toBe(2)

    // 나흘 뒤에 열어도 죽어 있지 않다. 다 자란 채로 기다린다.
    const later = gardenView(reloaded, new Date('2026-03-05T09:00:00.000Z'))
    expect(later.plots[0].state).toBe('READY')
    expect(later.plots[0].remainingSeconds).toBe(0)
    expect(readyCount(reloaded, new Date('2026-03-05T09:00:00.000Z'))).toBe(1)
  })

  it('다 자라기 전에는 못 거둔다', () => {
    const planted = plantSeed(withSeeds(opened(), 'strawberry', 1), 0, 'strawberry', now).state
    const { result } = harvestPlot(planted, 0, now)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('NOT_READY')
  })

  it('거두면 손에 들어오고 도감에 들어가고 밭이 빈다', () => {
    const planted = plantSeed(withSeeds(opened(), 'strawberry', 1), 0, 'strawberry', now).state
    const ready = new Date('2026-03-01T13:00:00.000Z')
    // 늘 최소 개수가 나오게 고정한다
    // 개수는 최소로, 섞여 나오는 것은 안 나오게
    const { state, result } = harvestPlot(planted, 0, ready, rolls(0, 0.99))

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.crop.id).toBe('strawberry')
    expect(result.count).toBe(2)
    expect(result.isNew).toBe(true)

    expect(ownedCount(state.collection, 'crop_strawberry')).toBe(2)
    expect(isDiscovered(state.collection, 'crop_strawberry')).toBe(true)
    expect(state.garden.plots[0].cropId).toBeUndefined()
    expect(state.garden.harvestedCropCounts.strawberry).toBe(1)
    expect(discoveredCropIds(state.garden)).toEqual(['strawberry'])
  })

  it('거둔 개수는 최소와 최대 사이다', () => {
    for (const roll of [0, 0.5, 0.999999]) {
      const planted = plantSeed(withSeeds(opened(), 'potato', 1), 0, 'potato', now).state
      const { result } = harvestPlot(planted, 0, new Date('2026-03-02T09:00:00.000Z'), rolls(roll, 0.99))
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.count).toBeGreaterThanOrEqual(result.crop.harvestMin)
      expect(result.count).toBeLessThanOrEqual(result.crop.harvestMax)
    }
  })

  it('두 번째부터는 처음 발견이 아니다', () => {
    let state = plantSeed(withSeeds(opened(), 'strawberry', 2), 0, 'strawberry', now).state
    state = harvestPlot(state, 0, new Date('2026-03-01T13:00:00.000Z'), rolls(0, 0.99)).state
    state = plantSeed(state, 0, 'strawberry', new Date('2026-03-01T14:00:00.000Z')).state
    const { result } = harvestPlot(state, 0, new Date('2026-03-01T18:00:00.000Z'), rolls(0, 0.99))
    expect(result.ok && result.isNew).toBe(false)
  })
})

// ── D. 정원 레벨 ────────────────────────────────────────

describe('D. 정원이 넓어진다', () => {
  it('경험치는 저장하지 않고 거둔 기록에서 센다', () => {
    const garden = { ...emptyGarden(), harvestedCropCounts: { strawberry: 3, lavender: 2 } }
    // 흔한 것 1점 · 귀한 것 2점
    expect(gardenXp(garden)).toBe(3 * 1 + 2 * 2)
    expect(harvestedTotal(garden)).toBe(5)
  })

  it('단계마다 밭이 늘어난다', () => {
    expect(plotsForLevel(1)).toBe(4)
    expect(plotsForLevel(2)).toBe(6)
    expect(plotsForLevel(3)).toBe(8)
    for (const def of GARDEN_LEVELS) {
      expect(gardenLevel(def.needXp)).toBe(def.level)
    }
  })

  it('Lv.2 가 되면 밭이 여섯 칸이다', () => {
    const state: AppState = {
      ...opened(),
      garden: { ...emptyGarden(), unlockedAt: 'x', harvestedCropCounts: { strawberry: 20 } },
    }
    const view = gardenView(state)
    expect(view.level).toBe(2)
    expect(view.plotsUnlocked).toBe(6)
    expect(view.plots.filter((p) => p.state === 'EMPTY')).toHaveLength(6)
  })

  it('마지막 단계에서는 다음이 없다', () => {
    const state: AppState = {
      ...opened(),
      garden: { ...emptyGarden(), unlockedAt: 'x', harvestedCropCounts: { strawberry: 60 } },
    }
    const view = gardenView(state)
    expect(view.level).toBe(3)
    expect(view.nextLevelXp).toBeNull()
  })

  it('잠긴 칸에 심어둔 게 있으면 그건 계속 자라고 거둘 수 있다', () => {
    // 값을 손봐서 밭이 줄어드는 일이 생겨도 심어둔 걸 잃지 않아야 한다
    const now = new Date('2026-03-01T09:00:00.000Z')
    const state: AppState = {
      ...opened(),
      garden: {
        ...emptyGarden(),
        unlockedAt: 'x',
        plots: emptyGarden().plots.map((p, i) =>
          i === 7
            ? {
                ...p,
                cropId: 'strawberry' as const,
                plantedAt: now.toISOString(),
                readyAt: '2026-03-01T13:00:00.000Z',
              }
            : p,
        ),
      },
    }
    const view = gardenView(state, new Date('2026-03-01T13:00:00.000Z'))
    expect(view.plotsUnlocked).toBe(4)
    expect(view.plots[7].state).toBe('READY')
    expect(harvestPlot(state, 7, new Date('2026-03-01T13:00:00.000Z')).result.ok).toBe(true)
  })
})

// ── E. 퀘스트와의 연결 ──────────────────────────────────

describe('E. 퀘스트에서 오는 것들', () => {
  it('정원을 못 찾았으면 씨앗이 안 나온다', () => {
    const drops = rollGardenDrops(base(), {
      category: 'LIFE',
      difficulty: 'NORMAL',
      rng: () => 0, // 무조건 나오는 굴림
    })
    expect(drops).toEqual([])
  })

  it('찾았으면 확률대로 나온다', () => {
    const always = rollGardenDrops(opened(), {
      category: 'LIFE',
      difficulty: 'NORMAL',
      rng: () => 0,
    })
    expect(always.length).toBeGreaterThan(0)
    expect(findCollectionItem(always[0])).not.toBeNull()

    const never = rollGardenDrops(opened(), {
      category: 'LIFE',
      difficulty: 'NORMAL',
      rng: () => 0.999,
    })
    expect(never).toEqual([])
  })

  it('나오는 씨앗은 지금 도는 것들 중에서만 나온다', () => {
    const ids = new Set(PLANTABLE_CROPS.map((c) => c.seedItemId))
    for (let i = 0; i < 200; i += 1) {
      const drops = rollGardenDrops(opened(), {
        category: 'PLAY',
        difficulty: 'HARD',
        rng: () => i / 200,
      })
      for (const id of drops) {
        if (id === GARDEN_DEW_ITEM_ID) continue
        expect(ids.has(id)).toBe(true)
      }
    }
  })

  it('아직 안 도는 씨앗은 나오지 않는다', () => {
    const future = CROPS.filter((c) => !c.seedAvailable)
    expect(future.length).toBe(4)
    for (const crop of future) {
      expect(PLANTABLE_CROPS.some((c) => c.id === crop.id)).toBe(false)
    }
  })

  it('성장 보너스는 자라는 중인 것만 앞당긴다', () => {
    const now = new Date('2026-03-01T09:00:00.000Z')
    const planted = plantSeed(withSeeds(opened(), 'strawberry', 1), 0, 'strawberry', now).state

    const { state, applied } = applyGrowthBonus(planted, GROWTH_BONUS_SECONDS.NORMAL, now)
    expect(applied).toHaveLength(1)
    expect(state.garden.plots[0].readyAt).toBe('2026-03-01T12:50:00.000Z')

    // 되돌리면 정확히 원래대로
    const back = revertGrowthBonus(state, applied)
    expect(back.garden.plots[0].readyAt).toBe(planted.garden.plots[0].readyAt)
  })

  it('그 사이 거두고 다시 심었으면 되돌리지 않는다', () => {
    const now = new Date('2026-03-01T09:00:00.000Z')
    const planted = plantSeed(withSeeds(opened(), 'strawberry', 2), 0, 'strawberry', now).state
    const { state, applied } = applyGrowthBonus(planted, 600, now)

    // 거두고 다시 심는다
    let after = harvestPlot(state, 0, new Date('2026-03-01T13:00:00.000Z'), rolls(0, 0.99)).state
    after = plantSeed(after, 0, 'strawberry', new Date('2026-03-01T14:00:00.000Z')).state
    const readyBefore = after.garden.plots[0].readyAt

    expect(revertGrowthBonus(after, applied).garden.plots[0].readyAt).toBe(readyBefore)
  })

  it('빈 정원에는 성장 보너스가 붙을 데가 없다', () => {
    const { applied } = applyGrowthBonus(opened(), 600)
    expect(applied).toEqual([])
  })

  it('모험 에너지는 한도를 넘지 않는다', () => {
    expect(gainEnergy(0, ENERGY_BY_DIFFICULTY.NORMAL)).toBe(1)
    expect(gainEnergy(0, ENERGY_BY_DIFFICULTY.HARD)).toBe(2)
    // 넘치는 만큼은 버린다 — 실제로 오른 값을 돌려준다
    expect(gainEnergy(MAX_ADVENTURE_ENERGY - 1, 3)).toBe(1)
    expect(gainEnergy(MAX_ADVENTURE_ENERGY, 3)).toBe(0)
    expect(sanitizeEnergy(9999)).toBe(MAX_ADVENTURE_ENERGY)
    expect(sanitizeEnergy(-5)).toBe(0)
    expect(sanitizeEnergy('x')).toBe(0)
  })
})

// ── F. 이슬 ─────────────────────────────────────────────

describe('F. 아침 이슬', () => {
  const now = new Date('2026-03-01T09:00:00.000Z')

  it('없으면 못 쓴다', () => {
    const planted = plantSeed(withSeeds(opened(), 'pumpkin', 1), 0, 'pumpkin', now).state
    const { result } = useDew(planted, 0, now)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('NO_DEW')
  })

  it('있으면 30분 앞당기고 하나 쓴다', () => {
    let state = plantSeed(withSeeds(opened(), 'pumpkin', 1), 0, 'pumpkin', now).state
    state = { ...state, collection: addItem(state.collection, GARDEN_DEW_ITEM_ID).collection }

    const { state: next, result } = useDew(state, 0, now)
    expect(result.ok).toBe(true)
    expect(ownedCount(next.collection, GARDEN_DEW_ITEM_ID)).toBe(0)
    // 호박은 열 시간 → 아홉 시간 반
    expect(next.garden.plots[0].readyAt).toBe('2026-03-01T18:30:00.000Z')
  })

  it('빈 밭에는 못 쓴다', () => {
    const { result } = useDew(opened(), 0, now)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('NOT_GROWING')
  })
})

// ── G. 씨앗 가방 · 개발용 ───────────────────────────────

describe('G. 가방과 개발용 도구', () => {
  it('안 가진 씨앗은 가방에 안 나온다', () => {
    expect(seedStock(opened())).toEqual([])
    const withOne = withSeeds(opened(), 'basil', 3)
    const stock = seedStock(withOne)
    expect(stock).toHaveLength(1)
    expect(stock[0].crop.id).toBe('basil')
    expect(stock[0].count).toBe(3)
  })

  it('개발용 도구는 정원만 건드린다', () => {
    const before = { ...base(), user: { ...base().user, coins: 500 } }
    const after = applyDevGarden(applyDevGarden(before, { kind: 'UNLOCK' }), { kind: 'SEEDS' })
    expect(isGardenUnlocked(after)).toBe(true)
    expect(seedStock(after).length).toBe(PLANTABLE_CROPS.length)
    // 코인도 퀘스트도 안 건드린다
    expect(after.user.coins).toBe(500)
    expect(after.quests).toBe(before.quests)
  })

  it('경험치를 맞추면 그만큼 거둔 것으로 친다', () => {
    const state = applyDevGarden(opened(), { kind: 'SET_XP', xp: 20 })
    expect(gardenXp(state.garden)).toBeGreaterThanOrEqual(20)
    expect(gardenLevel(gardenXp(state.garden))).toBe(2)
  })

  it('정원만 초기화해도 도감은 남는다', () => {
    const grown = applyDevGarden(opened(), { kind: 'HARVEST_ALL_CROPS' })
    expect(discoveredCropIds(grown.garden)).toHaveLength(CROPS.length)

    const reset = applyDevGarden(grown, { kind: 'RESET' })
    expect(reset.garden.harvestedCropCounts).toEqual({})
    // 손에 들어온 작물은 그대로 있다
    expect(isDiscovered(reset.collection, 'crop_strawberry')).toBe(true)
  })
})
