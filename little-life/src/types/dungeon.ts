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
  'INNER_HALL',
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
  /**
   * 생명체와 지나온 자리.
   *
   * `돌콩이:관찰` 처럼 한 걸음씩 적힌다. 이 배열 하나가 전부다 —
   * 친해졌는지도, 문이 열렸는지도, 금속을 빼냈는지도 여기서 계산한다.
   * (lib/dungeon/creatures.ts)
   *
   * 호감도 숫자를 두지 않는다. 올라가는 값이 있으면 그때부터
   * 사람들은 그 값을 올리려고 만나러 온다.
   */
  creatureLog: string[]
}

// ── 생명체 ──────────────────────────────────────────────

export const CREATURE_IDS = [
  'stone_bean',
  'moss_dream',
  'glow_pebble',
  'stone_sleeper',
] as const
export type CreatureId = (typeof CREATURE_IDS)[number]

/**
 * 관계의 단계.
 *
 * 화면에는 이 이름을 그대로 쓰지 않는다. 단계가 올랐다고 알리지도 않는다 —
 * 달라진 건 생명체의 행동이지 숫자가 아니다.
 */
export type CreatureStage =
  | 'UNKNOWN'
  | 'DISCOVERED'
  | 'OBSERVED'
  | 'UNDERSTOOD'
  | 'HELPED'
  | 'FRIENDLY'

/** 한 걸음. 눌렀을 때 읽는 몇 줄과, 고를 수 있는 두 갈래. */
export interface CreatureStepDef {
  /** `${creatureId}:${key}` 로 기록에 남는다 */
  id: string
  creatureId: CreatureId
  roomId: DungeonRoomId
  /** 목록에 보이는 이름 */
  title: string
  icon: string
  /** 누르기 전에 보이는 한 줄 */
  teaser: string
  /** 이 걸음을 밟으면 도달하는 단계 */
  stage: CreatureStage
  /** 눌렀을 때 차례로 읽는 줄 */
  lines: string[]
  /** 버튼 하나면 이 이름. 갈래가 있으면 choices 를 쓴다. */
  action: string
  /**
   * 두 갈래.
   *
   * 어느 쪽도 실패가 아니다. 진행은 똑같이 되고 읽는 줄만 달라진다 —
   * 고르는 재미는 결과가 갈려서가 아니라 그 순간이 달라서 생긴다.
   */
  choices?: Array<{ label: string; lines: string[] }>
  /** 고르고 나서 공통으로 읽는 줄 */
  after?: string[]
  /** 이 걸음에서 도감 기록에 한 줄이 붙는다 */
  note?: string
  /** 이 걸음에서 생명체가 도감에 등록된다 */
  discovers?: CreatureId
}

export interface CreatureDef {
  id: CreatureId
  name: string
  icon: string
  roomId: DungeonRoomId
  /** 도감에 처음 뜨는 한 줄 */
  description: string
  /** 친해진 뒤 방에서 가끔 보이는 모습. 보상도 진행도 없다. */
  ambient: string[]
}

/** 화면에서 보는 생명체 하나 */
export interface CreatureView {
  def: CreatureDef
  stage: CreatureStage
  /** 지금 밟을 수 있는 걸음. 없으면 더 할 게 없다는 뜻이다. */
  step: CreatureStepDef | null
  /** 지금까지 쌓인 도감 기록 */
  notes: string[]
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
