import type { Battle, BattleKind, Quest } from '@/types'
import { normalizeTitle } from '@/lib/suggest'
import { applyBattleAction, undoBattleAction } from './battle'
import { findBattleDef } from './content'

/**
 * 퀘스트를 끝내면 몬스터·보스도 같이 깎인다.
 *
 * 현실에서 설거지를 하고, 앱에서 퀘스트를 체크하고, 또 몬스터 시트를 열어
 * 같은 걸 한 번 더 체크하게 만들 이유가 없다. 한 번 한 일은 한 번만 누른다.
 *
 * 새 전투 시스템을 만들지 않는다 — 여기서 하는 일은 기존 행동 체크를
 * 대신 눌러주는 것뿐이고, HP·보상·클리어 판정은 전부 battle.ts 그대로다.
 *
 * 규칙 두 가지:
 *
 *  1. 한 번 완료에 배틀 하나당 행동 하나. 같은 퀘스트를 반복해서 파밍하는
 *     구조를 만들지 않는다. (행동은 어차피 한 번씩만 끝난다)
 *  2. 배틀 여러 개가 같은 말에 걸리면 전부 깎인다. 빨래를 돌렸으면
 *     빨래 덩어리도 빨래 대마왕도 실제로 한 칸씩 줄어든 게 맞다.
 */

export interface BattleProgress {
  battleId: string
  actionId: string
  kind: BattleKind
  name: string
  icon: string
  /** 이 퀘스트로 대신 눌러준 행동 */
  actionLabel: string
  /** 끝낸 행동 수 — 완료 전 → 완료 후 */
  before: number
  after: number
  total: number
  cleared: boolean
}

export interface LinkResult {
  battles: Battle[]
  progress: BattleProgress[]
  /** 이번에 쓰러진 것들. 보상은 호출한 쪽에서 기존 경로로 준다. */
  clearedBattles: Battle[]
}

/**
 * 이 제목에 걸린 말 중 제일 구체적인 것의 길이. 안 걸리면 0.
 *
 * 길이로 재는 이유: "밀린 답장 하나" 는 답장 유령의 두 행동에 다 걸린다.
 * ('밀린답장' 과 '답장') 그때 목록에서 위에 있는 쪽이 이기게 두면, 어느 행동이
 * 끝날지가 파일에 적힌 순서에 달리게 된다 — 읽는 사람이 알 수 없는 규칙이다.
 * 더 구체적으로 적힌 쪽이 이기는 게 사람이 예상하는 결과다.
 */
function matchStrength(match: string[] | undefined, normalizedTitle: string): number {
  if (!match || match.length === 0) return 0
  let best = 0
  for (const word of match) {
    const key = normalizeTitle(word)
    if (key && normalizedTitle.includes(key)) best = Math.max(best, key.length)
  }
  return best
}

/**
 * 저장된 배틀에는 match 가 없다 — 정의에서 그때그때 읽는다.
 *
 * 파생되는 값을 세이브에 넣지 않는 게 이 앱의 규칙이고, 실제로도 넣으면
 * 나중에 말을 고칠 때 이미 진행 중인 배틀만 옛말을 들고 있게 된다.
 *
 * 이름으로 먼저 찾고, 없으면 순서로 맞춘다. 예전 세이브에서 이름이 비어
 * "단계 2" 로 메워진 경우가 있어서 두 갈래를 다 둔다.
 */
function matchesOf(battle: Battle): (label: string, index: number) => string[] | undefined {
  const def = findBattleDef(battle.defId)
  if (!def) return () => undefined
  return (label, index) =>
    def.actions.find((a) => a.label === label)?.match ?? def.actions[index]?.match
}

/**
 * 완료한 퀘스트로 진행 중인 배틀들을 깎는다.
 *
 * 아무것도 안 걸리면 원래 배열을 그대로 돌려준다 — 쓸데없이 새 배열을 만들면
 * 위쪽에서 "뭔가 바뀌었나" 를 참조 비교로 판단할 수 없게 된다.
 */
export function linkQuestToBattles(
  battles: Battle[],
  quest: Pick<Quest, 'title'>,
  now: Date = new Date(),
): LinkResult {
  const title = normalizeTitle(quest.title)
  if (!title) return { battles, progress: [], clearedBattles: [] }

  const progress: BattleProgress[] = []
  const clearedBattles: Battle[] = []

  const next = battles.map((battle) => {
    if (battle.status !== 'ACTIVE') return battle

    const matchFor = matchesOf(battle)
    const done = battle.actions.filter((a) => a.doneAt).length

    let hit: (typeof battle.actions)[number] | null = null
    let best = 0
    battle.actions.forEach((action, i) => {
      if (action.doneAt) return
      const strength = matchStrength(matchFor(action.label, i), title)
      if (strength > best) {
        best = strength
        hit = action
      }
    })
    if (!hit) return battle
    const target: (typeof battle.actions)[number] = hit

    const result = applyBattleAction(battle, target.id, now)
    if (!result) return battle

    progress.push({
      battleId: battle.id,
      actionId: target.id,
      kind: battle.kind,
      name: battle.name,
      icon: battle.icon,
      actionLabel: target.label,
      before: done,
      after: done + 1,
      total: battle.actions.length,
      cleared: result.cleared,
    })
    if (result.cleared) clearedBattles.push(result.battle)

    return result.battle
  })

  if (progress.length === 0) return { battles, progress: [], clearedBattles: [] }
  return { battles: next, progress, clearedBattles }
}

/**
 * 완료를 되돌릴 때 눌러준 행동도 도로 푼다.
 *
 * 이미 쓰러진 배틀은 건드리지 않는다. 앱 전체에서 클리어는 되돌릴 수 없고
 * (BattleSheet 의 되돌리기도 CLEARED 면 아무것도 안 한다), 여기만 예외로
 * 두면 보상까지 거꾸로 돌려야 해서 규칙이 두 개가 된다.
 */
export function unlinkQuestFromBattles(
  battles: Battle[],
  ticks: Array<{ battleId: string; actionId: string }>,
): Battle[] {
  if (ticks.length === 0) return battles

  return battles.map((battle) => {
    if (battle.status === 'CLEARED') return battle
    const tick = ticks.find((t) => t.battleId === battle.id)
    if (!tick) return battle
    return undoBattleAction(battle, tick.actionId) ?? battle
  })
}

/**
 * 진행 상황을 한 줄로 읽어준다.
 *
 * "토벌했습니다!" 같은 말은 쓰지 않는다. 현실에서 무엇이 조용해졌는지만 적는다.
 */
export function progressLine(p: BattleProgress): string {
  if (!p.cleared) return `${p.actionLabel} — 하나 줄었다.`
  return p.kind === 'BOSS' ? '큰 게 하나 끝났다.' : '이제 이건 안 봐도 된다.'
}
