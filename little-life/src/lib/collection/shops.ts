import type { CollectionShopDef, CollectionShopId, ShopListing } from '@/types'
import { pickCount, pickSome, seededRandom } from '@/lib/city/seed'
import { todayKey } from '@/lib/date'
import { isNightOpen } from '@/lib/rpg/time'
import { CATALOG, findCollectionItem } from './catalog'

/**
 * 여덟 개의 가게.
 *
 * 한 가게에 240개를 다 넣으면 그건 목록이지 가게가 아니다.
 * 가게마다 파는 결이 다르고, 매일 그중 일부만 깔린다.
 * "오늘 뭐 들어왔지" 가 이 시스템의 전부다.
 *
 * 무엇을 파는지는 아이템 표가 정한다 (items.ts 의 S:가게id).
 * 여기에 목록을 또 적으면 두 곳이 어긋난다.
 */
const SHOP_DEFS: Omit<CollectionShopDef, 'catalog'>[] = [
  {
    id: 'HOME_ATELIER',
    name: '홈 아틀리에',
    icon: '🪑',
    areaId: 'HOME_BASE',
    description: '가구와 조명. 오래 보고 골라도 눈치 안 준다.',
    minCount: 10,
    maxCount: 14,
  },
  {
    id: 'TINY_MARKET',
    name: '작은 생활 마켓',
    icon: '🧺',
    areaId: 'CAFE_STREET',
    description: '컵과 접시와 바구니. 없어도 되는데 있으면 좋은 것들.',
    minCount: 8,
    maxCount: 12,
  },
  {
    id: 'GREEN_HOUSE',
    name: '초록 온실',
    icon: '🌿',
    areaId: 'GREEN_PARK',
    description: '물 주는 법까지 알려준다.',
    minCount: 6,
    maxCount: 10,
  },
  {
    id: 'PAPER_MOON',
    name: '페이퍼 문',
    icon: '📚',
    areaId: 'CAFE_STREET',
    description: '책과 종이와 펜. 사지 않아도 오래 있어도 된다.',
    minCount: 6,
    maxCount: 10,
  },
  {
    id: 'HOBBY_CORNER',
    name: '취미 코너',
    icon: '🎨',
    areaId: 'CREATIVE_DISTRICT',
    description: '시작만 해본 취미가 몇 개인지 묻지 않는다.',
    minCount: 6,
    maxCount: 10,
  },
  {
    id: 'JUNE_VINTAGE',
    name: '준의 빈티지',
    icon: '🕰️',
    areaId: 'CREATIVE_DISTRICT',
    description: '먼저 쓰던 사람이 있던 물건만 둔다.',
    minCount: 4,
    maxCount: 6,
    // 좋은 건 안쪽에 둔다. 몇 번 와본 사람에게만 꺼낸다.
    reputationForRare: 10,
  },
  {
    id: 'FLEA_MARKET',
    name: '주말 벼룩시장',
    icon: '🧦',
    areaId: 'GREEN_PARK',
    description: '토·일에만 선다. 값은 그날 기분에 따라 조금씩 다르다.',
    minCount: 8,
    maxCount: 12,
    weekendOnly: true,
    hagglePrices: true,
  },
  {
    id: 'MOON_STALL',
    name: '달빛 가판',
    icon: '🌙',
    areaId: 'NIGHT_TOWN',
    description: '밤 시장 끝자리. 밤에만 문을 연다.',
    minCount: 5,
    maxCount: 8,
    nightOnly: true,
  },
]

/** 가게가 파는 것 전체. 아이템 표에서 그대로 뽑는다. */
function catalogFor(shopId: CollectionShopId): string[] {
  return CATALOG.filter((item) =>
    item.acquisitionSources.some((s) => s.kind === 'SHOP' && s.shopId === shopId),
  ).map((i) => i.id)
}

export const COLLECTION_SHOPS: CollectionShopDef[] = SHOP_DEFS.map((def) => ({
  ...def,
  catalog: catalogFor(def.id),
}))

export function findCollectionShop(id: string): CollectionShopDef | null {
  return COLLECTION_SHOPS.find((s) => s.id === id) ?? null
}

export function collectionShopsInArea(areaId: string): CollectionShopDef[] {
  return COLLECTION_SHOPS.filter((s) => s.areaId === areaId)
}

/** 토요일·일요일 (getDay: 0=일) */
export function isWeekend(now: Date = new Date()): boolean {
  const day = now.getDay()
  return day === 0 || day === 6
}

export function isCollectionShopOpen(shop: CollectionShopDef, now: Date = new Date()): boolean {
  if (shop.nightOnly && !isNightOpen(now)) return false
  if (shop.weekendOnly && !isWeekend(now)) return false
  return true
}

/** 이 가게가 언제 여는지 한 줄 */
export function openingLabel(shop: CollectionShopDef): string | null {
  if (shop.nightOnly) return '밤 9시부터 새벽 5시까지'
  if (shop.weekendOnly) return '토요일과 일요일에만'
  return null
}

/** 주 단위 씨앗 — 벼룩시장 값은 하루가 아니라 그 주에 고정된다 */
function weekSeed(dayKey: string): string {
  const date = new Date(`${dayKey}T00:00:00`)
  const day = (date.getDay() + 6) % 7
  const monday = new Date(date)
  monday.setDate(date.getDate() - day)
  return monday.toISOString().slice(0, 10)
}

/**
 * 값 흔들림.
 * ±20% 안에서만 움직인다. 어제 100 이던 게 오늘 400 이면 그건 그냥 거짓말이다.
 */
export function hagglePrice(basePrice: number, itemId: string, dayKey: string): number {
  const random = seededRandom(`${weekSeed(dayKey)}:${itemId}:price`)
  const factor = 0.8 + random() * 0.4
  return Math.max(10, Math.round((basePrice * factor) / 5) * 5)
}

interface StockOptions {
  /** 이 지역에서 내가 얼마나 알려져 있는지 */
  reputation?: number
}

/**
 * 오늘 이 가게에 깔린 것.
 *
 * 날짜가 씨앗이라 새로고침해도 그대로고, 자정이 지나면 바뀐다.
 * 저장하지 않는다 — 저장하면 기기마다 다른 진열이 남는다.
 */
export function todayListings(
  shop: CollectionShopDef,
  dayKey: string = todayKey(),
  options: StockOptions = {},
): ShopListing[] {
  if (shop.catalog.length === 0) return []

  const count = pickCount(shop.minCount, shop.maxCount, `${dayKey}:${shop.id}:count`)
  const picked = pickSome(shop.catalog, count, `${dayKey}:${shop.id}`)
  const yesterday = yesterdayIds(shop, dayKey)

  const listings: ShopListing[] = []
  for (const itemId of picked) {
    const item = findCollectionItem(itemId)
    if (!item?.price) continue

    const locked =
      shop.reputationForRare !== undefined &&
      (item.rarity === 'EPIC' || item.rarity === 'LEGENDARY') &&
      (options.reputation ?? 0) < shop.reputationForRare

    listings.push({
      itemId,
      price: shop.hagglePrices ? hagglePrice(item.price, itemId, dayKey) : item.price,
      isNew: !yesterday.has(itemId),
      // 귀한 건 하나씩만 들어온다
      limited: item.unique || item.rarity === 'EPIC' || item.rarity === 'LEGENDARY',
      locked,
    })
  }
  return listings
}

/** 어제 뭐가 깔려 있었는지 — 오늘 NEW 를 표시하려고 한 번 더 굴린다 */
function yesterdayIds(shop: CollectionShopDef, dayKey: string): Set<string> {
  const date = new Date(`${dayKey}T00:00:00`)
  date.setDate(date.getDate() - 1)
  const prevKey = date.toISOString().slice(0, 10)

  const count = pickCount(shop.minCount, shop.maxCount, `${prevKey}:${shop.id}:count`)
  return new Set(pickSome(shop.catalog, count, `${prevKey}:${shop.id}`))
}

/** 오늘 이 물건을 파는 가게 (위시리스트 알림에 쓴다) */
export function shopsSellingToday(
  itemId: string,
  dayKey: string = todayKey(),
  now: Date = new Date(),
): CollectionShopDef[] {
  return COLLECTION_SHOPS.filter((shop) => {
    if (!isCollectionShopOpen(shop, now)) return false
    return todayListings(shop, dayKey).some((l) => l.itemId === itemId)
  })
}
