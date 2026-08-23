import type { AppState, CollectionItemDef, CollectionState } from '@/types'
import { seededRandom } from '@/lib/city/seed'
import { todayKey } from '@/lib/date'
import { CATALOG, findCollectionItem } from './catalog'
import { isDiscovered } from './progress'
import { rarityRank } from './rotation'

/**
 * 특별 배송.
 *
 * 어떤 날은 아무것도 안 하고 열었는데 문 앞에 뭐가 와 있다.
 * 사는 것도 아니고 퀘스트로 받는 것도 아니라서, 이 앱에서 유일하게
 * 아무 대가 없이 오는 것이다. 그래서 자주 오면 안 된다 —
 * 매일 오면 그건 배송이 아니라 출석 보상이고, 안 받으면 손해가 된다.
 *
 * 올지 안 올지는 날짜에서 계산한다. 저장하는 건 "받았다" 뿐이다.
 */

/** 하루에 올 확률 */
const DELIVERY_CHANCE = 0.18

/**
 * 며칠은 지나야 다시 온다.
 *
 * 확률만 두면 이틀 연속으로 오는 날이 생긴다. 그러면 귀함이 옅어진다.
 */
const COOLDOWN_DAYS = 3

export interface Delivery {
  dayKey: string
  itemId: string
  /** 보낸 사람 한 줄. 누가 보냈는지는 매번 다르다. */
  from: string
}

const SENDERS = [
  '이름 없는 상자',
  '준의 빈티지에서',
  '달빛 가판에서',
  '누가 두고 갔는지 모르는 상자',
  '초록 온실에서',
]

/** 그날 배송이 뜨는지 (받았는지는 안 본다) */
function rollsOn(dayKey: string): boolean {
  return seededRandom(`${dayKey}:delivery`)() < DELIVERY_CHANCE
}

/**
 * 오늘 배송이 오는지.
 *
 * 앞의 며칠에 이미 왔으면 오늘은 안 온다.
 * 확률만으로는 몰아서 오는 날이 생긴다.
 */
export function deliveryDueOn(dayKey: string): boolean {
  if (!rollsOn(dayKey)) return false

  const date = new Date(`${dayKey}T00:00:00`)
  for (let back = 1; back <= COOLDOWN_DAYS; back += 1) {
    const prev = new Date(date)
    prev.setDate(date.getDate() - back)
    if (rollsOn(prev.toISOString().slice(0, 10))) return false
  }
  return true
}

/**
 * 무엇이 올 수 있는지.
 *
 * RARE·EPIC 중에서, 아직 도감에 없는 것을 먼저 본다 —
 * 이미 가진 것이 또 오면 그건 그냥 숫자다.
 * 다 가졌으면 그때는 아무거나 귀한 것.
 * 전설품은 보내지 않는다. 그건 찾아가서 만나야 하는 것이다.
 */
function eligible(state: AppState): CollectionItemDef[] {
  const pool = CATALOG.filter((item) => {
    const rank = rarityRank(item.rarity)
    if (rank < rarityRank('RARE') || rank > rarityRank('EPIC')) return false
    // 하나뿐인 물건과 트로피는 배송으로 오지 않는다
    if (item.unique) return false
    if (item.category === 'TROPHY') return false
    // 도감에서 감추기로 한 것도 이런 식으로 새어 나오면 안 된다
    if (item.hiddenUntilDiscovered) return false
    return true
  })

  const fresh = pool.filter((item) => !isDiscovered(state.collection, item.id))
  return fresh.length > 0 ? fresh : pool
}

/**
 * 오늘 온 배송. 없으면 null.
 *
 * 이미 받았어도 같은 값을 돌려준다 — 받았는지는 claimedDeliveries 로 따로 본다.
 */
export function todaysDelivery(state: AppState, dayKey: string = todayKey()): Delivery | null {
  if (!deliveryDueOn(dayKey)) return null

  const pool = eligible(state)
  if (pool.length === 0) return null

  const random = seededRandom(`${dayKey}:delivery:item`)
  const item = pool[Math.floor(random() * pool.length) % pool.length]
  const from = SENDERS[Math.floor(random() * SENDERS.length) % SENDERS.length]

  return { dayKey, itemId: item.id, from }
}

export function isDeliveryClaimed(c: CollectionState, dayKey: string): boolean {
  return c.claimedDeliveries.includes(dayKey)
}

/** 아직 안 받은 오늘의 배송 */
export function pendingDelivery(state: AppState, dayKey: string = todayKey()): Delivery | null {
  const delivery = todaysDelivery(state, dayKey)
  if (!delivery) return null
  return isDeliveryClaimed(state.collection, dayKey) ? null : delivery
}

/** 화면에 보여줄 한 줄 */
export function deliveryLine(delivery: Delivery): string {
  const item = findCollectionItem(delivery.itemId)
  return item ? `${delivery.from} — ${item.nameKo}` : delivery.from
}
