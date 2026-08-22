import type { Difficulty } from '@/types'

/** 난이도별 획득 EXP. 밸런스 조정은 여기만 고친다. */
export const DIFFICULTY_EXP: Record<Difficulty, number> = {
  EASY: 10,
  NORMAL: 20,
  HARD: 40,
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: '쉬움',
  NORMAL: '보통',
  HARD: '어려움',
}

export function expForDifficulty(difficulty: Difficulty): number {
  return DIFFICULTY_EXP[difficulty]
}
