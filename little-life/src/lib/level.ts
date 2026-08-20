/**
 * 레벨 밸런스는 전부 여기서만 만진다.
 * 화면 코드에는 숫자를 직접 쓰지 않는다.
 */

const BASE_EXP = 100
const GROWTH = 1.18

/** 해당 레벨에서 다음 레벨로 가는 데 필요한 EXP. LV1 → LV2 는 100. */
export function expToNextLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level))
  return Math.round((BASE_EXP * Math.pow(GROWTH, safeLevel - 1)) / 10) * 10
}

/** 진행률 0~1. 바 애니메이션에 그대로 쓴다. */
export function levelProgress(level: number, currentExp: number): number {
  const need = expToNextLevel(level)
  if (need <= 0) return 0
  return Math.min(1, Math.max(0, currentExp / need))
}

export interface LevelUpOutcome {
  level: number
  currentExp: number
  leveledUp: boolean
}

/**
 * EXP 를 더한 뒤 넘치는 만큼 레벨을 올린다.
 * 한 번에 여러 레벨이 올라갈 수도 있어서 while 로 돈다.
 */
export function applyExp(level: number, currentExp: number, gained: number): LevelUpOutcome {
  let nextLevel = Math.max(1, Math.floor(level))
  let exp = Math.max(0, currentExp) + Math.max(0, gained)
  let leveledUp = false

  let need = expToNextLevel(nextLevel)
  while (exp >= need) {
    exp -= need
    nextLevel += 1
    leveledUp = true
    need = expToNextLevel(nextLevel)
  }

  return { level: nextLevel, currentExp: exp, leveledUp }
}
