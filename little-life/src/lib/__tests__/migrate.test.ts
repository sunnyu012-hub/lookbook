import { describe, expect, it } from 'vitest'
import type { AppState } from '@/types'
import { createDefaultState } from '@/store/defaultState'
import {
  COIN_REBALANCE_PER_QUEST,
  WELCOME_GIFT,
  grantCoinRebalance,
  defaultStats,
  emptyEquipped,
  grantWelcomeGift,
  sanitizeBattles,
  sanitizeBuffs,
  sanitizeEquipped,
  sanitizeInventory,
  sanitizeNpcs,
  sanitizeReputation,
  sanitizeSkills,
  sanitizeStats,
  withSkillPoints,
  STATE_VERSION,
} from '@/store/migrate'
import { sanitizeState } from '@/store/localStorage'
import { CATEGORIES } from '@/types'
import { findBattleDef } from '@/lib/rpg/content'

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
    expect(b.name).toBe(findBattleDef('dish_slime')!.name)
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

// ── 도시가 붙은 뒤 (v4) ─────────────────────────────────
describe('sanitizeNpcs', () => {
  it('없으면 여섯 명 모두 빈 관계로 시작한다', () => {
    const npcs = sanitizeNpcs(undefined)
    expect(Object.keys(npcs)).toHaveLength(6)
    expect(npcs.MINA).toEqual({ friendship: 0, lastTalkedOn: null, clearedChainIds: [] })
  })

  it('쌓아둔 친밀도는 그대로 둔다', () => {
    const npcs = sanitizeNpcs({ MINA: { friendship: 42, lastTalkedOn: '2026-08-22', clearedChainIds: ['mina_focus'] } })
    expect(npcs.MINA.friendship).toBe(42)
    expect(npcs.MINA.lastTalkedOn).toBe('2026-08-22')
    expect(npcs.MINA.clearedChainIds).toEqual(['mina_focus'])
  })

  it('정의가 사라진 NPC 는 버린다', () => {
    const npcs = sanitizeNpcs({ GHOST: { friendship: 99 } })
    expect(npcs.GHOST).toBeUndefined()
  })

  it('상한을 넘은 친밀도는 잘라낸다', () => {
    expect(sanitizeNpcs({ MINA: { friendship: 9999 } }).MINA.friendship).toBe(100)
  })

  it('날짜 모양이 아니면 안 본 것으로 친다', () => {
    expect(sanitizeNpcs({ MINA: { friendship: 1, lastTalkedOn: 'yesterday' } }).MINA.lastTalkedOn).toBeNull()
  })
})

describe('sanitizeReputation', () => {
  it('없으면 여섯 지역 모두 0', () => {
    const rep = sanitizeReputation(undefined)
    expect(Object.keys(rep)).toHaveLength(6)
    expect(rep.CAFE_STREET).toBe(0)
  })

  it('쌓아둔 평판은 그대로 둔다', () => {
    expect(sanitizeReputation({ CAFE_STREET: 88 }).CAFE_STREET).toBe(88)
  })

  it('없는 지역 값은 무시한다', () => {
    const rep = sanitizeReputation({ ATLANTIS: 500 })
    expect((rep as Record<string, number>).ATLANTIS).toBeUndefined()
  })
})

describe('sanitizeSkills', () => {
  it('없어진 스킬은 버린다', () => {
    expect(sanitizeSkills(['work_focus_1', 'nope'])).toEqual(['work_focus_1'])
  })

  it('중복은 하나로 합친다', () => {
    expect(sanitizeSkills(['work_focus_1', 'work_focus_1'])).toEqual(['work_focus_1'])
  })

  it('배열이 아니면 빈 목록', () => {
    expect(sanitizeSkills('work_focus_1')).toEqual([])
  })
})

describe('sanitizeBuffs', () => {
  it('마셔둔 것을 지킨다', () => {
    const buffs = sanitizeBuffs([
      { id: 'b', itemId: 'focus_coffee', name: 'Focus Coffee', icon: '☕', category: 'WORK', expPct: 20, uses: 1, startedAt: 'x' },
    ])
    expect(buffs).toHaveLength(1)
    expect(buffs[0].category).toBe('WORK')
  })

  it('다 쓴 것은 버린다', () => {
    expect(sanitizeBuffs([{ itemId: 'focus_coffee', uses: 0 }])).toEqual([])
  })

  it('마실 수 없는 아이템이면 버린다', () => {
    expect(sanitizeBuffs([{ itemId: 'cozy_hoodie', uses: 1 }])).toEqual([])
  })

  it('없는 아이템이면 버린다', () => {
    expect(sanitizeBuffs([{ itemId: 'nope', uses: 1 }])).toEqual([])
  })
})

describe('withSkillPoints', () => {
  it('레벨에서 쓴 만큼 뺀 값으로 덮는다', () => {
    const state = createDefaultState()
    const next = withSkillPoints({
      ...state,
      user: { ...state.user, level: 6, unlockedSkills: ['work_focus_1'], skillPoints: 999 },
    })
    // LV.6 → 5점, work_focus_1 에 1점 → 4점
    expect(next.user.skillPoints).toBe(4)
  })

  it('레벨이 내려가도 음수가 되지 않는다', () => {
    const state = createDefaultState()
    const next = withSkillPoints({
      ...state,
      user: { ...state.user, level: 1, unlockedSkills: ['work_focus_1', 'work_focus_2'] },
    })
    expect(next.user.skillPoints).toBe(0)
  })

  it('이미 맞으면 같은 객체를 그대로 돌려준다', () => {
    const state = withSkillPoints(createDefaultState())
    expect(withSkillPoints(state)).toBe(state)
  })
})

describe('첫 실행 상태 (v4)', () => {
  it('도시 항목이 전부 들어 있다', () => {
    const state: AppState = createDefaultState()
    expect(Object.keys(state.npcs)).toHaveLength(6)
    expect(Object.keys(state.reputation)).toHaveLength(6)
    expect(state.user.unlockedSkills).toEqual([])
    expect(state.user.activeBuffs).toEqual([])
    expect(state.user.skillPoints).toBe(0)
  })
})

describe('밸런스 보정', () => {
  const base = (): AppState => {
    const state = createDefaultState()
    return {
      ...state,
      coinRebalanceGiven: false,
      user: { ...state.user, coins: 50, totalCompletedQuests: 12 },
    }
  }

  it('지금까지 한 만큼 한 번 채워준다', () => {
    const { state, coins } = grantCoinRebalance(base())
    expect(coins).toBe(12 * COIN_REBALANCE_PER_QUEST)
    expect(state.user.coins).toBe(50 + coins)
    expect(state.coinRebalanceGiven).toBe(true)
  })

  it('두 번 열어도 두 번 주지 않는다', () => {
    const first = grantCoinRebalance(base())
    const second = grantCoinRebalance(first.state)
    expect(second.coins).toBe(0)
    expect(second.state.user.coins).toBe(first.state.user.coins)
  })

  it('한 번도 안 한 사람에게는 줄 것이 없다', () => {
    const empty = { ...base(), user: { ...base().user, totalCompletedQuests: 0 } }
    const { state, coins } = grantCoinRebalance(empty)
    expect(coins).toBe(0)
    // 그래도 플래그는 세워둔다. 나중에 퀘스트를 해도 소급해주지 않는다.
    expect(state.coinRebalanceGiven).toBe(true)
  })

  it('새로 시작하는 사람은 대상이 아니다', () => {
    expect(createDefaultState().coinRebalanceGiven).toBe(true)
  })
})

describe('완료 기록 sanitize', () => {
  const savedQuest = (reward: unknown) => ({
    id: 'q1',
    title: '설거지 끝내기',
    category: 'LIFE',
    difficulty: 'NORMAL',
    exp: 20,
    completed: true,
    createdAt: '2026-08-24T09:00:00.000Z',
    completedAt: '2026-08-24T10:00:00.000Z',
    reward,
  })

  const loadReward = (reward: unknown) =>
    sanitizeState({ version: 17, quests: [savedQuest(reward)] })!.quests[0].reward!

  it('되돌리기에 필요한 것들이 새로고침 뒤에도 남아 있다', () => {
    // 여기서 흘리면 새로고침한 사람만 되돌리기로 도감·씨앗·에너지를 공짜로 갖는다
    const reward = loadReward({
      exp: 20,
      coins: 80,
      statKey: 'ENERGY',
      collectDrops: [{ itemId: 'wood', wasNew: true }],
      gardenDrops: [{ itemId: 'seed_basil', wasNew: false }],
      adventureEnergy: 3,
      growthBonus: [{ plotId: 'p1', plantedAt: '2026-08-24T08:00:00.000Z', seconds: 120 }],
      battleTicks: [{ battleId: 'b1', actionId: 'b1-0' }],
    })

    expect(reward.collectDrops).toEqual([{ itemId: 'wood', wasNew: true }])
    expect(reward.gardenDrops).toEqual([{ itemId: 'seed_basil', wasNew: false }])
    expect(reward.adventureEnergy).toBe(3)
    expect(reward.growthBonus).toHaveLength(1)
    expect(reward.battleTicks).toEqual([{ battleId: 'b1', actionId: 'b1-0' }])
  })

  it('모양이 깨진 줄은 조용히 버린다', () => {
    const reward = loadReward({
      exp: 20,
      coins: 80,
      collectDrops: [{ wasNew: true }, 'nope', null],
      battleTicks: [{ battleId: 'b1' }, { actionId: 'a' }, 7],
      growthBonus: [{ plotId: 'p1' }],
    })

    expect(reward.collectDrops).toBeUndefined()
    expect(reward.battleTicks).toBeUndefined()
    expect(reward.growthBonus).toBeUndefined()
  })

  it('예전 저장에는 없던 항목이라 없어도 그냥 넘어간다', () => {
    const reward = loadReward({ exp: 20, coins: 80, statKey: 'ENERGY' })
    expect(reward.battleTicks).toBeUndefined()
    expect(reward.exp).toBe(20)
  })
})

describe('새로 추가된 몬스터·보스', () => {
  it('예전 저장이 그대로 열린다', () => {
    // 정의가 늘어난 것뿐이라 저장 판본을 올릴 이유가 없다
    const state = sanitizeState({
      version: 17,
      battles: [{ id: 'b1', defId: 'dish_slime', kind: 'MONSTER', hp: 20, maxHp: 40 }],
    })
    expect(state?.battles).toHaveLength(1)
    expect(state?.version).toBe(STATE_VERSION)
  })

  it('새 몬스터도 저장에서 되살아난다', () => {
    const [b] = sanitizeBattles([{ id: 'b9', defId: 'photo_cloud' }], CATEGORIES)
    expect(b.name).toBe('사진구름')
    expect(b.kind).toBe('MONSTER')
  })

  it('모르는 id 는 예전처럼 버린다', () => {
    expect(sanitizeBattles([{ id: 'b1', defId: '없는것' }], CATEGORIES)).toHaveLength(0)
  })
})
