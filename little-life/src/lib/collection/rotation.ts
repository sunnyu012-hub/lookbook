import type {
  CollectionItemDef,
  CollectionRarity,
  CollectionShopDef,
  CollectionShopId,
} from '@/types'
import { seededRandom } from '@/lib/city/seed'
import { findCollectionItem } from './catalog'

/**
 * 오늘 무엇이 깔릴지 정하는 규칙.
 *
 * 예전에는 가게 목록에서 그냥 아무거나 N개를 뽑았다. 그래서 이안의 빈티지에서는
 * 다섯 칸 중 한 칸이 늘 전설품이었고, 취미 코너는 네 칸 중 하나가 EPIC 이었다.
 * 매일 있는 것은 귀한 것이 아니다. 그러면 들여다볼 이유가 없어진다.
 *
 * 그래서 등급마다 뽑힐 무게를 다르게 준다.
 * 흔한 것은 늘 있어서 그 가게를 그 가게로 만들고,
 * 귀한 것은 어쩌다 한 번 있어서 그날이 다른 날이 된다.
 */

/** 등급별 기본 무게. 합이 100 이라 그대로 퍼센트로 읽으면 된다. */
export const BASE_WEIGHTS: Record<CollectionRarity, number> = {
  COMMON: 60,
  RARE: 28,
  EPIC: 10,
  LEGENDARY: 2,
  // 도감의 ??? 자리. 가게에는 절대 나오지 않는다.
  SECRET: 0,
}

/**
 * 가게마다 다른 결.
 *
 * 기본 무게에 곱한다. 모든 가게가 같은 확률표를 쓰면
 * 이름과 아이콘만 다른 여덟 개의 같은 가게가 된다.
 */
const SHOP_TILT: Partial<Record<CollectionShopId, Partial<Record<CollectionRarity, number>>>> = {
  // 정돈된 가구점. 늘 비슷한 것이 있고 그게 이 가게의 미덕이다.
  HOME_ATELIER: { COMMON: 1.2, EPIC: 0.7, LEGENDARY: 0.5 },
  // 생활용품. 귀한 컵 같은 건 별로 없다.
  TINY_MARKET: { COMMON: 1.4, RARE: 0.7, EPIC: 0.3 },
  GREEN_HOUSE: { COMMON: 1.1 },
  PAPER_MOON: { COMMON: 1.2, EPIC: 0.6 },
  HOBBY_CORNER: { RARE: 1.2, EPIC: 0.8 },
  // 소량 희귀. 다섯 칸뿐이라 그중 한둘은 볼 만해야 한다.
  JUNE_VINTAGE: { COMMON: 0.6, RARE: 1.6, EPIC: 2.2, LEGENDARY: 3 },
  // 남이 쓰던 것들. 흔한 것 사이에 가끔 이상한 게 섞인다.
  FLEA_MARKET: { COMMON: 1.1, RARE: 1.3 },
  // 밤에만 여는 가판. 여기서만 보는 것들이 있다.
  MOON_STALL: { COMMON: 0.5, RARE: 1.3, EPIC: 2.5, LEGENDARY: 2 },
}

/**
 * 귀한 것을 보려면 몇 레벨이어야 하는지.
 *
 * 시작하자마자 전설품이 진열대에 있으면, 살 수 없으니 그냥 벽지가 된다.
 * 나중에 열리면 레벨이 오른 게 눈에 보인다.
 * 흔한 것에는 조건을 걸지 않는다 — 첫날에도 살 것이 충분해야 한다.
 */
const RARITY_LEVEL_GATE: Partial<Record<CollectionRarity, number>> = {
  EPIC: 4,
  LEGENDARY: 8,
}

/** 평판 단계별로 붙는 것 (1~5) */
export interface ShopBonus {
  /** 슬롯이 몇 칸 더 늘어나는지 */
  extraSlots: number
  /** 귀한 것을 몇 칸 더 보장하는지 */
  extraRare: number
  /** RARE 이상 무게에 곱하는 값 */
  rareBoost: number
  /** 전설품 무게에 곱하는 값 */
  legendBoost: number
}

/**
 * 자주 오는 사람에게 조금 더.
 *
 * 단계마다 하나씩만 는다. 한꺼번에 세게 붙이면
 * 평판 낮은 동네의 가게가 볼 것 없는 가게가 된다.
 */
export function shopBonus(reputationLevel: number): ShopBonus {
  return {
    extraSlots: reputationLevel >= 3 ? 1 : 0,
    extraRare: reputationLevel >= 4 ? 1 : 0,
    rareBoost: reputationLevel >= 2 ? 1.4 : 1,
    legendBoost: reputationLevel >= 5 ? 2 : 1,
  }
}

interface PickContext {
  shop: CollectionShopDef
  playerLevel: number
  bonus: ShopBonus
  /** 후보 안에 등급마다 몇 개가 있는지 */
  countByRarity: Record<string, number>
}

/** 이 물건이 오늘 진열대에 오를 수 있는지 */
export function isEligible(def: CollectionItemDef, ctx: PickContext): boolean {
  if (!def.price) return false
  if (def.rarity === 'SECRET') return false

  const gate = RARITY_LEVEL_GATE[def.rarity]
  if (gate !== undefined && ctx.playerLevel < gate) return false

  return true
}

/**
 * 이 물건이 뽑힐 무게.
 *
 * 무게는 등급 전체에 주는 몫이지 한 물건에 주는 몫이 아니다.
 * 그래서 그 등급에 몇 개가 있는지로 나눠준다 —
 * 안 그러면 전설품이 세 개인 가게에서는 전설품 몫이 저절로 세 배가 된다.
 * (이안의 빈티지가 다섯 칸 중 한 칸을 늘 전설품으로 채우던 이유가 이거였다)
 */
function weightOf(def: CollectionItemDef, ctx: PickContext): number {
  const tilt = SHOP_TILT[ctx.shop.id]?.[def.rarity] ?? 1
  const siblings = ctx.countByRarity[def.rarity] ?? 1
  let w = (BASE_WEIGHTS[def.rarity] * tilt) / siblings

  if (def.rarity !== 'COMMON') w *= ctx.bonus.rareBoost
  if (def.rarity === 'LEGENDARY') w *= ctx.bonus.legendBoost

  return w
}

/**
 * 무게를 두고 겹치지 않게 n 개 뽑는다.
 *
 * 뽑을 때마다 남은 것의 무게를 다시 더한다.
 * 같은 씨앗이면 늘 같은 결과가 나온다 — 새로고침해도 진열이 그대로여야 하니까.
 */
function pickWeighted<T>(items: T[], count: number, seed: string, weight: (item: T) => number): T[] {
  const pool = items.filter((item) => weight(item) > 0)
  if (count >= pool.length) return pool

  const random = seededRandom(seed)
  const picked: T[] = []

  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const total = pool.reduce((sum, item) => sum + weight(item), 0)
    let roll = random() * total

    let index = pool.length - 1
    for (let j = 0; j < pool.length; j += 1) {
      roll -= weight(pool[j])
      if (roll <= 0) {
        index = j
        break
      }
    }
    picked.push(pool[index])
    pool.splice(index, 1)
  }
  return picked
}

const RARITY_ORDER: CollectionRarity[] = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'SECRET']

/** 등급을 숫자로. 클수록 귀하다. */
export function rarityRank(rarity: CollectionRarity): number {
  return RARITY_ORDER.indexOf(rarity)
}

export interface RotationOptions {
  /** 이 지역 평판 단계 (1~5) */
  reputationLevel?: number
  playerLevel?: number
}

/**
 * 오늘 이 가게에 깔릴 물건들.
 *
 * 날짜와 가게 이름만 있으면 나온다. 저장하지 않는다.
 * 같은 날이면 몇 번을 열어도 같고, 자정이 지나면 저절로 바뀐다.
 */
export function rotateShop(
  shop: CollectionShopDef,
  dayKey: string,
  options: RotationOptions = {},
): string[] {
  const ctx: PickContext = {
    shop,
    playerLevel: options.playerLevel ?? 99,
    bonus: shopBonus(options.reputationLevel ?? 1),
    countByRarity: {},
  }

  const pool = shop.catalog
    .map((id) => findCollectionItem(id))
    .filter((def): def is CollectionItemDef => def !== null && isEligible(def, ctx))

  if (pool.length === 0) return []

  for (const def of pool) {
    ctx.countByRarity[def.rarity] = (ctx.countByRarity[def.rarity] ?? 0) + 1
  }

  const random = seededRandom(`${dayKey}:${shop.id}:count`)
  const span = shop.maxCount - shop.minCount + 1
  const slots = shop.minCount + Math.floor(random() * span) + ctx.bonus.extraSlots

  const picked = pickWeighted(pool, slots, `${dayKey}:${shop.id}`, (def) => weightOf(def, ctx))

  return fillRareSlots(picked, pool, shop, dayKey, ctx).map((def) => def.id)
}

/**
 * 귀한 칸 채우기.
 *
 * 이안의 빈티지에 오늘 흔한 것만 다섯 개 깔리면 그건 그냥 잡화점이다.
 * 무게만으로 뽑으면 그런 날이 생기니까, 가게가 약속한 만큼은 채워 넣는다.
 * 대신 제일 흔한 칸을 내주고 바꾼다 — 칸 수가 늘어나면 안 된다.
 */
function fillRareSlots(
  picked: CollectionItemDef[],
  pool: CollectionItemDef[],
  shop: CollectionShopDef,
  dayKey: string,
  ctx: PickContext,
): CollectionItemDef[] {
  const want = (shop.guaranteedRare ?? 0) + ctx.bonus.extraRare
  if (want === 0) return picked

  const isRare = (def: CollectionItemDef) => rarityRank(def.rarity) >= rarityRank('RARE')
  const have = picked.filter(isRare).length
  const short = want - have
  if (short <= 0) return picked

  const rest = pool.filter((def) => isRare(def) && !picked.includes(def))
  const extra = pickWeighted(rest, short, `${dayKey}:${shop.id}:rare`, (def) => weightOf(def, ctx))
  if (extra.length === 0) return picked

  // 흔한 것부터 자리를 내준다. 같은 등급이면 뒤에 뽑힌 것부터.
  const out = [...picked]
  for (const add of extra) {
    let victim = -1
    for (let i = out.length - 1; i >= 0; i -= 1) {
      if (isRare(out[i])) continue
      if (victim === -1 || rarityRank(out[i].rarity) < rarityRank(out[victim].rarity)) victim = i
    }
    if (victim === -1) break
    out[victim] = add
  }
  return out
}

/**
 * 하루에 몇 개나 들어왔는지.
 *
 * 무한 재고면 품절이 없고, 품절이 없으면 "오늘 사둘까" 하는 순간이 없다.
 * 그렇다고 흔한 컵이 하루 한 개면 그건 불편일 뿐이다.
 */
export function dailyStock(def: CollectionItemDef, shop: CollectionShopDef): number {
  if (def.unique) return 1
  if (def.rarity === 'EPIC' || def.rarity === 'LEGENDARY') return 1
  // 남이 쓰던 것은 하나씩만 있다
  if (shop.id === 'JUNE_VINTAGE') return 1
  if (def.category === 'MATERIAL' || def.category === 'FOOD') return 5
  return 3
}
