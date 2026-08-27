import type { AppState } from '@/types'
import { addItem } from '@/lib/collection/progress'
import { todayKey } from '@/lib/date'
import { MINERALS } from './minerals'
import { emptyQuarry } from './derive'

/**
 * 개발용 채석장 도구.
 *
 * 주소에 ?dev=quarry 를 붙였을 때만. 화면 어디에도 들어가는 길은 없다.
 * 하루 세 번씩 나흘을 기다리지 않고 열두 가지를 확인하려고 둔다.
 */

export type DevQuarryAction =
  | { kind: 'UNLOCK' }
  | { kind: 'REFILL' }
  | { kind: 'FIND_ALL' }
  | { kind: 'FIND'; mineralId: string }
  | { kind: 'RESET' }

export function applyDevQuarry(
  state: AppState,
  action: DevQuarryAction,
  now: Date = new Date(),
): AppState {
  switch (action.kind) {
    case 'UNLOCK':
      return {
        ...state,
        quarry: { ...state.quarry, unlockedAt: state.quarry.unlockedAt ?? now.toISOString() },
      }

    /** 오늘 몫을 되돌린다. 날짜 기록만 지우면 된다. */
    case 'REFILL':
      return { ...state, quarry: { ...state.quarry, attemptsOn: null, attempts: 0 } }

    case 'FIND_ALL': {
      let next = state
      for (const m of MINERALS) {
        next = applyDevQuarry(next, { kind: 'FIND', mineralId: m.id }, now)
      }
      return next
    }

    /** 하나 캔 것으로 친다. 실제 길과 같이 도감에도 넣는다. */
    case 'FIND': {
      if (!MINERALS.some((m) => m.id === action.mineralId)) return state
      const counts = { ...state.quarry.foundMineralCounts }
      counts[action.mineralId] = (counts[action.mineralId] ?? 0) + 1
      return {
        ...state,
        collection: addItem(state.collection, action.mineralId, now).collection,
        quarry: {
          ...state.quarry,
          unlockedAt: state.quarry.unlockedAt ?? now.toISOString(),
          attemptsOn: state.quarry.attemptsOn ?? todayKey(now),
          foundMineralCounts: counts,
        },
      }
    }

    /**
     * 채석장만 되돌린다.
     *
     * 도감에서 광물 발견 기록도 같이 지운다 — 캔 기록만 지우면
     * "안 캤는데 도감에는 있는" 상태가 되어 검수가 검수답지 않게 된다.
     */
    case 'RESET': {
      const discovered = { ...state.collection.discovered }
      const owned = { ...state.collection.owned }
      for (const m of MINERALS) {
        delete discovered[m.id]
        delete owned[m.id]
      }
      return {
        ...state,
        collection: { ...state.collection, discovered, owned },
        quarry: emptyQuarry(),
      }
    }
  }
}
