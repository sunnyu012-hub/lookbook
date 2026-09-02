import type { Bonuses, GiftPreference, GiftTag, ItemDef, NpcDef, NpcState } from '@/types'

/**
 * 친밀도가 오르는 규칙.
 *
 * 오르기만 하고 시간이 지나도 줄지 않는다.
 * 며칠 안 와도 아무도 서운해하지 않는다 — 이 앱의 원칙이다.
 */

export const TALK_FRIENDSHIP = 2
export const NPC_QUEST_FRIENDSHIP = 10

/**
 * 선물로 오르는 친밀도.
 *
 * 예전엔 5 · 10 이었다. 스물넷이 되고 나서 그 값이 문제가 됐다 —
 * 좋아하는 결의 물건 하나가 의뢰 하나(10)와 같았고, 가게에서 사서
 * 스물넷에게 돌리는 게 제일 빠른 길이 됐다. 그건 관계가 아니라 순회다.
 *
 * 지금은 인사(2) 언저리에 둔다. 선물 한 번이 관계를 확 바꾸지 않는다.
 * 하루에 한 번만 오르니까 (giftedToday) 이 값이 그 사람의 하루 몫이다.
 */
export const GIFT_FRIENDSHIP = 1
export const GIFT_LIKED_FRIENDSHIP = 2
export const GIFT_LOVED_FRIENDSHIP = 3

export function emptyNpcState(): NpcState {
  return { friendship: 0, lastTalkedOn: null, lastGiftedOn: null, clearedChainIds: [] }
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

/**
 * 오늘 이 사람에게 이미 하나 건넸는지.
 *
 * 인사와 같은 모양이다. 계속 눌러서 올릴 수 있으면 선물이 버튼이 된다.
 * 다만 인사와 달리 두 번째부터는 아예 못 준다 — 인사는 다시 해도
 * 잃는 게 없지만 선물은 물건이 사라진다. 0이 오르는 걸 알면서
 * 물건을 쓰게 두면 그건 함정이다.
 */
export function giftedToday(state: NpcState, dayKey: string): boolean {
  return state.lastGiftedOn === dayKey
}

/**
 * 건넨 것이 그 사람에게 어떤 것이었는지.
 *
 * 콕 집은 물건(loves)이 먼저고, 그다음이 결(likes), 나머지는 NEUTRAL 이다.
 * 싫어함은 없다 — NEUTRAL 도 충분히 괜찮은 결과다.
 */
export function giftPreference(npc: NpcDef, itemId: string, tags: GiftTag[]): GiftPreference {
  if (npc.loves.includes(itemId)) return 'LOVE'
  if (tags.some((tag) => npc.likes.includes(tag))) return 'LIKE'
  return 'NEUTRAL'
}

/** 결과에 따라 오르는 친밀도 */
export function giftGainFor(preference: GiftPreference, bonuses: Bonuses): number {
  const base =
    preference === 'LOVE'
      ? GIFT_LOVED_FRIENDSHIP
      : preference === 'LIKE'
        ? GIFT_LIKED_FRIENDSHIP
        : GIFT_FRIENDSHIP
  return applyFriendshipBonus(base, bonuses)
}

/**
 * 결과와 친밀도를 한 번에.
 *
 * 가방 물건이든 부엌에서 만든 음식이든 친밀도가 오르는 식은 하나뿐이어야 한다.
 * 음식용으로 식을 하나 더 만들면 두 값이 언젠가 어긋난다.
 */
export function giftOutcome(
  npc: NpcDef,
  itemId: string,
  tags: GiftTag[],
  bonuses: Bonuses,
): { preference: GiftPreference; gained: number } {
  const preference = giftPreference(npc, itemId, tags)
  return { preference, gained: giftGainFor(preference, bonuses) }
}

export function giftPreferenceFor(npc: NpcDef, item: ItemDef): GiftPreference {
  return giftPreference(npc, item.id, item.giftTags ?? [])
}

/** 선물할 수 있는 물건인지. 장착 중인 장비는 여기서 걸러내지 않는다 — 화면에서 본다. */
export function isGiftable(item: ItemDef): boolean {
  return (item.giftTags ?? []).length > 0
}

/** 스킬·이벤트로 붙는 친밀도 보너스 */
export function applyFriendshipBonus(base: number, bonuses: Bonuses): number {
  return Math.max(0, Math.round(base * (1 + bonuses.friendshipPct / 100)))
}
