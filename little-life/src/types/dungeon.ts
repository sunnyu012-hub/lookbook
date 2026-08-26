/**
 * 잠든 돌문.
 *
 * ── 던전이지만 전투가 아니다 ───────────────────────────
 *
 * 여기서 하는 일은 걷고, 들여다보고, 뭘 하나 줍는 것이다.
 * 때리는 것도 맞는 것도 없다. 체력도 없다. 지고 돌아오는 일이 없으니
 * 준비를 하고 올 필요도 없다 — 그냥 들어와서 둘러보다 가면 된다.
 *
 * ── 안 오면 손해인 것을 만들지 않는다 ──────────────────
 *
 * 들어오는 데는 아무것도 안 든다. 모험 에너지가 0 이어도 들어와서
 * 이미 본 데를 다시 보고, 찾아둔 기록을 읽을 수 있다.
 * 에너지는 "처음 보는 곳을 자세히 들여다볼 때" 만 쓴다.
 *
 * ── 이야기는 운에 맡기지 않는다 ────────────────────────
 *
 * 조사 자리마다 나오는 것이 정해져 있다. 확률로 안 나와서 진행이
 * 막히는 일은 없다. 곁가지 자리 둘만 그날그날 다른 게 나온다.
 */

/** 구역. 앞에서부터 안쪽으로 이어진다. */
export const DUNGEON_ROOM_IDS = [
  'GATE',
  'ENTRANCE',
  'CORRIDOR',
  'SMALL_ROOM',
  'INNER_DOOR',
] as const
export type DungeonRoomId = (typeof DUNGEON_ROOM_IDS)[number]

/** 조사 자리 하나 */
export interface DungeonSpotDef {
  id: string
  roomId: DungeonRoomId
  name: string
  icon: string
  /** 누르기 전에 보이는 한 줄 */
  teaser: string
  /**
   * 여기서 나오는 것.
   *
   * itemId 가 있으면 그것이 반드시 나온다 — 이야기가 걸려 있는 자리다.
   * 없으면 곁가지 자리라, 그날 씨앗대로 작은 것이 하나 나온다.
   */
  itemId?: string
  /** 조사하고 나서 읽는 줄 */
  found: string
}

export interface DungeonRoomDef {
  id: DungeonRoomId
  name: string
  icon: string
  /** 들어섰을 때 한 줄 */
  description: string
  /** 이 구역에서 들여다볼 수 있는 자리 */
  spots: DungeonSpotDef[]
}

/** 저장되는 잠든 돌문의 전부 */
export interface DungeonState {
  /** 첫 안내를 본 시각. 두 번 띄우지 않으려고 둔다. */
  tutorialSeenAt: string | null
  /**
   * 들어가 본 구역.
   *
   * 여기 없는 구역은 아직 안쪽으로 못 가본 곳이다.
   * 어디까지 왔는지를 숫자(%)로 만들지 않는다 — 진행바가 되는 순간
   * 놀러 온 곳이 아니라 채워야 할 칸이 된다.
   */
  discoveredRoomIds: string[]
  /**
   * 이미 들여다본 자리.
   *
   * 같은 데를 또 파서 에너지를 쓰는 일이 없게 한다.
   * 무엇을 찾았는지는 여기 안 적는다 — 그건 도감이 알고 있다.
   */
  searchedSpotIds: string[]
}

/** 화면에서 보는 조사 자리 하나 */
export interface DungeonSpotView {
  def: DungeonSpotDef
  searched: boolean
}

/** 화면에서 보는 구역 하나 */
export interface DungeonRoomView {
  def: DungeonRoomDef
  discovered: boolean
  spots: DungeonSpotView[]
  /** 아직 안 본 자리가 남아 있는지 (몇 개인지는 안 알려준다) */
  hasUnsearched: boolean
}

/** 한 자리를 들여다본 결과 */
export interface DungeonFind {
  itemId: string
  name: string
  icon: string
  /** 처음 만난 것인지 */
  isNew: boolean
  /** 조사하고 나서 읽는 줄 */
  text: string
  /** 곁들여 받은 코인. 0 이면 없다. */
  coins: number
}
