import { describe, expect, it } from 'vitest'
import type { AppState } from '@/types'
import { SKIN_IDS } from '@/types'
import { createDefaultState } from '@/store/defaultState'
import { sanitizeState } from '@/store/localStorage'
import { sanitizeOwnedSkins, sanitizeSelectedSkin } from '@/store/migrate'
import {
  DEFAULT_SKIN_ID,
  SKINS,
  defaultOwnedSkinIds,
  findSkin,
  newlyUnlocked,
  ownedSkinCount,
  skinArt,
  skinProgress,
  skinViews,
} from '@/lib/character/skins'
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

  it('처음부터 가진 건 기본 모습 하나뿐이다', () => {
    expect(defaultOwnedSkinIds()).toEqual([DEFAULT_SKIN_ID])
  })

  it('힌트에 조건 숫자를 적지 않는다 — 그건 과제 목록이다', () => {
    for (const skin of SKINS) {
      if (skin.unlock.kind === 'DEFAULT') continue
      expect(skin.hint).not.toMatch(/\d/)
    }
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

  it('가게에서 파는 건 "가는 중" 이 없다', () => {
    const weekend = findSkin('weekend_casual')!
    expect(skinProgress(createDefaultState(), weekend.unlock)).toBe(0)
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
    const { state: next, result } = buySkin(state, 'weekend_casual')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('NOT_ENOUGH_COINS')
    expect(next).toBe(state)
  })

  it('되면 코인이 줄고 목록에 들어온다', () => {
    const state = withUser({ coins: 1000 })
    const { state: next, result } = buySkin(state, 'weekend_casual')
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

  it('이미 가진 건 또 안 판다', () => {
    const state = withUser({ coins: 99999, ownedSkinIds: ['basic_day', 'weekend_casual'] })
    const { state: next, result } = buySkin(state, 'weekend_casual')
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
