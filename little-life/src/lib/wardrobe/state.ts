import type { EquippedOutfit, WardrobeCategory, WardrobeState } from '@/types/wardrobe'
import {
  BASIC_ITEM_IDS,
  OUTFIT_SLOT,
  WARDROBE,
  defaultOutfit,
  emptyOutfit,
  findWardrobeItem,
} from './catalog'

/**
 * 옷장 상태를 다루는 순수 함수들.
 *
 * 화면은 여기 있는 것만 부르고, 규칙(원피스 충돌·기본 옷)은 전부 여기 있다.
 */

/**
 * Phase 1 에서는 있는 옷을 다 열어둔다.
 *
 * 옷 가게가 아직 없어서, 잠가두면 갈아입을 게 두 벌뿐이라
 * "옷이 제대로 갈아입혀지는가" 를 확인할 수가 없다.
 * 가게가 생기면 이 줄만 `BASIC_ITEM_IDS` 로 바꾸면 된다.
 */
export const STARTING_OWNED: string[] = WARDROBE.map((item) => item.id)

export function defaultWardrobe(): WardrobeState {
  return { owned: [...STARTING_OWNED], outfit: defaultOutfit() }
}

/** 기본 옷은 목록에 없어도 늘 가지고 있다 */
export function ownsItem(wardrobe: WardrobeState, id: string): boolean {
  return BASIC_ITEM_IDS.includes(id) || wardrobe.owned.includes(id)
}

export function ownedInCategory(wardrobe: WardrobeState, category: WardrobeCategory) {
  return WARDROBE.filter((item) => item.category === category && ownsItem(wardrobe, item.id))
}

/**
 * 한 벌 입는다. 같은 걸 다시 누르면 벗는다.
 *
 * 원피스를 입어도 상·하의 선택은 지우지 않는다 — 벗으면 그대로 돌아온다.
 * 사용자가 다시 고르게 만들면 그건 갈아입기가 아니라 숙제가 된다.
 */
export function wearItem(outfit: EquippedOutfit, id: string): EquippedOutfit {
  const item = findWardrobeItem(id)
  if (!item) return outfit

  const slot = OUTFIT_SLOT[item.category]
  return { ...outfit, [slot]: outfit[slot] === id ? null : id }
}

export function takeOff(outfit: EquippedOutfit, category: WardrobeCategory): EquippedOutfit {
  return { ...outfit, [OUTFIT_SLOT[category]]: null }
}

/** 지금 이 칸에 입고 있는 것 */
export function wornIn(outfit: EquippedOutfit, category: WardrobeCategory): string | null {
  return outfit[OUTFIT_SLOT[category]]
}

/**
 * 원피스에 가려 지금 안 보이는 칸인지.
 *
 * 선택은 살아 있고 그림만 안 보이는 상태다. 옷장에서 흐리게 보여준다.
 */
export function hiddenByOnePiece(outfit: EquippedOutfit, category: WardrobeCategory): boolean {
  if (!outfit.onePieceId) return false
  return category === 'TOP' || category === 'BOTTOM'
}

/**
 * 벗겨두면 안 되는 자리를 채운다.
 *
 * **처음 시작할 때와 옷장이 없던 세이브를 올릴 때만 쓴다.**
 * 갈아입을 때마다 부르면 "벗기" 가 먹지 않는다 — 벗는 순간 다시 입혀지니까.
 *
 * 베이스가 러닝과 반바지를 입고 있어서, 다 벗어도 알몸이 되지는 않는다.
 * 그건 사용자가 그러기로 한 것이고, 앱이 되돌릴 일이 아니다.
 */
export function dressed(outfit: EquippedOutfit): EquippedOutfit {
  if (outfit.onePieceId || outfit.topId || outfit.bottomId) return outfit
  return { ...outfit, ...defaultOutfit() }
}

/**
 * 가진 것 중에서 아무렇게나 한 벌.
 *
 * 원피스가 뽑히면 상·하의는 건드리지 않는다. 어차피 가려지고,
 * 원피스를 벗었을 때 입고 있던 게 돌아와야 한다.
 */
export function randomOutfit(
  wardrobe: WardrobeState,
  random: () => number = Math.random,
): EquippedOutfit {
  const pick = (category: WardrobeCategory): string | null => {
    const pool = ownedInCategory(wardrobe, category)
    if (pool.length === 0) return null
    return pool[Math.floor(random() * pool.length) % pool.length].id
  }

  const onePiece = pick('ONE_PIECE')
  // 원피스는 가끔만. 매번 나오면 상·하의를 고른 보람이 없다.
  const wearsOnePiece = onePiece !== null && random() < 0.25

  return {
    ...wardrobe.outfit,
    onePieceId: wearsOnePiece ? onePiece : null,
    topId: pick('TOP') ?? wardrobe.outfit.topId,
    bottomId: pick('BOTTOM') ?? wardrobe.outfit.bottomId,
    shoesId: pick('SHOES') ?? wardrobe.outfit.shoesId,
  }
}

/** 저장된 값 다듬기. 없는 옷 id 는 조용히 비운다. */
export function sanitizeWardrobe(raw: unknown): WardrobeState {
  // 옷장이 아예 없던 세이브 — 여기서만 기본 한 벌을 입혀준다
  if (!raw || typeof raw !== 'object') return defaultWardrobe()
  const source = raw as Record<string, unknown>

  const owned = Array.isArray(source.owned)
    ? [...new Set(source.owned.filter((v): v is string => typeof v === 'string'))].filter((id) =>
        findWardrobeItem(id),
      )
    : [...STARTING_OWNED]

  const savedOutfit = (source.outfit ?? {}) as Record<string, unknown>
  const outfit = emptyOutfit()
  for (const key of Object.keys(outfit) as (keyof EquippedOutfit)[]) {
    const value = savedOutfit[key]
    // 없어진 옷이 슬롯에 남아 있으면 비운다. 그대로 두면 매번 깨진 그림을 부른다.
    outfit[key] = typeof value === 'string' && findWardrobeItem(value) ? value : null
  }

  // 저장된 대로 둔다. 벗어둔 것을 열 때마다 다시 입히지 않는다.
  return { owned, outfit }
}
