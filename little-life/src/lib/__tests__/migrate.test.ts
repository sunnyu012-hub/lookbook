import { describe, expect, it } from 'vitest'
import type { AppState } from '@/types'
import { createDefaultState } from '@/store/defaultState'
import {
  WELCOME_GIFT,
  defaultStats,
  emptyEquipped,
  grantWelcomeGift,
  sanitizeBattles,
  sanitizeEquipped,
  sanitizeInventory,
  sanitizeStats,
} from '@/store/migrate'
import { CATEGORIES } from '@/types'

describe('sanitizeStats', () => {
  it('없으면 전부 1', () => {
    expect(sanitizeStats(undefined)).toEqual(defaultStats())
  })

  it('있는 값은 지키고 없는 것만 채운다', () => {
    const stats = sanitizeStats({ FOCUS: 12, VITALITY: 4 })
    expect(stats.FOCUS).toBe(12)
    expect(stats.VITALITY).toBe(4)
    expect(stats.LUCK).toBe(1)
  })

  it('이상한 값은 기본값으로', () => {
    expect(sanitizeStats({ FOCUS: 'abc', ENERGY: -3 })).toMatchObject({ FOCUS: 1, ENERGY: 0 })
  })
})

describe('sanitizeEquipped', () => {
  it('없으면 전부 빈 슬롯', () => {
    expect(sanitizeEquipped(null)).toEqual(emptyEquipped())
  })

  it('제자리에 있는 장비만 남긴다', () => {
    const e = sanitizeEquipped({ TOP: 'cozy_hoodie', SHOES: 'daily_sneakers' })
    expect(e.TOP).toBe('cozy_hoodie')
    expect(e.SHOES).toBe('daily_sneakers')
  })

  it('없는 아이템이 박혀 있으면 비운다', () => {
    expect(sanitizeEquipped({ TOP: 'ghost_item' }).TOP).toBeNull()
  })

  it('슬롯이 안 맞으면 비운다 — 신발을 머리에 쓸 수는 없다', () => {
    expect(sanitizeEquipped({ HEAD: 'daily_sneakers' }).HEAD).toBeNull()
  })
})

describe('sanitizeInventory', () => {
  it('없는 아이템은 버린다', () => {
    const inv = sanitizeInventory([
      { itemId: 'favorite_mug', quantity: 1 },
      { itemId: 'ghost', quantity: 5 },
    ])
    expect(inv).toHaveLength(1)
  })

  it('같은 아이템이 여러 줄이면 하나로 합친다', () => {
    const inv = sanitizeInventory([
      { itemId: 'favorite_mug', quantity: 2 },
      { itemId: 'favorite_mug', quantity: 3 },
    ])
    expect(inv).toHaveLength(1)
    expect(inv[0].quantity).toBe(5)
  })

  it('수량이 0 이하면 버린다', () => {
    expect(sanitizeInventory([{ itemId: 'favorite_mug', quantity: 0 }])).toHaveLength(0)
  })
})

describe('sanitizeBattles', () => {
  const base = {
    id: 'b1',
    defId: 'dish_slime',
    kind: 'MONSTER',
    hp: 20,
    maxHp: 40,
    actions: [{ id: 'a1', label: '컵 씻기', damage: 10, doneAt: null }],
    status: 'ACTIVE',
  }

  it('진행 중인 HP 를 그대로 지킨다', () => {
    const [b] = sanitizeBattles([base], CATEGORIES)
    expect(b.hp).toBe(20)
    expect(b.maxHp).toBe(40)
  })

  it('HP 가 최대치를 넘으면 잘라낸다', () => {
    const [b] = sanitizeBattles([{ ...base, hp: 999 }], CATEGORIES)
    expect(b.hp).toBe(40)
  })

  it('정의가 사라진 몬스터는 버린다', () => {
    expect(sanitizeBattles([{ ...base, defId: 'ghost_monster' }], CATEGORIES)).toHaveLength(0)
  })

  it('빠진 값은 원본 정의에서 채운다', () => {
    const [b] = sanitizeBattles([{ id: 'b2', defId: 'dish_slime' }], CATEGORIES)
    expect(b.name).toBe('Dish Slime')
    expect(b.maxHp).toBe(40)
    expect(b.rewardExp).toBeGreaterThan(0)
  })
})

describe('grantWelcomeGift', () => {
  function state(): AppState {
    return { ...createDefaultState(), welcomeGiftGiven: false }
  }

  it('처음 한 번은 준다', () => {
    const { state: next, given } = grantWelcomeGift(state())
    expect(given).toBe(true)
    expect(next.user.coins).toBe(WELCOME_GIFT.coins)
    expect(next.inventory.some((e) => e.itemId === WELCOME_GIFT.itemId)).toBe(true)
    expect(next.welcomeGiftGiven).toBe(true)
  })

  it('두 번 주지 않는다', () => {
    const first = grantWelcomeGift(state()).state
    const second = grantWelcomeGift(first)

    expect(second.given).toBe(false)
    expect(second.state.user.coins).toBe(WELCOME_GIFT.coins)
    expect(second.state).toBe(first)
  })

  it('이미 같은 아이템이 있으면 코인만 준다', () => {
    const withMug: AppState = {
      ...state(),
      inventory: [
        { itemId: WELCOME_GIFT.itemId, quantity: 1, obtainedAt: '2026-01-01T00:00:00Z', source: 'drop' },
      ],
    }
    const { state: next } = grantWelcomeGift(withMug)
    expect(next.inventory).toHaveLength(1)
    expect(next.user.coins).toBe(WELCOME_GIFT.coins)
  })
})
