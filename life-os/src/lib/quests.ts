/**
 * Daily Quest — 오늘 컨디션에 맞춘 아주 작은 행동 목록.
 * 지금은 UI 와 데이터 구조만 있고 XP 를 누적하지 않는다.
 * 나중에 XP/레벨을 붙일 때는 완료 기록(useQuests)의 questId 를 그대로 쓰면 된다.
 */
import type { EnergyMode } from '@/types'
import type { PixelAsset } from './pixelAssets.generated'
import { gear, icons, items } from './pixelAssets'

export interface Quest {
  id: string
  label: string
  xp: number
  icon: PixelAsset
}

const WATER: Quest = { id: 'water', label: '물 한 잔 마시기', xp: 3, icon: icons.water }
const MEAL: Quest = { id: 'meal', label: '뭐라도 제대로 먹기', xp: 8, icon: icons.food }
const EARLY_BED: Quest = { id: 'early-bed', label: '제발 일찍 자기', xp: 15, icon: icons.sleep }
const SHOWER: Quest = { id: 'shower', label: '씻기', xp: 3, icon: icons.shower }
const TIDY: Quest = { id: 'tidy', label: '바닥에 있는 것 좀 치우기', xp: 5, icon: icons.clean }
const OUTFIT: Quest = { id: 'outfit', label: '오늘 룩 저장', xp: 3, icon: icons.outfit }
const WALK: Quest = { id: 'walk', label: '10분 걷기', xp: 5, icon: gear.sneakers }
const CLIMB: Quest = { id: 'climb', label: '클라이밍 기록', xp: 10, icon: icons.climbing }
const COFFEE: Quest = { id: 'coffee', label: '따뜻한 거 한 잔', xp: 3, icon: items.coffeeMug }

const BY_MODE: Record<EnergyMode, Quest[]> = {
  RECOVERY: [WATER, MEAL, COFFEE, SHOWER, EARLY_BED],
  EASY: [WATER, MEAL, SHOWER, OUTFIT, EARLY_BED],
  NORMAL: [WATER, MEAL, TIDY, OUTFIT, WALK],
  POWER: [WATER, MEAL, TIDY, CLIMB, EARLY_BED],
}

export function questsFor(mode: EnergyMode): Quest[] {
  return BY_MODE[mode]
}

/** id → XP. 모드가 달라도 같은 퀘스트는 같은 XP 라서 한 곳에 모아 둔다. */
export const QUEST_XP: Record<string, number> = Object.fromEntries(
  Object.values(BY_MODE)
    .flat()
    .map((q) => [q.id, q.xp]),
)

/** 완료한 퀘스트 id 목록의 XP 합 */
export const xpOf = (questIds: string[]) =>
  questIds.reduce((sum, id) => sum + (QUEST_XP[id] ?? 0), 0)

export const totalXp = (quests: Quest[], done: string[]) =>
  quests.filter((q) => done.includes(q.id)).reduce((sum, q) => sum + q.xp, 0)
