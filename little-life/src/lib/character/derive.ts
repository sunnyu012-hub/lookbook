import type { AppState, CharacterSkin, SkinId } from '@/types'
import { SKINS, conditionsMet, findSkin, newlyUnlocked, skinPrice } from './skins'

/**
 * 조건을 채운 모습을 손에 넣어준다.
 *
 * ── 여기서 보상 계산을 하지 않는다 ─────────────────────
 *
 * 모습에는 EXP 도 코인도 스탯도 없다. 그래서 이 함수가 하는 일은
 * 목록에 id 를 하나 더하는 것뿐이다. 퀘스트 보상 계산에 끼어들지 않는다.
 *
 * ── 자동으로 갈아입히지 않는다 ─────────────────────────
 *
 * 새 모습을 얻었다고 지금 입고 있는 걸 바꾸면, 아침에 열었더니
 * 내가 고른 적 없는 모습이 서 있는 일이 생긴다. 고르는 건 사람이 한다.
 */

export interface SkinUnlockResult {
  state: AppState
  /** 이번에 새로 손에 들어온 것 */
  unlocked: CharacterSkin[]
}

export function applySkinUnlocks(state: AppState): SkinUnlockResult {
  const unlocked = newlyUnlocked(state)
  if (unlocked.length === 0) return { state, unlocked: [] }

  return {
    state: {
      ...state,
      user: {
        ...state.user,
        ownedSkinIds: [...state.user.ownedSkinIds, ...unlocked.map((s) => s.id)],
      },
    },
    unlocked,
  }
}

export type BuySkinResult =
  | { ok: true; skin: CharacterSkin; price: number }
  | {
      ok: false
      reason: 'NOT_FOR_SALE' | 'NOT_YET' | 'ALREADY_OWNED' | 'NOT_ENOUGH_COINS' | 'UNKNOWN'
    }

/**
 * 코인으로 하나 데려온다.
 *
 * 가게 진열과 섞지 않는다 — 가구 가게에 캐릭터 모습이 끼어 있으면
 * 둘 다 찾기 어려워진다. 여기서는 모습 화면 안에서 바로 산다.
 */
export function buySkin(state: AppState, id: string): { state: AppState; result: BuySkinResult } {
  const def = findSkin(id)
  if (!def) return { state, result: { ok: false, reason: 'UNKNOWN' } }

  const price = skinPrice(def)
  if (price === null) return { state, result: { ok: false, reason: 'NOT_FOR_SALE' } }
  if (state.user.ownedSkinIds.includes(def.id)) {
    return { state, result: { ok: false, reason: 'ALREADY_OWNED' } }
  }
  // 값이 붙어 있어도 조건을 먼저 채워야 한다.
  // June 이 안쪽에서 꺼내주는 옷은 아무한테나 꺼내주지 않는다.
  if (!conditionsMet(state, def.unlock)) {
    return { state, result: { ok: false, reason: 'NOT_YET' } }
  }

  if (state.user.coins < price) {
    return { state, result: { ok: false, reason: 'NOT_ENOUGH_COINS' } }
  }

  return {
    state: {
      ...state,
      user: {
        ...state.user,
        coins: state.user.coins - price,
        ownedSkinIds: [...state.user.ownedSkinIds, def.id],
      },
    },
    result: { ok: true, skin: def, price },
  }
}

/**
 * 입는다.
 *
 * 안 가진 것은 입을 수 없다. 화면에서도 막고 있지만, 저장된 값이
 * 이상해졌을 때 여기서 한 번 더 걸러야 빈 자리가 안 생긴다.
 */
export function wearSkin(state: AppState, id: string): AppState {
  if (!state.user.ownedSkinIds.includes(id as SkinId)) return state
  if (state.user.selectedSkinId === id) return state
  return { ...state, user: { ...state.user, selectedSkinId: id as SkinId } }
}

/**
 * 개발용 — 전부 지급.
 *
 * 조건을 하나하나 채워보지 않고도 스물넷을 화면에서 확인하려고 둔다.
 * 화면 어디에도 부르는 길이 없다 (?dev=skins 갤러리에서만).
 */
export function grantAllSkins(state: AppState): AppState {
  return {
    ...state,
    user: { ...state.user, ownedSkinIds: SKINS.map((s) => s.id) },
  }
}

/** 도감에 보여줄 진행률 */
export function skinCollectionProgress(state: AppState): { found: number; total: number } {
  return {
    found: SKINS.filter((s) => state.user.ownedSkinIds.includes(s.id)).length,
    total: SKINS.length,
  }
}
