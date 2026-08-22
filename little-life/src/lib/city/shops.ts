import type { ShopDef, ShopEntry, ShopId } from '@/types'
import { todayKey } from '@/lib/date'
import { isNightOpen } from '@/lib/rpg/time'
import { pickSome } from './seed'

/**
 * 지역 상점.
 *
 * Coin 은 현실에서 뭔가 해야만 생긴다. 그래서 상점은 "돈을 쓰는 곳" 이 아니라
 * "한 일에 대한 보상을 고르는 곳" 에 가깝다.
 */
export const SHOPS: ShopDef[] = [
  {
    id: 'MINA_CAFE',
    name: "Mina's Cafe",
    areaId: 'CAFE_STREET',
    npcId: 'MINA',
    icon: '☕',
    description: '오래 앉아 있어도 눈치 안 주는 곳.',
    stock: [
      { itemId: 'focus_coffee', price: 40 },
      { itemId: 'rainy_day_tea', price: 60 },
      { itemId: 'small_dessert', price: 25 },
    ],
  },
  {
    id: 'JUNE_CLOSET',
    name: "June's Closet",
    areaId: 'CREATIVE_DISTRICT',
    npcId: 'JUNE',
    icon: '🧥',
    description: '오래 입은 물건만 모아둔 가게.',
    stock: [
      { itemId: 'cozy_hoodie', price: 60 },
      { itemId: 'soft_cap', price: 50 },
      { itemId: 'vintage_ribbon', price: 120 },
    ],
    rotatingPool: [
      { itemId: 'cozy_scarf', price: 140 },
      { itemId: 'tiny_hair_clip', price: 45 },
      { itemId: 'flower_bookmark', price: 35 },
      { itemId: 'adventure_tote', price: 150 },
    ],
    rotatingCount: 2,
  },
  {
    id: 'MOVE_STORE',
    name: 'Move Store',
    areaId: 'TRAINING_ZONE',
    npcId: 'RIO',
    icon: '👟',
    description: '필요한 것만 딱 파는 가게.',
    stock: [
      { itemId: 'daily_sneakers', price: 55 },
      { itemId: 'comfort_shorts', price: 45 },
      { itemId: 'training_band', price: 130 },
    ],
    rotatingPool: [
      { itemId: 'morning_sneakers', price: 160 },
      { itemId: 'lucky_sneakers', price: 150 },
    ],
    rotatingCount: 1,
  },
  {
    id: 'NIGHT_MARKET',
    name: 'Night Market',
    areaId: 'NIGHT_TOWN',
    npcId: 'NOA',
    icon: '🏮',
    description: '밤에만 열리는 시장. 오늘 뭐가 나올지는 가봐야 안다.',
    nightOnly: true,
    stock: [{ itemId: 'night_ticket', price: 70 }],
    rotatingPool: [
      { itemId: 'moon_keyring', price: 240 },
      { itemId: 'star_pin', price: 260 },
      { itemId: 'lucky_keyring', price: 220 },
      { itemId: 'green_charm', price: 130 },
      { itemId: 'focus_watch', price: 150 },
      { itemId: 'lucky_cat_sticker', price: 40 },
    ],
    rotatingCount: 3,
  },
]

export function findShop(id: string): ShopDef | null {
  return SHOPS.find((s) => s.id === id) ?? null
}

export function shopInArea(areaId: string): ShopDef | null {
  return SHOPS.find((s) => s.areaId === areaId) ?? null
}

/** 지금 문을 열었는지 */
export function isShopOpen(shop: ShopDef, now: Date = new Date()): boolean {
  return !shop.nightOnly || isNightOpen(now)
}

/**
 * 오늘 이 가게에 깔린 물건.
 *
 * 늘 파는 것 + 오늘 몫으로 뽑힌 것. 날짜가 씨앗이라 하루 종일 똑같고,
 * 자정이 지나면 바뀐다.
 */
export function shopStock(shop: ShopDef, dayKey: string = todayKey()): ShopEntry[] {
  if (!shop.rotatingPool || !shop.rotatingCount) return shop.stock
  return [...shop.stock, ...pickSome(shop.rotatingPool, shop.rotatingCount, `${dayKey}:${shop.id}`)]
}

export const SHOP_ID_LIST: ShopId[] = SHOPS.map((s) => s.id)
