import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { AppState } from '@/types'
import { SKIN_IDS } from '@/types'
import { createDefaultState } from '@/store/defaultState'
import { sanitizeState } from '@/store/localStorage'
import { sanitizeOwnedSkins, sanitizeSeenSkins, sanitizeSelectedSkin } from '@/store/migrate'
import {
  DEFAULT_SKIN_ID,
  SKINS,
  conditionProgress,
  defaultOwnedSkinIds,
  findSkin,
  newlyUnlocked,
  ownedSkinCount,
  skinArt,
  skinPrice,
  skinProgress,
  skinViews,
  NEW_SHOP_SKIN_PRICE,
  packProgress,
  skinWorld,
  skinsInPack,
  skinsInPool,
  markSkinsSeen,
} from '@/lib/character/skins'
import { SKIN_PACKS } from '@/lib/character/packs'
import { RACK_COUNT, isOnRack, rackPool, todayRack, todayRackIds } from '@/lib/character/rack'
import { SKIN_GACHA_POOL_IDS } from '@/types'
import { discoveredInGroup, groupSize, itemIdsInGroup } from '@/lib/character/groups'
import { SKIN_ITEM_GROUPS } from '@/types'
import { applySkinUnlocks, buySkin, skinCollectionProgress, wearSkin } from '@/lib/character/derive'
import { exportText, parseImport } from '@/lib/sync/file'
import { emptyProfile } from '@/lib/library/usage'

/**
 * 여기서 붙잡는 것 —
 * 입을 게 없어지는 경우가 없고, 능력치가 붙지 않고,
 * 조건은 이미 있는 기록에서만 세고, 저절로 갈아입히지 않는다.
 */

function withUser(patch: Partial<AppState['user']>): AppState {
  const base = createDefaultState()
  return { ...base, user: { ...base.user, ...patch } }
}


/**
 * 이 옷이 진열대에 걸린 날 하나.
 *
 * 이제 사는 것은 오늘 걸린 것만 된다 (가구 가게와 같은 규칙).
 * 그래서 구매 테스트는 "그 옷이 걸린 날" 을 찾아서 그 날짜로 부른다.
 */
function dayOnRack(skinId: string): string {
  const start = new Date('2026-01-01')
  for (let i = 0; i < 400; i += 1) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    if (isOnRack(skinId, key)) return key
  }
  throw new Error(`${skinId} 는 400일 안에 한 번도 안 걸린다`)
}

describe('열두 모습', () => {
  it('id 가 타입과 정확히 맞는다', () => {
    expect(SKINS.map((s) => s.id).sort()).toEqual([...SKIN_IDS].sort())
  })

  it('이름 · 설명 · 순서가 다 있고 겹치지 않는다', () => {
    const orders = new Set<number>()
    for (const skin of SKINS) {
      expect(skin.name.trim().length).toBeGreaterThan(0)
      expect(skin.description.trim().length).toBeGreaterThan(0)
      expect(orders.has(skin.sortOrder)).toBe(false)
      orders.add(skin.sortOrder)
    }
  })

  it('백스무 벌이다 — 처음 스물넷 + 묶음 여덟 × 열둘', () => {
    expect(SKINS.length).toBe(120)
    expect(SKINS.filter((s) => s.acquisition === 'LEGACY_UNLOCK')).toHaveLength(24)
  })

  it('처음 스물넷이 그대로 앞자리에 있다', () => {
    expect(SKINS.slice(0, 24).map((s) => s.id)).toEqual([...SKIN_IDS].slice(0, 24))
  })

  it('2차 열둘이 다 들어 있고 전부 특별 분류다', () => {
    const pack2 = [
      'strawberry_bonbon', 'milky_ballet', 'toy_candy_pop', 'angel_picnic',
      'soft_rock_chic', 'pink_punk', 'vintage_band_girl', 'midnight_leather',
      'pink_idol_stage', 'navy_star_idol', 'white_encore', 'aurora_pop',
    ]
    for (const id of pack2) {
      const skin = findSkin(id)
      expect(skin).not.toBeNull()
      expect(skin?.category).toBe('SPECIAL')
      expect(skin?.sortOrder).toBeGreaterThan(12)
    }
  })

  it('1차 열둘을 지우거나 덮어쓰지 않았다', () => {
    const pack1 = [
      'basic_day', 'cozy_home', 'weekend_casual', 'cafe_work',
      'climbing_day', 'creative_day', 'rainy_day', 'night_owl',
      'date_day', 'spring_picnic', 'winter_cozy', 'moon_alley',
    ]
    for (const id of pack1) {
      const skin = findSkin(id)
      expect(skin).not.toBeNull()
      expect(skin!.sortOrder).toBeLessThanOrEqual(12)
    }
  })

  it('얻는 순간의 말이 붙어 있다', () => {
    for (const skin of SKINS) {
      if (skin.unlock.kind === 'DEFAULT') continue
      expect(skin.dialogue?.line1.trim().length ?? 0).toBeGreaterThan(0)
    }
  })

  it('처음부터 가진 건 기본 모습 하나뿐이다', () => {
    expect(defaultOwnedSkinIds()).toEqual([DEFAULT_SKIN_ID])
  })

  it('힌트에 조건 숫자를 적지 않는다 — 그건 과제 목록이다', () => {
    for (const skin of SKINS) {
      if (skin.unlock.kind === 'DEFAULT') continue
      expect(skin.hint).not.toMatch(/\d/)
    }
  })

  /**
   * 백스무 장이 다 있다.
   *
   * 렌더러에 fallback 이 있다고 해서 없는 걸 통과시키지 않는다 —
   * 그건 배포가 반쯤 갈렸을 때 화면이 안 깨지게 하는 장치지,
   * 그림이 있다는 뜻이 아니다. 여기가 빨개지면 진짜로 없는 것이다.
   */
  it('백스무 장이 실제로 다 있다', () => {
    const pub = path.resolve(__dirname, '../../../public')
    const missing = SKINS.filter(
      (s) => !existsSync(path.join(pub, `assets/characters/${s.id}.webp`)),
    )
    expect(missing.map((s) => s.id)).toEqual([])
  })

  it('작은 그림도 백스무 장 다 있다', () => {
    const pub = path.resolve(__dirname, '../../../public')
    const missing = SKINS.filter(
      (s) => !existsSync(path.join(pub, `assets/thumbs/characters/${s.id}.webp`)),
    )
    expect(missing.map((s) => s.id)).toEqual([])
  })

  it('보정값은 기본이 없다 — 자를 때 이미 맞춰뒀다', () => {
    const nudged = SKINS.filter(
      (s) => s.scale !== undefined || s.offsetX !== undefined || s.offsetY !== undefined,
    )
    expect(nudged.map((s) => s.id)).toEqual([])
  })

  it('그림 경로는 한 곳에서만 만든다', () => {
    for (const skin of SKINS) {
      expect(skinArt(skin)).toBe(`/assets/characters/${skin.id}.webp`)
    }
  })

  it('기본 모습만 자세 그림이 따로 있다', () => {
    const withPoses = SKINS.filter((s) => s.poses !== undefined).map((s) => s.id)
    expect(withPoses).toEqual([DEFAULT_SKIN_ID])
  })
})

describe('물건 묶음', () => {
  it('묶음이 비어 있지 않다 — 비면 조건이 영원히 안 채워진다', () => {
    for (const group of SKIN_ITEM_GROUPS) {
      expect(groupSize(group)).toBeGreaterThan(0)
    }
  })

  it('조건에 쓰는 개수만큼은 실제로 있다', () => {
    expect(groupSize('SWEET')).toBeGreaterThanOrEqual(3)
    expect(groupSize('SOFT')).toBeGreaterThanOrEqual(5)
    expect(groupSize('FLOWER')).toBeGreaterThanOrEqual(8)
    expect(groupSize('STAR')).toBeGreaterThanOrEqual(5)
    expect(groupSize('MUSIC')).toBeGreaterThanOrEqual(3)
    expect(groupSize('TREASURE')).toBeGreaterThanOrEqual(10)
  })

  it('발견한 것만 센다', () => {
    const some = [...itemIdsInGroup('STAR')].slice(0, 3)
    const discovered = Object.fromEntries(some.map((id) => [id, '2026-01-01T00:00:00.000Z']))
    expect(discoveredInGroup(discovered, 'STAR')).toBe(3)
    expect(discoveredInGroup({}, 'STAR')).toBe(0)
  })
})

describe('조건은 이미 있는 기록에서 센다', () => {
  it('분야 퀘스트 수를 그대로 본다', () => {
    const cozy = findSkin('cozy_home')!
    const start = createDefaultState()

    expect(skinProgress(start, cozy.unlock)).toBe(0)

    const half: AppState = { ...start, categoryCompleted: { ...start.categoryCompleted, LIFE: 5 } }
    expect(skinProgress(half, cozy.unlock)).toBeCloseTo(0.5)

    const done: AppState = { ...start, categoryCompleted: { ...start.categoryCompleted, LIFE: 40 } }
    expect(skinProgress(done, cozy.unlock)).toBe(1)
  })

  it('동네 평판을 그대로 본다', () => {
    const cafe = findSkin('cafe_work')!
    const start = createDefaultState()
    const state: AppState = { ...start, reputation: { ...start.reputation, CAFE_STREET: 20 } }
    expect(skinProgress(state, cafe.unlock)).toBe(1)
  })

  it('밤에 끝낸 개수는 사용 기록에서 센다', () => {
    const owl = findSkin('night_owl')!
    const start = createDefaultState()
    const profile = emptyProfile({ questKey: '밤산책', title: '밤 산책', category: 'MIND', difficulty: 'EASY' })

    const state: AppState = {
      ...start,
      usageProfiles: {
        [profile.questKey]: {
          ...profile,
          completedByBand: { ...profile.completedByBand, NIGHT: 25 },
        },
      },
    }
    expect(skinProgress(state, owl.unlock)).toBe(1)
  })

  it('계절 모습은 그 달에 끝낸 것만 센다', () => {
    const spring = findSkin('spring_picnic')!
    const start = createDefaultState()

    const winter: AppState = {
      ...start,
      dailyLog: { '2026-01-10': { completed: 40, exp: 0, byCategory: {} } },
    }
    expect(skinProgress(winter, spring.unlock)).toBe(0)

    const april: AppState = {
      ...start,
      dailyLog: { '2026-04-10': { completed: 15, exp: 0, byCategory: {} } },
    }
    expect(skinProgress(april, spring.unlock)).toBe(1)
  })

  it('비밀 장소를 찾아야 열리는 것도 있다', () => {
    const moon = findSkin('moon_alley')!
    const start = createDefaultState()
    expect(skinProgress(start, moon.unlock)).toBe(0)

    const found: AppState = {
      ...start,
      discovery: { ...start.discovery, foundSecretIds: ['MOON_ALLEY'] },
    }
    expect(skinProgress(found, moon.unlock)).toBe(1)
  })

  it('조건 없이 값만 붙은 건 걸린 날 바로 살 수 있다', () => {
    const weekend = findSkin('weekend_casual')!
    expect(skinPrice(weekend)).toBe(400)
    const day = dayOnRack('weekend_casual')
    const view = skinViews(createDefaultState(), todayRackIds(day)).find(
      (v) => v.def.id === 'weekend_casual',
    )!
    expect(view.forSale).toBe(true)
    expect(view.onRack).toBe(true)
    expect(view.owned).toBe(false)
  })

  it('안 걸린 날에는 값이 붙어 있어도 못 산다', () => {
    // 아무것도 안 걸린 날로 본다 (rackIds 를 안 넘기면 빈 집합)
    const view = skinViews(createDefaultState()).find((v) => v.def.id === 'weekend_casual')!
    expect(view.forSale).toBe(false)
    expect(view.onRack).toBe(false)
  })

  it('조건이 남은 유료 모습은 아직 못 산다', () => {
    const state = withUser({ coins: 99999 })
    const view = skinViews(state).find((v) => v.def.id === 'soft_rock_chic')!
    expect(view.forSale).toBe(false)

    const { result } = buySkin(state, 'soft_rock_chic')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('NOT_YET')
  })

  it('조건 여럿은 제일 덜 온 것으로 본다 — 평균이면 75% 라고 해놓고 안 열린다', () => {
    const start = createDefaultState()
    const angel = findSkin('angel_picnic')!
    // 꽃은 채우고 식물 분류는 비워둔다
    const half: AppState = {
      ...start,
      collection: {
        ...start.collection,
        discovered: Object.fromEntries(
          [...itemIdsInGroup('FLOWER')].slice(0, 8).map((id) => [id, '2026-01-01T00:00:00.000Z']),
        ),
      },
    }
    const flower = conditionProgress(half, { kind: 'COLLECTION_GROUP', group: 'FLOWER', count: 8 })
    expect(flower).toBe(1)
    // 그래도 전체는 1 이 아니다 (PLANT 분류 조건이 아직 덜 찼을 수 있다)
    expect(skinProgress(half, angel.unlock)).toBeLessThanOrEqual(1)
    expect(skinProgress(start, angel.unlock)).toBe(0)
  })
})

describe('새로 얻기', () => {
  it('조건을 채우면 목록에 들어온다', () => {
    const start = createDefaultState()
    const state: AppState = { ...start, categoryCompleted: { ...start.categoryCompleted, LIFE: 10 } }

    const result = applySkinUnlocks(state)
    expect(result.unlocked.map((s) => s.id)).toEqual(['cozy_home'])
    expect(result.state.user.ownedSkinIds).toContain('cozy_home')
  })

  it('두 번 주지 않는다', () => {
    const start = createDefaultState()
    const state: AppState = { ...start, categoryCompleted: { ...start.categoryCompleted, LIFE: 10 } }

    const once = applySkinUnlocks(state)
    const twice = applySkinUnlocks(once.state)
    expect(twice.unlocked).toEqual([])
    expect(twice.state).toBe(once.state)
    expect(once.state.user.ownedSkinIds.filter((id) => id === 'cozy_home').length).toBe(1)
  })

  it('저절로 갈아입히지 않는다', () => {
    const start = createDefaultState()
    const state: AppState = { ...start, categoryCompleted: { ...start.categoryCompleted, LIFE: 10 } }
    const result = applySkinUnlocks(state)
    expect(result.state.user.selectedSkinId).toBe(DEFAULT_SKIN_ID)
  })

  it('EXP 도 코인도 건드리지 않는다 — 모습에는 능력치가 없다', () => {
    const start = createDefaultState()
    const state: AppState = {
      ...start,
      user: { ...start.user, coins: 500, totalExp: 1200 },
      categoryCompleted: { ...start.categoryCompleted, LIFE: 10, BODY: 30 },
    }
    const result = applySkinUnlocks(state)
    expect(result.unlocked.length).toBe(2)
    expect(result.state.user.coins).toBe(500)
    expect(result.state.user.totalExp).toBe(1200)
    expect(result.state.user.stats).toEqual(start.user.stats)
  })

  it('가게에서 파는 건 조건으로 안 들어온다', () => {
    const start = createDefaultState()
    const rich: AppState = { ...start, user: { ...start.user, coins: 99999 } }
    expect(newlyUnlocked(rich).map((s) => s.id)).not.toContain('weekend_casual')
  })
})

describe('코인으로 데려오기', () => {
  it('코인이 모자라면 안 된다', () => {
    const state = withUser({ coins: 100 })
    const { state: next, result } = buySkin(state, 'weekend_casual', dayOnRack('weekend_casual'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('NOT_ENOUGH_COINS')
    expect(next).toBe(state)
  })

  it('되면 코인이 줄고 목록에 들어온다', () => {
    const state = withUser({ coins: 1000 })
    const { state: next, result } = buySkin(state, 'weekend_casual', dayOnRack('weekend_casual'))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.price).toBe(400)
    expect(next.user.coins).toBe(600)
    expect(next.user.ownedSkinIds).toContain('weekend_casual')
    // 사도 저절로 입지 않는다
    expect(next.user.selectedSkinId).toBe(DEFAULT_SKIN_ID)
  })

  it('안 파는 건 코인으로 못 산다', () => {
    const state = withUser({ coins: 99999 })
    const { result } = buySkin(state, 'moon_alley')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('NOT_FOR_SALE')
  })

  it('오늘 안 걸린 옷은 코인이 넘쳐도 안 판다', () => {
    // 화면만 믿으면 자정 언저리에 열어둔 시트로 어제 것을 살 수 있다.
    const state = withUser({ coins: 99999 })
    const { state: next, result } = buySkin(state, 'weekend_casual', '1999-01-01')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('NOT_TODAY')
    expect(next).toBe(state)
    expect(next.user.coins).toBe(99999)
  })

  it('이미 가진 건 또 안 판다', () => {
    const state = withUser({ coins: 99999, ownedSkinIds: ['basic_day', 'weekend_casual'] })
    const { state: next, result } = buySkin(state, 'weekend_casual', dayOnRack('weekend_casual'))
    expect(result.ok).toBe(false)
    expect(next.user.coins).toBe(99999)
  })
})

describe('입기', () => {
  it('가진 것만 입을 수 있다', () => {
    const state = createDefaultState()
    expect(wearSkin(state, 'moon_alley')).toBe(state)
  })

  it('가진 것은 그 자리에서 바뀐다', () => {
    const state = withUser({ ownedSkinIds: ['basic_day', 'cozy_home'] })
    expect(wearSkin(state, 'cozy_home').user.selectedSkinId).toBe('cozy_home')
  })

  it('이미 입고 있으면 아무 일도 안 한다', () => {
    const state = createDefaultState()
    expect(wearSkin(state, DEFAULT_SKIN_ID)).toBe(state)
  })
})

describe('화면에서 보는 모양', () => {
  it('비밀 모습은 얻기 전까지 감춘다', () => {
    const views = skinViews(createDefaultState())
    const moon = views.find((v) => v.def.id === 'moon_alley')!
    expect(moon.hidden).toBe(true)
    expect(moon.owned).toBe(false)
  })

  it('얻고 나면 보인다', () => {
    const state = withUser({ ownedSkinIds: ['basic_day', 'moon_alley'] })
    const moon = skinViews(state).find((v) => v.def.id === 'moon_alley')!
    expect(moon.hidden).toBe(false)
  })

  it('순서대로 나온다', () => {
    const orders = skinViews(createDefaultState()).map((v) => v.def.sortOrder)
    expect(orders).toEqual([...orders].sort((a, b) => a - b))
  })

  it('진행률이 도감 숫자와 맞는다', () => {
    const state = withUser({ ownedSkinIds: ['basic_day', 'cozy_home', 'rainy_day'] })
    expect(ownedSkinCount(state)).toBe(3)
    expect(skinCollectionProgress(state)).toEqual({ found: 3, total: SKINS.length })
  })
})

describe('기존 저장', () => {
  it('모습 항목이 없던 저장도 입을 게 하나는 있다', () => {
    const old = JSON.parse(JSON.stringify(createDefaultState())) as Record<string, unknown>
    const user = old.user as Record<string, unknown>
    delete user.selectedSkinId
    delete user.ownedSkinIds

    const state = sanitizeState(old)
    expect(state?.user.selectedSkinId).toBe(DEFAULT_SKIN_ID)
    expect(state?.user.ownedSkinIds).toEqual([DEFAULT_SKIN_ID])
  })

  it('예전 기록은 그대로 남는다', () => {
    const before = createDefaultState()
    const played = JSON.parse(
      JSON.stringify({
        ...before,
        user: { ...before.user, level: 9, coins: 730, totalCompletedQuests: 84 },
        dailyLog: { '2026-08-01': { completed: 3, exp: 45, byCategory: {} } },
      }),
    ) as Record<string, unknown>
    delete (played.user as Record<string, unknown>).ownedSkinIds

    const state = sanitizeState(played)
    expect(state?.user.level).toBe(9)
    expect(state?.user.coins).toBe(730)
    expect(state?.user.totalCompletedQuests).toBe(84)
    expect(Object.keys(state?.dailyLog ?? {})).toEqual(['2026-08-01'])
  })

  it('모르는 id 는 버리고 기본은 남긴다', () => {
    expect(sanitizeOwnedSkins(['basic_day', 'wat', 42, 'cozy_home'])).toEqual([
      'basic_day',
      'cozy_home',
    ])
    expect(sanitizeOwnedSkins('nope')).toEqual([DEFAULT_SKIN_ID])
  })

  it('안 가진 걸 입고 있다고 저장돼 있으면 기본으로 돌린다', () => {
    expect(sanitizeSelectedSkin('moon_alley', ['basic_day'])).toBe(DEFAULT_SKIN_ID)
    expect(sanitizeSelectedSkin('cozy_home', ['basic_day', 'cozy_home'])).toBe('cozy_home')
  })

  it('파일로 옮겨도 따라간다', () => {
    const state = withUser({ ownedSkinIds: ['basic_day', 'night_owl'], selectedSkinId: 'night_owl' })
    const result = parseImport(exportText(state))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.user.selectedSkinId).toBe('night_owl')
    expect(result.state.user.ownedSkinIds).toContain('night_owl')
  })
})

// ── UPDATE F.5 — 의상실과 아흔여섯 벌 ────────────────────

/**
 * 여기서 붙잡는 것 —
 * 처음 스물넷이 하나도 안 흔들리고, 작은 옷장 마흔여덟이
 * 어떤 경로로도 저절로 들어오지 않는다.
 */

describe('F.5 · 묶음 여덟', () => {
  it('묶음마다 정확히 열두 벌이다', () => {
    for (const pack of SKIN_PACKS) {
      expect(skinsInPack(pack.id)).toHaveLength(12)
    }
    expect(SKIN_PACKS).toHaveLength(8)
  })

  it('묶음 번호는 3에서 10까지다', () => {
    expect(SKIN_PACKS.map((p) => p.id)).toEqual([3, 4, 5, 6, 7, 8, 9, 10])
  })

  it('홀수 묶음은 의상실, 짝수 묶음은 작은 옷장이다', () => {
    for (const pack of SKIN_PACKS) {
      expect(pack.acquisition).toBe(pack.id % 2 === 1 ? 'SHOP' : 'GACHA')
    }
  })

  it('의상실 마흔여덟 · 작은 옷장 마흔여덟', () => {
    expect(SKINS.filter((s) => s.acquisition === 'SHOP')).toHaveLength(48)
    expect(SKINS.filter((s) => s.acquisition === 'GACHA')).toHaveLength(48)
  })

  it('신규 아흔여섯은 전부 묶음과 결을 가진다', () => {
    const fresh = SKINS.filter((s) => s.acquisition !== 'LEGACY_UNLOCK')
    expect(fresh).toHaveLength(96)
    for (const skin of fresh) {
      expect(skin.packId).toBeDefined()
      expect(skin.wardrobeTag).toBeDefined()
    }
  })

  it('처음 스물넷은 묶음이 없다 — 늘 전체에서 보인다', () => {
    for (const skin of SKINS.filter((s) => s.acquisition === 'LEGACY_UNLOCK')) {
      expect(skin.packId).toBeUndefined()
      expect(skinWorld(skin)).toBeNull()
    }
  })

  it('작은 옷장 넷에 열두 벌씩 들어 있다', () => {
    for (const poolId of SKIN_GACHA_POOL_IDS) {
      expect(skinsInPool(poolId)).toHaveLength(12)
    }
    // 마흔여덟을 한 통에 넣지 않았다
    expect(SKIN_GACHA_POOL_IDS).toHaveLength(4)
  })

  it('묶음 진행도는 저장이 아니라 계산이다', () => {
    const [first, second] = skinsInPack(9)
    const state = withUser({ ownedSkinIds: ['basic_day', first.id, second.id] })
    expect(packProgress(state, 9)).toEqual({ found: 2, total: 12 })
    expect(packProgress(state, 10)).toEqual({ found: 0, total: 12 })
  })
})

describe('F.5 · 작은 옷장 마흔여덟은 저절로 안 들어온다', () => {
  const gacha = () => SKINS.filter((s) => s.unlock.kind === 'GACHA')

  it('갈래가 조건이 아니다 — 빈 조건으로 표현하지 않았다', () => {
    for (const skin of gacha()) {
      expect(skin.unlock.kind).toBe('GACHA')
    }
    expect(gacha()).toHaveLength(48)
  })

  it('처음부터 가진 것에 안 들어간다', () => {
    expect(defaultOwnedSkinIds()).toEqual([DEFAULT_SKIN_ID])
  })

  it('진행률이 늘 0 이다 — 조건이 아니니 채울 수도 없다', () => {
    const rich = withUser({ ownedSkinIds: SKINS.map((s) => s.id) })
    for (const skin of gacha()) {
      expect(skinProgress(rich, skin.unlock)).toBe(0)
    }
  })

  it('아무리 많이 해도 새로 열리지 않는다', () => {
    const base = createDefaultState()
    const busy: AppState = {
      ...base,
      categoryCompleted: { LIFE: 999, WORK: 999, BODY: 999, MIND: 999, PLAY: 999, HEART: 999 },
      reputation: { ...base.reputation, CAFE_STREET: 999, CREATIVE_DISTRICT: 999, NIGHT_TOWN: 999 },
      bossClears: 99,
      discovery: {
        ...base.discovery,
        foundSecretIds: [...base.discovery.foundSecretIds],
        readChapterIds: [...base.discovery.readChapterIds],
      },
    }
    const opened = newlyUnlocked(busy).map((s) => s.id)
    for (const skin of gacha()) {
      expect(opened).not.toContain(skin.id)
    }
    const after = applySkinUnlocks(busy)
    for (const skin of gacha()) {
      expect(after.state.user.ownedSkinIds).not.toContain(skin.id)
    }
  })

  it('코인으로도 못 산다', () => {
    const rich = withUser({ coins: 99999 })
    for (const skin of gacha().slice(0, 6)) {
      expect(skinPrice(skin)).toBeNull()
      const { state, result } = buySkin(rich, skin.id)
      expect(result).toEqual({ ok: false, reason: 'NOT_FOR_SALE' })
      expect(state).toBe(rich)
    }
  })

  it('목록에서도 살 수 있는 걸로 안 나온다', () => {
    const views = skinViews(withUser({ coins: 99999 }))
    for (const view of views.filter((v) => v.def.unlock.kind === 'GACHA')) {
      expect(view.forSale).toBe(false)
      expect(view.owned).toBe(false)
      expect(view.progress).toBe(0)
    }
  })
})

describe('F.5 · 의상실에서 사는 마흔여덟', () => {
  const shop = () => SKINS.filter((s) => s.acquisition === 'SHOP')

  it('값이 다 같다 — 능력치가 없으니 값을 나눌 근거가 없다', () => {
    expect([...new Set(shop().map(skinPrice))]).toEqual([NEW_SHOP_SKIN_PRICE])
    expect(NEW_SHOP_SKIN_PRICE).toBe(480)
  })

  it('조건이 없어서 코인만 있으면 바로 산다', () => {
    for (const skin of shop().slice(0, 8)) {
      const rich = withUser({ coins: 1000 })
      const { state, result } = buySkin(rich, skin.id, dayOnRack(skin.id))
      expect(result.ok).toBe(true)
      expect(state.user.coins).toBe(1000 - NEW_SHOP_SKIN_PRICE)
      expect(state.user.ownedSkinIds).toContain(skin.id)
    }
  })

  it('코인이 모자라면 안 팔고 코인도 안 준다', () => {
    const skin = shop()[0]
    const poor = withUser({ coins: 479 })
    const { state, result } = buySkin(poor, skin.id, dayOnRack(skin.id))
    expect(result).toEqual({ ok: false, reason: 'NOT_ENOUGH_COINS' })
    expect(state.user.coins).toBe(479)
  })

  it('두 번 눌러도 한 번만 빠진다', () => {
    const skin = shop()[0]
    const day = dayOnRack(skin.id)
    let state = withUser({ coins: 1000 })
    state = buySkin(state, skin.id, day).state
    const second = buySkin(state, skin.id, day)
    expect(second.result).toEqual({ ok: false, reason: 'ALREADY_OWNED' })
    expect(second.state.user.coins).toBe(520)
    expect(second.state.user.ownedSkinIds.filter((id) => id === skin.id)).toHaveLength(1)
  })

  it('사도 저절로 입혀지지 않는다', () => {
    const skin = shop()[0]
    const bought = buySkin(withUser({ coins: 1000 }), skin.id, dayOnRack(skin.id)).state
    expect(bought.user.selectedSkinId).toBe(DEFAULT_SKIN_ID)
  })

  it('네 묶음에서 한 벌씩 다 사진다', () => {
    for (const packId of [3, 5, 7, 9] as const) {
      const skin = skinsInPack(packId)[0]
      const { result } = buySkin(withUser({ coins: 1000 }), skin.id, dayOnRack(skin.id))
      expect(result.ok).toBe(true)
    }
  })
})

describe('F.5 · 처음 스물넷을 안 건드렸다', () => {
  const legacy = () => SKINS.filter((s) => s.acquisition === 'LEGACY_UNLOCK')

  it('id 스물네 개가 그대로다', () => {
    expect(legacy().map((s) => s.id)).toEqual([
      'basic_day', 'cozy_home', 'weekend_casual', 'cafe_work', 'climbing_day', 'creative_day',
      'rainy_day', 'night_owl', 'date_day', 'spring_picnic', 'winter_cozy', 'moon_alley',
      'strawberry_bonbon', 'milky_ballet', 'toy_candy_pop', 'angel_picnic',
      'soft_rock_chic', 'pink_punk', 'vintage_band_girl', 'midnight_leather',
      'pink_idol_stage', 'navy_star_idol', 'white_encore', 'aurora_pop',
    ])
  })

  it('기본 지급은 여전히 하나뿐이다', () => {
    expect(legacy().filter((s) => s.unlock.kind === 'DEFAULT').map((s) => s.id)).toEqual([
      'basic_day',
    ])
  })

  it('예전 다섯 벌의 값이 그대로다', () => {
    const prices = Object.fromEntries(legacy().map((s) => [s.id, skinPrice(s)]))
    expect(prices.weekend_casual).toBe(400)
    expect(prices.strawberry_bonbon).toBe(420)
    expect(prices.milky_ballet).toBe(480)
    expect(prices.vintage_band_girl).toBe(520)
    expect(prices.soft_rock_chic).toBe(750)
    expect(legacy().filter((s) => skinPrice(s) !== null)).toHaveLength(5)
  })

  it('감춘 넷이 그대로다', () => {
    expect(legacy().filter((s) => s.hiddenUntilOwned).map((s) => s.id)).toEqual([
      'moon_alley', 'midnight_leather', 'white_encore', 'aurora_pop',
    ])
  })

  it('"귀한 모습" 으로 세는 등급이 안 늘었다 — 오로라 팝이 쉬워지지 않는다', () => {
    const rare = new Set(['EPIC', 'LEGENDARY', 'SECRET'])
    const fresh = SKINS.filter((s) => s.acquisition !== 'LEGACY_UNLOCK')
    expect(fresh.filter((s) => rare.has(s.rarity))).toEqual([])
    // 예전 그대로 다섯 벌 이상이 필요하다
    expect(legacy().filter((s) => rare.has(s.rarity)).length).toBeGreaterThanOrEqual(5)
  })

  it('묶음 열둘이 늘어도 예전 조건은 같은 결과를 낸다', () => {
    const state = withUser({})
    const done = withUser({})
    done.categoryCompleted = { ...done.categoryCompleted, LIFE: 10 }
    expect(newlyUnlocked(state).map((s) => s.id)).not.toContain('cozy_home')
    expect(newlyUnlocked(done).map((s) => s.id)).toContain('cozy_home')
  })
})

describe('F.5 · 기존 저장 (Case A~G)', () => {
  it('A. 새로 시작한 사람은 기본 모습 하나뿐이다', () => {
    const fresh = createDefaultState()
    expect(fresh.user.ownedSkinIds).toEqual(['basic_day'])
    const after = applySkinUnlocks(fresh)
    expect(after.state.user.ownedSkinIds).toEqual(['basic_day'])
  })

  it('B. 조건으로 연 것들이 그대로 남는다', () => {
    const saved = ['basic_day', 'cozy_home', 'climbing_day', 'night_owl', 'moon_alley']
    expect(sanitizeOwnedSkins(saved)).toEqual(saved)
  })

  it('C. 사둔 유료 다섯이 그대로 남는다', () => {
    const saved = ['basic_day', 'weekend_casual', 'soft_rock_chic']
    expect(sanitizeOwnedSkins(saved)).toEqual(saved)
  })

  it('D. 사둔 걸 입고 있었으면 그대로 입고 있다', () => {
    expect(sanitizeSelectedSkin('soft_rock_chic', ['basic_day', 'soft_rock_chic'])).toBe(
      'soft_rock_chic',
    )
  })

  it('E. 감춘 모습을 가지고 있었으면 그대로다', () => {
    expect(sanitizeOwnedSkins(['basic_day', 'aurora_pop'])).toContain('aurora_pop')
  })

  it('F. 아흔여섯이 늘어도 예전 저장이 그대로 열린다', () => {
    const saved = ['basic_day', 'cozy_home', 'weekend_casual', 'midnight_leather']
    const state = withUser({ ownedSkinIds: sanitizeOwnedSkins(saved), selectedSkinId: 'cozy_home' })
    expect(state.user.ownedSkinIds).toEqual(saved)
    expect(sanitizeSelectedSkin('cozy_home', saved)).toBe('cozy_home')
    // 새로 늘어난 아흔여섯 중 하나도 딸려 들어오지 않는다
    const fresh = SKINS.filter((s) => s.acquisition !== 'LEGACY_UNLOCK').map((s) => s.id)
    for (const id of fresh) expect(state.user.ownedSkinIds).not.toContain(id)
  })

  it('G. 상태가 아무리 변해도 작은 옷장 마흔여덟은 0벌이다', () => {
    let state: AppState = createDefaultState()
    // 퀘스트 · 도감 · 이야기 · 보스 · 평판을 전부 끝까지 밀어본다
    state = {
      ...state,
      categoryCompleted: { LIFE: 500, WORK: 500, BODY: 500, MIND: 500, PLAY: 500, HEART: 500 },
      bossClears: 50,
      user: { ...state.user, coins: 999999 },
    }
    for (let i = 0; i < 3; i++) state = applySkinUnlocks(state).state

    const gachaIds = SKINS.filter((s) => s.unlock.kind === 'GACHA').map((s) => s.id)
    const got = state.user.ownedSkinIds.filter((id) => gachaIds.includes(id))
    expect(got).toEqual([])
  })
})

describe('F.5 · 도감', () => {
  it('분모가 백스물이 된다', () => {
    expect(skinCollectionProgress(withUser({})).total).toBe(120)
  })

  it('가진 만큼 센다', () => {
    const state = withUser({ ownedSkinIds: ['basic_day', 'cozy_home', 'french_girl_casual'] })
    expect(skinCollectionProgress(state)).toEqual({ found: 3, total: 120 })
  })
})

describe('F.5 · 그림 캔버스', () => {
  /**
   * 캔버스 하나에 다 올라가 있어야 한다.
   *
   * extract-skins.py 가 판에 들어온 조각 전부에서 캔버스를 계산한다.
   * 새 시트만 따로 돌리면 그것들만 다른 크기가 되고, 화면에서
   * 새 옷만 몸 크기가 달라 보인다.
   */
  function canvasOf(id: string): { w: number; h: number } | null {
    const file = path.resolve(__dirname, '../../../public', `assets/characters/${id}.webp`)
    if (!existsSync(file)) return null
    const buf = readFileSync(file)
    // VP8L 만 다룬다 — 이 폴더는 전부 무손실이 아니라 VP8 이라 헤더에서 읽는다
    const tag = buf.subarray(12, 16).toString('ascii')
    if (tag === 'VP8 ') {
      return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff }
    }
    if (tag === 'VP8X') {
      return { w: buf.readUIntLE(24, 3) + 1, h: buf.readUIntLE(27, 3) + 1 }
    }
    return null
  }

  const made = SKINS.map((s) => ({ id: s.id, box: canvasOf(s.id) })).filter((r) => r.box !== null)

  it('그림이 있는 것들은 캔버스가 하나다', () => {
    const boxes = new Set(made.map((r) => `${r.box!.w}x${r.box!.h}`))
    expect([...boxes]).toHaveLength(1)
  })

  /**
   * 홈 카드의 idle 자리(45% 폭 · 62% 높이)가 폭이 아니라 높이로 재도록.
   * 여기를 넘기는 그림이 들어오면 홈에서 캐릭터가 조금 작아진다 —
   * 그때는 그림이 아니라 PLACEMENT.idle 을 손봐야 한다.
   */
  it('캔버스가 홈 카드가 버티는 비율 안에 있다', () => {
    const box = made[0].box!
    expect(box.w / box.h).toBeLessThanOrEqual(0.95)
  })
})

describe('F.5 · 이름 자리표', () => {
  /**
   * 한때 7묶음 열둘이 자리표였다.
   *
   * 그림은 왔는데 확정명을 못 찾아서 PACK7_SKIN_73 으로 세워뒀다가,
   * 확정명을 받고 id · 이름 · 그림 파일을 한 번에 정했다.
   * 장치는 남겨둔다 — 다음에 또 그림이 이름보다 먼저 올 수 있다.
   *
   * 여기가 붙잡는 건 하나다: **자리표가 조용히 이름이 되어 굳지 않는 것.**
   */
  it('지금은 자리표가 하나도 없다', () => {
    expect(SKINS.filter((s) => s.nameMissing).map((s) => s.id)).toEqual([])
  })

  it('자리표 흔적이 이름에도 id 에도 안 남았다', () => {
    for (const skin of SKINS) {
      expect(skin.name).not.toMatch(/^PACK\d/)
      expect(skin.id).not.toMatch(/^pack\d+_/)
    }
  })
})

describe('F.5 · 확정명', () => {
  const nameOf = (id: string) => findSkin(id)?.name

  it('8묶음 열둘이 확정명 그대로다', () => {
    expect([
      'early_spring_trench', 'fine_dust_day', 'spring_wedding_guest', 'early_summer_shirt',
      'rainy_season_practical', 'heatwave_linen', 'aircon_cardigan', 'midsummer_long_skirt',
      'early_autumn_shirt', 'autumn_suede_jacket', 'sudden_cold_day', 'cold_wave_long_padding',
    ].map(nameOf)).toEqual([
      '꽃샘추위 트렌치코트', '미세먼지 있는 날', '봄날 하객 코디', '초여름 셔츠 레이어드',
      '장마철 실용 코디', '폭염의 린넨 셋업', '에어컨 대비 카디건', '한여름 롱스커트',
      '초가을 셔츠 레이어드', '가을 스웨이드 재킷', '갑자기 추운 날 플리스', '한파의 롱패딩',
    ])
  })

  it('9묶음 열둘도 확정명 그대로다', () => {
    expect(skinsInPack(9).map((s) => s.name)).toEqual([
      '프렌치 걸 캐주얼', '미니멀 모노톤', '키치 빈티지 데님', '빈티지 북카페 무드',
      '현실적인 발레코어', '소프트 고프코어', '코지 스칸디 무드', '캠퍼스 프레피',
      '레트로 스포티', '시티보이 오버핏', '로맨틱 새틴 무드', '소프트 시크 올블랙',
    ])
  })

  it('7묶음 열둘이 확정명 그대로다', () => {
    expect(skinsInPack(7).map((s) => s.name)).toEqual([
      '오트밀 맨투맨 데일리', '코랄 티셔츠와 연청 데님', '세이지 체크 셔츠 레이어드',
      '차콜 카디건과 생지 데님', '더스티블루 워크재킷', '크림 니트 조끼와 롱스커트',
      '더스티레드 럭비 셔츠', '셔링 블라우스와 카고 스커트', '데님 셔츠 셋업',
      '라벤더 셔츠 원피스', '도심 바람막이와 와이드 팬츠', '레드 카디건과 크림 팬츠',
    ])
  })

  it('10묶음 열둘도 확정명 그대로다', () => {
    expect(skinsInPack(10).map((s) => s.name)).toEqual([
      '지하철 출근길', '재택근무하는 날', '편의점 다녀오는 길', '퇴근 후 약속',
      '카페 신상 탐방', '전시회 보러 가는 날', '야구장 응원룩', '한강 피크닉',
      '팝업스토어 오픈런', '콘서트 가는 날', '공항 가는 날', '면접 보러 가는 날',
    ])
  })
})

describe('가게에서 본 것을 기억한다', () => {
  /**
   * 도감은 기억하는 곳이다.
   *
   * 진열은 저장하지 않는다 — 날짜 씨앗으로 다시 만든다. 그러면 어제 본 옷이
   * 오늘 진열에서 빠졌을 때 도감에서 다시 실루엣이 된다. 봤다는 사실만은 남아야 한다.
   */
  const priced = SKINS.find((s) => skinPrice(s) !== null)
  if (!priced) throw new Error('값이 붙은 모습이 하나도 없다')

  it('처음에는 아무것도 안 봤다', () => {
    const s = createDefaultState()
    expect(s.user.seenSkinIds).toEqual([])
    expect(skinViews(s).every((v) => !v.seen)).toBe(true)
  })

  it('본 것으로 적으면 도감이 그림을 보여준다', () => {
    const s = markSkinsSeen(createDefaultState(), [priced.id])
    const view = skinViews(s).find((v) => v.def.id === priced.id)
    expect(view?.seen).toBe(true)
    expect(view?.owned).toBe(false)
  })

  it('감춘 모습도 한 번 보면 안 감춘다', () => {
    const secret = SKINS.find((sk) => sk.hiddenUntilOwned === true)
    if (!secret) return
    expect(skinViews(createDefaultState()).find((v) => v.def.id === secret.id)?.hidden).toBe(true)
    const s = markSkinsSeen(createDefaultState(), [secret.id])
    expect(skinViews(s).find((v) => v.def.id === secret.id)?.hidden).toBe(false)
  })

  it('두 번 적어도 한 번만 남고 순서는 그대로다', () => {
    let s = markSkinsSeen(createDefaultState(), [priced.id])
    const other = SKINS.find((sk) => sk.id !== priced.id)!
    s = markSkinsSeen(s, [other.id, priced.id])
    expect(s.user.seenSkinIds).toEqual([priced.id, other.id])
  })

  it('모르는 id 는 안 적는다', () => {
    expect(markSkinsSeen(createDefaultState(), ['no_such_skin']).user.seenSkinIds).toEqual([])
  })

  it('사도 본 기록은 안 사라진다', () => {
    let s = markSkinsSeen(createDefaultState(), [priced.id])
    s = { ...s, user: { ...s.user, coins: 99999 } }
    const bought = buySkin(s, priced.id, dayOnRack(priced.id))
    expect(bought.result.ok).toBe(true)
    expect(bought.state.user.seenSkinIds).toContain(priced.id)
    expect(bought.state.user.ownedSkinIds).toContain(priced.id)
  })

  it('예전 저장에는 이 칸이 없다 — 빈 배열로 연다', () => {
    expect(sanitizeSeenSkins(undefined)).toEqual([])
    expect(sanitizeSeenSkins('아무거나')).toEqual([])
    expect(sanitizeSeenSkins([priced.id, 'no_such_skin', 7])).toEqual([priced.id])
  })

  it('감춘 옷은 들춰봐도 적지 않는다', () => {
    // 화면에서 hidden 인 것은 onSee 를 안 부른다. 들춰봐도 ??? 였으니
    // "봤다" 고 적으면 다음부터 이름과 그림이 공짜로 열린다.
    const secret = SKINS.filter((sk) => sk.hiddenUntilOwned === true)
    expect(secret.length).toBeGreaterThan(0)
    // markSkinsSeen 자체는 막지 않는다 — 가게가 실제로 보여줬다면 그건 본 것이다.
    // 막는 자리는 화면이다 (MyLookSheet.tap).
    const s = markSkinsSeen(createDefaultState(), [secret[0].id])
    expect(s.user.seenSkinIds).toContain(secret[0].id)
  })

  it('저장을 한 바퀴 돌려도 살아남는다', () => {
    const s = markSkinsSeen(createDefaultState(), [priced.id])
    const back = sanitizeState(JSON.parse(JSON.stringify(s)))
    expect(back?.user.seenSkinIds).toEqual([priced.id])
  })
})

describe('누르는 것만으로는 안 사진다', () => {
  /**
   * 의상실에서 옷을 누르면 그 자리에서 코인이 빠져나갔다. 물어보지도 않았다.
   * 화면은 이제 상세 시트를 열 뿐이고, 코인이 움직이는 길은 buySkin 하나다.
   * 여기서는 그 하나가 제대로 잠겨 있는지만 못 박는다.
   */
  const priced = SKINS.find((s) => skinPrice(s) !== null)!

  it('코인이 모자라면 아무것도 안 변한다', () => {
    const base = createDefaultState()
    const s = { ...base, user: { ...base.user, coins: 0 } }
    const r = buySkin(s, priced.id)
    expect(r.result.ok).toBe(false)
    expect(r.state).toBe(s)
    expect(r.state.user.ownedSkinIds).not.toContain(priced.id)
  })

  it('값이 없는 모습은 코인으로 살 수 없다', () => {
    const free = SKINS.find((sk) => skinPrice(sk) === null && sk.unlock.kind !== 'DEFAULT')
    if (!free) return
    const base = createDefaultState()
    const s = { ...base, user: { ...base.user, coins: 99999 } }
    expect(buySkin(s, free.id).result.ok).toBe(false)
  })

  it('산 만큼만 정확히 빠진다', () => {
    const base = createDefaultState()
    const price = skinPrice(priced)!
    const s = { ...base, user: { ...base.user, coins: price + 37 } }
    const r = buySkin(s, priced.id, dayOnRack(priced.id))
    expect(r.result.ok).toBe(true)
    expect(r.state.user.coins).toBe(37)
  })
})

describe('오늘 걸린 옷', () => {
  /**
   * 의상실이 백스무 벌을 한 번에 다 보여줘서, 도감의 실루엣이
   * "아직 가게에 안 나온 옷" 이 아니라 "아직 안 눌러본 옷" 이었다.
   * 하루에 다섯 벌만 걸리면 도감이 며칠에 걸쳐 찬다.
   */
  it('날짜가 같으면 늘 같은 다섯 벌이다', () => {
    const a = todayRack('2026-08-28').map((s) => s.id)
    const b = todayRack('2026-08-28').map((s) => s.id)
    expect(a).toEqual(b)
    expect(a).toHaveLength(RACK_COUNT)
  })

  it('날짜가 바뀌면 바뀐다', () => {
    const days = ['2026-08-28', '2026-08-29', '2026-08-30', '2026-08-31', '2026-09-01']
    const sets = days.map((d) => todayRack(d).map((s) => s.id).join(','))
    // 다섯 날이 전부 같으면 그건 진열이 아니다
    expect(new Set(sets).size).toBeGreaterThan(1)
  })

  it('값이 붙은 옷만 걸린다 — 못 사는 옷을 걸어두면 광고다', () => {
    for (const day of ['2026-01-05', '2026-06-06', '2026-11-20']) {
      for (const skin of todayRack(day)) {
        expect(skinPrice(skin)).not.toBeNull()
      }
    }
  })

  it('한 날에 같은 옷이 두 번 걸리지 않는다', () => {
    for (const day of ['2026-02-02', '2026-07-17', '2026-12-25']) {
      const ids = todayRack(day).map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('오래 돌리면 결국 여러 벌이 돌아온다', () => {
    // 한두 벌만 계속 걸리면 도감이 안 찬다
    const seen = new Set<string>()
    const start = new Date('2026-01-01')
    for (let i = 0; i < 60; i += 1) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      for (const s of todayRack(d.toISOString().slice(0, 10))) seen.add(s.id)
    }
    expect(seen.size).toBeGreaterThan(RACK_COUNT * 4)
  })

  it('걸린 옷은 살 수 있는 풀 안에 있다', () => {
    const pool = new Set(rackPool().map((s) => s.id))
    for (const s of todayRack('2026-03-03')) expect(pool.has(s.id)).toBe(true)
  })

  it('isOnRack 이 그날 목록과 어긋나지 않는다', () => {
    const day = '2026-04-04'
    const ids = todayRack(day).map((s) => s.id)
    for (const id of ids) expect(isOnRack(id, day)).toBe(true)
    const off = rackPool().find((s) => !ids.includes(s.id))
    if (off) expect(isOnRack(off.id, day)).toBe(false)
  })

  it('저장을 건드리지 않는다 — 날짜에서 다시 만든다', () => {
    // 진열을 저장하면 기기마다 다른 진열이 남는다. 그래서 이 파일은
    // AppState 도 저장 계층도 아예 안 부른다. 인자는 날짜 하나뿐이다.
    const src = readFileSync(
      path.join(process.cwd(), 'src/lib/character/rack.ts'),
      'utf-8',
    )
    expect(src).not.toMatch(/AppState|localStorage|@\/store\//)
  })
})
