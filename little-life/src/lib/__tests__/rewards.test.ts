import { describe, expect, it } from 'vitest'
import type { EquippedItems, Rarity } from '@/types'
import { EQUIP_SLOTS } from '@/types'
import {
  BASE_DROP_CHANCE,
  DIFFICULTY_COINS,
  calculateDropChance,
  calculateEquipmentBonus,
  calculateQuestReward,
  collectBonuses,
  rollDrop,
} from '../rpg/rewards'
import { AREAS, CLASSES, ITEMS } from '../rpg/content'

function equipped(partial: Partial<EquippedItems> = {}): EquippedItems {
  const base = EQUIP_SLOTS.reduce((acc, slot) => {
    acc[slot] = null
    return acc
  }, {} as EquippedItems)
  return { ...base, ...partial }
}

const bare = { classId: null, equipped: equipped(), areaId: 'HOME_BASE' as const }

describe('calculateQuestReward — 기본', () => {
  it('아무 보너스가 없으면 난이도 기본값 그대로', () => {
    const r = calculateQuestReward({ ...bare, areaId: 'CAFE_STREET', category: 'BODY', difficulty: 'NORMAL' })
    expect(r).toMatchObject({ baseExp: 20, baseCoins: 10, exp: 20, coins: 10 })
  })

  it('난이도별 Coin 은 5 / 10 / 20', () => {
    expect(DIFFICULTY_COINS).toEqual({ EASY: 5, NORMAL: 10, HARD: 20 })
  })

  it('퀘스트에 굳혀둔 EXP 가 있으면 그걸 쓴다', () => {
    const r = calculateQuestReward({ ...bare, areaId: 'CAFE_STREET', category: 'WORK', difficulty: 'EASY', baseExp: 999 })
    expect(r.baseExp).toBe(999)
  })
})

describe('calculateQuestReward — 지역 버프', () => {
  it('Cafe Street 에서 WORK 20 EXP → 22', () => {
    const r = calculateQuestReward({ ...bare, areaId: 'CAFE_STREET', category: 'WORK', difficulty: 'NORMAL' })
    expect(r.exp).toBe(22)
  })

  it('버프와 안 맞는 카테고리는 그대로', () => {
    const r = calculateQuestReward({ ...bare, areaId: 'CAFE_STREET', category: 'HEART', difficulty: 'NORMAL' })
    expect(r.exp).toBe(20)
  })

  it('Training Zone 의 BODY 보상은 EXP 와 Coin 둘 다 오른다', () => {
    const r = calculateQuestReward({ ...bare, areaId: 'TRAINING_ZONE', category: 'BODY', difficulty: 'NORMAL' })
    expect(r.exp).toBe(23) // 20 * 1.15
    expect(r.coins).toBe(12) // 10 * 1.15 → 11.5 → 12
  })
})

describe('calculateQuestReward — 장비', () => {
  it('명세 예시: WORK 20 EXP + 헤드폰(+5%) → 21', () => {
    const r = calculateQuestReward({
      ...bare,
      category: 'WORK',
      difficulty: 'NORMAL',
      equipped: equipped({ ACCESSORY: 'noise_cancelling_headphones' }),
    })
    expect(r.exp).toBe(21)
    expect(r.bonusExp).toBe(1)
  })

  it('Hard 보너스는 Hard 에만 붙는다', () => {
    const withWatch = { ...bare, equipped: equipped({ ACCESSORY: 'focus_watch' }) }

    expect(calculateQuestReward({ ...withWatch, category: 'WORK', difficulty: 'HARD' }).exp).toBe(42)
    expect(calculateQuestReward({ ...withWatch, category: 'WORK', difficulty: 'NORMAL' }).exp).toBe(20)
  })

  it('장비 여러 개는 더해서 한 번에 적용한다', () => {
    const bonus = calculateEquipmentBonus(
      equipped({ HEAD: 'perfect_work_headset', ACCESSORY: 'noise_cancelling_headphones' }),
    )
    expect(bonus.expPctByCategory.WORK).toBe(13)
  })

  it('빈 슬롯은 아무 영향이 없다', () => {
    expect(calculateEquipmentBonus(equipped())).toMatchObject({ hardExpPct: 0, luck: 0 })
  })
})

describe('calculateQuestReward — 직업', () => {
  it('Mover 는 BODY EXP +10%', () => {
    const r = calculateQuestReward({ ...bare, classId: 'MOVER', category: 'BODY', difficulty: 'NORMAL' })
    expect(r.exp).toBe(22)
  })

  it('Explorer 는 Coin 만 오른다', () => {
    const r = calculateQuestReward({ ...bare, classId: 'EXPLORER', category: 'WORK', difficulty: 'NORMAL' })
    expect(r.coins).toBe(11)
    expect(r.exp).toBe(20)
  })
})

describe('calculateQuestReward — 직업 + 장비 + 지역이 함께', () => {
  it('셋을 더한 뒤 한 번에 적용한다', () => {
    // Mover(BODY +10) + Lucky Sneakers(BODY +5) + Green Park(BODY +10) = +25%
    const r = calculateQuestReward({
      classId: 'MOVER',
      equipped: equipped({ SHOES: 'lucky_sneakers' }),
      areaId: 'GREEN_PARK',
      category: 'BODY',
      difficulty: 'NORMAL',
    })
    expect(r.exp).toBe(25)
    expect(r.bonusExp).toBe(5)
  })

  it('퍼센트를 곱하지 않는다 — 더한 값과 같아야 한다', () => {
    // 곱했다면 20 * 1.10 * 1.05 * 1.10 = 25.41 → 25 로 우연히 같을 수 있어
    // 값이 큰 쪽으로 확인한다
    const r = calculateQuestReward({
      classId: 'MOVER',
      equipped: equipped({ SHOES: 'lucky_sneakers' }),
      areaId: 'GREEN_PARK',
      category: 'BODY',
      difficulty: 'HARD',
    })
    expect(r.exp).toBe(50) // 40 * 1.25. 곱셈이면 40*1.1*1.05*1.1 = 50.82 → 51
  })
})

describe('calculateDropChance', () => {
  it('아무것도 없으면 기본 확률', () => {
    expect(calculateDropChance(bare)).toEqual(BASE_DROP_CHANCE)
  })

  it('Adventure Tote 는 모든 등급에 +2%p', () => {
    const c = calculateDropChance({ ...bare, equipped: equipped({ ACCESSORY: 'adventure_tote' }) })
    expect(c.COMMON).toBe(22)
    expect(c.RARE).toBe(9)
  })

  it('Rare 드롭 보너스는 COMMON 에는 안 붙는다', () => {
    const c = calculateDropChance({ ...bare, equipped: equipped({ CHARM: 'lucky_keyring' }) })
    expect(c.COMMON).toBe(20)
    expect(c.RARE).toBe(11)
    expect(c.EPIC).toBe(6)
  })

  it('Maker + Creative District 면 Rare 보너스가 쌓인다', () => {
    const c = calculateDropChance({ ...bare, classId: 'MAKER', areaId: 'CREATIVE_DISTRICT' })
    expect(c.RARE).toBe(7 + 3 + 3)
  })
})

describe('rollDrop', () => {
  const pool = (rarity: Rarity) => ITEMS.filter((i) => i.rarity === rarity).map((i) => i.id)

  it('확률이 아주 낮으면 대체로 안 나온다', () => {
    expect(rollDrop(bare, pool, () => 0.99)).toBeNull()
  })

  it('굴림이 0 이면 가장 귀한 등급부터 걸린다', () => {
    const drop = rollDrop(bare, pool, () => 0)
    expect(drop?.rarity).toBe('LEGENDARY')
  })

  it('귀한 게 걸리면 흔한 걸로 덮이지 않는다', () => {
    // EPIC(2%) 은 통과, LEGENDARY(0.3%) 는 실패하는 굴림
    let call = 0
    const random = () => {
      call += 1
      // 1번째: LEGENDARY 판정(실패), 2번째: EPIC 판정(성공), 3번째: 아이템 고르기
      if (call === 1) return 0.5
      return 0
    }
    const drop = rollDrop(bare, pool, random)
    expect(drop?.rarity).toBe('EPIC')
  })

  it('해당 등급에 아이템이 없으면 건너뛴다', () => {
    const onlyCommon = (rarity: Rarity) => (rarity === 'COMMON' ? ['favorite_mug'] : [])
    const drop = rollDrop(bare, onlyCommon, () => 0)
    expect(drop).toEqual({ itemId: 'favorite_mug', rarity: 'COMMON' })
  })
})

describe('content 무결성', () => {
  it('장비는 12개 이상이고 모두 슬롯이 있다', () => {
    const equipment = ITEMS.filter((i) => i.type === 'EQUIPMENT')
    expect(equipment.length).toBeGreaterThanOrEqual(12)
    expect(equipment.every((i) => i.equipSlot !== null)).toBe(true)
  })

  it('아이템 id 가 겹치지 않는다', () => {
    const ids = ITEMS.map((i) => i.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('지역 6개, 직업 5개', () => {
    expect(AREAS).toHaveLength(6)
    expect(CLASSES).toHaveLength(5)
  })

  it('모든 지역·직업 보너스가 실제로 뭔가를 준다', () => {
    for (const area of AREAS) {
      expect(Object.keys(area.bonuses).length).toBeGreaterThan(0)
    }
    for (const cls of CLASSES) {
      expect(Object.keys(cls.bonuses).length).toBeGreaterThan(0)
    }
  })

  it('collectBonuses 는 세 출처를 모두 합친다', () => {
    const b = collectBonuses({
      classId: 'CARETAKER',
      equipped: equipped({ TOP: 'cozy_hoodie' }),
      areaId: 'HOME_BASE',
    })
    // 직업 3 + 장비 3 + 지역 5
    expect(b.expPctByCategory.LIFE).toBe(11)
  })
})
