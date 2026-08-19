/**
 * Daily Quest — 오늘 컨디션에 맞춘 아주 작은 행동 목록.
 * 지금은 UI 와 데이터 구조만 있고 XP 를 누적하지 않는다.
 * 나중에 XP/레벨을 붙일 때는 완료 기록(useQuests)의 questId 를 그대로 쓰면 된다.
 */
import type { EnergyMode } from '@/types'
import type { IconName } from './sprites.generated'

export interface Quest {
  id: string
  label: string
  xp: number
  icon: IconName
}

const WATER: Quest = { id: 'water', label: '물 한 잔 마시기', xp: 3, icon: 'drop' }
const MEAL: Quest = { id: 'meal', label: '밥 챙겨 먹기', xp: 5, icon: 'food' }
const EARLY_BED: Quest = { id: 'early-bed', label: '평소보다 일찍 눕기', xp: 10, icon: 'bed' }
const SHOWER: Quest = { id: 'shower', label: '따뜻하게 씻기', xp: 3, icon: 'sparkle' }
const WALK: Quest = { id: 'walk', label: '10분 걷기', xp: 5, icon: 'shoe' }
const AIR: Quest = { id: 'air', label: '창문 열고 환기하기', xp: 3, icon: 'sprout' }
const WORKOUT: Quest = { id: 'workout', label: '운동하기', xp: 10, icon: 'dumbbell' }
const BIG_TASK: Quest = { id: 'big-task', label: '미뤄둔 일 하나 끝내기', xp: 10, icon: 'star' }

const BY_MODE: Record<EnergyMode, Quest[]> = {
  RECOVERY: [WATER, MEAL, SHOWER, EARLY_BED],
  EASY: [WATER, MEAL, WALK, EARLY_BED],
  NORMAL: [WATER, MEAL, WALK, AIR],
  POWER: [WATER, MEAL, WORKOUT, BIG_TASK],
}

export function questsFor(mode: EnergyMode): Quest[] {
  return BY_MODE[mode]
}

export const totalXp = (quests: Quest[], done: string[]) =>
  quests.filter((q) => done.includes(q.id)).reduce((sum, q) => sum + q.xp, 0)
