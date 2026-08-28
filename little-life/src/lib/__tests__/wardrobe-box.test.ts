import { describe, expect, it } from 'vitest'
import type { AppState, SkinGachaPoolId, SkinId } from '@/types'
import { SKIN_GACHA_POOL_IDS } from '@/types'
import { SKINS, skinsInPool } from '@/lib/character/skins'
import {
  WARDROBE_BOX_PRICE,
  drawFromWardrobeBox,
  wardrobeBoxView,
  wardrobeBoxViews,
} from '@/lib/character/wardrobe-box'
import { createDefaultState } from '@/store/defaultState'

function rich(coins = 100_000): AppState {
  const state = createDefaultState()
  return { ...state, user: { ...state.user, coins } }
}

/** 늘 첫 번째를 고르는 무작위 — 결과를 눈으로 따라갈 수 있게 */
const first = () => 0
/** 늘 마지막을 고르는 무작위 — 경계에서 벗어나는지 본다 */
const last = () => 0.999999

describe('A 옷장 묶음', () => {
  it('A1 네 칸 · 칸마다 열두 벌 · 모두 마흔여덟', () => {
    expect(SKIN_GACHA_POOL_IDS).toHaveLength(4)

    const all: string[] = []
    for (const poolId of SKIN_GACHA_POOL_IDS) {
      const skins = skinsInPool(poolId)
      expect(skins, poolId).toHaveLength(12)
      all.push(...skins.map((s) => s.id))
    }

    expect(all).toHaveLength(48)
    expect(new Set(all).size).toBe(48)
  })

  it('A2 의상실에서 파는 옷이나 예전 옷이 섞여 있지 않다', () => {
    for (const poolId of SKIN_GACHA_POOL_IDS) {
      for (const skin of skinsInPool(poolId)) {
        expect(skin.acquisition, skin.id).toBe('GACHA')
        expect(skin.unlock.kind, skin.id).toBe('GACHA')
      }
    }
    // 반대쪽도 본다 — 작은 옷장 옷은 이 마흔여덟 벌이 전부다
    expect(SKINS.filter((s) => s.acquisition === 'GACHA')).toHaveLength(48)
  })

  it('A3 처음에는 아무것도 안 가졌고 다 남아 있다', () => {
    for (const view of wardrobeBoxViews(createDefaultState())) {
      expect(view.found).toBe(0)
      expect(view.remaining).toHaveLength(12)
      expect(view.complete).toBe(false)
    }
  })
})

describe('B 한 번 열기', () => {
  it('B1 코인은 정확히 값만큼 빠지고 옷은 정확히 한 벌 는다', () => {
    const before = rich(1000)
    const { state, result } = drawFromWardrobeBox(before, 'PACK_4', first)

    expect(result.ok).toBe(true)
    expect(state.user.coins).toBe(1000 - WARDROBE_BOX_PRICE)
    expect(state.user.ownedSkinIds).toHaveLength(before.user.ownedSkinIds.length + 1)
  })

  it('B2 나온 옷은 고른 칸에 든 옷이다', () => {
    const { result } = drawFromWardrobeBox(rich(), 'PACK_8', first)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(skinsInPool('PACK_8').map((s) => s.id)).toContain(result.skin.id)
  })

  it('B3 무작위가 끝값을 줘도 목록 밖으로 안 나간다', () => {
    const { result } = drawFromWardrobeBox(rich(), 'PACK_6', last)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.skin.id).toBe(skinsInPool('PACK_6')[11].id)
  })

  it('B4 없는 칸을 열면 아무 일도 안 일어난다', () => {
    const before = rich()
    const { state, result } = drawFromWardrobeBox(before, 'PACK_99' as SkinGachaPoolId, first)
    expect(result).toEqual({ ok: false, reason: 'UNKNOWN_POOL' })
    expect(state).toBe(before)
  })
})

describe('C 같은 옷이 두 번 나오지 않는다', () => {
  it('C1 열두 번이면 그 칸이 다 찬다 — 중복 없음', () => {
    let state = rich()
    const got: SkinId[] = []

    for (let i = 0; i < 12; i += 1) {
      const draw = drawFromWardrobeBox(state, 'PACK_10', Math.random)
      expect(draw.result.ok, `${i}번째`).toBe(true)
      if (!draw.result.ok) return
      got.push(draw.result.skin.id as SkinId)
      state = draw.state
    }

    expect(new Set(got).size).toBe(12)
    expect(new Set(got)).toEqual(new Set(skinsInPool('PACK_10').map((s) => s.id)))
  })

  it('C2 다 본 칸은 코인을 안 먹는다', () => {
    let state = rich()
    for (let i = 0; i < 12; i += 1) {
      state = drawFromWardrobeBox(state, 'PACK_4', Math.random).state
    }

    const before = state
    const { state: after, result } = drawFromWardrobeBox(before, 'PACK_4', first)

    expect(result).toEqual({ ok: false, reason: 'COMPLETE' })
    expect(after).toBe(before)
    expect(wardrobeBoxView(after, 'PACK_4')?.complete).toBe(true)
    expect(wardrobeBoxView(after, 'PACK_4')?.found).toBe(12)
  })

  it('C3 한 칸을 다 채워도 다른 칸은 그대로 남아 있다', () => {
    let state = rich()
    for (let i = 0; i < 12; i += 1) {
      state = drawFromWardrobeBox(state, 'PACK_4', Math.random).state
    }
    expect(wardrobeBoxView(state, 'PACK_6')?.found).toBe(0)
    expect(wardrobeBoxView(state, 'PACK_6')?.complete).toBe(false)
  })
})

describe('D 코인이 모자랄 때', () => {
  it('D1 한 코인이 모자라면 열리지 않는다', () => {
    const before = rich(WARDROBE_BOX_PRICE - 1)
    const { state, result } = drawFromWardrobeBox(before, 'PACK_4', first)

    expect(result).toEqual({ ok: false, reason: 'NOT_ENOUGH_COINS' })
    // 코인도 옷도 그대로다
    expect(state).toBe(before)
  })

  it('D2 딱 맞으면 열리고 코인이 0 이 된다', () => {
    const { state, result } = drawFromWardrobeBox(rich(WARDROBE_BOX_PRICE), 'PACK_4', first)
    expect(result.ok).toBe(true)
    expect(state.user.coins).toBe(0)
  })
})

describe('E 값', () => {
  it('E1 의상실에서 원하는 옷을 바로 사는 것보다 싸다', () => {
    // 무엇이 나올지 모르는 쪽이 더 비싸면 아무도 안 연다
    expect(WARDROBE_BOX_PRICE).toBeLessThan(480)
  })

  it('E2 퀘스트 몇 개는 해야 한 번 열린다', () => {
    // 보통(80) 네 개. 쉬움(40) 하나로 열리면 그건 버튼이지 기대가 아니다
    expect(WARDROBE_BOX_PRICE / 80).toBeGreaterThanOrEqual(3)
    expect(WARDROBE_BOX_PRICE / 40).toBeGreaterThanOrEqual(5)
  })
})

describe('F 저장에 새로 만드는 게 없다', () => {
  it('F1 뽑은 결과는 ownedSkinIds 와 coins 에만 남는다', () => {
    const before = rich()
    const { state: after } = drawFromWardrobeBox(before, 'PACK_4', first)

    const beforeKeys = Object.keys(before.user).sort()
    const afterKeys = Object.keys(after.user).sort()
    expect(afterKeys).toEqual(beforeKeys)

    // user 안에서 달라진 건 둘뿐이다
    const read = (user: AppState['user'], key: string) =>
      JSON.stringify((user as unknown as Record<string, unknown>)[key])
    const changed = beforeKeys.filter((k) => read(before.user, k) !== read(after.user, k))
    expect(changed.sort()).toEqual(['coins', 'ownedSkinIds'])
  })

  it('F2 user 말고는 아무 데도 안 건드린다', () => {
    const before = rich()
    const { state: after } = drawFromWardrobeBox(before, 'PACK_4', first)
    for (const key of Object.keys(before) as (keyof AppState)[]) {
      if (key === 'user') continue
      expect(after[key], key).toBe(before[key])
    }
  })
})
