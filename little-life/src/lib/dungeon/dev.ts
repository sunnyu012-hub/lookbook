import type { AppState } from '@/types'
import { addItem } from '@/lib/collection/progress'
import { DUNGEON_ROOMS } from './rooms'
import { DUNGEON_FINDS, OLD_KEY_ID } from './items'
import { OLD_KEY_CHAPTER_ID, OLD_METAL_ID, emptyDungeon } from './derive'
import { STRANGE_FRAGMENT_ID } from '@/lib/quarry/derive'

/**
 * 개발용 잠든 돌문 도구.
 *
 * 주소에 ?dev=dungeon 을 붙였을 때만. 화면 어디에도 들어가는 길은 없다.
 * 하루한테 서른네 번 말을 걸고 채석장에서 돌조각이 나올 때까지
 * 기다리지 않고 문 안쪽을 확인하려고 둔다.
 */

export type DevDungeonAction =
  | { kind: 'CLUES' }
  | { kind: 'ENERGY' }
  | { kind: 'OPEN_ALL' }
  | { kind: 'FIND_ALL' }
  | { kind: 'RESET' }

export function applyDevDungeon(
  state: AppState,
  action: DevDungeonAction,
  now: Date = new Date(),
): AppState {
  switch (action.kind) {
    /**
     * 단서 셋을 다 채운다.
     *
     * 열쇠를 직접 주지 않는다 — 실제 길과 같아야 검수가 된다.
     * 단서만 세워두면 하루 한 번 도는 발견 검사가 알아서 열쇠를 준다.
     */
    case 'CLUES': {
      const counts = { ...state.quarry.foundMineralCounts }
      counts[STRANGE_FRAGMENT_ID] = Math.max(1, counts[STRANGE_FRAGMENT_ID] ?? 0)
      counts[OLD_METAL_ID] = Math.max(1, counts[OLD_METAL_ID] ?? 0)
      return {
        ...state,
        quarry: {
          ...state.quarry,
          unlockedAt: state.quarry.unlockedAt ?? now.toISOString(),
          foundMineralCounts: counts,
          // 막힌 길을 본 적이 있어야 문이 보인다
          blockedPathSeen: true,
        },
        discovery: {
          ...state.discovery,
          readChapterIds: state.discovery.readChapterIds.includes(OLD_KEY_CHAPTER_ID)
            ? state.discovery.readChapterIds
            : [...state.discovery.readChapterIds, OLD_KEY_CHAPTER_ID],
        },
      }
    }

    /** 탐험 에너지를 가득 채운다 */
    case 'ENERGY':
      return { ...state, user: { ...state.user, adventureEnergy: state.user.maxAdventureEnergy } }

    /** 다섯 구역을 다 가본 것으로 친다 */
    case 'OPEN_ALL':
      return {
        ...state,
        dungeon: { ...state.dungeon, discoveredRoomIds: DUNGEON_ROOMS.map((r) => r.id) },
      }

    /** 다섯 발견물과 열쇠를 도감에 넣는다 */
    case 'FIND_ALL': {
      let collection = state.collection
      for (const item of [...DUNGEON_FINDS.map((i) => i.id), OLD_KEY_ID]) {
        collection = addItem(collection, item, now).collection
      }
      return { ...state, collection }
    }

    /**
     * 다시 처음부터.
     *
     * 도감에 남은 발견 기록은 안 지운다 — 지우면 다른 데(트로피·세트)가
     * 같이 흔들린다. 여기서 되돌리는 건 걸어간 자취뿐이다.
     */
    case 'RESET':
      return { ...state, dungeon: emptyDungeon() }
  }
}
