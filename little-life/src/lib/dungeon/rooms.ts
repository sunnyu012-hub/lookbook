import type { DungeonRoomDef } from '@/types'

/**
 * 잠든 돌문 안쪽.
 *
 * 다섯 구역이 한 줄로 이어진다. 갈림길도 미로도 없다 —
 * 첫 던전에서 길을 잃게 만들면 그건 탐험이 아니라 시험이다.
 *
 * ── 무섭게 만들지 않는다 ────────────────────────────────
 *
 * 오래되고 조용한 곳이지 흉가가 아니다. 어두운 것과 무서운 것은
 * 다르다. 여기서 나오는 말은 전부 "누가 살았던 자리" 쪽으로 쓴다.
 *
 * ── 이야기 자리와 곁가지 자리 ──────────────────────────
 *
 * itemId 가 적힌 자리는 반드시 그것이 나온다. 확률 때문에 이야기가
 * 안 이어지는 일은 없다. itemId 가 없는 자리 둘만 그날 씨앗대로
 * 작은 것이 하나 나온다 — 있어도 그만 없어도 그만인 자리다.
 */

export const DUNGEON_ROOMS: DungeonRoomDef[] = [
  {
    id: 'GATE',
    name: '돌문 앞',
    icon: '🚪',
    description: '문이 반쯤 열려 있다. 안쪽에서 서늘한 바람이 조금 나온다.',
    spots: [
      {
        id: 'gate_carving',
        roomId: 'GATE',
        name: '문에 새겨진 것',
        icon: '🪨',
        teaser: '문 가장자리에 뭔가 새겨져 있다',
        itemId: 'dungeon_wall_fragment',
        found: '문틀에서 조각 하나가 떨어져 나왔다. 무늬가 반쯤 남아 있다.',
      },
    ],
  },
  {
    id: 'ENTRANCE',
    name: '조용한 입구',
    icon: '🕯️',
    description: '먼지가 가라앉아 있다. 오래 아무도 안 지나간 것 같다.',
    spots: [
      {
        id: 'entrance_dust',
        roomId: 'ENTRANCE',
        name: '바닥의 먼지',
        icon: '🌫️',
        teaser: '한쪽만 유난히 반짝인다',
        itemId: 'dungeon_old_coin',
        found: '먼지를 걷어내니 동전이 하나 나왔다. 어디서도 못 쓸 것 같다.',
      },
    ],
  },
  {
    id: 'CORRIDOR',
    name: '무너진 복도',
    icon: '🧱',
    description: '천장이 한 군데 내려앉았다. 지나갈 자리는 남아 있다.',
    spots: [
      {
        id: 'corridor_rubble',
        roomId: 'CORRIDOR',
        name: '돌무더기 뒤',
        icon: '🪨',
        teaser: '틈으로 뭔가 보인다',
        itemId: 'dungeon_small_crystal',
        found: '돌 사이에 수정이 하나 끼어 있었다. 빛에 대면 조금 밝아진다.',
      },
      {
        id: 'corridor_wall',
        roomId: 'CORRIDOR',
        name: '낡은 벽',
        icon: '🧱',
        teaser: '벽을 따라 손을 대보면',
        found: '벽을 따라가다 보니 손에 뭔가 묻었다.',
      },
    ],
  },
  {
    id: 'SMALL_ROOM',
    name: '작은 방',
    icon: '🏚️',
    description: '누가 여기서 뭘 했던 것 같다. 자리가 정리되어 있다.',
    spots: [
      {
        id: 'room_corner',
        roomId: 'SMALL_ROOM',
        name: '방 구석',
        icon: '🌿',
        teaser: '구석에 뭔가 자라 있다',
        itemId: 'dungeon_soft_moss',
        found: '구석에 이끼가 두껍게 자랐다. 눌러보니 생각보다 폭신하다.',
      },
      {
        id: 'room_shelf',
        roomId: 'SMALL_ROOM',
        name: '무너진 선반',
        icon: '📦',
        teaser: '떨어진 것들이 그대로 있다',
        found: '선반에서 떨어진 것들 사이를 뒤져봤다.',
      },
    ],
  },
  {
    id: 'INNER_DOOR',
    name: '안쪽 닫힌 문',
    icon: '🔒',
    description: '여기서부터는 안 열린다. 열쇠 구멍도 없다.',
    spots: [
      {
        id: 'door_gap',
        roomId: 'INNER_DOOR',
        name: '문 아래 틈',
        icon: '🐾',
        teaser: '문 밑에 좁은 틈이 있다',
        itemId: 'dungeon_unknown_trace',
        found: '틈 근처에 작은 발자국 같은 게 남아 있다. 돌 사이에 털 같은 것도 끼어 있다.',
      },
    ],
  },
]

/**
 * 곁가지 자리에서 나오는 것.
 *
 * 셋 다 이미 있는 물건이다. 여기 오려고 파밍할 이유를 만들지 않는다 —
 * 던전이 재화 효율 때문에 도는 곳이 되면 그때부터는 놀러 오는 곳이 아니다.
 */
export const SIDE_DROPS = ['m_stone', 'mineral_moss_stone', 'dungeon_soft_moss'] as const

/** 곁가지 자리에서 곁들여 나오는 코인. 적게 준다. */
export const SIDE_COINS = [0, 3, 5, 8] as const

/** 안쪽으로 한 구역 더 들어갈 때 드는 모험 에너지 */
export const ENERGY_PER_ROOM = 1

/** 한 자리를 들여다볼 때 드는 모험 에너지 */
export const ENERGY_PER_SEARCH = 1

export function findRoomDef(id: string): DungeonRoomDef | null {
  return DUNGEON_ROOMS.find((r) => r.id === id) ?? null
}

export function findSpotDef(id: string) {
  for (const room of DUNGEON_ROOMS) {
    const spot = room.spots.find((s) => s.id === id)
    if (spot) return spot
  }
  return null
}

/** 처음 들어서면 여기다. 돌문 앞은 공짜로 들어온다. */
export const FIRST_ROOM_ID = DUNGEON_ROOMS[0].id
