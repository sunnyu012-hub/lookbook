import type { Category, SkillDef } from '@/types'
import { CATEGORIES } from '@/types'

/**
 * 스킬트리.
 *
 * 여섯 갈래가 각각 세 단계다. 앞 단계를 찍어야 뒤가 열린다.
 * 되돌릴 수 없는 선택이지만, 포인트는 레벨이 오르면 계속 생기니까
 * "잘못 찍으면 끝" 이 되지 않는다.
 */
export const SKILLS: SkillDef[] = [
  // WORK
  {
    id: 'work_focus_1',
    tree: 'WORK',
    name: 'Focus I',
    effectLabel: 'WORK EXP +3%',
    cost: 1,
    requires: null,
    bonuses: { expPctByCategory: { WORK: 3 } },
  },
  {
    id: 'work_focus_2',
    tree: 'WORK',
    name: 'Focus II',
    effectLabel: 'WORK EXP +5%',
    cost: 2,
    requires: 'work_focus_1',
    bonuses: { expPctByCategory: { WORK: 5 } },
  },
  {
    id: 'work_deep',
    tree: 'WORK',
    name: 'Deep Work',
    effectLabel: 'Hard 퀘스트 EXP +8%',
    cost: 3,
    requires: 'work_focus_2',
    bonuses: { hardExpPct: 8 },
  },

  // LIFE
  {
    id: 'life_routine',
    tree: 'LIFE',
    name: 'Little Routine',
    effectLabel: 'LIFE EXP +3%',
    cost: 1,
    requires: null,
    bonuses: { expPctByCategory: { LIFE: 3 } },
  },
  {
    id: 'life_keeper',
    tree: 'LIFE',
    name: 'Home Keeper',
    effectLabel: 'LIFE 보상 +10%',
    cost: 2,
    requires: 'life_routine',
    bonuses: { rewardPctByCategory: { LIFE: 10 } },
  },
  {
    id: 'life_cozy',
    tree: 'LIFE',
    name: 'Cozy Master',
    effectLabel: 'LIFE · MIND EXP +5%',
    cost: 3,
    requires: 'life_keeper',
    bonuses: { expPctByCategory: { LIFE: 5, MIND: 5 } },
  },

  // BODY
  {
    id: 'body_move',
    tree: 'BODY',
    name: 'Move More',
    effectLabel: 'BODY EXP +3%',
    cost: 1,
    requires: null,
    bonuses: { expPctByCategory: { BODY: 3 } },
  },
  {
    id: 'body_step',
    tree: 'BODY',
    name: 'Strong Step',
    effectLabel: '드롭 확률 +2%',
    cost: 2,
    requires: 'body_move',
    bonuses: { dropChancePct: 2 },
  },
  {
    id: 'body_rhythm',
    tree: 'BODY',
    name: 'Training Rhythm',
    effectLabel: 'BODY 보상 +10%',
    cost: 3,
    requires: 'body_step',
    bonuses: { rewardPctByCategory: { BODY: 10 } },
  },

  // PLAY
  {
    id: 'play_curiosity',
    tree: 'PLAY',
    name: 'Curiosity',
    effectLabel: 'PLAY EXP +3%',
    cost: 1,
    requires: null,
    bonuses: { expPctByCategory: { PLAY: 3 } },
  },
  {
    id: 'play_treasure',
    tree: 'PLAY',
    name: 'Treasure Eye',
    effectLabel: 'Rare 이상 드롭 +2%',
    cost: 2,
    requires: 'play_curiosity',
    bonuses: { rareDropChancePct: 2 },
  },
  {
    id: 'play_burst',
    tree: 'PLAY',
    name: 'Inspiration Burst',
    effectLabel: 'PLAY 보상 +10%',
    cost: 3,
    requires: 'play_treasure',
    bonuses: { rewardPctByCategory: { PLAY: 10 } },
  },

  // MIND
  {
    id: 'mind_calm',
    tree: 'MIND',
    name: 'Calm Focus',
    effectLabel: 'MIND EXP +3%',
    cost: 1,
    requires: null,
    bonuses: { expPctByCategory: { MIND: 3 } },
  },
  {
    id: 'mind_quiet',
    tree: 'MIND',
    name: 'Quiet Time',
    effectLabel: 'MIND EXP +5%',
    cost: 2,
    requires: 'mind_calm',
    bonuses: { expPctByCategory: { MIND: 5 } },
  },
  {
    id: 'mind_clear',
    tree: 'MIND',
    name: 'Clear Mind',
    effectLabel: 'MIND 보상 +15%',
    cost: 3,
    requires: 'mind_quiet',
    bonuses: { rewardPctByCategory: { MIND: 15 } },
  },

  // HEART
  {
    id: 'heart_hello',
    tree: 'HEART',
    name: 'Warm Hello',
    effectLabel: '친밀도 획득 +10%',
    cost: 1,
    requires: null,
    bonuses: { friendshipPct: 10 },
  },
  {
    id: 'heart_familiar',
    tree: 'HEART',
    name: 'Familiar Face',
    effectLabel: '하루 첫 대화 친밀도 +2 더',
    cost: 2,
    requires: 'heart_hello',
    bonuses: { dailyTalkBonus: 2 },
  },
  {
    id: 'heart_city',
    tree: 'HEART',
    name: 'City Friend',
    effectLabel: 'HEART 보상 +15%',
    cost: 3,
    requires: 'heart_familiar',
    bonuses: { rewardPctByCategory: { HEART: 15 } },
  },
]

export function findSkill(id: string): SkillDef | null {
  return SKILLS.find((s) => s.id === id) ?? null
}

export function skillsInTree(tree: Category): SkillDef[] {
  return SKILLS.filter((s) => s.tree === tree)
}

export const SKILL_TREES: Category[] = [...CATEGORIES]

/**
 * 레벨로 지금까지 받은 스킬 포인트 전부.
 * LV.1 은 0개, 레벨이 하나 오를 때마다 1개.
 */
export function earnedSkillPoints(level: number): number {
  return Math.max(0, level - 1)
}

/** 찍어둔 스킬에 쓴 포인트 */
export function spentSkillPoints(unlocked: string[]): number {
  return unlocked.reduce((sum, id) => sum + (findSkill(id)?.cost ?? 0), 0)
}

/** 지금 쓸 수 있는 포인트 */
export function availableSkillPoints(level: number, unlocked: string[]): number {
  return Math.max(0, earnedSkillPoints(level) - spentSkillPoints(unlocked))
}

export type SkillLockReason = 'UNLOCKED' | 'AVAILABLE' | 'NEEDS_PARENT' | 'NEEDS_POINTS'

/** 이 스킬을 지금 찍을 수 있는지 */
export function skillState(
  skill: SkillDef,
  level: number,
  unlocked: string[],
): SkillLockReason {
  if (unlocked.includes(skill.id)) return 'UNLOCKED'
  if (skill.requires && !unlocked.includes(skill.requires)) return 'NEEDS_PARENT'
  if (availableSkillPoints(level, unlocked) < skill.cost) return 'NEEDS_POINTS'
  return 'AVAILABLE'
}
