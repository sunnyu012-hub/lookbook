/**
 * 레벨 밸런스는 전부 여기서만 만진다.
 * 화면 코드에는 숫자를 직접 쓰지 않는다.
 */

const BASE_EXP = 100
const STEP = 25

/** 해당 레벨에서 다음 레벨로 가는 데 필요한 EXP. LV1 → LV2 는 100. */
export function requiredExp(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level))
  return BASE_EXP + (safeLevel - 1) * STEP
}

/** 진행률 0~1. 바 애니메이션에 그대로 쓴다. */
export function levelProgress(level: number, currentExp: number): number {
  const need = requiredExp(level)
  if (need <= 0) return 0
  return Math.min(1, Math.max(0, currentExp / need))
}

export interface LevelUpOutcome {
  level: number
  currentExp: number
  leveledUp: boolean
}

/**
 * EXP 를 더한 뒤 넘치는 만큼 레벨을 올리고 나머지는 다음 레벨로 넘긴다.
 * 한 번에 여러 레벨이 올라갈 수도 있어서 while 로 돈다.
 */
export function applyExp(level: number, currentExp: number, gained: number): LevelUpOutcome {
  let nextLevel = Math.max(1, Math.floor(level))
  let exp = Math.max(0, currentExp) + Math.max(0, gained)
  let leveledUp = false

  let need = requiredExp(nextLevel)
  while (exp >= need) {
    exp -= need
    nextLevel += 1
    leveledUp = true
    need = requiredExp(nextLevel)
  }

  return { level: nextLevel, currentExp: exp, leveledUp }
}

/**
 * 지금까지 받은 EXP 총합만 보고 레벨과 현재 EXP 를 되짚는다.
 *
 * 완료를 되돌릴 때 쓴다. totalExp 에서 빼고 여기로 다시 계산하면
 * 레벨이 내려가는 경우까지 정확히 맞는다.
 *
 * applyExp 를 LV.1 / 0 EXP 부터 쭉 돌린 결과와 항상 같아야 한다 (테스트로 묶어뒀다).
 */
export function levelFromTotalExp(totalExp: number): { level: number; currentExp: number } {
  let level = 1
  let remaining = Math.max(0, Math.floor(totalExp))
  let need = requiredExp(level)

  while (remaining >= need) {
    remaining -= need
    level += 1
    need = requiredExp(level)
  }

  return { level, currentExp: remaining }
}
