import type {
  ActiveBuff,
  AreaId,
  Bonuses,
  Category,
  CityEvent,
  ClassId,
  Difficulty,
  DropResult,
  EquippedItems,
  Rarity,
  Reputation,
  RewardBreakdown,
  StatKey,
} from '@/types'
import { RARITIES } from '@/types'
import { findSkill } from '@/lib/city/skills'
import { areaReputation, reputationCoinPct } from '@/lib/city/reputation'
import { expForDifficulty } from '../difficulty'
import { findArea, findClass, findItem } from './content'

/**
 * 보상 계산.
 *
 * 직업·장비·지역·스킬·평판·도시 이벤트·마신 것 — 전부 같은 모양(Bonuses)으로
 * 보너스를 내놓고, 여기 한 군데에서만 합쳐진다.
 * 어디서 온 보너스인지 계산하는 쪽은 알 필요가 없고,
 * 새 출처가 생겨도 이 파일의 계산식은 그대로다.
 */

/**
 * 난이도별 기본 Coin.
 *
 * 하루치를 하면 방에 놓을 것 하나는 살 수 있어야 한다.
 * 처음엔 5/10/20 이었는데, 그러면 제일 싼 러그(120)가 나흘치였다.
 * 나흘을 모아야 러그 하나면 그건 모으는 게 아니라 막힌 거다.
 */
export const DIFFICULTY_COINS: Record<Difficulty, number> = {
  EASY: 15,
  NORMAL: 30,
  HARD: 60,
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
    friendshipPct: 0,
    dailyTalkBonus: 0,
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
  into.friendshipPct += add.friendshipPct ?? 0
  into.dailyTalkBonus += add.dailyTalkBonus ?? 0
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

/** 찍어둔 스킬의 보너스만 모은다. */
export function calculateSkillBonus(unlockedSkills: string[]): Bonuses {
  const total = emptyBonuses()
  for (const id of unlockedSkills) {
    merge(total, findSkill(id)?.bonuses)
  }
  return total
}

export interface BonusSources {
  classId: ClassId | null
  equipped: EquippedItems
  areaId: AreaId
  /** 찍어둔 스킬 */
  unlockedSkills?: string[]
  /** 지금 열려 있는 도시 이벤트 */
  events?: CityEvent[]
  /** 지역별 평판 */
  reputation?: Reputation
}

/**
 * 모든 출처를 하나로 합친다.
 *
 * 순서: 직업 → 장비 → 지역 → 스킬 → 평판 → 도시 이벤트.
 * 전부 더하기라서 순서 자체는 결과를 바꾸지 않는다. 읽는 사람을 위한 순서다.
 */
export function collectBonuses(sources: BonusSources): Bonuses {
  const { classId, equipped, areaId, unlockedSkills, events, reputation } = sources
  const total = emptyBonuses()

  merge(total, findClass(classId)?.bonuses)
  merge(total, calculateEquipmentBonus(equipped))
  merge(total, findArea(areaId).bonuses)
  merge(total, calculateSkillBonus(unlockedSkills ?? []))

  // 평판은 지금 있는 동네 것만 붙는다
  if (reputation) {
    merge(total, { coinPct: reputationCoinPct(areaReputation(reputation, areaId)) })
  }

  // 도시 이벤트는 지금 있는 동네 것과 도시 전체 것만
  for (const event of events ?? []) {
    if (event.areaId === null || event.areaId === areaId) merge(total, event.bonuses)
  }

  return total
}

export interface QuestRewardInput extends BonusSources {
  category: Category
  difficulty: Difficulty
  /** 퀘스트에 굳혀둔 EXP. 없으면 난이도로 계산한다. */
  baseExp?: number
  /** 이번 퀘스트에 쓰이는 일시 버프 (마신 것) */
  buff?: ActiveBuff | null
}

/**
 * 퀘스트 하나의 보상.
 *
 * 퍼센트는 곱하지 않고 모두 더한 뒤 한 번에 적용한다.
 * 곱하면 장비를 몇 개 꼈는지, 스킬을 몇 개 찍었는지에 따라 값이 튀어서 예측이 안 된다.
 */
export function calculateQuestReward(input: QuestRewardInput): RewardBreakdown {
  const { category, difficulty, buff } = input
  const baseExp = input.baseExp ?? expForDifficulty(difficulty)
  const baseCoins = DIFFICULTY_COINS[difficulty]

  const bonuses = collectBonuses(input)

  const categoryExpPct = bonuses.expPctByCategory[category] ?? 0
  const categoryRewardPct = bonuses.rewardPctByCategory[category] ?? 0
  const hardPct = difficulty === 'HARD' ? bonuses.hardExpPct : 0
  const buffPct = buff && buffApplies(buff, category) ? buff.expPct : 0

  const expPct = categoryExpPct + categoryRewardPct + hardPct + buffPct
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

/** 이 버프가 이 카테고리 퀘스트에 걸리는지 */
export function buffApplies(buff: ActiveBuff, category: Category): boolean {
  return buff.category === null || buff.category === category
}

/** 이번 퀘스트에 쓰일 버프 하나를 고른다. 딱 맞는 것을 먼저 쓴다. */
export function pickBuff(buffs: ActiveBuff[], category: Category): ActiveBuff | null {
  const usable = buffs.filter((b) => buffApplies(b, category) && b.uses > 0)
  if (usable.length === 0) return null
  // 카테고리가 정해진 것부터 쓴다 — 아무 데나 쓰는 건 남겨두는 게 이득이다
  return usable.find((b) => b.category !== null) ?? usable[0]
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
