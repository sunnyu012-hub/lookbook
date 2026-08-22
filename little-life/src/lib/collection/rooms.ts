import type { Category, RoomDef, RoomId } from '@/types'

/**
 * 방.
 *
 * 처음엔 방 하나로 시작한다. 나머지는 현실에서 뭔가를 하다 보면 열린다.
 * 조건은 전부 여기 있다 — 화면 코드에는 숫자가 하나도 없다.
 *
 * 열렸는지 여부는 저장하지 않는다. 지금 상태에서 매번 계산한다.
 * 저장해두면 나중에 조건을 바꿨을 때 이미 열린 방과 어긋난다.
 */
export const ROOMS: RoomDef[] = [
  {
    id: 'MY_ROOM',
    name: '내 방',
    icon: '🛏️',
    description: '하루가 시작되고 끝나는 곳.',
    unlock: { kind: 'DEFAULT' },
    wall: '#FBEEDC',
    floor: '#F0DCC2',
  },
  {
    id: 'LIVING_ROOM',
    name: '거실',
    icon: '🛋️',
    description: '아무것도 안 하려고 앉는 자리.',
    unlock: { kind: 'LEVEL', level: 10 },
    wall: '#F7EFE4',
    floor: '#E9D9C3',
  },
  {
    id: 'KITCHEN_ROOM',
    name: '부엌',
    icon: '🍳',
    description: '냄새가 제일 먼저 도착하는 방.',
    unlock: { kind: 'CATEGORY_QUESTS', category: 'LIFE', count: 30 },
    wall: '#FAF1E6',
    floor: '#EEDCC6',
  },
  {
    id: 'WORK_ROOM',
    name: '작업실',
    icon: '💻',
    description: '문을 닫으면 출근한 셈 친다.',
    unlock: { kind: 'CATEGORY_QUESTS', category: 'WORK', count: 30 },
    wall: '#F4EFE9',
    floor: '#E4D9CB',
  },
  {
    id: 'HOBBY_ROOM',
    name: '취미방',
    icon: '🎨',
    description: '쓸모를 묻지 않는 방.',
    unlock: { kind: 'CATEGORY_QUESTS', category: 'PLAY', count: 30 },
    wall: '#FBEDEF',
    floor: '#EFD9D6',
  },
  {
    id: 'BALCONY',
    name: '발코니',
    icon: '🌤️',
    description: '방인데 바깥이다.',
    unlock: { kind: 'COLLECTION', count: 60 },
    wall: '#EAF1F6',
    floor: '#DCE6E0',
  },
]

export function findRoom(id: string): RoomDef | null {
  return ROOMS.find((r) => r.id === id) ?? null
}

/** 방 조건을 확인할 때 필요한 것만 */
export interface RoomContext {
  level: number
  categoryCompleted: Record<Category, number>
  discoveredCount: number
}

export function isRoomUnlocked(room: RoomDef, ctx: RoomContext): boolean {
  switch (room.unlock.kind) {
    case 'DEFAULT':
      return true
    case 'LEVEL':
      return ctx.level >= room.unlock.level
    case 'CATEGORY_QUESTS':
      return (ctx.categoryCompleted[room.unlock.category] ?? 0) >= room.unlock.count
    case 'COLLECTION':
      return ctx.discoveredCount >= room.unlock.count
    default:
      return false
  }
}

export function unlockedRooms(ctx: RoomContext): RoomDef[] {
  return ROOMS.filter((r) => isRoomUnlocked(r, ctx))
}

/** 아직 안 열린 방에 뭐가 필요한지 — 혼내지 않고 알려만 준다 */
export function unlockLabel(room: RoomDef): string {
  switch (room.unlock.kind) {
    case 'DEFAULT':
      return '처음부터 열려 있어'
    case 'LEVEL':
      return `Lv.${room.unlock.level}부터`
    case 'CATEGORY_QUESTS':
      return `${LABEL[room.unlock.category]} 퀘스트 ${room.unlock.count}개`
    case 'COLLECTION':
      return `도감 ${room.unlock.count}개`
    default:
      return ''
  }
}

const LABEL: Record<Category, string> = {
  LIFE: '생활',
  WORK: '일',
  BODY: '몸',
  PLAY: '놀이',
  MIND: '마음',
  HEART: '관계',
}

export const DEFAULT_ROOM_ID: RoomId = 'MY_ROOM'
