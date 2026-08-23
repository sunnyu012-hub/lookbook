import { describe, expect, it } from 'vitest'
import type { AppState, CollectionShopDef } from '@/types'
import {
  COLLECTION_SHOPS,
  findCollectionShop,
  isCollectionShopOpen,
  shopDiscovery,
  todayListings,
  todaysStock,
} from '@/lib/collection/shops'
import { BASE_WEIGHTS, dailyStock, rarityRank, shopBonus } from '@/lib/collection/rotation'
import { deliveryDueOn, isDeliveryClaimed, pendingDelivery } from '@/lib/collection/delivery'
import {
  emptyCollection,
  hasFreshStock,
  isDiscovered,
  isSeen,
  discoveredCount,
  knowledgeOf,
  markSeen,
  markShopVisited,
} from '@/lib/collection/progress'
import { findCollectionItem } from '@/lib/collection/catalog'
import { createDefaultState } from '@/store/defaultState'
import { sanitizeCollection } from '@/store/migrate'

const shopOf = (id: string) => findCollectionShop(id)!
const ids = (l: ReturnType<typeof todayListings>) => l.map((x) => x.itemId)

/** 며칠 뒤의 날짜 키 */
function dayAfter(dayKey: string, days: number): string {
  const d = new Date(`${dayKey}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ── A. 같은 날 ──────────────────────────────────────────

describe('진열은 날짜에 묶여 있다', () => {
  it('같은 날 다시 열어도 똑같다', () => {
    for (const shop of COLLECTION_SHOPS) {
      const first = todayListings(shop, '2026-09-14')
      const again = todayListings(shop, '2026-09-14')
      expect(ids(again), shop.id).toEqual(ids(first))
      expect(again.map((l) => l.price), shop.id).toEqual(first.map((l) => l.price))
      expect(again.map((l) => l.stock), shop.id).toEqual(first.map((l) => l.stock))
    }
  })

  it('날짜가 바뀌면 진열도 바뀐다', () => {
    // 어느 하루쯤은 완전히 같을 수 있으니 한 주를 통째로 본다
    const changed = COLLECTION_SHOPS.filter((shop) => {
      const today = ids(todayListings(shop, '2026-09-14')).join()
      return [1, 2, 3, 4, 5, 6].some(
        (n) => ids(todayListings(shop, dayAfter('2026-09-14', n))).join() !== today,
      )
    })
    expect(changed.length).toBe(COLLECTION_SHOPS.length)
  })

  it('어제와 견줘서 새로 들어온 것을 표시한다', () => {
    const shop = shopOf('HOME_ATELIER')
    const yesterday = new Set(ids(todayListings(shop, '2026-09-13')))
    for (const listing of todayListings(shop, '2026-09-14')) {
      expect(listing.isNew, listing.itemId).toBe(!yesterday.has(listing.itemId))
    }
  })

  it('내일 빠지는 것을 오늘까지로 표시한다', () => {
    const shop = shopOf('TINY_MARKET')
    const tomorrow = new Set(ids(todayListings(shop, '2026-09-15')))
    for (const listing of todayListings(shop, '2026-09-14')) {
      expect(listing.lastDay, listing.itemId).toBe(!tomorrow.has(listing.itemId))
    }
  })
})

// ── 등급 무게 ───────────────────────────────────────────

describe('귀한 것은 드물게 나온다', () => {
  it('기본 무게는 흔한 것 쪽으로 크게 기울어 있다', () => {
    expect(BASE_WEIGHTS.COMMON).toBeGreaterThan(BASE_WEIGHTS.RARE)
    expect(BASE_WEIGHTS.RARE).toBeGreaterThan(BASE_WEIGHTS.EPIC)
    expect(BASE_WEIGHTS.EPIC).toBeGreaterThan(BASE_WEIGHTS.LEGENDARY)
    // 비밀 물건은 가게에 절대 나오지 않는다
    expect(BASE_WEIGHTS.SECRET).toBe(0)
  })

  it('전설품이 진열의 5분의 1을 차지하지 않는다', () => {
    // 예전에는 아무거나 고르는 방식이라 준의 빈티지 다섯 칸 중 한 칸이 늘 전설품이었다
    const shop = shopOf('JUNE_VINTAGE')
    let slots = 0
    let legendary = 0

    for (let i = 0; i < 90; i += 1) {
      for (const listing of todayListings(shop, dayAfter('2026-01-01', i), { playerLevel: 20 })) {
        slots += 1
        if (findCollectionItem(listing.itemId)?.rarity === 'LEGENDARY') legendary += 1
      }
    }
    expect(slots).toBeGreaterThan(300)
    expect(legendary / slots).toBeLessThan(0.12)
  })

  it('비밀 물건은 어느 가게에도 안 나온다', () => {
    for (const shop of COLLECTION_SHOPS) {
      for (let i = 0; i < 30; i += 1) {
        for (const listing of todayListings(shop, dayAfter('2026-05-01', i), { playerLevel: 20 })) {
          expect(findCollectionItem(listing.itemId)?.rarity, listing.itemId).not.toBe('SECRET')
        }
      }
    }
  })

  it('레벨이 낮으면 전설품은 아직 안 보인다', () => {
    const shop = shopOf('JUNE_VINTAGE')
    for (let i = 0; i < 40; i += 1) {
      for (const listing of todayListings(shop, dayAfter('2026-02-01', i), { playerLevel: 1 })) {
        const rarity = findCollectionItem(listing.itemId)?.rarity
        expect(rarity, listing.itemId).not.toBe('LEGENDARY')
        expect(rarity, listing.itemId).not.toBe('EPIC')
      }
    }
  })

  it('그래도 첫날부터 살 것은 충분하다', () => {
    // 레벨 1 이어도 진열이 텅 비면 안 된다
    for (const shop of COLLECTION_SHOPS) {
      const listings = todayListings(shop, '2026-02-01', { playerLevel: 1 })
      expect(listings.length, shop.id).toBeGreaterThanOrEqual(Math.min(4, shop.minCount))
    }
  })

  it('약속한 가게에는 귀한 것이 매일 들어온다', () => {
    const shop = shopOf('JUNE_VINTAGE')
    for (let i = 0; i < 30; i += 1) {
      const listings = todayListings(shop, dayAfter('2026-04-01', i), { playerLevel: 20 })
      const rare = listings.filter(
        (l) => rarityRank(findCollectionItem(l.itemId)!.rarity) >= rarityRank('RARE'),
      )
      expect(rare.length, `day ${i}`).toBeGreaterThanOrEqual(shop.guaranteedRare!)
    }
  })

  it('귀한 칸을 채워도 진열 수는 그대로다', () => {
    const shop = shopOf('HOME_ATELIER')
    for (let i = 0; i < 20; i += 1) {
      const listings = todayListings(shop, dayAfter('2026-06-01', i), { playerLevel: 20 })
      expect(listings.length).toBeGreaterThanOrEqual(shop.minCount)
      expect(listings.length).toBeLessThanOrEqual(shop.maxCount)
    }
  })
})

// ── E. 오늘의 발견 ──────────────────────────────────────

describe('오늘의 발견', () => {
  it('한 가게에 하나뿐이다', () => {
    for (const shop of COLLECTION_SHOPS) {
      for (let i = 0; i < 20; i += 1) {
        const marked = todayListings(shop, dayAfter('2026-07-01', i), {
          playerLevel: 20,
        }).filter((l) => l.rareFind)
        expect(marked.length, shop.id).toBeLessThanOrEqual(1)
      }
    }
  })

  it('흔한 것에는 붙지 않는다', () => {
    for (const shop of COLLECTION_SHOPS) {
      for (let i = 0; i < 20; i += 1) {
        for (const listing of todayListings(shop, dayAfter('2026-07-01', i), { playerLevel: 20 })) {
          if (!listing.rareFind) continue
          const rarity = findCollectionItem(listing.itemId)!.rarity
          expect(rarityRank(rarity), listing.itemId).toBeGreaterThanOrEqual(rarityRank('RARE'))
        }
      }
    }
  })

  it('아직 못 사는 것에는 안 붙는다', () => {
    // 살 수 없는 물건을 오늘의 발견이라고 가리키면 그건 약 올리는 것이다
    for (const shop of COLLECTION_SHOPS) {
      for (let i = 0; i < 30; i += 1) {
        for (const l of todayListings(shop, dayAfter('2026-07-01', i), {
          playerLevel: 20,
          reputation: 0,
        })) {
          if (l.rareFind) expect(l.locked, l.itemId).toBe(false)
        }
      }
    }
  })

  it('이미 다 나간 것에도 안 붙는다', () => {
    const shop = shopOf('HOME_ATELIER')
    const first = todayListings(shop, '2026-07-04', { playerLevel: 20 }).find((l) => l.rareFind)
    if (!first) return

    const collection = {
      ...emptyCollection(),
      purchases: { [`2026-07-04:${shop.id}:${first.itemId}`]: first.stock },
    }
    const after = todayListings(shop, '2026-07-04', { playerLevel: 20, collection })
    expect(after.find((l) => l.itemId === first.itemId)!.rareFind).toBe(false)
  })

  it('그날 제일 귀한 것에 붙는다', () => {
    const shop = shopOf('HOBBY_CORNER')
    const listings = todayListings(shop, '2026-07-04', { playerLevel: 20, reputation: 999 })
    const best = Math.max(
      ...listings.map((l) => rarityRank(findCollectionItem(l.itemId)!.rarity)),
    )
    const marked = listings.find((l) => l.rareFind)
    if (best >= rarityRank('RARE')) {
      expect(marked).toBeDefined()
      expect(rarityRank(findCollectionItem(marked!.itemId)!.rarity)).toBe(best)
    }
  })
})

// ── C. 재고와 품절 ──────────────────────────────────────

describe('재고', () => {
  it('귀한 것과 하나뿐인 것은 하루 한 개', () => {
    for (const shop of COLLECTION_SHOPS) {
      for (const listing of todayListings(shop, '2026-09-14', { playerLevel: 20 })) {
        const def = findCollectionItem(listing.itemId)!
        if (def.rarity === 'EPIC' || def.rarity === 'LEGENDARY' || def.unique) {
          expect(listing.stock, `${shop.id}:${def.id}`).toBe(1)
        }
        expect(listing.stock).toBeGreaterThan(0)
      }
    }
  })

  it('사면 남은 개수가 준다', () => {
    const shop = shopOf('TINY_MARKET')
    const before = todayListings(shop, '2026-09-14')[0]
    const collection = {
      ...emptyCollection(),
      purchases: { [`2026-09-14:${shop.id}:${before.itemId}`]: 1 },
    }

    const after = todayListings(shop, '2026-09-14', { collection }).find(
      (l) => l.itemId === before.itemId,
    )!
    expect(after.remaining).toBe(before.remaining - 1)
    // 진열 자체는 그대로다. 산다고 물건이 사라지지 않는다.
    expect(after.stock).toBe(before.stock)
  })

  it('다 사면 품절이 되고 자리는 남는다', () => {
    const shop = shopOf('TINY_MARKET')
    const target = todayListings(shop, '2026-09-14')[0]
    const collection = {
      ...emptyCollection(),
      purchases: { [`2026-09-14:${shop.id}:${target.itemId}`]: target.stock },
    }

    const after = todayListings(shop, '2026-09-14', { collection })
    const sold = after.find((l) => l.itemId === target.itemId)!
    expect(sold.remaining).toBe(0)
    expect(after.length).toBe(todayListings(shop, '2026-09-14').length)
  })

  it('구매 기록은 다시 계산해도 덮이지 않는다', () => {
    const shop = shopOf('HOME_ATELIER')
    const target = todayListings(shop, '2026-09-14')[0]
    const key = `2026-09-14:${shop.id}:${target.itemId}`
    const collection = { ...emptyCollection(), purchases: { [key]: 1 } }

    // 저장했다 다시 읽어도 그대로
    const reloaded = sanitizeCollection(collection)
    expect(reloaded.purchases[key]).toBe(1)
  })

  it('하나뿐인 물건은 이미 가졌으면 살 수 없다', () => {
    const unique = COLLECTION_SHOPS.flatMap((shop) =>
      shop.catalog
        .map((id) => ({ shop, def: findCollectionItem(id)! }))
        .filter(({ def }) => def.unique && def.price),
    )[0]
    if (!unique) return

    const collection = { ...emptyCollection(), owned: { [unique.def.id]: 1 } }
    for (let i = 0; i < 60; i += 1) {
      const found = todayListings(unique.shop, dayAfter('2026-01-01', i), {
        playerLevel: 20,
        collection,
      }).find((l) => l.itemId === unique.def.id)
      if (found) expect(found.remaining).toBe(0)
    }
  })

  it('재고 규칙이 등급을 따른다', () => {
    const shop = shopOf('HOME_ATELIER')
    const june = shopOf('JUNE_VINTAGE')
    const common = findCollectionItem('cream_bed')!
    expect(dailyStock(common, shop)).toBeGreaterThan(1)
    // 남이 쓰던 것은 하나씩만 있다
    expect(dailyStock(common, june)).toBe(1)
  })
})

// ── H. 평판 ─────────────────────────────────────────────

describe('평판이 쌓이면', () => {
  it('단계마다 하나씩만 붙는다', () => {
    expect(shopBonus(1)).toEqual({ extraSlots: 0, extraRare: 0, rareBoost: 1, legendBoost: 1 })
    expect(shopBonus(2).rareBoost).toBeGreaterThan(1)
    expect(shopBonus(3).extraSlots).toBe(1)
    expect(shopBonus(4).extraRare).toBe(1)
    expect(shopBonus(5).legendBoost).toBeGreaterThan(1)
  })

  it('진열이 한 칸 늘어난다', () => {
    for (const shop of COLLECTION_SHOPS) {
      const visitor = todayListings(shop, '2026-09-14', { reputationLevel: 1, playerLevel: 20 })
      const local = todayListings(shop, '2026-09-14', { reputationLevel: 3, playerLevel: 20 })
      expect(local.length, shop.id).toBe(visitor.length + 1)
    }
  })

  it('귀한 것이 더 자주 나온다', () => {
    const shop = shopOf('HOME_ATELIER')
    const count = (level: number) => {
      let rare = 0
      let slots = 0
      for (let i = 0; i < 60; i += 1) {
        for (const l of todayListings(shop, dayAfter('2026-03-01', i), {
          reputationLevel: level,
          playerLevel: 20,
        })) {
          slots += 1
          if (rarityRank(findCollectionItem(l.itemId)!.rarity) >= rarityRank('RARE')) rare += 1
        }
      }
      return rare / slots
    }
    expect(count(4)).toBeGreaterThan(count(1))
  })

  it('보너스가 지나치게 세지 않다', () => {
    // 다섯 단계를 다 올려도 진열이 두 배가 되지는 않는다
    for (const shop of COLLECTION_SHOPS) {
      const visitor = todayListings(shop, '2026-09-14', { reputationLevel: 1, playerLevel: 20 })
      const legend = todayListings(shop, '2026-09-14', { reputationLevel: 5, playerLevel: 20 })
      expect(legend.length, shop.id).toBeLessThanOrEqual(visitor.length + 2)
    }
  })
})

// ── F·G. 여는 시간 ──────────────────────────────────────

describe('여는 시간', () => {
  it('밤 시장은 20시엔 닫혀 있고 22시엔 열려 있다', () => {
    const night = COLLECTION_SHOPS.find((s) => s.nightOnly)!
    expect(isCollectionShopOpen(night, new Date('2026-09-14T20:00:00'))).toBe(false)
    expect(isCollectionShopOpen(night, new Date('2026-09-14T22:00:00'))).toBe(true)
    expect(isCollectionShopOpen(night, new Date('2026-09-14T03:00:00'))).toBe(true)
    expect(isCollectionShopOpen(night, new Date('2026-09-14T06:00:00'))).toBe(false)
  })

  it('벼룩시장은 금요일엔 안 서고 토요일엔 선다', () => {
    const flea = COLLECTION_SHOPS.find((s) => s.weekendOnly)!
    // 2026-09-18 은 금요일, 19 는 토요일, 20 은 일요일
    expect(isCollectionShopOpen(flea, new Date('2026-09-18T12:00:00'))).toBe(false)
    expect(isCollectionShopOpen(flea, new Date('2026-09-19T12:00:00'))).toBe(true)
    expect(isCollectionShopOpen(flea, new Date('2026-09-20T12:00:00'))).toBe(true)
  })

  it('벼룩시장 값은 그 주 안에서는 안 흔들린다', () => {
    const flea = COLLECTION_SHOPS.find((s) => s.weekendOnly)!
    const sat = todayListings(flea, '2026-09-19')
    const sun = todayListings(flea, '2026-09-20')
    for (const s of sat) {
      const same = sun.find((l) => l.itemId === s.itemId)
      // 같은 주말이면 같은 물건은 같은 값 (깎아주는 것은 빼고 본다)
      if (same && s.wasPrice === undefined && same.wasPrice === undefined) {
        expect(same.price, s.itemId).toBe(s.price)
      }
    }
  })
})

// ── 오늘의 입고 요약 ────────────────────────────────────

describe('오늘의 입고', () => {
  it('센 것과 진열이 어긋나지 않는다', () => {
    const shop = shopOf('HOME_ATELIER')
    const collection = emptyCollection()
    const listings = todayListings(shop, '2026-09-14', { collection })
    const stock = todaysStock(shop, collection, '2026-09-14')

    expect(stock.total).toBe(listings.length)
    expect(stock.fresh).toBe(listings.filter((l) => l.isNew).length)
    // 아무것도 발견 안 한 상태면 전부 처음 보는 것이다
    expect(stock.unseen).toBe(listings.length)
    expect(stock.wished).toBe(0)
  })

  it('찾는 물건이 진열에 있으면 센다', () => {
    const shop = shopOf('HOME_ATELIER')
    const first = todayListings(shop, '2026-09-14')[0]
    const collection = { ...emptyCollection(), wishlist: [first.itemId] }
    expect(todaysStock(shop, collection, '2026-09-14').wished).toBe(1)
  })

  it('이 가게에서 몇 개 모았는지 센다', () => {
    const shop = shopOf('GREEN_HOUSE')
    const empty = shopDiscovery(shop, emptyCollection())
    expect(empty.found).toBe(0)
    expect(empty.total).toBeGreaterThan(0)

    const one = shopDiscovery(shop, {
      ...emptyCollection(),
      discovered: { [shop.catalog[0]]: new Date().toISOString() },
    })
    expect(one.found).toBe(1)
  })
})

// ── 본 것 ───────────────────────────────────────────────

describe('본 것과 가진 것', () => {
  it('진열대에서 본 것은 도감 수에 안 들어간다', () => {
    const shop = shopOf('HOME_ATELIER')
    const seenIds = ids(todayListings(shop, '2026-09-14'))
    const collection = markSeen(emptyCollection(), seenIds)

    expect(discoveredCount(collection)).toBe(0)
    for (const id of seenIds) {
      expect(isSeen(collection, id), id).toBe(true)
      expect(isDiscovered(collection, id), id).toBe(false)
      expect(knowledgeOf(collection, id)).toBe('SEEN')
    }
  })

  it('가진 것이 본 것을 덮는다', () => {
    const collection = {
      ...markSeen(emptyCollection(), ['cream_bed']),
      discovered: { cream_bed: new Date().toISOString() },
    }
    expect(knowledgeOf(collection, 'cream_bed')).toBe('DISCOVERED')
  })

  it('아무것도 모르는 것은 UNKNOWN', () => {
    expect(knowledgeOf(emptyCollection(), 'cream_bed')).toBe('UNKNOWN')
  })

  it('저장했다 읽어도 남는다', () => {
    const collection = markSeen(emptyCollection(), ['cream_bed', 'floor_lamp'])
    const back = sanitizeCollection(collection)
    expect(isSeen(back, 'cream_bed')).toBe(true)
    expect(isSeen(back, 'floor_lamp')).toBe(true)
  })

  it('이미 가진 것은 본 것으로 또 적지 않는다', () => {
    const owned = { ...emptyCollection(), discovered: { cream_bed: '2026-01-01T00:00:00.000Z' } }
    expect(markSeen(owned, ['cream_bed'])).toBe(owned)
  })
})

// ── 방문 기억 ───────────────────────────────────────────

describe('오늘 들른 가게', () => {
  it('들르기 전에는 새 입고 표시가 붙는다', () => {
    expect(hasFreshStock(emptyCollection(), 'HOME_ATELIER', '2026-09-14')).toBe(true)
  })

  it('들르면 표시가 사라진다', () => {
    const visited = markShopVisited(emptyCollection(), 'HOME_ATELIER', '2026-09-14')
    expect(hasFreshStock(visited, 'HOME_ATELIER', '2026-09-14')).toBe(false)
    // 다른 가게는 그대로
    expect(hasFreshStock(visited, 'TINY_MARKET', '2026-09-14')).toBe(true)
  })

  it('다음 날이 되면 다시 붙는다', () => {
    const visited = markShopVisited(emptyCollection(), 'HOME_ATELIER', '2026-09-14')
    expect(hasFreshStock(visited, 'HOME_ATELIER', '2026-09-15')).toBe(true)
  })
})

// ── 특별 배송 ───────────────────────────────────────────

describe('특별 배송', () => {
  it('매일 오지 않는다', () => {
    let hits = 0
    for (let i = 0; i < 365; i += 1) {
      if (deliveryDueOn(dayAfter('2026-01-01', i))) hits += 1
    }
    // 한 해에 20~60번쯤. 매일도 아니고 아예 안 오지도 않는다.
    expect(hits).toBeGreaterThan(15)
    expect(hits).toBeLessThan(70)
  })

  it('며칠은 지나야 다시 온다', () => {
    const days: number[] = []
    for (let i = 0; i < 365; i += 1) {
      if (deliveryDueOn(dayAfter('2026-01-01', i))) days.push(i)
    }
    for (let i = 1; i < days.length; i += 1) {
      expect(days[i] - days[i - 1]).toBeGreaterThan(3)
    }
  })

  it('같은 날 다시 봐도 같은 것이 온다', () => {
    const state = createDefaultState()
    const day = findDeliveryDay()
    expect(pendingDelivery(state, day)).toEqual(pendingDelivery(state, day))
  })

  it('받고 나면 사라진다', () => {
    const day = findDeliveryDay()
    const state = createDefaultState()
    expect(pendingDelivery(state, day)).not.toBeNull()

    const claimed: AppState = {
      ...state,
      collection: { ...state.collection, claimedDeliveries: [day] },
    }
    expect(isDeliveryClaimed(claimed.collection, day)).toBe(true)
    expect(pendingDelivery(claimed, day)).toBeNull()
  })

  it('전설품이나 하나뿐인 것은 보내지 않는다', () => {
    const state = createDefaultState()
    for (let i = 0; i < 365; i += 1) {
      const delivery = pendingDelivery(state, dayAfter('2026-01-01', i))
      if (!delivery) continue
      const item = findCollectionItem(delivery.itemId)!
      expect(item.rarity, item.id).not.toBe('LEGENDARY')
      expect(item.rarity, item.id).not.toBe('SECRET')
      expect(item.unique, item.id).toBe(false)
    }
  })

  it('아직 도감에 없는 것을 먼저 보낸다', () => {
    const state = createDefaultState()
    const day = findDeliveryDay()
    const delivery = pendingDelivery(state, day)!
    expect(isDiscovered(state.collection, delivery.itemId)).toBe(false)
  })
})

/** 배송이 오는 날 하나를 찾는다 */
function findDeliveryDay(): string {
  for (let i = 0; i < 365; i += 1) {
    const day = dayAfter('2026-01-01', i)
    if (deliveryDueOn(day)) return day
  }
  throw new Error('한 해에 배송이 한 번도 안 온다')
}

// ── J. 이관 ─────────────────────────────────────────────

describe('예전 저장에서 올라오기', () => {
  it('새 칸이 없던 기록도 그대로 읽힌다', () => {
    // v7 까지의 모양 — seen · shopVisits · claimedDeliveries 가 없다
    const old = {
      discovered: { cream_bed: '2026-01-01T00:00:00.000Z' },
      owned: { cream_bed: 2 },
      wishlist: ['floor_lamp'],
      rooms: {},
      roomEffects: {},
      currentRoomId: 'MY_ROOM',
      purchases: {},
      discoveredRecipeIds: [],
      claimedMilestones: [],
      claimedSetIds: [],
      earnedTrophyIds: [],
    }

    const back = sanitizeCollection(old)
    // 있던 것은 그대로
    expect(back.discovered.cream_bed).toBe('2026-01-01T00:00:00.000Z')
    expect(back.owned.cream_bed).toBe(2)
    expect(back.wishlist).toEqual(['floor_lamp'])
    // 없던 것만 채워진다
    expect(back.seen).toEqual({})
    expect(back.shopVisits).toEqual({})
    expect(back.claimedDeliveries).toEqual([])
  })

  it('오래된 구매 기록은 정리하고 최근 것은 남긴다', () => {
    const today = new Date().toISOString().slice(0, 10)
    const back = sanitizeCollection({
      ...emptyCollection(),
      purchases: {
        [`${today}:TINY_MARKET:small_pot`]: 1,
        '2020-01-01:TINY_MARKET:small_pot': 3,
      },
    })
    expect(back.purchases[`${today}:TINY_MARKET:small_pot`]).toBe(1)
    expect(back.purchases['2020-01-01:TINY_MARKET:small_pot']).toBeUndefined()
  })

  it('없는 가게 · 없는 물건이 저장돼 있으면 조용히 버린다', () => {
    const back = sanitizeCollection({
      ...emptyCollection(),
      seen: { nope_not_real: '2026-01-01T00:00:00.000Z', cream_bed: '2026-01-01T00:00:00.000Z' },
      shopVisits: { NOT_A_SHOP: '2026-09-14', HOME_ATELIER: '2026-09-14' },
    })
    expect(back.seen.nope_not_real).toBeUndefined()
    expect(back.seen.cream_bed).toBeDefined()
    expect(back.shopVisits.NOT_A_SHOP).toBeUndefined()
    expect(back.shopVisits.HOME_ATELIER).toBe('2026-09-14')
  })
})

// ── 가게가 저마다 다르다 ────────────────────────────────

describe('가게마다 결이 다르다', () => {
  it('생활 마켓과 빈티지 가게의 등급 분포가 다르다', () => {
    const rareShare = (shop: CollectionShopDef) => {
      let rare = 0
      let slots = 0
      for (let i = 0; i < 60; i += 1) {
        for (const l of todayListings(shop, dayAfter('2026-03-01', i), { playerLevel: 20 })) {
          slots += 1
          if (rarityRank(findCollectionItem(l.itemId)!.rarity) >= rarityRank('RARE')) rare += 1
        }
      }
      return rare / slots
    }

    expect(rareShare(shopOf('JUNE_VINTAGE'))).toBeGreaterThan(rareShare(shopOf('TINY_MARKET')) + 0.3)
  })

  it('여덟 곳 다 오늘 팔 것이 있다', () => {
    for (const shop of COLLECTION_SHOPS) {
      expect(todayListings(shop, '2026-09-14', { playerLevel: 20 }).length, shop.id).toBeGreaterThan(
        0,
      )
    }
  })
})
