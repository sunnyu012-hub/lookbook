import { describe, expect, it } from 'vitest'
import type { AppState, CollectionState } from '@/types'
import { ITEMS } from '@/lib/rpg/content'
import {
  ALL_COLLECTION_ITEMS,
  CATALOG,
  CRAFTED_CATALOG,
  MATERIAL_CATALOG,
  PLACEABLE_CATALOG,
  TROPHY_CATALOG,
  catalogTotal,
  findCollectionItem,
  hasHiddenLeft,
} from '@/lib/collection/catalog'
import { COLLECTION_SETS, HOME_EFFECTS, setsForItem } from '@/lib/collection/sets'
import { HAS_ART } from '@/lib/collection/assets'
import { RECIPES } from '@/lib/collection/recipes'
import { TROPHIES, TROPHY_ITEMS } from '@/lib/collection/trophies'
import {
  COLLECTION_SHOPS,
  hagglePrice,
  isCollectionShopOpen,
  isWeekend,
  todayListings,
} from '@/lib/collection/shops'
import { ROOMS, isRoomUnlocked, unlockedRooms } from '@/lib/collection/rooms'
import {
  MILESTONES,
  addItem,
  canCraft,
  collectionProgress,
  completedSetIds,
  discoveredCount,
  emptyCollection,
  isDiscovered,
  isRecipeKnown,
  recipeContextOf,
  craftedKinds,
  gardenCraftedKinds,
  trophyEarned,
  isSetVisible,
  unclaimedPartials,
  partialKey,
  visibleSets,
  newMilestones,
  newTrophies,
  ownedCount,
  removeItem,
  setProgress,
  spendItems,
  unclaimedSets,
  unlockedEffectIds,
} from '@/lib/collection/progress'
import { pendingGrants } from '@/lib/collection/grants'
import { applyCollectionDerived } from '@/lib/collection/derive'
import { rollBossDrop, rollCollectDrops } from '@/lib/collection/drops'
import { workshopView } from '@/lib/collection/workshopView'
import { createDefaultState } from '@/store/defaultState'
import { sanitizeCollection, backfillCategoryCompleted, STATE_VERSION } from '@/store/migrate'
import { emptyCategoryStats } from '@/lib/stats'

// ── 표 자체 ──────────────────────────────────────────────

describe('아이템 표', () => {
  it('도감은 240개다', () => {
    expect(CATALOG).toHaveLength(240)
  })

  it('id 가 겹치지 않는다', () => {
    const ids = ALL_COLLECTION_ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('기존 장비·소모품 id 와 부딪히지 않는다', () => {
    const legacy = new Set(ITEMS.map((i) => i.id))
    const clash = ALL_COLLECTION_ITEMS.filter((i) => legacy.has(i.id))
    expect(clash.map((i) => i.id)).toEqual([])
  })

  it('모든 물건에 이름과 한 줄 설명이 있다', () => {
    const bad = ALL_COLLECTION_ITEMS.filter((i) => !i.nameKo.trim() || !i.description.trim())
    expect(bad).toEqual([])
  })

  it('설명이 "…입니다" 로 끝나지 않는다', () => {
    const dull = CATALOG.filter((i) => i.description.endsWith('입니다.'))
    expect(dull).toEqual([])
  })

  it('등급 분포가 대략 정해둔 대로다', () => {
    const count = (r: string) => CATALOG.filter((i) => i.rarity === r).length
    expect(count('COMMON') / 240).toBeGreaterThan(0.45)
    expect(count('COMMON') / 240).toBeLessThan(0.55)
    expect(count('RARE') / 240).toBeGreaterThan(0.25)
    expect(count('RARE') / 240).toBeLessThan(0.35)
    expect(count('EPIC') / 240).toBeGreaterThan(0.1)
    expect(count('EPIC') / 240).toBeLessThan(0.18)
    expect(count('LEGENDARY') / 240).toBeGreaterThan(0.03)
    expect(count('SECRET')).toBeGreaterThanOrEqual(1)
  })

  it('등급이 목록 뒤로 갈수록 높아지는 식이 아니다', () => {
    // 앞쪽 절반에도 EPIC 이상이 충분히 섞여 있어야 한다
    const front = CATALOG.slice(0, 120).filter(
      (i) => i.rarity === 'EPIC' || i.rarity === 'LEGENDARY',
    ).length
    expect(front).toBeGreaterThan(8)
  })

  it('절반 넘게는 상점 밖에서 만난다', () => {
    const shopOnly = CATALOG.filter((i) =>
      i.acquisitionSources.every((s) => s.kind === 'SHOP'),
    ).length
    expect(shopOnly / 240).toBeLessThan(0.55)
  })

  it('획득처가 없는 물건은 없다', () => {
    const orphan = CATALOG.filter((i) => i.acquisitionSources.length === 0)
    expect(orphan.map((i) => i.id)).toEqual([])
  })

  it('가격이 있으면 등급에 맞는 범위 안이다', () => {
    const RANGE: Record<string, [number, number]> = {
      COMMON: [30, 150],
      RARE: [150, 450],
      EPIC: [450, 1200],
      LEGENDARY: [1200, 3000],
    }
    const bad = CATALOG.filter((i) => {
      if (!i.price) return false
      const range = RANGE[i.rarity]
      if (!range) return true
      return i.price < range[0] || i.price > range[1]
    })
    expect(bad.map((i) => `${i.id}:${i.rarity}:${i.price}`)).toEqual([])
  })

  it('비밀 물건은 발견 전까지 감춘다', () => {
    const secrets = CATALOG.filter((i) => i.rarity === 'SECRET')
    expect(secrets.length).toBeGreaterThan(0)
    for (const item of secrets) {
      expect(item.hiddenUntilDiscovered).toBe(true)
      expect(item.price).toBeUndefined()
    }
  })

  it('재료는 도감에 세지 않는다', () => {
    for (const material of MATERIAL_CATALOG) {
      expect(CATALOG.some((i) => i.id === material.id)).toBe(false)
      expect(material.placeable).toBe(false)
    }
  })

  it('방에 놓으려면 놓는 물건이면서 그릴 것이 있어야 한다', () => {
    for (const item of CATALOG) {
      const drawable = item.assetKey !== undefined || item.icon !== undefined
      const placeable = item.placement === 'PLACEABLE'
      expect(item.hasPlaceableAsset, item.id).toBe(placeable && drawable)
    }
    // 그림이 없어 이모지나 실루엣으로 때우는 칸은 이제 없다.
    // 이모지는 폰마다 모양이 달라서 한 칸만 결이 다르게 보인다.
    const noArt = CATALOG.filter((i) => i.assetKey === undefined)
    expect(noArt.map((i) => i.id)).toEqual([])
  })

  it('그려둔 그림이 실제 물건에만 붙어 있다', () => {
    for (const id of HAS_ART) {
      expect(findCollectionItem(id), id).not.toBeNull()
    }
    expect(HAS_ART.size).toBeGreaterThan(200)
  })

  it('그림 경로는 분류 폴더 + 아이템 id 다', () => {
    for (const item of ALL_COLLECTION_ITEMS) {
      if (!item.assetKey) continue
      expect(item.assetKey).toMatch(new RegExp(`^/assets/items/[a-z_]+/${item.id}\\.webp$`))
    }
  })
})

// ── 세트 ────────────────────────────────────────────────

describe('세트', () => {
  it('스무 개 이상이다', () => {
    expect(COLLECTION_SETS.length).toBeGreaterThanOrEqual(20)
  })

  it('세트에 적힌 물건이 전부 실제로 있다', () => {
    for (const set of COLLECTION_SETS) {
      for (const id of set.itemIds) {
        expect(findCollectionItem(id), `${set.id} → ${id}`).not.toBeNull()
      }
    }
  })

  it('세트 보상이 가리키는 것도 전부 실제로 있다', () => {
    const effectIds = new Set(HOME_EFFECTS.map((e) => e.id))
    for (const set of COLLECTION_SETS) {
      for (const reward of set.rewards) {
        if (reward.kind === 'ROOM_EFFECT') expect(effectIds.has(reward.effectId)).toBe(true)
        if (reward.kind === 'ITEM') expect(findCollectionItem(reward.itemId)).not.toBeNull()
        if (reward.kind === 'RECIPE') {
          expect(RECIPES.some((r) => r.id === reward.recipeId)).toBe(true)
        }
      }
    }
  })

  it('세트가 자기 보상 아이템을 다시 요구하지 않는다', () => {
    for (const set of COLLECTION_SETS) {
      for (const reward of set.rewards) {
        if (reward.kind !== 'ITEM') continue
        expect(set.itemIds).not.toContain(reward.itemId)
      }
    }
  })

  it('물건에서 세트를 거꾸로 찾을 수 있다', () => {
    expect(setsForItem('cream_bed')).toContain('sunday_morning')
  })
})

// ── 레시피 · 트로피 ─────────────────────────────────────

describe('만들기와 트로피', () => {
  it('레시피의 재료와 결과가 전부 실제로 있다', () => {
    for (const recipe of RECIPES) {
      expect(findCollectionItem(recipe.resultItemId), recipe.id).not.toBeNull()
      for (const ing of recipe.ingredients) {
        expect(findCollectionItem(ing.itemId), `${recipe.id} → ${ing.itemId}`).not.toBeNull()
      }
    }
  })

  it('한 물건에 레시피가 둘 이상 붙지 않는다', () => {
    const results = RECIPES.map((r) => r.resultItemId)
    expect(new Set(results).size).toBe(results.length)
  })

  it('처음부터 아는 레시피가 몇 개는 있다', () => {
    const ctx = {
      level: 1,
      discoveredCount: 0,
      completedSetIds: [],
      friendship: {},
      discoveredRecipeIds: [],
    }
    const known = RECIPES.filter((r) => isRecipeKnown(r, ctx))
    expect(known.length).toBeGreaterThan(2)
    expect(known.length).toBeLessThan(RECIPES.length)
  })

  it('트로피 물건이 전부 실제로 있다', () => {
    for (const trophy of TROPHIES) {
      expect(findCollectionItem(trophy.itemId), trophy.id).not.toBeNull()
    }
    expect(TROPHY_ITEMS.every((i) => i.category === 'TROPHY')).toBe(true)
  })

  it('트로피는 팔 수 없고 하나뿐이다', () => {
    for (const item of TROPHY_CATALOG) {
      expect(item.price).toBeUndefined()
      expect(item.unique).toBe(true)
    }
  })
})

// ── 상점 ────────────────────────────────────────────────

describe('상점', () => {
  it('여덟 곳이고 전부 팔 물건이 있다', () => {
    expect(COLLECTION_SHOPS).toHaveLength(8)
    for (const shop of COLLECTION_SHOPS) {
      expect(shop.catalog.length, shop.id).toBeGreaterThanOrEqual(shop.maxCount)
    }
  })

  it('같은 날이면 몇 번을 봐도 같은 진열이다', () => {
    const shop = COLLECTION_SHOPS[0]
    const a = todayListings(shop, '2026-03-04')
    const b = todayListings(shop, '2026-03-04')
    expect(a.map((l) => l.itemId)).toEqual(b.map((l) => l.itemId))
  })

  it('날이 바뀌면 진열도 바뀐다', () => {
    const shop = COLLECTION_SHOPS[0]
    const a = todayListings(shop, '2026-03-04').map((l) => l.itemId)
    const b = todayListings(shop, '2026-03-05').map((l) => l.itemId)
    expect(a).not.toEqual(b)
  })

  it('오늘 처음 들어온 것에 NEW 가 붙는다', () => {
    const shop = COLLECTION_SHOPS[0]
    const listings = todayListings(shop, '2026-03-04')
    expect(listings.some((l) => l.isNew)).toBe(true)
  })

  it('벼룩시장 값은 ±20% 안에서만 흔들린다', () => {
    for (const dayKey of ['2026-03-07', '2026-03-14', '2026-03-21']) {
      const price = hagglePrice(100, 'round_stool', dayKey)
      expect(price).toBeGreaterThanOrEqual(80)
      expect(price).toBeLessThanOrEqual(120)
    }
  })

  it('같은 주에는 벼룩시장 값이 그대로다', () => {
    // 2026-03-09 은 월요일, 03-15 는 그 주 일요일
    expect(hagglePrice(200, 'small_umbrella', '2026-03-09')).toBe(
      hagglePrice(200, 'small_umbrella', '2026-03-15'),
    )
  })

  it('밤 가게는 낮에 닫혀 있다', () => {
    const night = COLLECTION_SHOPS.find((s) => s.nightOnly)!
    expect(isCollectionShopOpen(night, new Date('2026-03-04T14:00:00'))).toBe(false)
    expect(isCollectionShopOpen(night, new Date('2026-03-04T22:00:00'))).toBe(true)
  })

  it('벼룩시장은 주말에만 선다', () => {
    const flea = COLLECTION_SHOPS.find((s) => s.weekendOnly)!
    expect(isWeekend(new Date('2026-03-04T12:00:00'))).toBe(false)
    expect(isCollectionShopOpen(flea, new Date('2026-03-04T12:00:00'))).toBe(false)
    expect(isCollectionShopOpen(flea, new Date('2026-03-07T12:00:00'))).toBe(true)
  })

  it('단골이 아니면 안쪽 물건은 잠겨 있다', () => {
    const vintage = COLLECTION_SHOPS.find((s) => s.reputationForRare)!
    // 평판 단계는 같게 두고 잠금만 본다. 단계가 다르면 진열 자체가 달라져서
    // 무엇 때문에 달라졌는지 알 수 없다.
    const stranger = todayListings(vintage, '2026-03-04', { reputation: 0, reputationLevel: 1 })
    const regular = todayListings(vintage, '2026-03-04', { reputation: 999, reputationLevel: 1 })

    expect(regular.filter((l) => l.locked)).toHaveLength(0)
    // 물건을 숨기지는 않는다. 자리에 있고, 아직 못 살 뿐이다.
    expect(stranger.map((l) => l.itemId)).toEqual(regular.map((l) => l.itemId))
  })

  it('자주 오면 진열이 한 칸 늘고 귀한 것이 더 나온다', () => {
    const shop = COLLECTION_SHOPS.find((s) => s.id === 'HOME_ATELIER')!
    const visitor = todayListings(shop, '2026-03-04', { reputationLevel: 1 })
    const local = todayListings(shop, '2026-03-04', { reputationLevel: 3 })
    expect(local.length).toBe(visitor.length + 1)
  })

  it('파는 물건에는 값이 있다', () => {
    for (const shop of COLLECTION_SHOPS) {
      for (const id of shop.catalog) {
        expect(findCollectionItem(id)?.price, `${shop.id}:${id}`).toBeTruthy()
      }
    }
  })
})

// ── 가진 것 ─────────────────────────────────────────────

describe('발견과 되돌리기', () => {
  it('처음 얻으면 발견으로 기록된다', () => {
    const { collection, isNew } = addItem(emptyCollection(), 'cream_bed')
    expect(isNew).toBe(true)
    expect(isDiscovered(collection, 'cream_bed')).toBe(true)
    expect(ownedCount(collection, 'cream_bed')).toBe(1)
  })

  it('두 번째부터는 발견이 아니다', () => {
    const first = addItem(emptyCollection(), 'cream_bed')
    const second = addItem(first.collection, 'cream_bed')
    expect(second.isNew).toBe(false)
    expect(ownedCount(second.collection, 'cream_bed')).toBe(2)
  })

  it('하나뿐인 물건은 두 개가 되지 않는다', () => {
    let c = emptyCollection()
    c = addItem(c, 'moon_ticket_c').collection
    c = addItem(c, 'moon_ticket_c').collection
    expect(ownedCount(c, 'moon_ticket_c')).toBe(1)
  })

  it('되돌리면 처음 발견도 같이 지워진다', () => {
    const added = addItem(emptyCollection(), 'cream_bed')
    const back = removeItem(added.collection, 'cream_bed', added.isNew)
    expect(isDiscovered(back, 'cream_bed')).toBe(false)
    expect(ownedCount(back, 'cream_bed')).toBe(0)
  })

  it('이미 알던 것을 되돌려도 도감에서 지우지 않는다', () => {
    let c = addItem(emptyCollection(), 'cream_bed').collection
    const second = addItem(c, 'cream_bed')
    c = removeItem(second.collection, 'cream_bed', second.isNew)
    expect(isDiscovered(c, 'cream_bed')).toBe(true)
    expect(ownedCount(c, 'cream_bed')).toBe(1)
  })

  it('되돌리면 방에 놓아둔 것도 같이 거둔다', () => {
    const added = addItem(emptyCollection(), 'cream_bed')
    const withPlaced: CollectionState = {
      ...added.collection,
      rooms: {
        MY_ROOM: [{ uid: 'a', itemId: 'cream_bed', x: 50, y: 50, scale: 1, flipped: false }],
      },
    }
    const back = removeItem(withPlaced, 'cream_bed', true)
    expect(back.rooms.MY_ROOM).toHaveLength(0)
  })

  it('재료를 쓰면 개수만 줄고 발견 기록은 남는다', () => {
    let c = emptyCollection()
    for (let i = 0; i < 3; i += 1) c = addItem(c, 'm_wood').collection

    const spent = spendItems(c, [{ itemId: 'm_wood', count: 2 }])!
    expect(ownedCount(spent, 'm_wood')).toBe(1)
    expect(isDiscovered(spent, 'm_wood')).toBe(true)
  })

  it('재료가 모자라면 아무것도 쓰지 않는다', () => {
    const c = addItem(emptyCollection(), 'm_wood').collection
    expect(spendItems(c, [{ itemId: 'm_wood', count: 5 }])).toBeNull()
  })

  it('도감 진행은 240개 기준으로 센다', () => {
    const c = addItem(emptyCollection(), 'cream_bed').collection
    expect(collectionProgress(c)).toEqual({ found: 1, total: 240 })
    expect(catalogTotal(c.discovered)).toBe(240)
    expect(hasHiddenLeft(c.discovered)).toBe(false)
  })

  it('트로피는 도감 240개에 세지 않는다', () => {
    const c = addItem(emptyCollection(), 't_wood_star').collection
    expect(discoveredCount(c)).toBe(0)
    expect(isDiscovered(c, 't_wood_star')).toBe(true)
  })
})

// ── 세트 완성 ───────────────────────────────────────────

describe('세트 완성', () => {
  const own = (ids: string[]): CollectionState => {
    let c = emptyCollection()
    for (const id of ids) c = addItem(c, id).collection
    return c
  }

  it('가진 것으로 진행도를 센다', () => {
    const set = COLLECTION_SETS.find((s) => s.id === 'sunday_morning')!
    const c = own(set.itemIds.slice(0, 3))
    expect(setProgress(set, c)).toEqual({ have: 3, need: set.itemIds.length, complete: false })
  })

  it('다 모으면 완성이다', () => {
    const set = COLLECTION_SETS.find((s) => s.id === 'sunday_morning')!
    const c = own(set.itemIds)
    expect(setProgress(set, c).complete).toBe(true)
    expect(completedSetIds(c)).toContain('sunday_morning')
  })

  it('분류로 세는 세트도 있다', () => {
    const set = COLLECTION_SETS.find((s) => s.id === 'plant_parent')!
    const plants = CATALOG.filter((i) => i.category === 'PLANT').slice(0, 10).map((i) => i.id)
    expect(setProgress(set, own(plants.slice(0, 5))).complete).toBe(false)
    expect(setProgress(set, own(plants)).complete).toBe(true)
  })

  it('완성하면 방 공기가 열린다', () => {
    const set = COLLECTION_SETS.find((s) => s.id === 'sunday_morning')!
    expect(unlockedEffectIds(own(set.itemIds))).toContain('SOFT_MORNING')
  })

  it('보상은 한 번만 받는다', () => {
    const set = COLLECTION_SETS.find((s) => s.id === 'soft_pink')!
    const c = own(set.itemIds)
    expect(unclaimedSets(c).map((s) => s.id)).toContain('soft_pink')

    const claimed: CollectionState = { ...c, claimedSetIds: ['soft_pink'] }
    expect(unclaimedSets(claimed).map((s) => s.id)).not.toContain('soft_pink')
  })
})

// ── 트로피 · 도감 보상 ──────────────────────────────────

describe('트로피와 도감 보상', () => {
  it('첫 퀘스트를 끝내면 트로피가 하나 생긴다', () => {
    const trophies = newTrophies(emptyCollection(), {
      totalCompletedQuests: 1,
      categoryCompleted: emptyCategoryStats(),
      bossClears: 0,
      completedSetIds: [],
      discoveredCount: 0,
      gardenLevel: 0,
      craftedKinds: 0,
    })
    expect(trophies.map((t) => t.id)).toContain('first_step')
  })

  it('이미 받은 트로피는 다시 안 준다', () => {
    const c: CollectionState = { ...emptyCollection(), earnedTrophyIds: ['first_step'] }
    const trophies = newTrophies(c, {
      totalCompletedQuests: 5,
      categoryCompleted: emptyCategoryStats(),
      bossClears: 0,
      completedSetIds: [],
      discoveredCount: 0,
      gardenLevel: 0,
      craftedKinds: 0,
    })
    expect(trophies.map((t) => t.id)).not.toContain('first_step')
  })

  it('분야별 트로피는 그 분야 개수만 본다', () => {
    const counts = { ...emptyCategoryStats(), WORK: 100 }
    const trophies = newTrophies(emptyCollection(), {
      totalCompletedQuests: 100,
      categoryCompleted: counts,
      bossClears: 0,
      completedSetIds: [],
      discoveredCount: 0,
      gardenLevel: 0,
      craftedKinds: 0,
    })
    const ids = trophies.map((t) => t.id)
    expect(ids).toContain('work_master')
    expect(ids).not.toContain('life_master')
  })

  it('도감을 채우면 자리마다 보상이 있다', () => {
    let c = emptyCollection()
    for (const item of CATALOG.slice(0, 10)) c = addItem(c, item.id).collection

    const reached = newMilestones(c)
    expect(reached.map((m) => m.count)).toEqual([10])
    expect(reached[0].coins).toBe(MILESTONES[0].coins)
  })
})

// ── 받게 되는 것 ────────────────────────────────────────

describe('평판 · 사람 · 비밀', () => {
  const base = {
    collection: emptyCollection(),
    reputation: {
      HOME_BASE: 0,
      CAFE_STREET: 0,
      GREEN_PARK: 0,
      CREATIVE_DISTRICT: 0,
      TRAINING_ZONE: 0,
      NIGHT_TOWN: 0,
    },
    friendship: {},
    night: false,
  }

  it('아무것도 안 했으면 아무것도 안 온다', () => {
    expect(pendingGrants(base)).toEqual([])
  })

  it('동네에서 얼굴이 알려지면 하나 온다', () => {
    const grants = pendingGrants({
      ...base,
      reputation: { ...base.reputation, CAFE_STREET: 100 },
    })
    expect(grants.map((g) => g.itemId)).toContain('home_cafe_cart')
  })

  it('가까워지면 사람이 물건을 준다', () => {
    const grants = pendingGrants({ ...base, friendship: { MINA: 20 } })
    expect(grants.map((g) => g.itemId)).toContain('my_mug')
    // 더 가까워져야 주는 것은 아직 안 온다
    expect(grants.map((g) => g.itemId)).not.toContain('cook_book')
  })

  it('비밀 물건은 조건을 맞춰야 온다', () => {
    let c = emptyCollection()
    const plants = CATALOG.filter((i) => i.category === 'PLANT').slice(0, 8)
    for (const plant of plants) c = addItem(c, plant.id).collection

    expect(pendingGrants({ ...base, collection: c, night: false }).map((g) => g.itemId)).not.toContain(
      'night_flower',
    )
    expect(pendingGrants({ ...base, collection: c, night: true }).map((g) => g.itemId)).toContain(
      'night_flower',
    )
  })

  it('이미 발견한 것은 다시 오지 않는다', () => {
    const c = addItem(emptyCollection(), 'my_mug').collection
    const grants = pendingGrants({ ...base, collection: c, friendship: { MINA: 100 } })
    expect(grants.map((g) => g.itemId)).not.toContain('my_mug')
  })
})

// ── 따라오는 것들 ───────────────────────────────────────

describe('세트 완성이 부르는 것들', () => {
  function stateWith(itemIds: string[]): AppState {
    let collection = emptyCollection()
    for (const id of itemIds) collection = addItem(collection, id).collection
    return { ...createDefaultState(), collection }
  }

  it('세트를 완성하면 보상이 붙는다', () => {
    const set = COLLECTION_SETS.find((s) => s.id === 'soft_pink')!
    const before = stateWith(set.itemIds)
    const after = applyCollectionDerived(before, new Date('2026-03-04T12:00:00'), false)

    expect(after.state.user.coins).toBe(before.user.coins + 250)
    expect(after.state.collection.claimedSetIds).toContain('soft_pink')
    expect(after.notes.join(' ')).toContain('Soft Pink')
  })

  it('두 번 지나가도 보상은 한 번이다', () => {
    const set = COLLECTION_SETS.find((s) => s.id === 'soft_pink')!
    const first = applyCollectionDerived(stateWith(set.itemIds), new Date(), false)
    const second = applyCollectionDerived(first.state, new Date(), false)
    expect(second.state.user.coins).toBe(first.state.user.coins)
  })

  it('세트 → 트로피 → 도감까지 한 번에 이어진다', () => {
    const moon = COLLECTION_SETS.find((s) => s.id === 'moon_collector')!
    const result = applyCollectionDerived(stateWith(moon.itemIds), new Date(), false)

    // 세트가 완성되면 Moon Globe 가 트로피로 오고, 그것도 도감에 등록된다
    expect(result.state.collection.earnedTrophyIds).toContain('moon_collector')
    expect(isDiscovered(result.state.collection, 'moon_globe')).toBe(true)
    expect(result.discoveries.map((d) => d.itemId)).toContain('moon_globe')
  })

  it('세트가 주는 물건도 발견으로 잡힌다', () => {
    const set = COLLECTION_SETS.find((s) => s.id === 'star_collector')!
    const result = applyCollectionDerived(stateWith(set.itemIds), new Date(), false)
    expect(isDiscovered(result.state.collection, 'star_music_box')).toBe(true)
  })
})

// ── 드롭 ────────────────────────────────────────────────

describe('퀘스트에서 나오는 것', () => {
  it('운이 아주 좋으면 재료와 물건이 같이 나온다', () => {
    const drops = rollCollectDrops({ category: 'LIFE', rng: () => 0 })
    expect(drops.length).toBeGreaterThanOrEqual(1)
    for (const id of drops) expect(findCollectionItem(id)).not.toBeNull()
  })

  it('운이 없으면 아무것도 안 나온다', () => {
    expect(rollCollectDrops({ category: 'LIFE', rng: () => 0.99 })).toEqual([])
  })

  it('분야에 맞는 재료가 나온다', () => {
    const drops = rollCollectDrops({ category: 'WORK', rng: () => 0 })
    const materials = drops.filter((id) => findCollectionItem(id)?.category === 'MATERIAL')
    expect(materials.length).toBeGreaterThan(0)
    for (const id of materials) {
      expect(['m_glass', 'm_metal', 'm_paper']).toContain(id)
    }
  })

  it('이벤트가 열린 날에는 하나 더 굴린다', () => {
    const plain = rollCollectDrops({ category: 'MIND', rng: () => 0, eventActive: false })
    const feast = rollCollectDrops({ category: 'MIND', rng: () => 0, eventActive: true })
    expect(feast.length).toBeGreaterThan(plain.length)
  })

  it('보스에서는 늘 하나 나온다', () => {
    const id = rollBossDrop(() => 0.5)
    expect(id).not.toBeNull()
    expect(findCollectionItem(id!)?.acquisitionSources.some((s) => s.kind === 'BOSS')).toBe(true)
  })
})

// ── 방 ──────────────────────────────────────────────────

describe('방', () => {
  const ctx = { level: 1, categoryCompleted: emptyCategoryStats(), discoveredCount: 0 }

  it('처음엔 내 방 하나뿐이다', () => {
    expect(unlockedRooms(ctx).map((r) => r.id)).toEqual(['MY_ROOM'])
  })

  it('레벨이 오르면 거실이 열린다', () => {
    expect(isRoomUnlocked(ROOMS[1], { ...ctx, level: 10 })).toBe(true)
    expect(isRoomUnlocked(ROOMS[1], { ...ctx, level: 9 })).toBe(false)
  })

  it('생활 퀘스트를 쌓으면 부엌이 열린다', () => {
    const kitchen = ROOMS.find((r) => r.id === 'KITCHEN_ROOM')!
    const counts = { ...emptyCategoryStats(), LIFE: 30 }
    expect(isRoomUnlocked(kitchen, { ...ctx, categoryCompleted: counts })).toBe(true)
  })

  it('도감을 채우면 발코니가 열린다', () => {
    const balcony = ROOMS.find((r) => r.id === 'BALCONY')!
    expect(isRoomUnlocked(balcony, { ...ctx, discoveredCount: 60 })).toBe(true)
  })

  it('방마다 벽과 바닥 색이 있다', () => {
    for (const room of ROOMS) {
      expect(room.wall).toMatch(/^#/)
      expect(room.floor).toMatch(/^#/)
    }
  })
})

// ── 만들기 ──────────────────────────────────────────────

describe('만들기', () => {
  it('재료가 다 있으면 만들 수 있다', () => {
    const recipe = RECIPES.find((r) => r.id === 'sprout_jar')!
    let c = emptyCollection()
    expect(canCraft(recipe, c)).toBe(false)

    for (const ing of recipe.ingredients) {
      for (let i = 0; i < ing.count; i += 1) c = addItem(c, ing.itemId).collection
    }
    expect(canCraft(recipe, c)).toBe(true)
  })

  it('아직 모르는 레시피가 있다', () => {
    const secret = RECIPES.find((r) => r.unlock.kind === 'NPC')!
    const ctx = {
      level: 99,
      discoveredCount: 999,
      completedSetIds: [],
      friendship: {},
      discoveredRecipeIds: [],
    }
    expect(isRecipeKnown(secret, ctx)).toBe(false)
    expect(isRecipeKnown(secret, { ...ctx, friendship: { LULU: 99, NOA: 99, JUNE: 99 } })).toBe(true)
  })

  it('세트를 완성하면 레시피를 알게 된다', () => {
    const recipe = RECIPES.find((r) => r.id === 'clover_bottle')!
    const ctx = {
      level: 1,
      discoveredCount: 0,
      completedSetIds: [] as string[],
      friendship: {},
      discoveredRecipeIds: [],
    }
    expect(isRecipeKnown(recipe, ctx)).toBe(false)
    expect(isRecipeKnown(recipe, { ...ctx, completedSetIds: ['green_corner'] })).toBe(true)
  })
})

describe('만들어본 가짓수', () => {
  it('만든 횟수를 저장하지 않는다 — 발견 기록에서 센다', () => {
    let c = emptyCollection()
    expect(craftedKinds(c)).toBe(0)

    c = addItem(c, 'w_strawberry_shelf').collection
    expect(craftedKinds(c)).toBe(1)
    expect(gardenCraftedKinds(c)).toBe(1)

    // 같은 것을 또 만들어도 가짓수는 그대로다
    c = addItem(c, 'w_strawberry_shelf').collection
    expect(craftedKinds(c)).toBe(1)
  })

  it('재료로 다 써버려도 줄지 않는다', () => {
    let c = emptyCollection()
    c = addItem(c, 'w_herb_bundle').collection
    expect(craftedKinds(c)).toBe(1)

    c = { ...c, owned: {} }
    expect(craftedKinds(c)).toBe(1)
  })

  it('가게에서도 파는 것은 만든 것으로 안 센다', () => {
    // 사서 얻은 것을 만든 것으로 쳐주면 작업실을 한 번도 안 연 사람이
    // 작업 트로피를 받는다
    let c = emptyCollection()
    const bought = RECIPES.find((r) => {
      const def = findCollectionItem(r.resultItemId)
      return def && def.acquisitionSources.some((s) => s.kind === 'SHOP')
    })
    if (!bought) return
    c = addItem(c, bought.resultItemId).collection
    expect(craftedKinds(c)).toBe(0)
  })

  it('정원 쪽만 따로 셀 수 있다', () => {
    let c = emptyCollection()
    c = addItem(c, 'sprout_jar').collection
    expect(craftedKinds(c)).toBe(1)
    expect(gardenCraftedKinds(c)).toBe(0)
  })

  it('서른 가지 만들면 작업대 트로피가 나온다', () => {
    const trophy = TROPHIES.find((t) => t.id === 'tiny_workbench')!
    const ctx = {
      totalCompletedQuests: 0,
      categoryCompleted: emptyCategoryStats(),
      bossClears: 0,
      completedSetIds: [] as string[],
      discoveredCount: 0,
      gardenLevel: 0,
      craftedKinds: 29,
    }
    expect(trophyEarned(trophy, ctx)).toBe(false)
    expect(trophyEarned(trophy, { ...ctx, craftedKinds: 30 })).toBe(true)
  })
})

describe('정원 세트', () => {
  function ready(): AppState {
    const base = createDefaultState()
    return { ...base, garden: { ...base.garden, unlockedAt: '2026-01-01T00:00:00.000Z' } }
  }

  it('아직 못 만난 것으로만 채우는 세트는 감춘다', () => {
    const state = ready()
    expect(visibleSets(state).map((s) => s.id)).not.toContain('moon_garden')

    const found = {
      ...state,
      garden: { ...state.garden, harvestedCropCounts: { moon_herb: 1 } },
    }
    expect(visibleSets(found).map((s) => s.id)).toContain('moon_garden')
  })

  it('감춘 세트도 조건을 채우면 보인다 — 저장하지 않는다', () => {
    const state = ready()
    const set = COLLECTION_SETS.find((s) => s.id === 'moon_garden')!
    expect(isSetVisible(set, state)).toBe(false)
    expect(
      isSetVisible(set, {
        ...state,
        garden: { ...state.garden, harvestedCropCounts: { star_flower: 2 } },
      }),
    ).toBe(true)
  })

  it('다 못 모아도 중간까지 온 몫이 한 번 나온다', () => {
    const set = COLLECTION_SETS.find((s) => s.id === 'strawberry_patch')!
    let c = emptyCollection()
    expect(unclaimedPartials(c).map((s) => s.id)).not.toContain('strawberry_patch')

    for (const id of set.itemIds.slice(0, 3)) c = addItem(c, id).collection
    expect(unclaimedPartials(c).map((s) => s.id)).toContain('strawberry_patch')
  })

  it('중간 몫은 두 번 안 나온다 — 저장 구조를 안 늘리고 막는다', () => {
    const set = COLLECTION_SETS.find((s) => s.id === 'herb_corner')!
    let c = emptyCollection()
    for (const id of set.itemIds.slice(0, 3)) c = addItem(c, id).collection
    expect(unclaimedPartials(c).map((s) => s.id)).toContain('herb_corner')

    c = { ...c, claimedSetIds: [...c.claimedSetIds, partialKey('herb_corner')] }
    expect(unclaimedPartials(c).map((s) => s.id)).not.toContain('herb_corner')
    // 세트 자체는 아직 안 받은 것으로 남는다
    expect(c.claimedSetIds).not.toContain('herb_corner')
  })

  it('중간 몫을 받아도 완성 보상은 그대로 남는다', () => {
    const set = COLLECTION_SETS.find((s) => s.id === 'autumn_harvest')!
    let state = ready()
    let c = state.collection
    for (const id of set.itemIds) c = addItem(c, id).collection
    state = { ...state, collection: c }

    const first = applyCollectionDerived(state, new Date())
    expect(ownedCount(first.state.collection, 'g_harvest_basket')).toBe(1)
    expect(ownedCount(first.state.collection, 'g_autumn_table')).toBe(1)

    // 한 번 더 지나가도 안 늘어난다
    const again = applyCollectionDerived(first.state, new Date())
    expect(ownedCount(again.state.collection, 'g_harvest_basket')).toBe(1)
    expect(ownedCount(again.state.collection, 'g_autumn_table')).toBe(1)
  })
})

describe('작업실 제작물 열둘 (UPDATE D)', () => {
  const IDS = [
    'w_strawberry_shelf', 'w_herb_bundle', 'w_veggie_crate', 'w_lavender_cushion',
    'w_mushroom_lamp', 'w_garden_table', 'w_recipe_shelf', 'w_picnic_set',
    'w_moon_lamp', 'w_star_vase', 'w_autumn_bench', 'w_quarry_lantern',
  ]

  function ready(): AppState {
    const base = createDefaultState()
    return { ...base, garden: { ...base.garden, unlockedAt: '2026-01-01T00:00:00.000Z' } }
  }

  it('열두 개가 다 있고 id 가 겹치지 않는다', () => {
    expect(new Set(IDS).size).toBe(12)
    for (const id of IDS) expect(findCollectionItem(id), id).not.toBeNull()
  })

  it('이제 열두 개 다 만들 수 있다 — 돌등불이 열렸다', () => {
    const craftable = IDS.filter((id) =>
      RECIPES.some((r) => r.resultItemId === id && r.unlock.kind !== 'COMING_SOON'),
    )
    expect(craftable).toHaveLength(12)
    expect(craftable).toContain('w_quarry_lantern')
  })

  it('돌등불은 광물을 세 가지 만나야 열린다', () => {
    const def = findCollectionItem('w_quarry_lantern')!
    expect(def.comingSoon).toBeUndefined()
    expect(PLACEABLE_CATALOG.some((i) => i.id === 'w_quarry_lantern')).toBe(true)

    const recipe = RECIPES.find((r) => r.resultItemId === 'w_quarry_lantern')!
    const before = ready()
    expect(isRecipeKnown(recipe, recipeContextOf(before))).toBe(false)

    const after = {
      ...before,
      quarry: {
        ...before.quarry,
        foundMineralCounts: { m_stone: 2, mineral_spark_stone: 1, mineral_old_metal: 1 },
      },
    }
    expect(isRecipeKnown(recipe, recipeContextOf(after))).toBe(true)
  })

  it('허브 다발만 벽에 건다. 나머지는 벽이 아니다', () => {
    expect(findCollectionItem('w_herb_bundle')!.placementType).toBe('WALL')
    for (const id of IDS.filter((i) => i !== 'w_herb_bundle')) {
      expect(findCollectionItem(id)!.placementType, id).not.toBe('WALL')
    }
  })

  it('방에서 차지하는 폭이 기존 물건 관례와 맞는다', () => {
    // 렌더러는 footprint.width 만 본다 (RoomCanvas). 분류마다 관례가 있다.
    const 관례: Record<string, number> = { LIGHTING: 13, PLANT: 13, LITTLE_THING: 10, WALL: 16 }
    // 그림 비율이 정사각형에서 먼 셋만 관례에서 벗어난다 (workshop.ts 주석).
    // 폭을 관례대로 두면 높이가 어긋나는 것들이다.
    const 예외: Record<string, number> = {
      w_herb_bundle: 11, // 세로로 긴 그림 — 16이면 높이가 26이 되어 벽을 다 덮는다
      w_lavender_cushion: 15, // 바닥 쿠션. 도감의 담요·쿠션 관례가 15다
      w_autumn_bench: 26, // 옆으로 넓은 그림 — 21이면 높이가 13이라 앉는 물건으로 안 보인다
    }
    for (const id of IDS) {
      const def = findCollectionItem(id)!
      const want = 예외[id] ?? 관례[def.category]
      if (want !== undefined) expect(def.footprint?.width, id).toBe(want)
    }
    // 가구는 기존 가구 폭 범위(15~32) 안에 있어야 한다
    for (const id of IDS) {
      const def = findCollectionItem(id)!
      if (def.category !== 'FURNITURE') continue
      expect(def.footprint!.width, id).toBeGreaterThanOrEqual(15)
      expect(def.footprint!.width, id).toBeLessThanOrEqual(32)
    }
  })

  it('이름이 비슷한 기존 물건과 완전히 다른 아이템이다', () => {
    for (const [mine, theirs] of [
      ['w_mushroom_lamp', 'mushroom_lamp'],
      ['w_picnic_set', 'k_picnic_basket'],
      ['w_recipe_shelf', 'k_recipe_book'],
      ['w_garden_table', 'g_autumn_table'],
    ]) {
      const a = findCollectionItem(mine)!
      const b = findCollectionItem(theirs)!
      expect(a.id).not.toBe(b.id)
      // 그림도 공유하지 않는다 (한쪽만 그림이 있어도 서로 빌려 쓰지 않는다)
      if (a.assetKey && b.assetKey) expect(a.assetKey).not.toBe(b.assetKey)
    }
  })

  it('만든 것은 도감의 자기 칸에 들어간다 — 240 은 안 늘어난다', () => {
    for (const id of IDS) {
      expect(CRAFTED_CATALOG.some((i) => i.id === id), id).toBe(true)
      expect(CATALOG.some((i) => i.id === id), id).toBe(false)
    }
    // 정원·부엌 세트 보상도 같은 칸에 있다
    expect(CRAFTED_CATALOG.some((i) => i.id === 'g_moon_arch')).toBe(true)
    expect(CRAFTED_CATALOG.some((i) => i.id === 'k_soup_pot')).toBe(true)
    // 240 칸은 그대로다
    expect(catalogTotal({})).toBe(240)
  })

  it('만들면 재료가 빠지고 하나 생기고 도감에 남는다', () => {
    const recipe = RECIPES.find((r) => r.id === 'w_strawberry_shelf')!
    let c = emptyCollection()
    for (const ing of recipe.ingredients) {
      for (let i = 0; i < ing.count; i += 1) c = addItem(c, ing.itemId).collection
    }
    expect(canCraft(recipe, c)).toBe(true)

    const spent = spendItems(c, recipe.ingredients)!
    for (const ing of recipe.ingredients) expect(ownedCount(spent, ing.itemId)).toBe(0)

    const made = addItem(spent, recipe.resultItemId)
    expect(made.isNew).toBe(true)
    expect(ownedCount(made.collection, recipe.resultItemId)).toBe(1)
    expect(isDiscovered(made.collection, recipe.resultItemId)).toBe(true)

    // 두 번째는 새 발견이 아니다 (연출을 두 번 띄우지 않는다)
    const again = addItem(made.collection, recipe.resultItemId)
    expect(again.isNew).toBe(false)
  })

  it('재료가 모자라면 하나도 안 빠진다', () => {
    const recipe = RECIPES.find((r) => r.id === 'w_herb_bundle')!
    let c = emptyCollection()
    c = addItem(c, recipe.ingredients[0].itemId).collection
    expect(canCraft(recipe, c)).toBe(false)
    // 모자란 채로 쓰려 하면 아무것도 안 건드리고 null 을 준다
    expect(spendItems(c, recipe.ingredients)).toBeNull()
    expect(ownedCount(c, recipe.ingredients[0].itemId)).toBe(1)
  })

  it('레시피가 화면이 아니라 데이터에 있다', () => {
    // 열한 개 전부 표에서 나온다. 컴포넌트가 비용을 정하지 않는다.
    for (const id of IDS.filter((i) => i !== 'w_quarry_lantern')) {
      const r = RECIPES.find((x) => x.resultItemId === id)!
      expect(r.ingredients.length, id).toBeGreaterThan(0)
      for (const ing of r.ingredients) {
        expect(findCollectionItem(ing.itemId), `${id} → ${ing.itemId}`).not.toBeNull()
        expect(ing.count).toBeGreaterThan(0)
      }
    }
  })
})

describe('작업실 화면', () => {
  function ready(): AppState {
    const base = createDefaultState()
    return {
      ...base,
      garden: { ...base.garden, unlockedAt: '2026-01-01T00:00:00.000Z' },
    }
  }

  it('한 문맥으로만 판단한다 — 정원과 부엌 기록이 함께 들어온다', () => {
    const state = ready()
    const ctx = recipeContextOf({
      ...state,
      garden: { ...state.garden, harvestedCropCounts: { strawberry: 7 } },
      kitchen: { ...state.kitchen, cookedRecipeCounts: { strawberry_milk: 2, herb_tea: 0 } },
    })
    expect(ctx.harvestedCropCounts).toEqual({ strawberry: 7 })
    expect(ctx.cookedKinds).toBe(1)
  })

  it('딸기를 거두면 딸기 선반을 알게 된다', () => {
    const state = ready()
    const before = workshopView(state).recipes.find((r) => r.def.id === 'w_strawberry_shelf')!
    expect(before.stage).not.toBe('KNOWN')

    const after = workshopView({
      ...state,
      garden: { ...state.garden, harvestedCropCounts: { strawberry: 3 } },
    }).recipes.find((r) => r.def.id === 'w_strawberry_shelf')!
    expect(after.stage).toBe('KNOWN')
  })

  it('가까이 오면 낌새만 흘린다 — 이름은 아직 안 알려준다', () => {
    const state = ready()
    const row = workshopView({
      ...state,
      garden: { ...state.garden, harvestedCropCounts: { strawberry: 1 } },
    }).recipes.find((r) => r.def.id === 'w_strawberry_shelf')!
    expect(row.stage).toBe('HINTED')
    expect(row.def.hint).toBeTruthy()
  })

  it('만들 수 있는 것이 맨 위로 온다', () => {
    let state = ready()
    let collection = state.collection
    for (let i = 0; i < 3; i += 1) collection = addItem(collection, 'crop_strawberry').collection
    collection = addItem(collection, 'm_wood').collection
    state = {
      ...state,
      collection,
      garden: { ...state.garden, harvestedCropCounts: { strawberry: 3 } },
    }

    const view = workshopView(state)
    expect(view.recipes[0].def.id).toBe('w_strawberry_shelf')
    expect(view.recipes[0].ready).toBe(true)
    expect(view.suggestion?.def.id).toBe('w_strawberry_shelf')
  })

  it('재료 칸에 가진 수와 필요한 수가 같이 온다', () => {
    let state = ready()
    state = { ...state, collection: addItem(state.collection, 'm_wood').collection }
    const row = workshopView(state).recipes.find((r) => r.def.id === 'w_strawberry_shelf')!
    const wood = row.ingredients.find((i) => i.itemId === 'm_wood')!
    expect(wood.have).toBe(1)
    expect(wood.need).toBe(1)
    expect(row.ready).toBe(false)
  })

  it('돌등불도 이제 세는 수에 들어간다', () => {
    const view = workshopView(ready())
    const lantern = view.recipes.find((r) => r.def.id === 'w_quarry_lantern')!
    expect(lantern.stage).not.toBe('COMING_SOON')
    // 아직 못 만들어도 셀 수 있는 목록에는 든다
    expect(view.total).toBe(view.recipes.length)
  })

  it('예전 레시피도 칸이 정해진다 (표를 안 고치고 물건에서 가져온다)', () => {
    const view = workshopView(ready())
    for (const row of view.recipes) {
      expect(['FURNITURE', 'DECOR', 'SPECIAL']).toContain(row.tab)
    }
  })
})

// ── 저장된 것 읽기 ──────────────────────────────────────

describe('저장된 수집 기록', () => {
  it('없으면 빈 상태로 시작한다', () => {
    expect(sanitizeCollection(undefined)).toEqual(emptyCollection())
    expect(sanitizeCollection('망가진 값')).toEqual(emptyCollection())
  })

  it('없어진 물건은 조용히 버린다', () => {
    const c = sanitizeCollection({
      discovered: { cream_bed: '2026-01-01T00:00:00.000Z', ghost_item: '2026-01-01T00:00:00.000Z' },
      owned: { cream_bed: 2, ghost_item: 5 },
    })
    expect(c.owned).toEqual({ cream_bed: 2 })
    expect(c.discovered.ghost_item).toBeUndefined()
  })

  it('가진 적이 있으면 발견한 것으로 본다', () => {
    const c = sanitizeCollection({ owned: { cream_bed: 1 } })
    expect(isDiscovered(c, 'cream_bed')).toBe(true)
  })

  it('놓인 자리가 이상하면 방 안으로 되돌린다', () => {
    const c = sanitizeCollection({
      owned: { cream_bed: 1 },
      rooms: {
        MY_ROOM: [
          { uid: 'a', itemId: 'cream_bed', x: 500, y: -80, scale: 99, flipped: 'yes' },
          { uid: 'b', itemId: 'ghost_item', x: 10, y: 10 },
        ],
      },
    })
    expect(c.rooms.MY_ROOM).toHaveLength(1)
    expect(c.rooms.MY_ROOM[0]).toMatchObject({ x: 100, y: 0, scale: 1, flipped: false })
  })

  it('없어진 방은 버린다', () => {
    const c = sanitizeCollection({ rooms: { GHOST_ROOM: [] }, currentRoomId: 'GHOST_ROOM' })
    expect(c.rooms.GHOST_ROOM).toBeUndefined()
    expect(c.currentRoomId).toBe('MY_ROOM')
  })

  it('아직 안 열린 방 공기는 비운다', () => {
    const c = sanitizeCollection({ roomEffects: { MY_ROOM: 'NOT_A_REAL_EFFECT' } })
    expect(c.roomEffects.MY_ROOM).toBeNull()
  })

  it('분야별 완료 수가 없으면 남아 있는 퀘스트에서 센다', () => {
    const state: AppState = {
      ...createDefaultState(),
      quests: [
        { ...createDefaultState().quests[0], category: 'LIFE', completed: true },
        { ...createDefaultState().quests[1], category: 'LIFE', completed: true },
        { ...createDefaultState().quests[2], category: 'WORK', completed: false },
      ],
    }
    const counts = backfillCategoryCompleted(state, undefined)
    expect(counts.LIFE).toBe(2)
    expect(counts.WORK).toBe(0)
  })

  it('저장돼 있으면 그 값을 그대로 쓴다', () => {
    const state = createDefaultState()
    const counts = backfillCategoryCompleted(state, { ...emptyCategoryStats(), WORK: 42 })
    expect(counts.WORK).toBe(42)
  })

  it('스키마 버전이 16 이다', () => {
    expect(STATE_VERSION).toBe(16)
    expect(createDefaultState().version).toBe(16)
  })
})

describe('오늘의 가게', () => {
  const shop = COLLECTION_SHOPS.find((s) => s.id === 'HOME_ATELIER')!

  it('같은 날은 몇 번을 봐도 같다', () => {
    const a = todayListings(shop, '2026-03-04')
    const b = todayListings(shop, '2026-03-04')
    expect(a).toEqual(b)
  })

  it('오늘까지인 것은 내일 진열에 없다', () => {
    const today = todayListings(shop, '2026-03-04')
    const tomorrow = new Set(todayListings(shop, '2026-03-05').map((l) => l.itemId))

    for (const listing of today) {
      expect(tomorrow.has(listing.itemId), listing.itemId).toBe(!listing.lastDay)
    }
  })

  it('깎아주는 건 하루 한둘이다', () => {
    for (const day of ['2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07']) {
      const sale = todayListings(shop, day).filter((l) => l.wasPrice !== undefined)
      expect(sale.length, day).toBeLessThanOrEqual(2)
    }
  })

  it('깎아준 값은 원래보다 싸다', () => {
    for (const day of ['2026-03-04', '2026-03-05', '2026-03-06']) {
      for (const l of todayListings(shop, day)) {
        if (l.wasPrice === undefined) continue
        expect(l.price).toBeLessThan(l.wasPrice)
      }
    }
  })

  it('귀한 것은 깎아주지 않는다', () => {
    for (const day of ['2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07']) {
      for (const l of todayListings(shop, day)) {
        if (l.wasPrice === undefined) continue
        const item = findCollectionItem(l.itemId)!
        expect(item.rarity, l.itemId).not.toBe('EPIC')
        expect(item.rarity, l.itemId).not.toBe('LEGENDARY')
      }
    }
  })

  it('며칠 지켜보면 깎아주는 날이 있다', () => {
    // 하나도 안 깎으면 매일 들여다볼 이유가 없다
    const days = ['2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07', '2026-03-08']
    const any = days.some((d) => todayListings(shop, d).some((l) => l.wasPrice !== undefined))
    expect(any).toBe(true)
  })
})
