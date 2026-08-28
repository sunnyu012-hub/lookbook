import type { CharacterSkin, SkinRarity } from '@/types'
import { seededRandom } from '@/lib/city/seed'
import { todayKey } from '@/lib/date'
import { SKINS, skinPrice } from './skins'

/**
 * 오늘 의상실에 걸린 옷.
 *
 * ── 왜 필요했는지 ──────────────────────────────────────
 *
 * 의상실이 백스무 벌을 한 번에 다 보여준다. 그래서 도감의 실루엣이
 * "아직 가게에 안 나온 옷" 이 아니라 그냥 "아직 안 눌러본 옷" 이었다 —
 * 순서대로 눌러가면 하루 만에 다 열린다.
 *
 * 매일 다섯 벌만 걸리면 다르다. 오늘 걸린 것을 보고 가면 그만큼
 * 도감이 채워지고, 나머지는 다음에 걸릴 때 채워진다.
 * 며칠에 걸쳐 천천히 차는 게 도감이다.
 *
 * ── 저장하지 않는다 ────────────────────────────────────
 *
 * 날짜가 씨앗이라 새로고침해도 그대로고 자정이 지나면 바뀐다.
 * 저장하면 기기마다 다른 진열이 남는다. 가구 가게(rotateShop)와 같은 규칙이다.
 *
 * ── 오늘 놓쳐도 손해가 아니다 ──────────────────────────
 *
 * 여기 걸리는 것은 **보여주는 일**이지 파는 자격이 아니다.
 * 값이 붙은 옷은 걸렸든 안 걸렸든 언제나 살 수 있다.
 * "오늘 안 사면 사라진다" 는 이 앱이 만들지 않기로 한 구조다.
 */

/** 하루에 몇 벌을 거는지 */
export const RACK_COUNT = 5

/**
 * 등급별 뽑힐 무게.
 *
 * 매일 있는 것은 귀한 것이 아니다. 흔한 옷이 대부분이고 귀한 옷은
 * 어쩌다 한 번 걸려야 그날이 다른 날이 된다. (rotation.ts 와 같은 생각)
 */
const WEIGHT: Record<SkinRarity, number> = {
  COMMON: 60,
  RARE: 30,
  EPIC: 10,
  LEGENDARY: 3,
  // 도감의 ??? 자리. 진열대에는 절대 안 걸린다.
  SECRET: 0,
}

/**
 * 걸릴 수 있는 옷 전체.
 *
 * 값이 붙은 것만이다 — 작은 옷장 옷과 이야기로 얻는 옷은 여기 안 건다.
 * 살 수 없는 옷을 진열해두면 그건 진열이 아니라 광고다.
 */
export function rackPool(): CharacterSkin[] {
  return SKINS.filter((s) => skinPrice(s) !== null && WEIGHT[s.rarity] > 0)
}

/** 오늘 걸린 다섯 벌. 상태와 상관없이 날짜만으로 정해진다. */
export function todayRack(dayKey: string = todayKey(), count = RACK_COUNT): CharacterSkin[] {
  const pool = [...rackPool()]
  if (pool.length <= count) return pool

  const random = seededRandom(`${dayKey}:wardrobe-rack`)
  const picked: CharacterSkin[] = []

  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const total = pool.reduce((sum, s) => sum + WEIGHT[s.rarity], 0)
    let roll = random() * total

    let index = pool.length - 1
    for (let j = 0; j < pool.length; j += 1) {
      roll -= WEIGHT[pool[j].rarity]
      if (roll <= 0) {
        index = j
        break
      }
    }
    picked.push(pool[index])
    pool.splice(index, 1)
  }

  // 걸린 순서는 뽑힌 순서가 아니라 늘 같은 순서로 — 진열대가 매번
  // 뒤섞이면 어제 본 것이 오늘도 있는지 알아보기 어렵다.
  return picked.sort((a, b) => a.sortOrder - b.sortOrder)
}

/** 이 옷이 오늘 걸려 있는지 */
export function isOnRack(id: string, dayKey: string = todayKey()): boolean {
  return todayRack(dayKey).some((s) => s.id === id)
}
