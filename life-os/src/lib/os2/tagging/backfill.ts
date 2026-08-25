/**
 * 예전 기록에 태그 붙이기.
 *
 * 사전과 규칙은 앞으로도 계속 고쳐진다. 그때마다 기록 전체를 다시 훑으면
 * 기록이 수천 개가 됐을 때 앱이 멈춘다. 그래서 두 가지 길만 둔다.
 *
 *   1. 게으른 길 — 그 기록을 실제로 열어 볼 때 하나만 다시 돌린다
 *   2. 손으로 누르는 길 — 설정에서 "예전 기록에 태그 붙이기" 를 누를 때만 몰아서 돌린다
 *
 * 저절로 전부 돌아가는 길은 만들지 않는다.
 * 사용자가 모르는 사이에 기록 수백 개가 고쳐지면, 그건 좋은 일이라도 무섭다.
 *
 * 그리고 이 파일의 함수는 절대 던지지 않는다.
 * 태그 하나 붙이려다 기록을 못 읽게 되는 일이 있어서는 안 된다.
 */
import type { AppliedLifeTag, QuickLog } from '../types'
import { TAGGING_RULE_VERSION } from './engine'
import { TAXONOMY_VERSION } from '../versions'
import { isDecided, needsRetag, retag } from './apply'

/** 몰아서 돌릴 때 한 번에 처리할 개수. 사이사이 화면이 숨 쉴 틈을 준다 */
export const BATCH_SIZE = 20

export interface BackfillStamp {
  ruleVersion: number
  taxonomyVersion: number
}

export const CURRENT_STAMP: BackfillStamp = {
  ruleVersion: TAGGING_RULE_VERSION,
  taxonomyVersion: TAXONOMY_VERSION,
}

/**
 * 다시 돌릴 만한 기록인가.
 *
 * 본문이 없으면 건드리지 않는다 — 이모지만 누른 기록에는 붙일 말 자체가 없다.
 * 판 번호가 이미 최신이면 결과가 같으므로 쓸 이유가 없다.
 */
export const isPending = (log: QuickLog): boolean =>
  Boolean(log.text?.trim()) && needsRetag(log)

export const pendingLogs = (logs: readonly QuickLog[]): QuickLog[] => logs.filter(isPending)

/**
 * 기록 하나를 다시 태깅한다.
 *
 * 사용자가 "맞아요" / "아니에요" 한 태그는 그대로 두고 나머지만 다시 계산한다.
 * 고쳐 놓은 게 되살아나면 고치는 의미가 없다.
 *
 * 실제로 달라진 게 없으면 null 을 돌려준다 — 쓸 필요가 없다는 뜻이다.
 */
export function retagOne(
  log: QuickLog,
  myTagNames: readonly string[] = [],
): AppliedLifeTag[] | null {
  try {
    const previous = log.lifeTags ?? []
    const next = retag(
      {
        mood: log.mood,
        text: log.text,
        energy: log.energy,
      },
      { myTagNames, previous },
    ).lifeTags

    return sameTags(previous, next) ? null : next
  } catch {
    return null
  }
}

/** 태그 묶음이 사실상 같은가 — 붙은 시각처럼 매번 달라지는 값은 빼고 본다 */
function sameTags(a: readonly AppliedLifeTag[], b: readonly AppliedLifeTag[]): boolean {
  if (a.length !== b.length) return false
  const key = (t: AppliedLifeTag) =>
    `${t.tagId}|${t.confidence}|${t.temporalContext ?? 'present'}|${t.userVerified ? 1 : 0}|${t.userRejected ? 1 : 0}`
  const left = [...a].map(key).sort()
  const right = [...b].map(key).sort()
  return left.every((v, i) => v === right[i])
}

export interface BackfillResult {
  /** 태그가 실제로 바뀌어서 저장한 개수 */
  updated: number
  /** 돌려 봤지만 결과가 같아서 판 번호만 찍은 개수 */
  unchanged: number
  /** 저장하다 실패한 개수 — 다음에 다시 시도한다 */
  failed: number
}

const EMPTY: BackfillResult = { updated: 0, unchanged: 0, failed: 0 }

export interface BackfillOptions {
  myTagNames?: readonly string[]
  /** 한 번에 여기까지만. 나머지는 다음에 누르면 이어서 한다 */
  limit?: number
  onProgress?: (done: number, total: number) => void
  /** 중간에 그만두기 */
  shouldStop?: () => boolean
}

/**
 * 여러 기록을 몰아서 다시 태깅한다.
 *
 * save 가 실패한 기록은 판 번호를 안 찍으므로 다음에 다시 잡힌다 —
 * 실패한 것을 조용히 넘겨서 영영 태그 없이 남는 일이 없게.
 */
export async function runBackfill(
  logs: readonly QuickLog[],
  save: (
    id: string,
    tags: AppliedLifeTag[],
    stamp: BackfillStamp,
  ) => Promise<unknown>,
  options: BackfillOptions = {},
): Promise<BackfillResult> {
  const targets = pendingLogs(logs).slice(0, options.limit ?? Number.POSITIVE_INFINITY)
  if (!targets.length) return EMPTY

  const result: BackfillResult = { ...EMPTY }

  for (const [index, log] of targets.entries()) {
    if (options.shouldStop?.()) break

    const next = retagOne(log, options.myTagNames)

    try {
      // 결과가 같아도 판 번호는 찍는다. 안 찍으면 다음에 또 같은 일을 한다
      await save(log.id, next ?? log.lifeTags ?? [], CURRENT_STAMP)
      if (next) result.updated += 1
      else result.unchanged += 1
    } catch {
      result.failed += 1
    }

    options.onProgress?.(index + 1, targets.length)
  }

  return result
}

/** 사용자가 손댄 태그가 하나라도 있는 기록인지 — 화면에서 조심스럽게 다룰 때 쓴다 */
export const hasUserEdits = (log: QuickLog): boolean =>
  (log.lifeTags ?? []).some(isDecided)
