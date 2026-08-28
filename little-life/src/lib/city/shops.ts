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
    hours: { open: 7, close: 20 },
    name: '미나의 카페',
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
    hours: { open: 12, close: 21 },
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
    hours: { open: 6, close: 22 },
    name: '움직임 가게',
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
    name: '밤 시장',
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

/**
 * 지금 문을 열었는지.
 *
 * 밤 가게는 예전부터 자기 시간을 알고 있어서 그쪽이 먼저다.
 * 나머지는 `hours` 를 본다 — 없으면 예전처럼 늘 열려 있다.
 */
export function isShopOpen(shop: ShopDef, now: Date = new Date()): boolean {
  if (shop.nightOnly) return isNightOpen(now)
  if (!shop.hours) return true
  return withinHours(shop.hours, now.getHours())
}

function withinHours({ open, close }: { open: number; close: number }, hour: number): boolean {
  // 닫는 쪽이 더 작으면 자정을 넘긴 것이다 (21 → 5).
  return open <= close ? hour >= open && hour < close : hour >= open || hour < close
}

/**
 * 닫혀 있다면 아직인지 끝난 것인지.
 *
 * 둘을 뭉뚱그려 "닫힘" 이라고만 하면, 아침에 온 사람이 오늘은 글렀다고
 * 생각하고 돌아간다. 자정을 넘겨 여는 가게는 늘 "아직" 쪽이다 —
 * 그런 가게의 낮은 어제의 끝이 아니라 오늘 밤을 기다리는 시간이다.
 */
export type ShopStatus = 'OPEN' | 'BEFORE' | 'AFTER'

export function shopStatus(shop: ShopDef, now: Date = new Date()): ShopStatus {
  if (isShopOpen(shop, now)) return 'OPEN'
  if (shop.nightOnly || !shop.hours) return 'BEFORE'
  const { open, close } = shop.hours
  if (open > close) return 'BEFORE'
  return now.getHours() < open ? 'BEFORE' : 'AFTER'
}

/** 닫힌 가게 옆에 적는 한 줄. 나무라지 않는다. */
export function shopClosedLine(shop: ShopDef, now: Date = new Date()): string {
  return shopStatus(shop, now) === 'AFTER'
    ? '오늘 영업은 끝난 것 같다'
    : '아직 문을 열지 않은 것 같다'
}

function hourLabel(hour: number): string {
  if (hour === 0) return '자정'
  if (hour < 6) return `새벽 ${hour}시`
  if (hour < 12) return `아침 ${hour}시`
  if (hour === 12) return '낮 12시'
  if (hour < 18) return `낮 ${hour - 12}시`
  if (hour < 21) return `저녁 ${hour - 12}시`
  return `밤 ${hour - 12}시`
}

/** 이 가게가 언제 여는지 한 줄. 늘 열려 있으면 null. */
export function shopOpeningLabel(shop: ShopDef): string | null {
  if (shop.nightOnly) return '밤 9시부터 새벽 5시까지'
  if (!shop.hours) return null
  return `${hourLabel(shop.hours.open)}부터 ${hourLabel(shop.hours.close)}까지`
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
