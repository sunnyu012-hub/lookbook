/**
 * 이 빌드가 누구인지, 그리고 뭘 물어볼 데가 있는지.
 *
 * ── 판 이름이 왜 필요한가 ───────────────────────────────
 *
 * 베타에서 "튕겨요" 라는 제보를 받으면 제일 먼저 물어야 할 게
 * "어느 판에서요?" 다. 화면 어디에도 안 적혀 있으면 물어봐도 답이 안 나오고,
 * 이미 고친 버그를 다시 쫓게 된다.
 *
 * 값은 `vite.config.ts` 가 빌드할 때 한 번 만들어서 서비스 워커와 **같이**
 * 쓴다. 둘이 따로 만들면 "설정에 적힌 판" 과 "실제로 돌고 있는 판" 이
 * 달라져서, 제보를 받아도 어느 쪽을 믿어야 할지 모른다.
 */
declare const __APP_BUILD_ID__: string

/** 개발 중에는 빌드가 아니라서 값이 없다. */
export const BUILD_ID: string =
  typeof __APP_BUILD_ID__ === 'string' && __APP_BUILD_ID__ ? __APP_BUILD_ID__ : 'dev'

/**
 * 사람이 읽는 판 이름.
 *
 * `20260909044236` → `2026-09-09 04:42`. 열네 자리 숫자를 그대로 보여주면
 * 옮겨 적다가 틀린다.
 */
export function buildLabel(id: string = BUILD_ID): string {
  if (!/^\d{14}$/.test(id)) return id
  const [, y, mo, d, h, mi] = id.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/)!
  return `${y}-${mo}-${d} ${h}:${mi}`
}
