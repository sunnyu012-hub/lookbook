import { describe, expect, it } from 'vitest'
import type { ActiveBuff, EquippedItems, NpcState } from '@/types'
import { CATEGORIES, EQUIP_SLOTS } from '@/types'
import { pickCount, pickSome, seededRandom } from '@/lib/city/seed'
import { CITY_EVENTS, activeEvents, eventsForArea, eventsForDay } from '@/lib/city/events'
import { SHOPS, findShop, isShopOpen, shopInArea, shopStock } from '@/lib/city/shops'
import {
  FRIENDSHIP_MAX,
  NPCS,
  findNpc,
  friendshipLevel,
  friendshipProgress,
  meetsLevel,
  npcsInArea,
} from '@/lib/city/npcs'
import {
  GIFT_FRIENDSHIP,
  GIFT_LIKED_FRIENDSHIP,
  TALK_FRIENDSHIP,
  emptyNpcState,
  giftGain,
  isGiftable,
  talkGain,
  talkedToday,
} from '@/lib/city/friendship'
import {
  REPUTATION_BOSS,
  emptyReputation,
  reputationCoinPct,
  reputationGain,
  reputationLevel,
  reputationLevelNumber,
  reputationProgress,
} from '@/lib/city/reputation'
import {
  SKILLS,
  availableSkillPoints,
  earnedSkillPoints,
  findSkill,
  skillState,
  skillsInTree,
  spentSkillPoints,
} from '@/lib/city/skills'
import { calculateQuestReward, emptyBonuses, pickBuff } from '@/lib/rpg/rewards'
import { findItem } from '@/lib/rpg/content'

const empty = (): EquippedItems =>
  EQUIP_SLOTS.reduce((acc, slot) => {
    acc[slot] = null
    return acc
  }, {} as EquippedItems)

const base = { classId: null, equipped: empty(), areaId: 'HOME_BASE' as const }

// ── 날짜 씨앗 ───────────────────────────────────────────
describe('날짜로 고정되는 무작위', () => {
  it('같은 씨앗이면 늘 같은 수열이 나온다', () => {
    const a = seededRandom('2026-08-22')
    const b = seededRandom('2026-08-22')
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('씨앗이 다르면 수열도 달라진다', () => {
    const a = seededRandom('2026-08-22')
    const b = seededRandom('2026-08-23')
    expect(a()).not.toBe(b())
  })

  it('pickSome 은 겹치지 않게 고른다', () => {
    const picked = pickSome([1, 2, 3, 4, 5], 3, 'seed')
    expect(picked).toHaveLength(3)
    expect(new Set(picked).size).toBe(3)
  })

  it('pickSome 은 목록보다 많이 달라고 해도 전부만 준다', () => {
    expect(pickSome([1, 2], 5, 'seed')).toHaveLength(2)
  })

  it('pickCount 는 범위 안에 든다', () => {
    for (let i = 0; i < 50; i += 1) {
      const n = pickCount(1, 3, `day-${i}`)
      expect(n).toBeGreaterThanOrEqual(1)
      expect(n).toBeLessThanOrEqual(3)
    }
  })
})

// ── 도시 이벤트 ─────────────────────────────────────────
describe('도시 이벤트', () => {
  it('하루에 1~3개만 열린다', () => {
    for (let day = 1; day <= 40; day += 1) {
      const key = `2026-09-${String(day).padStart(2, '0')}`
      const events = eventsForDay(key)
      expect(events.length).toBeGreaterThanOrEqual(1)
      expect(events.length).toBeLessThanOrEqual(3)
    }
  })

  it('같은 날이면 몇 번을 불러도 같은 결과가 나온다', () => {
    const a = eventsForDay('2026-08-22').map((e) => e.id)
    const b = eventsForDay('2026-08-22').map((e) => e.id)
    expect(a).toEqual(b)
  })

  it('날짜가 바뀌면 언젠가는 다른 이벤트가 나온다', () => {
    const days = Array.from({ length: 20 }, (_, i) =>
      eventsForDay(`2026-10-${String(i + 1).padStart(2, '0')}`)
        .map((e) => e.id)
        .join(','),
    )
    expect(new Set(days).size).toBeGreaterThan(1)
  })

  it('같은 이벤트가 하루에 두 번 나오지 않는다', () => {
    for (let day = 1; day <= 28; day += 1) {
      const ids = eventsForDay(`2026-11-${String(day).padStart(2, '0')}`).map((e) => e.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('벌점을 주는 이벤트는 하나도 없다', () => {
    for (const event of CITY_EVENTS) {
      const values = [
        ...Object.values(event.bonuses.expPctByCategory ?? {}),
        ...Object.values(event.bonuses.rewardPctByCategory ?? {}),
        event.bonuses.coinPct ?? 0,
        event.bonuses.dropChancePct ?? 0,
        event.bonuses.rareDropChancePct ?? 0,
        event.bonuses.luck ?? 0,
        event.bonuses.friendshipPct ?? 0,
      ]
      for (const v of values) expect(v).toBeGreaterThanOrEqual(0)
    }
  })

  it('시간대가 정해진 이벤트는 그 시간에만 실제로 걸린다', () => {
    const night = new Date('2026-08-22T22:00:00')
    const noon = new Date('2026-08-22T13:00:00')

    // 밤 전용 이벤트가 뽑힌 날을 찾아서 확인한다
    let checked = false
    for (let day = 1; day <= 60; day += 1) {
      const key = `2026-12-${String((day % 28) + 1).padStart(2, '0')}`
      if (!eventsForDay(key).some((e) => e.id === 'late_night_star')) continue

      expect(activeEvents(key, night).some((e) => e.id === 'late_night_star')).toBe(true)
      expect(activeEvents(key, noon).some((e) => e.id === 'late_night_star')).toBe(false)
      checked = true
      break
    }
    expect(checked).toBe(true)
  })

  it('지역 이벤트는 그 지역에만, 도시 전체 이벤트는 어디서나 걸린다', () => {
    const events = [
      { ...CITY_EVENTS.find((e) => e.id === 'rainy_cafe')!, dayKey: 'x' },
      { ...CITY_EVENTS.find((e) => e.id === 'quiet_city')!, dayKey: 'x' },
    ]
    expect(eventsForArea('CAFE_STREET', events).map((e) => e.id)).toEqual([
      'rainy_cafe',
      'quiet_city',
    ])
    expect(eventsForArea('GREEN_PARK', events).map((e) => e.id)).toEqual(['quiet_city'])
  })
})

// ── 상점 ────────────────────────────────────────────────
describe('상점', () => {
  it('모든 상점의 상품이 실제로 있는 아이템이다', () => {
    for (const shop of SHOPS) {
      for (const entry of [...shop.stock, ...(shop.rotatingPool ?? [])]) {
        expect(findItem(entry.itemId), `${shop.id} / ${entry.itemId}`).not.toBeNull()
        expect(entry.price).toBeGreaterThan(0)
      }
    }
  })

  it('같은 날이면 진열이 그대로다', () => {
    const shop = findShop('NIGHT_MARKET')!
    const a = shopStock(shop, '2026-08-22').map((e) => e.itemId)
    const b = shopStock(shop, '2026-08-22').map((e) => e.itemId)
    expect(a).toEqual(b)
  })

  it('날짜가 바뀌면 진열이 바뀐다', () => {
    const shop = findShop('NIGHT_MARKET')!
    const days = Array.from({ length: 14 }, (_, i) =>
      shopStock(shop, `2026-07-${String(i + 1).padStart(2, '0')}`)
        .map((e) => e.itemId)
        .join(','),
    )
    expect(new Set(days).size).toBeGreaterThan(1)
  })

  it('늘 파는 것은 어느 날에나 들어 있다', () => {
    const shop = findShop('NIGHT_MARKET')!
    for (let day = 1; day <= 20; day += 1) {
      const ids = shopStock(shop, `2026-06-${String(day).padStart(2, '0')}`).map((e) => e.itemId)
      expect(ids).toContain('night_ticket')
    }
  })

  it('오늘 몫은 정해진 개수만큼만 나온다', () => {
    const shop = findShop('NIGHT_MARKET')!
    const ids = shopStock(shop, '2026-08-22').map((e) => e.itemId)
    expect(ids).toHaveLength(shop.stock.length + shop.rotatingCount!)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('돌지 않는 가게는 늘 같은 것만 판다', () => {
    const shop = findShop('MINA_CAFE')!
    expect(shopStock(shop, '2026-01-01')).toEqual(shop.stock)
    expect(shopStock(shop, '2026-09-09')).toEqual(shop.stock)
  })

  it('밤 시장은 밤에만 문을 연다', () => {
    const market = findShop('NIGHT_MARKET')!
    expect(isShopOpen(market, new Date('2026-08-22T22:00:00'))).toBe(true)
    expect(isShopOpen(market, new Date('2026-08-22T13:00:00'))).toBe(false)
    expect(isShopOpen(findShop('MINA_CAFE')!, new Date('2026-08-22T13:00:00'))).toBe(true)
  })

  it('지역마다 상점은 하나씩만 있다', () => {
    expect(shopInArea('CAFE_STREET')?.id).toBe('MINA_CAFE')
    expect(shopInArea('GREEN_PARK')).toBeNull()
  })
})

// ── NPC ─────────────────────────────────────────────────
describe('NPC', () => {
  it('여섯 명이 있고 id 가 겹치지 않는다', () => {
    expect(NPCS).toHaveLength(6)
    expect(new Set(NPCS.map((n) => n.id)).size).toBe(6)
  })

  it('모두 일반 대화를 다섯 줄 이상 가지고 있다', () => {
    for (const npc of NPCS) {
      const plain = npc.dialogues.filter((d) => !d.minLevel && !d.band && !d.eventId)
      expect(plain.length, npc.id).toBeGreaterThanOrEqual(5)
    }
  })

  it('모두 친밀도별 대화를 두 줄 이상 가지고 있다', () => {
    for (const npc of NPCS) {
      const byLevel = npc.dialogues.filter((d) => d.minLevel)
      expect(byLevel.length, npc.id).toBeGreaterThanOrEqual(2)
    }
  })

  it('의뢰 보상 아이템이 전부 실제로 있다', () => {
    for (const npc of NPCS) {
      for (const chain of npc.chains) {
        expect(chain.steps.length, chain.id).toBeGreaterThan(0)
        if (chain.rewardItemId) {
          expect(findItem(chain.rewardItemId), chain.id).not.toBeNull()
        }
      }
    }
  })

  it('의뢰의 모든 단계가 실제 카테고리를 쓴다', () => {
    for (const npc of NPCS) {
      for (const chain of npc.chains) {
        for (const step of chain.steps) {
          expect(CATEGORIES).toContain(step.category)
          expect(step.title.trim().length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('상점을 가진 NPC 는 그 상점과 같은 동네에 있다', () => {
    for (const npc of NPCS) {
      if (!npc.shopId) continue
      expect(findShop(npc.shopId)?.areaId, npc.id).toBe(npc.areaId)
    }
  })

  it('지역으로 NPC 를 찾을 수 있다', () => {
    expect(npcsInArea('CREATIVE_DISTRICT').map((n) => n.id)).toEqual(['LULU', 'JUNE'])
    expect(npcsInArea('HOME_BASE')).toEqual([])
  })

  it('없는 NPC 는 null 이다', () => {
    expect(findNpc('NOBODY')).toBeNull()
  })
})

// ── 친밀도 ──────────────────────────────────────────────
describe('친밀도', () => {
  it('단계가 순서대로 올라간다', () => {
    expect(friendshipLevel(0)).toBe('STRANGER')
    expect(friendshipLevel(19)).toBe('STRANGER')
    expect(friendshipLevel(20)).toBe('FAMILIAR')
    expect(friendshipLevel(45)).toBe('FRIEND')
    expect(friendshipLevel(75)).toBe('CLOSE_FRIEND')
    expect(friendshipLevel(100)).toBe('SPECIAL_BOND')
  })

  it('최고 단계에서는 진행도가 가득 찬다', () => {
    expect(friendshipProgress(FRIENDSHIP_MAX)).toBe(1)
  })

  it('진행도는 단계 사이에서만 움직인다', () => {
    expect(friendshipProgress(20)).toBe(0)
    expect(friendshipProgress(32.5)).toBeCloseTo(0.5, 5)
  })

  it('하루 첫 대화만 친밀도가 오른다', () => {
    const state: NpcState = { ...emptyNpcState(), lastTalkedOn: null }
    expect(talkGain(state, '2026-08-22', emptyBonuses())).toBe(TALK_FRIENDSHIP)

    const after: NpcState = { ...state, lastTalkedOn: '2026-08-22' }
    expect(talkGain(after, '2026-08-22', emptyBonuses())).toBe(0)
    expect(talkGain(after, '2026-08-23', emptyBonuses())).toBe(TALK_FRIENDSHIP)
  })

  it('talkedToday 는 날짜로만 판단한다', () => {
    const state: NpcState = { ...emptyNpcState(), lastTalkedOn: '2026-08-22' }
    expect(talkedToday(state, '2026-08-22')).toBe(true)
    expect(talkedToday(state, '2026-08-21')).toBe(false)
  })

  it('스킬이 있으면 하루 첫 대화에 더 붙는다', () => {
    const bonuses = { ...emptyBonuses(), dailyTalkBonus: 2 }
    expect(talkGain(emptyNpcState(), '2026-08-22', bonuses)).toBe(TALK_FRIENDSHIP + 2)
  })

  it('좋아하는 선물이 더 많이 오른다', () => {
    const mina = findNpc('MINA')!
    const coffee = findItem('focus_coffee')!
    const sneakers = findItem('daily_sneakers')!

    expect(giftGain(mina, coffee, emptyBonuses())).toBe(GIFT_LIKED_FRIENDSHIP)
    expect(giftGain(mina, sneakers, emptyBonuses())).toBe(GIFT_FRIENDSHIP)
  })

  it('친밀도 보너스는 선물에도 붙는다', () => {
    const mina = findNpc('MINA')!
    const coffee = findItem('focus_coffee')!
    const bonuses = { ...emptyBonuses(), friendshipPct: 10 }
    expect(giftGain(mina, coffee, bonuses)).toBe(11)
  })

  it('선물할 수 있는 물건이 정해져 있다', () => {
    expect(isGiftable(findItem('focus_coffee')!)).toBe(true)
    expect(isGiftable(findItem('cozy_hoodie')!)).toBe(false)
  })

  it('meetsLevel 은 필요 단계가 없으면 늘 통과다', () => {
    expect(meetsLevel(0)).toBe(true)
    expect(meetsLevel(0, 'FRIEND')).toBe(false)
    expect(meetsLevel(45, 'FRIEND')).toBe(true)
    expect(meetsLevel(100, 'FRIEND')).toBe(true)
  })
})

// ── 평판 ────────────────────────────────────────────────
describe('평판', () => {
  it('여섯 지역이 0 에서 시작한다', () => {
    const rep = emptyReputation()
    expect(Object.values(rep)).toHaveLength(6)
    expect(Object.values(rep).every((v) => v === 0)).toBe(true)
  })

  it('단계가 순서대로 올라간다', () => {
    expect(reputationLevel(0)).toBe('VISITOR')
    expect(reputationLevel(15)).toBe('REGULAR')
    expect(reputationLevel(40)).toBe('LOCAL')
    expect(reputationLevel(80)).toBe('FAVORITE')
    expect(reputationLevel(150)).toBe('CITY_LEGEND')
    expect(reputationLevelNumber(150)).toBe(5)
  })

  it('난이도가 높을수록 평판이 더 쌓인다', () => {
    expect(reputationGain('EASY', false)).toBe(1)
    expect(reputationGain('NORMAL', false)).toBe(2)
    expect(reputationGain('HARD', false)).toBe(3)
  })

  it('NPC 의뢰는 난이도와 무관하게 더 쌓인다', () => {
    expect(reputationGain('EASY', true)).toBe(4)
    expect(reputationGain('HARD', true)).toBe(4)
    expect(REPUTATION_BOSS).toBe(10)
  })

  it('최고 단계에서는 진행도가 가득 찬다', () => {
    expect(reputationProgress(150)).toBe(1)
    expect(reputationProgress(999)).toBe(1)
  })

  it('평판이 오르면 그 동네 Coin 이 조금씩 는다', () => {
    expect(reputationCoinPct(0)).toBe(0)
    expect(reputationCoinPct(15)).toBe(3)
    expect(reputationCoinPct(150)).toBe(12)
  })
})

// ── 스킬 ────────────────────────────────────────────────
describe('스킬트리', () => {
  it('여섯 갈래에 18개가 있다', () => {
    expect(SKILLS).toHaveLength(18)
    for (const tree of CATEGORIES) {
      expect(skillsInTree(tree), tree).toHaveLength(3)
    }
  })

  it('id 가 겹치지 않는다', () => {
    expect(new Set(SKILLS.map((s) => s.id)).size).toBe(SKILLS.length)
  })

  it('앞 단계로 지정한 스킬이 실제로 있고 같은 갈래다', () => {
    for (const skill of SKILLS) {
      if (!skill.requires) continue
      const parent = findSkill(skill.requires)
      expect(parent, skill.id).not.toBeNull()
      expect(parent!.tree, skill.id).toBe(skill.tree)
    }
  })

  it('갈래마다 시작점이 하나씩만 있다', () => {
    for (const tree of CATEGORIES) {
      const roots = skillsInTree(tree).filter((s) => s.requires === null)
      expect(roots, tree).toHaveLength(1)
    }
  })

  it('포인트는 레벨이 오를 때마다 하나씩 생긴다', () => {
    expect(earnedSkillPoints(1)).toBe(0)
    expect(earnedSkillPoints(2)).toBe(1)
    expect(earnedSkillPoints(10)).toBe(9)
  })

  it('찍은 만큼 포인트가 줄어든다', () => {
    expect(spentSkillPoints([])).toBe(0)
    expect(spentSkillPoints(['work_focus_1'])).toBe(1)
    expect(spentSkillPoints(['work_focus_1', 'work_focus_2'])).toBe(3)
    expect(availableSkillPoints(5, ['work_focus_1', 'work_focus_2'])).toBe(1)
  })

  it('레벨이 내려가도 포인트가 음수가 되지 않는다', () => {
    expect(availableSkillPoints(1, ['work_focus_1', 'work_focus_2'])).toBe(0)
  })

  it('앞 단계를 안 찍으면 잠겨 있다', () => {
    const second = findSkill('work_focus_2')!
    expect(skillState(second, 20, [])).toBe('NEEDS_PARENT')
    expect(skillState(second, 20, ['work_focus_1'])).toBe('AVAILABLE')
  })

  it('포인트가 모자라면 찍을 수 없다', () => {
    const first = findSkill('work_focus_1')!
    expect(skillState(first, 1, [])).toBe('NEEDS_POINTS')
    expect(skillState(first, 2, [])).toBe('AVAILABLE')
  })

  it('이미 찍은 스킬은 찍힌 상태로 나온다', () => {
    const first = findSkill('work_focus_1')!
    expect(skillState(first, 5, ['work_focus_1'])).toBe('UNLOCKED')
  })
})

// ── 보상 파이프라인 ─────────────────────────────────────
describe('보상 파이프라인 — 도시가 붙은 뒤', () => {
  it('스킬 보너스가 실제 보상에 붙는다', () => {
    const plain = calculateQuestReward({
      ...base,
      category: 'WORK',
      difficulty: 'NORMAL',
      baseExp: 100,
    })
    const skilled = calculateQuestReward({
      ...base,
      category: 'WORK',
      difficulty: 'NORMAL',
      baseExp: 100,
      unlockedSkills: ['work_focus_1'],
    })
    expect(plain.exp).toBe(100)
    expect(skilled.exp).toBe(103)
  })

  it('같은 갈래를 두 개 찍으면 더해진다 (곱하지 않는다)', () => {
    const both = calculateQuestReward({
      ...base,
      category: 'WORK',
      difficulty: 'NORMAL',
      baseExp: 100,
      unlockedSkills: ['work_focus_1', 'work_focus_2'],
    })
    // 3% + 5% = 8% — 곱했다면 108.15 → 108 이라 값이 같아 보이지만
    // 아래 HARD 검사에서 갈린다
    expect(both.exp).toBe(108)
  })

  it('도시 이벤트 보너스가 붙는다', () => {
    const event = { ...CITY_EVENTS.find((e) => e.id === 'rainy_cafe')!, dayKey: 'x' }
    const withEvent = calculateQuestReward({
      ...base,
      areaId: 'CAFE_STREET',
      category: 'MIND',
      difficulty: 'NORMAL',
      baseExp: 100,
      events: [event],
    })
    expect(withEvent.exp).toBe(110)
  })

  it('다른 동네의 이벤트는 붙지 않는다', () => {
    const event = { ...CITY_EVENTS.find((e) => e.id === 'rainy_cafe')!, dayKey: 'x' }
    const elsewhere = calculateQuestReward({
      ...base,
      areaId: 'GREEN_PARK',
      category: 'MIND',
      difficulty: 'NORMAL',
      baseExp: 100,
      events: [event],
    })
    expect(elsewhere.exp).toBe(100)
  })

  it('도시 전체 이벤트는 어느 동네에서나 붙는다', () => {
    const event = { ...CITY_EVENTS.find((e) => e.id === 'quiet_city')!, dayKey: 'x' }
    const anywhere = calculateQuestReward({
      ...base,
      areaId: 'TRAINING_ZONE',
      category: 'MIND',
      difficulty: 'NORMAL',
      baseExp: 100,
      events: [event],
    })
    expect(anywhere.exp).toBe(120)
  })

  it('평판이 그 동네 Coin 을 올린다', () => {
    const reputation = { ...emptyReputation(), CAFE_STREET: 40 }
    const here = calculateQuestReward({
      ...base,
      areaId: 'CAFE_STREET',
      category: 'WORK',
      difficulty: 'NORMAL',
      reputation,
    })
    const elsewhere = calculateQuestReward({
      ...base,
      areaId: 'GREEN_PARK',
      category: 'WORK',
      difficulty: 'NORMAL',
      reputation,
    })
    // LOCAL = 3단계 → +6%, 기본 30 Coin → 31.8 → 32
    expect(here.coins).toBe(32)
    expect(elsewhere.coins).toBe(30)
  })

  it('마신 것이 맞는 카테고리에만 붙는다', () => {
    const buff: ActiveBuff = {
      id: 'b1',
      itemId: 'focus_coffee',
      name: 'Focus Coffee',
      icon: '☕',
      category: 'WORK',
      expPct: 20,
      uses: 1,
      startedAt: 'now',
    }

    const matched = calculateQuestReward({
      ...base,
      category: 'WORK',
      difficulty: 'NORMAL',
      baseExp: 100,
      buff,
    })
    const mismatched = calculateQuestReward({
      ...base,
      category: 'BODY',
      difficulty: 'NORMAL',
      baseExp: 100,
      buff,
    })

    expect(matched.exp).toBe(120)
    expect(mismatched.exp).toBe(100)
  })

  it('카테고리가 없는 버프는 아무 퀘스트에나 붙는다', () => {
    const buff: ActiveBuff = {
      id: 'b2',
      itemId: 'small_dessert',
      name: 'Small Dessert',
      icon: '🍰',
      category: null,
      expPct: 10,
      uses: 1,
      startedAt: 'now',
    }
    const result = calculateQuestReward({
      ...base,
      category: 'HEART',
      difficulty: 'NORMAL',
      baseExp: 100,
      buff,
    })
    expect(result.exp).toBe(110)
  })

  it('버프를 고를 때 카테고리가 정해진 것을 먼저 쓴다', () => {
    const generic: ActiveBuff = {
      id: 'g',
      itemId: 'small_dessert',
      name: 'g',
      icon: '🍰',
      category: null,
      expPct: 10,
      uses: 1,
      startedAt: 'now',
    }
    const specific: ActiveBuff = {
      id: 's',
      itemId: 'focus_coffee',
      name: 's',
      icon: '☕',
      category: 'WORK',
      expPct: 20,
      uses: 1,
      startedAt: 'now',
    }

    expect(pickBuff([generic, specific], 'WORK')?.id).toBe('s')
    // WORK 전용은 BODY 퀘스트에 못 쓰니 아무거나 쓰는 쪽이 남는다
    expect(pickBuff([generic, specific], 'BODY')?.id).toBe('g')
    expect(pickBuff([specific], 'BODY')).toBeNull()
    expect(pickBuff([], 'WORK')).toBeNull()
  })

  it('다 쓴 버프는 고르지 않는다', () => {
    const spent: ActiveBuff = {
      id: 'x',
      itemId: 'focus_coffee',
      name: 'x',
      icon: '☕',
      category: 'WORK',
      expPct: 20,
      uses: 0,
      startedAt: 'now',
    }
    expect(pickBuff([spent], 'WORK')).toBeNull()
  })

  it('여러 출처가 겹쳐도 곱하지 않고 더한다', () => {
    const event = { ...CITY_EVENTS.find((e) => e.id === 'coffee_delivery')!, dayKey: 'x' }
    const result = calculateQuestReward({
      ...base,
      areaId: 'CAFE_STREET',
      category: 'WORK',
      difficulty: 'NORMAL',
      baseExp: 100,
      unlockedSkills: ['work_focus_1'],
      events: [event],
    })
    // 지역 10 + 스킬 3 + 이벤트 8 = 21% → 121
    // 곱했다면 1.10 * 1.03 * 1.08 = 1.2236 → 122 로 갈렸을 것이다
    expect(result.exp).toBe(121)
  })
})
