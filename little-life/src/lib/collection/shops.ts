import type {
  CollectionShopDef,
  CollectionShopId,
  CollectionState,
  ShopListing,
  TodaysStock,
} from '@/types'
import { pickCount, pickSome, seededRandom } from '@/lib/city/seed'
import { todayKey } from '@/lib/date'
import { isNightOpen } from '@/lib/rpg/time'
import { reputationLevelNumber } from '@/lib/city/reputation'
import { CATALOG, findCollectionItem } from './catalog'
import { dailyStock, rarityRank, rotateShop } from './rotation'
import { isDiscovered, ownedCount } from './progress'

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
    minCount: 11,
    maxCount: 13,
    guaranteedRare: 1,
  },
  {
    id: 'TINY_MARKET',
    name: '작은 생활 마켓',
    icon: '🧺',
    areaId: 'CAFE_STREET',
    description: '컵과 접시와 바구니. 없어도 되는데 있으면 좋은 것들.',
    minCount: 9,
    maxCount: 11,
  },
  {
    id: 'GREEN_HOUSE',
    name: '초록 온실',
    icon: '🌿',
    areaId: 'GREEN_PARK',
    description: '물 주는 법까지 알려준다.',
    minCount: 5,
    maxCount: 7,
  },
  {
    id: 'PAPER_MOON',
    name: '페이퍼 문',
    icon: '📚',
    areaId: 'CAFE_STREET',
    description: '책과 종이와 펜. 사지 않아도 오래 있어도 된다.',
    minCount: 5,
    maxCount: 7,
  },
  {
    id: 'HOBBY_CORNER',
    name: '취미 코너',
    icon: '🎨',
    areaId: 'CREATIVE_DISTRICT',
    description: '시작만 해본 취미가 몇 개인지 묻지 않는다.',
    minCount: 7,
    maxCount: 9,
  },
  {
    id: 'JUNE_VINTAGE',
    name: '준의 빈티지',
    icon: '🕰️',
    areaId: 'CREATIVE_DISTRICT',
    description: '먼저 쓰던 사람이 있던 물건만 둔다.',
    minCount: 4,
    maxCount: 5,
    guaranteedRare: 2,
    // 좋은 건 안쪽에 둔다. 몇 번 와본 사람에게만 꺼낸다.
    reputationForRare: 10,
  },
  {
    id: 'FLEA_MARKET',
    name: '주말 벼룩시장',
    icon: '🧦',
    areaId: 'GREEN_PARK',
    description: '토·일에만 선다. 값은 그날 기분에 따라 조금씩 다르다.',
    minCount: 7,
    maxCount: 9,
    weekendOnly: true,
    hagglePrices: true,
  },
  {
    id: 'MOON_STALL',
    name: '달빛 가판',
    icon: '🌙',
    areaId: 'NIGHT_TOWN',
    description: '밤 시장 끝자리. 밤에만 문을 연다.',
    minCount: 4,
    maxCount: 5,
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

export interface StockOptions {
  /** 이 지역에서 내가 얼마나 알려져 있는지 */
  reputation?: number
  /** 평판 단계 (1~5). 없으면 reputation 에서 구한다. */
  reputationLevel?: number
  /** 귀한 물건이 열렸는지 보려고 쓴다 */
  playerLevel?: number
  /** 오늘 이미 산 것을 빼려면 */
  collection?: CollectionState
}

/** 진열은 평판 단계와 레벨에 따라 달라진다. 두 값을 한 곳에서 정리한다. */
function rotationOptions(options: StockOptions) {
  return {
    reputationLevel:
      options.reputationLevel ?? reputationLevelNumber(options.reputation ?? 0),
    playerLevel: options.playerLevel ?? 99,
  }
}

/**
 * 오늘 이 가게에 깔린 것.
 *
 * 날짜가 씨앗이라 새로고침해도 그대로고, 자정이 지나면 바뀐다.
 * 저장하지 않는다 — 저장하면 기기마다 다른 진열이 남는다.
 *
 * 남은 개수만 저장된 구매 기록에서 뺀다. 진열 자체는 다시 계산해도
 * 오늘 산 기록을 덮어쓰지 않는다는 뜻이다.
 */
export function todayListings(
  shop: CollectionShopDef,
  dayKey: string = todayKey(),
  options: StockOptions = {},
): ShopListing[] {
  if (shop.catalog.length === 0) return []

  const rotation = rotationOptions(options)
  const picked = rotateShop(shop, dayKey, rotation)
  const yesterday = new Set(idsOn(shop, dayKey, -1, rotation))
  const tomorrow = new Set(idsOn(shop, dayKey, 1, rotation))
  const onSale = saleIds(shop, picked, dayKey)

  const listings: ShopListing[] = []
  for (const itemId of picked) {
    const item = findCollectionItem(itemId)
    if (!item?.price) continue

    // 뒷줄에 두는 건 전설품뿐이다.
    // 예전에는 EPIC 까지 잠갔는데, 등급 무게를 넣고 나니 준의 빈티지에
    // EPIC 이 꾸준히 들어오게 되어서 처음 온 사람은 네 칸 중 한 칸만 살 수 있었다.
    // 가게에 들어갔는데 살 수 있는 게 하나면 그건 가게가 아니다.
    const locked =
      shop.reputationForRare !== undefined &&
      item.rarity === 'LEGENDARY' &&
      (options.reputation ?? 0) < shop.reputationForRare

    const base = shop.hagglePrices ? hagglePrice(item.price, itemId, dayKey) : item.price
    const sale = onSale.has(itemId)
    const price = sale ? Math.max(10, Math.round((base * (1 - SALE_OFF)) / 5) * 5) : base

    const stock = dailyStock(item, shop)
    const sold = options.collection?.purchases[`${dayKey}:${shop.id}:${itemId}`] ?? 0
    // 하나만 가질 수 있는 물건은 이미 가지고 있으면 더 살 것이 없다
    const alreadyOwned =
      item.unique && options.collection && ownedCount(options.collection, itemId) > 0

    listings.push({
      itemId,
      price,
      isNew: !yesterday.has(itemId),
      // 귀한 건 하나씩만 들어온다
      limited: stock === 1,
      locked,
      lastDay: !tomorrow.has(itemId),
      stock,
      remaining: alreadyOwned ? 0 : Math.max(0, stock - sold),
      rareFind: false,
      ...(sale ? { wasPrice: base } : {}),
    })
  }

  markRareFind(listings)
  return listings
}

/**
 * 오늘 이 가게에서 제일 귀한 것 하나에 표시를 단다.
 *
 * RARE 부터만 고른다. 흔한 것뿐인 날에는 아무것도 고르지 않는다 —
 * 매일 무언가에 표시가 붙으면 그 표시는 곧 안 보이게 된다.
 *
 * 아직 못 사는 것은 고르지 않는다. 살 수 없는 물건을 "오늘의 발견" 이라고
 * 가리키는 건 알려주는 게 아니라 약 올리는 것이다.
 * 같은 등급이 여럿이면 앞에 뽑힌 것 — 진열 순서도 씨앗이 정한 값이라 흔들리지 않는다.
 */
function markRareFind(listings: ShopListing[]): void {
  let best: ShopListing | null = null
  let bestRank = rarityRank('RARE') - 1

  for (const listing of listings) {
    if (listing.locked || listing.remaining <= 0) continue
    const item = findCollectionItem(listing.itemId)
    if (!item) continue

    const rank = rarityRank(item.rarity)
    if (rank > bestRank) {
      bestRank = rank
      best = listing
    }
  }
  if (best) best.rareFind = true
}

/**
 * 다른 날 이 가게에 뭐가 깔려 있(었)는지.
 *
 * 진열은 날짜만 알면 나오는 값이라 하루 앞뒤로 한 번 더 굴리면 된다.
 * 어제 것과 견주면 "오늘 들어온 것", 내일 것과 견주면 "오늘까지" 가 나온다.
 * 저장할 필요가 없다는 게 이 방식의 전부다.
 */
function idsOn(
  shop: CollectionShopDef,
  dayKey: string,
  offsetDays: number,
  rotation: ReturnType<typeof rotationOptions>,
): string[] {
  const date = new Date(`${dayKey}T00:00:00`)
  date.setDate(date.getDate() + offsetDays)
  return rotateShop(shop, date.toISOString().slice(0, 10), rotation)
}

/**
 * 오늘의 입고 한 줄.
 *
 * 가게에 들어가기 전에 "볼 것이 있나" 를 알 수 있어야 한다.
 * 없으면 굳이 열지 않아도 된다 — 매일 다 열어보는 게 숙제가 되면 안 된다.
 */
export function todaysStock(
  shop: CollectionShopDef,
  collection: CollectionState,
  dayKey: string = todayKey(),
  options: StockOptions = {},
): TodaysStock {
  const listings = todayListings(shop, dayKey, { ...options, collection })

  return {
    total: listings.length,
    fresh: listings.filter((l) => l.isNew).length,
    wished: listings.filter((l) => collection.wishlist.includes(l.itemId)).length,
    rare: listings.filter((l) => {
      const item = findCollectionItem(l.itemId)
      return item !== null && rarityRank(item.rarity) >= rarityRank('RARE')
    }).length,
    unseen: listings.filter((l) => !isDiscovered(collection, l.itemId)).length,
  }
}

/** 이 가게가 파는 것 중 몇 개를 도감에 넣었는지 */
export function shopDiscovery(
  shop: CollectionShopDef,
  collection: CollectionState,
): { found: number; total: number } {
  const sellable = shop.catalog.filter((id) => findCollectionItem(id)?.price)
  return {
    found: sellable.filter((id) => isDiscovered(collection, id)).length,
    total: sellable.length,
  }
}

/** 오늘 깎아주는 비율 */
const SALE_OFF = 0.25

/**
 * 오늘 깎아주는 물건.
 *
 * 가게마다 하루 한둘. 매일 다 깎아주면 그건 그냥 원래 값이고,
 * 아무것도 안 깎으면 굳이 매일 들여다볼 이유가 없다.
 *
 * 귀한 것은 안 깎는다 — EPIC 하나가 25% 빠지면 그날 하루가 다른 날 열흘이 된다.
 */
function saleIds(shop: CollectionShopDef, picked: string[], dayKey: string): Set<string> {
  const cheap = picked.filter((id) => {
    const item = findCollectionItem(id)
    return item && item.rarity !== 'EPIC' && item.rarity !== 'LEGENDARY'
  })
  if (cheap.length === 0) return new Set()

  const howMany = pickCount(1, 2, `${dayKey}:${shop.id}:saleCount`)
  return new Set(pickSome(cheap, Math.min(howMany, cheap.length), `${dayKey}:${shop.id}:sale`))
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
