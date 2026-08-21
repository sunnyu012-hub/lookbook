import type {
  AreaId,
  Bonuses,
  Category,
  ClassId,
  Difficulty,
  DropResult,
  EquippedItems,
  Rarity,
  RewardBreakdown,
  StatKey,
} from '@/types'
import { RARITIES } from '@/types'
import { expForDifficulty } from '../difficulty'
import { findArea, findClass, findItem } from './content'

/**
 * 보상 계산.
 *
 * 장비·직업·지역이 전부 같은 모양(Bonuses)으로 보너스를 내놓고,
 * 여기 한 군데에서만 합쳐진다. 밸런스를 고칠 일이 생기면 이 파일과 content.ts 만 본다.
 */

/** 난이도별 기본 Coin */
export const DIFFICULTY_COINS: Record<Difficulty, number> = {
  EASY: 5,
  NORMAL: 10,
  HARD: 20,
}

/** 등급별 기본 드롭 확률 (%) */
export const BASE_DROP_CHANCE: Record<Rarity, number> = {
  COMMON: 20,
  RARE: 7,
  EPIC: 2,
  LEGENDARY: 0.3,
}

export function emptyBonuses(): Bonuses {
  return {
    expPctByCategory: {},
    hardExpPct: 0,
    rewardPctByCategory: {},
    dropChancePct: 0,
    rareDropChancePct: 0,
    coinPct: 0,
    luck: 0,
  }
}

function merge(into: Bonuses, add: Partial<Bonuses> | undefined): Bonuses {
  if (!add) return into

  for (const [category, pct] of Object.entries(add.expPctByCategory ?? {})) {
    const key = category as Category
    into.expPctByCategory[key] = (into.expPctByCategory[key] ?? 0) + (pct ?? 0)
  }
  for (const [category, pct] of Object.entries(add.rewardPctByCategory ?? {})) {
    const key = category as Category
    into.rewardPctByCategory[key] = (into.rewardPctByCategory[key] ?? 0) + (pct ?? 0)
  }
  into.hardExpPct += add.hardExpPct ?? 0
  into.dropChancePct += add.dropChancePct ?? 0
  into.rareDropChancePct += add.rareDropChancePct ?? 0
  into.coinPct += add.coinPct ?? 0
  into.luck += add.luck ?? 0
  return into
}

/** 장착 중인 장비의 보너스만 모은다. */
export function calculateEquipmentBonus(equipped: EquippedItems): Bonuses {
  const total = emptyBonuses()
  for (const itemId of Object.values(equipped)) {
    if (!itemId) continue
    merge(total, findItem(itemId)?.bonuses)
  }
  return total
}

export interface BonusSources {
  classId: ClassId | null
  equipped: EquippedItems
  areaId: AreaId
}

/** 직업 + 장비 + 지역을 하나로 합친다. */
export function collectBonuses({ classId, equipped, areaId }: BonusSources): Bonuses {
  const total = emptyBonuses()
  merge(total, findClass(classId)?.bonuses)
  merge(total, calculateEquipmentBonus(equipped))
  merge(total, findArea(areaId).bonuses)
  return total
}

export interface QuestRewardInput extends BonusSources {
  category: Category
  difficulty: Difficulty
  /** 퀘스트에 굳혀둔 EXP. 없으면 난이도로 계산한다. */
  baseExp?: number
}

/**
 * 퀘스트 하나의 보상.
 *
 * 순서: 기본 → 난이도 → 직업 → 장비 → 지역.
 * 퍼센트는 곱하지 않고 모두 더한 뒤 한 번에 적용한다.
 * 곱하면 장비를 몇 개 끼웠는지에 따라 값이 튀어서 예측이 안 된다.
 */
export function calculateQuestReward(input: QuestRewardInput): RewardBreakdown {
  const { category, difficulty, areaId, classId, equipped } = input
  const baseExp = input.baseExp ?? expForDifficulty(difficulty)
  const baseCoins = DIFFICULTY_COINS[difficulty]

  const bonuses = collectBonuses({ classId, equipped, areaId })

  const categoryExpPct = bonuses.expPctByCategory[category] ?? 0
  const categoryRewardPct = bonuses.rewardPctByCategory[category] ?? 0
  const hardPct = difficulty === 'HARD' ? bonuses.hardExpPct : 0

  const expPct = categoryExpPct + categoryRewardPct + hardPct
  const coinPct = categoryRewardPct + bonuses.coinPct

  // 올림이 아니라 반올림. +5% 가 늘 +1 이 되어버리면 등급 차이가 사라진다.
  const exp = Math.max(0, Math.round(baseExp * (1 + expPct / 100)))
  const coins = Math.max(0, Math.round(baseCoins * (1 + coinPct / 100)))

  return {
    baseExp,
    baseCoins,
    exp,
    coins,
    bonusExp: exp - baseExp,
    bonusCoins: coins - baseCoins,
  }
}

/** 등급별 최종 드롭 확률 (%) */
export function calculateDropChance(sources: BonusSources): Record<Rarity, number> {
  const bonuses = collectBonuses(sources)
  const result = {} as Record<Rarity, number>

  for (const rarity of RARITIES) {
    const rareBonus = rarity === 'COMMON' ? 0 : bonuses.rareDropChancePct
    result[rarity] = Math.max(
      0,
      BASE_DROP_CHANCE[rarity] + bonuses.dropChancePct + rareBonus,
    )
  }
  return result
}

/**
 * 드롭을 굴린다.
 *
 * 귀한 등급부터 확인해서, 한 번 걸리면 거기서 멈춘다.
 * 그래야 EPIC 이 떴는데 COMMON 으로 덮이는 일이 없다.
 */
export function rollDrop(
  sources: BonusSources,
  itemsByRarity: (rarity: Rarity) => string[],
  random: () => number = Math.random,
): DropResult | null {
  const chances = calculateDropChance(sources)

  for (const rarity of [...RARITIES].reverse()) {
    const pool = itemsByRarity(rarity)
    if (pool.length === 0) continue
    if (random() * 100 >= chances[rarity]) continue

    const picked = pool[Math.floor(random() * pool.length) % pool.length]
    return { itemId: picked, rarity }
  }
  return null
}

/** 카테고리를 하나 끝냈을 때 오르는 스탯 */
export const STAT_BY_CATEGORY: Record<Category, StatKey> = {
  LIFE: 'ENERGY',
  WORK: 'FOCUS',
  BODY: 'VITALITY',
  PLAY: 'CREATIVITY',
  MIND: 'FOCUS',
  HEART: 'CONNECTION',
}
