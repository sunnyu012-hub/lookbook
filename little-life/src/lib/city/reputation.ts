import type { AreaId, Difficulty, Reputation, ReputationLevel } from '@/types'
import { AREA_IDS, REPUTATION_LEVELS } from '@/types'

/**
 * 지역 평판.
 *
 * 그 동네에서 실제로 뭔가 한 만큼 쌓인다. 줄어들지 않는다.
 * "안 가면 떨어진다" 를 만들면 그때부터 지도가 숙제가 된다.
 */

export const REPUTATION_THRESHOLDS = [0, 15, 40, 80, 150] as const

export const REPUTATION_LABEL: Record<ReputationLevel, string> = {
  VISITOR: '손님',
  REGULAR: '단골',
  LOCAL: '동네 사람',
  FAVORITE: '반가운 얼굴',
  CITY_LEGEND: '이 동네의 전설',
}

export const REPUTATION_KO: Record<ReputationLevel, string> = {
  VISITOR: '가끔 들르는 사람',
  REGULAR: '자주 오는 사람',
  LOCAL: '여기 사람',
  FAVORITE: '반가운 얼굴',
  CITY_LEGEND: '이 동네의 전설',
}

export function emptyReputation(): Reputation {
  return AREA_IDS.reduce((acc, id) => {
    acc[id] = 0
    return acc
  }, {} as Reputation)
}

export function reputationLevel(value: number): ReputationLevel {
  let level: ReputationLevel = 'VISITOR'
  for (let i = 0; i < REPUTATION_THRESHOLDS.length; i += 1) {
    if (value >= REPUTATION_THRESHOLDS[i]) level = REPUTATION_LEVELS[i]
  }
  return level
}

export function reputationLevelNumber(value: number): number {
  return REPUTATION_LEVELS.indexOf(reputationLevel(value)) + 1
}

/** 다음 단계까지 (0~1). 최고 단계면 1. */
export function reputationProgress(value: number): number {
  const index = REPUTATION_LEVELS.indexOf(reputationLevel(value))
  if (index >= REPUTATION_THRESHOLDS.length - 1) return 1

  const from = REPUTATION_THRESHOLDS[index]
  const to = REPUTATION_THRESHOLDS[index + 1]
  return Math.min(1, Math.max(0, (value - from) / (to - from)))
}

/** 퀘스트 하나를 끝냈을 때 그 동네에 쌓이는 평판 */
export const REPUTATION_BY_DIFFICULTY: Record<Difficulty, number> = {
  EASY: 1,
  NORMAL: 2,
  HARD: 3,
}

export const REPUTATION_NPC_QUEST = 4
export const REPUTATION_BOSS = 10

export function reputationGain(difficulty: Difficulty, isNpcQuest: boolean): number {
  return isNpcQuest ? REPUTATION_NPC_QUEST : REPUTATION_BY_DIFFICULTY[difficulty]
}

/**
 * 평판이 주는 보너스.
 *
 * 단계마다 그 지역 Coin 이 조금씩 는다. 눈에 띄게 세지 않다 —
 * 평판은 세지려고 쌓는 게 아니라 그 동네와 친해진 흔적이다.
 */
export function reputationCoinPct(value: number): number {
  return (reputationLevelNumber(value) - 1) * 3
}

export function areaReputation(reputation: Reputation, areaId: AreaId): number {
  return reputation[areaId] ?? 0
}
