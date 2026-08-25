import type { AppState } from '@/types'
import { discoveredCount } from '@/lib/collection/progress'
import { WELCOME_GIFT } from '@/store/migrate'
import type { SyncLocal } from './local'

/**
 * 어느 쪽을 남길지 정하는 자리.
 *
 * ── 원칙 하나 ──────────────────────────────────────────
 *
 * 확실하지 않으면 지우지 않고 물어본다.
 * 자동으로 덮어쓰는 건 "덮이는 쪽이 덮는 쪽의 예전 모습" 일 때뿐이다.
 * 양쪽에서 각각 뭔가를 했으면 그건 우리가 고를 문제가 아니다.
 *
 * ── 판본 번호로 어떻게 아는가 ──────────────────────────
 *
 * 기기마다 "내가 마지막으로 맞춰본 클라우드 판본" (baseRev) 을 들고 있다.
 * 그 뒤로 이 기기에서 뭔가 바뀌었으면 dirty 가 선다.
 *
 *   클라우드 판본 == baseRev, dirty 아님  →  같다. 할 일 없음
 *   클라우드 판본 == baseRev, dirty       →  이 기기만 앞섰다. 올린다
 *   클라우드 판본 >  baseRev, dirty 아님  →  클라우드만 앞섰다. 받는다
 *   그 밖에                               →  갈라졌다. 물어본다
 */

export type SyncDecision =
  /** 클라우드에 올린다 */
  | { kind: 'PUSH' }
  /** 클라우드 것을 받는다 */
  | { kind: 'PULL' }
  /** 이미 같다 */
  | { kind: 'IN_SYNC' }
  /** 사용자에게 물어본다 */
  | { kind: 'ASK'; reason: AskReason }

/**
 * FIRST_LINK — 이 기기에서 처음 연결했는데 양쪽 다 기록이 있다
 * DIVERGED   — 맞춰본 뒤로 양쪽에서 각각 바뀌었다
 */
export type AskReason = 'FIRST_LINK' | 'DIVERGED'

export interface DecideInput {
  /** 클라우드에 이 사람의 줄이 있는지 */
  hasRemote: boolean
  /** 있다면 몇 번 판본인지 */
  remoteRev: number
  /** 이 기기의 동기화 기록 */
  local: Pick<SyncLocal, 'baseRev' | 'dirty' | 'userId'>
  /** 지금 로그인한 사람 */
  userId: string
  /** 이 기기의 기록이 아직 손도 안 댄 상태인지 */
  localPristine: boolean
}

export function decide(input: DecideInput): SyncDecision {
  const { hasRemote, remoteRev, local, userId, localPristine } = input

  // 클라우드가 비어 있으면 올리는 것 말고 할 게 없다.
  // 이 기기가 백지여도 올려둔다 — 그래야 다음 기기에서 받을 게 생긴다.
  if (!hasRemote) return { kind: 'PUSH' }

  // 이 기기에서 처음 연결했거나 계정이 바뀌었으면 baseRev 를 믿을 수 없다.
  const firstLink = local.userId !== userId || local.baseRev === 0
  if (firstLink) {
    // 갓 깐 앱이면 물어볼 것도 없다. 잃을 게 없으니 클라우드 것을 받는다.
    if (localPristine) return { kind: 'PULL' }
    return { kind: 'ASK', reason: 'FIRST_LINK' }
  }

  if (remoteRev === local.baseRev) {
    return local.dirty ? { kind: 'PUSH' } : { kind: 'IN_SYNC' }
  }

  // 클라우드만 앞섰고 이 기기는 그대로면, 이 기기 것은 클라우드의 예전 모습이다.
  // 덮여도 잃는 게 없다.
  if (remoteRev > local.baseRev && !local.dirty) return { kind: 'PULL' }

  // 남은 건 전부 갈라진 경우다.
  // (양쪽 다 바뀌었거나, 클라우드 판본이 뒤로 갔거나 — 어느 쪽이든 우리가 고를 일이 아니다)
  return { kind: 'ASK', reason: 'DIVERGED' }
}

/**
 * 아직 아무것도 안 한 기록인지.
 *
 * 넉넉하게 본다. 하나라도 흔적이 있으면 "손댔다" 로 친다 —
 * 잘못 판단해서 물어보는 건 번거로울 뿐이지만,
 * 잘못 판단해서 덮어쓰면 되돌릴 수 없다.
 *
 * 다만 처음 켤 때 주는 선물(머그컵 하나 + 코인 50)은 흔적으로 치지 않는다.
 * 앱을 깔면 누구나 받는 거라 이걸 흔적으로 보면 새 폰에서도 매번 물어보게 된다.
 */
export function isPristine(state: AppState): boolean {
  if (state.user.totalExp > 0) return false
  if (state.user.totalCompletedQuests > 0) return false
  if (state.user.level > 1) return false
  if (state.user.coins > WELCOME_GIFT.coins) return false
  if (state.quests.some((q) => q.completed)) return false
  if (state.routines.length > 0) return false
  if (state.battles.length > 0) return false
  if (Object.keys(state.dailyLog).length > 0) return false
  if (Object.keys(state.collection.owned).length > 0) return false
  if (Object.keys(state.discovery.companions).length > 0) return false
  if (state.discovery.foundSecretIds.length > 0) return false

  // 가방에 선물 말고 다른 게 있으면 뭔가 한 것이다
  const extras = state.inventory.filter(
    (entry) => entry.itemId !== WELCOME_GIFT.itemId || entry.quantity > 1,
  )
  if (extras.length > 0) return false

  return true
}

/**
 * 양쪽을 나란히 보여줄 때 쓰는 한 줄 요약.
 *
 * 어느 쪽을 남길지 고르라고 하면서 "기기 / 클라우드" 라고만 쓰면
 * 고를 수가 없다. 무엇이 들어 있는지 숫자로 보여줘야 고를 수 있다.
 */
export interface StateSummary {
  level: number
  completed: number
  totalExp: number
  coins: number
  /** 도감에서 알아본 것 */
  discovered: number
  /** 기록이 남은 날 수 */
  days: number
  /** 마지막으로 뭔가 한 날 (yyyy-mm-dd). 없으면 null */
  lastActiveOn: string | null
}

export function summarize(state: AppState): StateSummary {
  const days = Object.keys(state.dailyLog).filter((d) => (state.dailyLog[d]?.completed ?? 0) > 0)
  days.sort()

  return {
    level: state.user.level,
    completed: state.user.totalCompletedQuests,
    totalExp: state.user.totalExp,
    coins: state.user.coins,
    discovered: discoveredCount(state.collection),
    days: days.length,
    lastActiveOn: days.length > 0 ? days[days.length - 1] : null,
  }
}

/**
 * 두 요약 중 눈에 띄게 더 많은 쪽.
 *
 * 고르라고 할 때 어느 쪽이 더 큰지 슬쩍 알려주려고 쓴다.
 * 대신 이걸로 자동 결정하지는 않는다 — 큰 쪽이 늘 맞는 건 아니다.
 * (한 기기에서 며칠 몰아서 했다고 다른 기기 기록이 버려도 되는 건 아니니까)
 */
export function richer(a: StateSummary, b: StateSummary): 'A' | 'B' | 'SAME' {
  const score = (s: StateSummary) => s.totalExp * 4 + s.completed * 10 + s.discovered * 6 + s.days * 8
  const sa = score(a)
  const sb = score(b)
  if (sa === sb) return 'SAME'
  // 5% 안쪽 차이는 "비슷하다" 로 본다. 한 끗 차이로 한쪽을 가리키면 오해를 부른다.
  if (Math.abs(sa - sb) < Math.max(sa, sb) * 0.05) return 'SAME'
  return sa > sb ? 'A' : 'B'
}
