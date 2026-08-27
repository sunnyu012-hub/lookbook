import type {
  AppState,
  DungeonFind,
  DungeonRoomView,
  DungeonState,
  DungeonSpotDef,
} from '@/types'
import { addItem, isDiscovered } from '@/lib/collection/progress'
import { seededRandom } from '@/lib/city/seed'
import { todayKey } from '@/lib/date'
import { blockedPathSeen, strangeFragmentFound } from '@/lib/quarry/derive'
import { OLD_KEY_ID, findDungeonItem } from './items'
import { isInnerDoorOpen } from './creatureDerive'
import {
  DUNGEON_ROOMS,
  ENERGY_PER_ROOM,
  ENERGY_PER_SEARCH,
  FIRST_ROOM_ID,
  INNER_HALL_ID,
  SIDE_COINS,
  SIDE_DROPS,
  findRoomDef,
  findSpotDef,
} from './rooms'

/**
 * 잠든 돌문 계산 층.
 *
 * 채석장·정원과 같은 규칙이다 — 셀 수 있는 것은 저장하지 않는다.
 * 열쇠를 가졌는지도, 문을 찾았는지도, 단서를 몇 개 모았는지도
 * 전부 이미 있는 기록에서 나온다. 새 깃발은 하나도 세우지 않았다.
 */

export function emptyDungeon(): DungeonState {
  return {
    tutorialSeenAt: null,
    discoveredRoomIds: [],
    searchedSpotIds: [],
    creatureLog: [],
  }
}

// ── 오래된 열쇠 이야기 ──────────────────────────────────

/** 하루가 문 이야기를 꺼내는 장 */
export const OLD_KEY_CHAPTER_ID = 'HARU_5'

/** 두 번째 단서로 보는 광물 */
export const OLD_METAL_ID = 'mineral_old_metal'

/**
 * 하루한테 안 듣고 스스로 알아보는 데 필요한 금속 조각 수.
 *
 * 하나는 "이런 게 나오네" 고, 넷쯤 되면 "다 같은 무늬네" 가 된다.
 * 채석장 두 자리에서 제법 잘 나오는 것이라 며칠이면 모인다.
 */
export const PATTERN_PIECES = 4

export interface ClueView {
  id: string
  name: string
  /** 아직 못 찾았을 때 흘리는 한 줄. 조건을 숫자로 말하지 않는다. */
  hint: string
  /** 찾고 나서 읽는 한 줄 */
  note: string
  found: boolean
}

/**
 * 열쇠로 가는 단서 셋.
 *
 * 셋 다 이미 하고 있던 일에서 나온다 — 채석장에서 뭘 캤는지,
 * 도감에 뭐가 있는지. 단서를 모으려고 따로 해야 하는 일은 없다.
 *
 * 세 번째만 길이 둘이다. 하루한테 듣거나, 금속 조각을 몇 개 모아
 * 스스로 알아보거나. 어느 쪽으로 와도 열쇠는 같다.
 */
export function clueViews(state: AppState): ClueView[] {
  return [
    {
      id: 'strange_fragment',
      name: '오래된 작업장 기록',
      hint: '채석장 안쪽에서 못 보던 돌을 하나 주웠던 것 같은데.',
      note: '이상한 돌조각. 다른 돌하고는 결이 다르다.',
      found: strangeFragmentFound(state),
    },
    {
      id: 'old_metal',
      name: '낡은 금속 조각',
      hint: '돌 말고 금속이 나오는 자리도 있었던 것 같다.',
      note: '오래된 금속 조각. 문에 쓰던 것과 비슷하게 생겼다.',
      found:
        (state.quarry.foundMineralCounts[OLD_METAL_ID] ?? 0) > 0 ||
        isDiscovered(state.collection, OLD_METAL_ID),
    },
    {
      id: 'haru_talk',
      name: '돌문 문양 기록',
      hint: '금속 조각이 몇 개 모이면 무늬가 눈에 들어올 것 같다.',
      note: '문양이 그 돌조각과 같다.',
      // 길이 둘이다. 하루한테 듣거나, 금속 조각을 몇 개 모아
      // 스스로 알아보거나.
      //
      // 하루 이야기 하나만 두면 던전이 "매일 사람한테 말 걸기" 뒤에
      // 잠긴다. 친밀도는 대화 하루 +2 가 주력이고 이야기는 순서대로만
      // 열려서, 아무리 많이 놀아도 안 빨라진다 — 이 앱이 처음부터
      // 안 만들겠다고 한 그 구조다.
      //
      // 그렇다고 하루 이야기를 빼지 않는다. 듣고 가는 쪽이 더 좋은
      // 길이다. 유일한 길이 아니게만 한다.
      found:
        state.discovery.readChapterIds.includes(OLD_KEY_CHAPTER_ID) ||
        (state.quarry.foundMineralCounts[OLD_METAL_ID] ?? 0) >= PATTERN_PIECES,
    },
  ]
}

export function foundClueCount(state: AppState): number {
  return clueViews(state).filter((c) => c.found).length
}

/**
 * 열쇠를 가졌는지.
 *
 * 따로 적어두지 않는다 — 단서 셋이 모이면 가진 것이다.
 * 도감에 남는 것은 "언제 손에 들어왔는지" 뿐이고, 그건 발견 기록이 한다.
 */
export function hasOldKey(state: AppState): boolean {
  return foundClueCount(state) >= clueViews(state).length
}

/**
 * 열쇠가 막 손에 들어왔으면 도감에 적어둔다.
 *
 * 하루 한 번 도는 발견 검사에서 부른다 (lib/discovery/derive.ts).
 * 두 번 주는 일은 없다 — 이미 도감에 있으면 아무것도 안 한다.
 */
export function applyOldKey(
  state: AppState,
  now: Date = new Date(),
): { state: AppState; gained: boolean } {
  if (!hasOldKey(state) || isDiscovered(state.collection, OLD_KEY_ID)) {
    return { state, gained: false }
  }
  const added = addItem(state.collection, OLD_KEY_ID, now)
  return { state: { ...state, collection: added.collection }, gained: true }
}

// ── 잠든 돌문 ───────────────────────────────────────────

/**
 * 문을 찾았는지.
 *
 * 막힌 길을 이미 들여다봤고, 열쇠가 손에 있어야 한다.
 * 순서는 상관없다 — 열쇠를 먼저 얻고 나중에 막힌 길을 봐도
 * 그 자리에서 문이 보인다. 어느 쪽이 먼저인지까지 시킬 일은 아니다.
 */
export function isGateFound(state: AppState): boolean {
  return hasOldKey(state) && blockedPathSeen(state)
}

/** 안에 한 번이라도 들어와 봤는지 */
export function hasEntered(state: AppState): boolean {
  return state.dungeon.discoveredRoomIds.length > 0
}

export function isRoomDiscovered(state: AppState, roomId: string): boolean {
  return state.dungeon.discoveredRoomIds.includes(roomId)
}

/**
 * 문을 처음 열고 들어선다.
 *
 * 들어오는 데는 아무것도 안 든다. 모험 에너지가 0 이어도 들어온다 —
 * 입장권을 만드는 순간 이 앱에 없던 규칙이 하나 생긴다.
 */
export function enterDungeon(state: AppState): AppState {
  if (!isGateFound(state) || isRoomDiscovered(state, FIRST_ROOM_ID)) return state
  return {
    ...state,
    dungeon: { ...state.dungeon, discoveredRoomIds: [FIRST_ROOM_ID] },
  }
}

/** 지금 있는 곳 다음 구역. 더 없으면 null. */
export function nextRoomId(roomId: string): string | null {
  const index = DUNGEON_ROOMS.findIndex((r) => r.id === roomId)
  if (index < 0 || index + 1 >= DUNGEON_ROOMS.length) return null
  return DUNGEON_ROOMS[index + 1].id
}

/** 지금 가본 데 중 가장 안쪽 */
export function deepestRoomId(state: AppState): string | null {
  for (let i = DUNGEON_ROOMS.length - 1; i >= 0; i -= 1) {
    if (isRoomDiscovered(state, DUNGEON_ROOMS[i].id)) return DUNGEON_ROOMS[i].id
  }
  return null
}

export type GoDeeperResult =
  | { ok: true; state: AppState; roomId: string }
  | { ok: false; reason: 'NO_MORE' | 'NO_ENERGY' | 'LOCKED' | 'DOOR_SHUT' }

/**
 * 안쪽으로 한 구역 더 들어간다.
 *
 * 처음 가는 구역에만 모험 에너지를 쓴다. 한 번 가본 데로 돌아가는 건
 * 공짜다 — 이미 본 곳을 다시 보는 데까지 값을 매기면
 * 그때부터는 둘러보는 게 아니라 계산하는 게 된다.
 */
export function goDeeper(state: AppState, fromRoomId: string): GoDeeperResult {
  if (!isRoomDiscovered(state, fromRoomId)) return { ok: false, reason: 'LOCKED' }

  const next = nextRoomId(fromRoomId)
  if (!next) return { ok: false, reason: 'NO_MORE' }
  // 이미 가본 데면 그냥 걸어간다. 값을 다시 받지 않는다.
  if (isRoomDiscovered(state, next)) return { ok: true, state, roomId: next }
  // 안쪽 방은 문이 열려야 간다. 열렸는지는 저장하지 않는다 —
  // 세 생명체와 친해졌으면 열린 것이다 (creatureDerive.ts).
  if (next === INNER_HALL_ID && !isInnerDoorOpen(state)) return { ok: false, reason: 'DOOR_SHUT' }

  if (state.user.adventureEnergy < ENERGY_PER_ROOM) return { ok: false, reason: 'NO_ENERGY' }

  return {
    ok: true,
    roomId: next,
    state: {
      ...state,
      user: { ...state.user, adventureEnergy: state.user.adventureEnergy - ENERGY_PER_ROOM },
      dungeon: {
        ...state.dungeon,
        discoveredRoomIds: [...state.dungeon.discoveredRoomIds, next],
      },
    },
  }
}

// ── 들여다보기 ──────────────────────────────────────────

export function isSpotSearched(state: AppState, spotId: string): boolean {
  return state.dungeon.searchedSpotIds.includes(spotId)
}

/**
 * 곁가지 자리에서 오늘 나올 것.
 *
 * 자리 이름과 날짜로 씨앗을 만든다 — 새로고침해도 같은 것이 나오고,
 * 마음에 안 든다고 다시 굴릴 수가 없다. 채석장과 같은 규칙이다.
 */
function sideFind(spot: DungeonSpotDef, now: Date): { itemId: string; coins: number } {
  const rng = seededRandom(`${todayKey(now)}:dungeon:${spot.id}`)
  return {
    itemId: SIDE_DROPS[Math.floor(rng() * SIDE_DROPS.length)],
    coins: SIDE_COINS[Math.floor(rng() * SIDE_COINS.length)],
  }
}

export type SearchResult =
  | { ok: true; state: AppState; find: DungeonFind }
  | { ok: false; reason: 'UNKNOWN' | 'LOCKED' | 'DONE' | 'NO_ENERGY' }

/**
 * 한 자리를 들여다본다.
 *
 * 이야기가 걸린 자리는 나올 것이 정해져 있다. 확률로 안 나와서
 * 다음으로 못 가는 일은 없다.
 */
export function search(state: AppState, spotId: string, now: Date = new Date()): SearchResult {
  const spot = findSpotDef(spotId)
  if (!spot) return { ok: false, reason: 'UNKNOWN' }
  if (!isRoomDiscovered(state, spot.roomId)) return { ok: false, reason: 'LOCKED' }
  if (isSpotSearched(state, spotId)) return { ok: false, reason: 'DONE' }
  if (state.user.adventureEnergy < ENERGY_PER_SEARCH) return { ok: false, reason: 'NO_ENERGY' }

  const side = spot.itemId ? null : sideFind(spot, now)
  const itemId = spot.itemId ?? side!.itemId
  const coins = side?.coins ?? 0

  const added = addItem(state.collection, itemId, now)
  const def = findDungeonItem(itemId)

  return {
    ok: true,
    state: {
      ...state,
      collection: added.collection,
      user: {
        ...state.user,
        adventureEnergy: state.user.adventureEnergy - ENERGY_PER_SEARCH,
        coins: state.user.coins + coins,
      },
      dungeon: {
        ...state.dungeon,
        searchedSpotIds: [...state.dungeon.searchedSpotIds, spotId],
      },
    },
    find: {
      itemId,
      name: def?.nameKo ?? itemId,
      icon: def?.icon ?? '📦',
      isNew: added.isNew,
      text: spot.found,
      coins,
    },
  }
}

// ── 화면이 보는 것 ──────────────────────────────────────

export interface DungeonView {
  rooms: DungeonRoomView[]
  /** 남은 모험 에너지 */
  energy: number
  /** 아직 안 가본 안쪽이 남아 있는지 */
  hasDeeper: boolean
  /** 안쪽 문 앞까지 가봤는지 */
  reachedInnerDoor: boolean
  /** 작은 흔적을 찾았는지 (다음 이야기가 여기서 시작한다) */
  traceFound: boolean
}

export function roomViews(state: AppState): DungeonRoomView[] {
  return DUNGEON_ROOMS.map((def) => {
    const discovered = isRoomDiscovered(state, def.id)
    const spots = def.spots.map((spot) => ({
      def: spot,
      searched: isSpotSearched(state, spot.id),
    }))
    return {
      def,
      discovered,
      spots,
      hasUnsearched: discovered && spots.some((s) => !s.searched),
    }
  })
}

export const TRACE_ID = 'dungeon_unknown_trace'

/** 작은 흔적을 만났는지. 다음 업데이트가 이 함수만 보면 된다. */
export function traceFound(state: AppState): boolean {
  return isDiscovered(state.collection, TRACE_ID)
}

export function dungeonView(state: AppState): DungeonView {
  const rooms = roomViews(state)
  const deepest = deepestRoomId(state)
  return {
    rooms,
    energy: state.user.adventureEnergy,
    hasDeeper: deepest !== null && nextRoomId(deepest) !== null,
    reachedInnerDoor: isRoomDiscovered(state, 'INNER_DOOR'),
    traceFound: traceFound(state),
  }
}

export { findRoomDef, findSpotDef, FIRST_ROOM_ID, ENERGY_PER_ROOM, ENERGY_PER_SEARCH }
