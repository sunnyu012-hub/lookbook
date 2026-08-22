import type { Bonuses, ItemDef, NpcDef, NpcState } from '@/types'

/**
 * 친밀도가 오르는 규칙.
 *
 * 오르기만 하고 시간이 지나도 줄지 않는다.
 * 며칠 안 와도 아무도 서운해하지 않는다 — 이 앱의 원칙이다.
 */

export const TALK_FRIENDSHIP = 2
export const NPC_QUEST_FRIENDSHIP = 10
export const GIFT_FRIENDSHIP = 5
export const GIFT_LIKED_FRIENDSHIP = 10

export function emptyNpcState(): NpcState {
  return { friendship: 0, lastTalkedOn: null, clearedChainIds: [] }
}

/** 오늘 이 사람과 이미 인사했는지 */
export function talkedToday(state: NpcState, dayKey: string): boolean {
  return state.lastTalkedOn === dayKey
}

/**
 * 대화로 오르는 친밀도.
 * 하루 첫 대화만 오른다. 계속 눌러서 올릴 수 있으면 대화가 버튼이 된다.
 */
export function talkGain(state: NpcState, dayKey: string, bonuses: Bonuses): number {
  if (talkedToday(state, dayKey)) return 0
  return applyFriendshipBonus(TALK_FRIENDSHIP + bonuses.dailyTalkBonus, bonuses)
}

/** 선물로 오르는 친밀도. 좋아하는 결이면 두 배쯤. */
export function giftGain(npc: NpcDef, item: ItemDef, bonuses: Bonuses): number {
  const liked = (item.giftTags ?? []).some((tag) => npc.likes.includes(tag))
  return applyFriendshipBonus(liked ? GIFT_LIKED_FRIENDSHIP : GIFT_FRIENDSHIP, bonuses)
}

export function isLikedGift(npc: NpcDef, item: ItemDef): boolean {
  return (item.giftTags ?? []).some((tag) => npc.likes.includes(tag))
}

/** 선물할 수 있는 물건인지. 장착 중인 장비는 여기서 걸러내지 않는다 — 화면에서 본다. */
export function isGiftable(item: ItemDef): boolean {
  return (item.giftTags ?? []).length > 0
}

/** 스킬·이벤트로 붙는 친밀도 보너스 */
export function applyFriendshipBonus(base: number, bonuses: Bonuses): number {
  return Math.max(0, Math.round(base * (1 + bonuses.friendshipPct / 100)))
}
