/**
 * 이 세계에서 불릴 이름.
 *
 * ── 기본값을 두지 않는다 ────────────────────────────────
 *
 * 오래 `'Yuli'` 가 기본값으로 박혀 있었다. 만든 사람 이름이라 혼자 쓸 때는
 * 아무 문제가 없었는데, 남에게 주는 순간 처음 켠 사람에게 "안녕, Yuli" 라고
 * 인사하는 앱이 된다. 그 사람이 아닌 이름으로 시작하면 그때부터 이건
 * 내 하루가 아니다.
 *
 * 그래서 기본값은 **빈 문자열**이고, 비어 있으면 화면이 먼저 물어본다.
 * "아직 이름을 안 정했다" 를 따로 저장하지 않는 이유도 같다 —
 * 이름 칸이 비었는지 보면 알 수 있는 걸 굳이 한 번 더 적어두지 않는다.
 */

/** 화면 어디에 놓아도 안 깨지는 길이. 인사 한 줄과 프로필 카드 기준. */
export const NICKNAME_MAX = 12

/**
 * 보이지 않는 글자들.
 *
 * 붙여넣기로 딸려 들어온다. 이게 남으면 "비어 보이는데 비어 있지는 않은"
 * 이름이 되고, 그러면 인사 줄에 이름 자리만 뻥 뚫린 채로 앱이 돌아간다.
 * zero-width 계열과 방향 지시자, 안 보이는 공백들.
 */
const INVISIBLE = /[​-‏‪-‮⁠-⁯﻿­]/g

/**
 * 사람이 친 걸 그대로 쓰지 않는다.
 *
 * 안 보이는 글자를 떼고, 가운데 연속 공백은 하나로 줄이고, 앞뒤를 다듬은 뒤
 * 길이를 자른다. 자르는 걸 맨 마지막에 하는 이유는, 공백을 정리하기 전에
 * 자르면 "김 　 　" 같은 입력이 공백만 남기고 잘려버려서다.
 */
export function normalizeNickname(raw: string): string {
  return raw
    .replace(INVISIBLE, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NICKNAME_MAX)
    .trim()
}

/** 쓸 수 있는 이름인지 */
export function isNicknameOk(raw: string): boolean {
  return normalizeNickname(raw).length > 0
}

/**
 * 아직 이름을 안 정했는지.
 *
 * 저장하지 않고 이름 칸에서 계산한다. 예전 저장에는 이미 이름이 들어 있어서
 * (직접 지었든 옛 기본값이든) 하던 사람에게 다시 묻지 않는다.
 */
export function needsNickname(name: string): boolean {
  return normalizeNickname(name).length === 0
}
