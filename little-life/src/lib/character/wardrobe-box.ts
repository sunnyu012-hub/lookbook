import type { AppState, CharacterSkin, SkinGachaPoolId, SkinId } from '@/types'
import { SKIN_GACHA_POOL_IDS } from '@/types'
import { skinsInPool } from './skins'
import { packByPool, type SkinPackDef } from './packs'

/**
 * 작은 옷장.
 *
 * ── 확률표가 아니라 수집 상자다 ────────────────────────
 *
 * 열면 **아직 없는 옷** 중에서만 하나 나온다. 이미 가진 옷이 또 나오는
 * 일이 없다. 그래서 조각도, 별가루도, 천장도, 보상 교환도 필요 없다 —
 * 그런 것들은 전부 "중복이 나온다" 는 문제를 덮으려고 있는 장치다.
 *
 * 한 묶음이 열두 벌이라 최대 열두 번이면 그 옷장은 다 본다. 그게 맞다.
 * 여기서 오래 붙잡아두는 게 목적이 아니다.
 *
 * ── 실패가 없다 ────────────────────────────────────────
 *
 * 코인을 냈으면 반드시 옷 한 벌이다. 꽝도, 빈 상자도, 낮은 확률도 없다.
 * 코인은 현실에서 뭔가 해야만 생기는 거라, 그걸 걸고 지는 판을 만들지 않는다.
 *
 * ── 저장하지 않는다 ────────────────────────────────────
 *
 * 뽑은 결과는 `ownedSkinIds` 에 그대로 들어간다. 몇 벌 모았는지 ·
 * 다 봤는지 · 뭐가 남았는지는 전부 거기서 그때그때 센다.
 */

/**
 * 한 번 열어보는 값.
 *
 * 퀘스트 하나가 쉬움 40 · 보통 80 · 어려움 160 코인이라, 보통 네 개쯤
 * 하면 한 번 열린다. 의상실에서 원하는 옷을 바로 사는 값이 480 이라
 * 그보다는 싸야 한다 — 무엇이 나올지 모르는 쪽이 더 비싸면 아무도
 * 안 연다. 대신 너무 싸게 두면 코인이 남아돌 때 의미 없이 눌러보는
 * 버튼이 된다.
 */
export const WARDROBE_BOX_PRICE = 320

export interface WardrobeBoxView {
  poolId: SkinGachaPoolId
  pack: SkinPackDef
  /** 이 묶음 열두 벌 (순서 그대로) */
  skins: CharacterSkin[]
  found: number
  total: number
  /** 아직 없는 옷들 — 다음에 나올 수 있는 것 전부 */
  remaining: CharacterSkin[]
  /** 열두 벌을 다 본 옷장 */
  complete: boolean
}

export type WardrobeBoxDrawResult =
  | { ok: true; skin: CharacterSkin }
  | { ok: false; reason: 'UNKNOWN_POOL' | 'COMPLETE' | 'NOT_ENOUGH_COINS' | 'BUSY' }

/** 옷장 하나가 지금 어떤 상태인지. 전부 계산이고 저장은 없다. */
export function wardrobeBoxView(state: AppState, poolId: SkinGachaPoolId): WardrobeBoxView | null {
  const pack = packByPool(poolId)
  if (!pack) return null

  const skins = skinsInPool(poolId)
  const owned = new Set<string>(state.user.ownedSkinIds)
  const remaining = skins.filter((s) => !owned.has(s.id))

  return {
    poolId,
    pack,
    skins,
    found: skins.length - remaining.length,
    total: skins.length,
    remaining,
    complete: remaining.length === 0,
  }
}

export function wardrobeBoxViews(state: AppState): WardrobeBoxView[] {
  return SKIN_GACHA_POOL_IDS.map((id) => wardrobeBoxView(state, id)).filter(
    (v): v is WardrobeBoxView => v !== null,
  )
}

/**
 * 한 번 열어본다.
 *
 * 순서를 지킨다 — 옷장이 남았는지 · 코인이 되는지를 **먼저** 보고,
 * 그다음에 뽑고, 그다음에 코인을 빼고 옷을 넣는다. 하나라도 안 되면
 * 상태를 그대로 돌려준다. 반쯤 진행된 결과가 남지 않는다.
 *
 * 무작위를 밖에서 받는다. 화면이 `Math.random()` 을 직접 부르면
 * 그 순간부터 이 판정은 테스트할 수 없는 코드가 된다.
 *
 * 날짜로 굳히지 않는 이유: 같은 날 두 번 열었는데 같은 옷이 나오면
 * 그건 고장난 것처럼 보인다. 여기는 매번 새로 뽑는 게 맞다.
 */
export function drawFromWardrobeBox(
  state: AppState,
  poolId: SkinGachaPoolId,
  random: () => number = Math.random,
): { state: AppState; result: WardrobeBoxDrawResult } {
  const view = wardrobeBoxView(state, poolId)
  if (!view) return { state, result: { ok: false, reason: 'UNKNOWN_POOL' } }
  if (view.complete) return { state, result: { ok: false, reason: 'COMPLETE' } }
  if (state.user.coins < WARDROBE_BOX_PRICE) {
    return { state, result: { ok: false, reason: 'NOT_ENOUGH_COINS' } }
  }

  // 남은 것 중에서 고르게 뽑는다. 등급으로 무게를 주지 않는다 —
  // 어차피 열두 벌을 다 모으게 되어 있어서, 무게는 순서만 바꾼다.
  const index = Math.min(view.remaining.length - 1, Math.floor(random() * view.remaining.length))
  const skin = view.remaining[Math.max(0, index)]

  return {
    state: {
      ...state,
      user: {
        ...state.user,
        coins: state.user.coins - WARDROBE_BOX_PRICE,
        ownedSkinIds: [...state.user.ownedSkinIds, skin.id as SkinId],
      },
    },
    result: { ok: true, skin },
  }
}
