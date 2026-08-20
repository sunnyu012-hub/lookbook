/**
 * 레벨 / EXP.
 *
 * XP 는 두 곳에서 쌓인다 — 퀘스트 완료, 그리고 하루치 체크인 저장.
 * 레벨업에 필요한 XP 는 레벨마다 조금씩 늘어난다 (1레벨 100 → 27레벨 490).
 */

/** 하루 상태를 저장하면 주는 XP */
export const SAVE_XP = 20

/** 그 레벨을 넘기는 데 필요한 XP */
export function xpForLevel(level: number): number {
  return 100 + (level - 1) * 15
}

export interface LevelState {
  level: number
  /** 현재 레벨에서 모은 XP */
  into: number
  /** 다음 레벨까지 필요한 XP */
  need: number
  /** 0~1 */
  ratio: number
  totalXp: number
}

export function levelFromXp(totalXp: number): LevelState {
  let level = 1
  let remaining = Math.max(0, Math.floor(totalXp))

  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level)
    level += 1
  }

  const need = xpForLevel(level)
  return { level, into: remaining, need, ratio: remaining / need, totalXp }
}
