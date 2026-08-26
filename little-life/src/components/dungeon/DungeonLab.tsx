import type { ReactNode } from 'react'
import type { AppState } from '@/types'
import type { DevDungeonAction } from '@/lib/dungeon/dev'
import {
  ENERGY_PER_ROOM,
  ENERGY_PER_SEARCH,
  clueViews,
  deepestRoomId,
  dungeonView,
  hasOldKey,
  isGateFound,
  traceFound,
} from '@/lib/dungeon/derive'
import { DUNGEON_ROOMS } from '@/lib/dungeon/rooms'
import { blockedPathSeen } from '@/lib/quarry/derive'

interface DungeonLabProps {
  state: AppState
  onRun: (action: DevDungeonAction) => void
}

/**
 * 개발용 잠든 돌문 검수판.
 *
 * 주소에 ?dev=dungeon 을 붙이면 나온다. 화면 어디에도 들어가는 길은 없다.
 */
export function DungeonLab({ state, onRun }: DungeonLabProps) {
  const view = dungeonView(state)
  const clues = clueViews(state)

  return (
    <div className="min-h-[100dvh] bg-canvas px-4 py-6 text-ink">
      <h1 className="font-game text-[13px] tracking-[0.14em] text-coral-deep">SLEEPING GATE LAB</h1>
      <p className="mt-1 text-[12px] text-inkdim">
        단서 {clues.filter((c) => c.found).length}/{clues.length} · 열쇠{' '}
        {hasOldKey(state) ? '있음' : '없음'} · 막힌 길 {blockedPathSeen(state) ? '봄' : '안 봄'} ·
        문 {isGateFound(state) ? '찾음' : '아직'}
      </p>
      <p className="mt-0.5 text-[12px] text-inkdim">
        가본 곳 {state.dungeon.discoveredRoomIds.length}/{DUNGEON_ROOMS.length} · 가장 안쪽{' '}
        {deepestRoomId(state) ?? '없음'} · 조사한 자리 {state.dungeon.searchedSpotIds.length} ·
        흔적 {traceFound(state) ? '찾음' : '아직'}
      </p>
      <p className="mt-0.5 text-[12px] text-inkdim">
        탐험 에너지 {state.user.adventureEnergy}/{state.user.maxAdventureEnergy} · 진입{' '}
        {ENERGY_PER_ROOM} · 조사 {ENERGY_PER_SEARCH}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Lab onClick={() => onRun({ kind: 'CLUES' })}>단서 셋 채우기</Lab>
        <Lab onClick={() => onRun({ kind: 'ENERGY' })}>에너지 채우기</Lab>
        <Lab onClick={() => onRun({ kind: 'OPEN_ALL' })}>다섯 구역 다 가본 걸로</Lab>
        <Lab onClick={() => onRun({ kind: 'FIND_ALL' })}>발견물 전부</Lab>
        <Lab onClick={() => onRun({ kind: 'RESET' })}>걸어간 자취만 초기화</Lab>
      </div>

      <h2 className="mt-6 font-game text-[11px] tracking-[0.12em] text-inkdim">단서</h2>
      <ul className="mt-2 space-y-1">
        {clues.map((c) => (
          <li key={c.id} className="rounded-btn bg-surface px-3 py-2 text-[12px]">
            <p className="font-medium">
              {c.found ? '✓' : '·'} {c.name}
              <span className="ml-1 font-game text-[10px] text-inkfaint">{c.id}</span>
            </p>
            <p className="mt-0.5 text-[10.5px] text-inkfaint">{c.found ? c.note : c.hint}</p>
          </li>
        ))}
      </ul>

      <h2 className="mt-5 font-game text-[11px] tracking-[0.12em] text-inkdim">구역과 자리</h2>
      <ul className="mt-2 space-y-1">
        {view.rooms.map((r) => (
          <li key={r.def.id} className="rounded-btn bg-surface px-3 py-2 text-[11.5px]">
            <p className="font-medium">
              {r.def.icon} {r.def.name}
              <span className="ml-1 font-game text-[10px] text-inkfaint">
                {r.def.id} · {r.discovered ? '가봄' : '아직'}
              </span>
            </p>
            {r.spots.map((s) => (
              <p key={s.def.id} className="mt-0.5 text-[10.5px] text-inkfaint">
                {s.searched ? '✓' : '·'} {s.def.name} — {s.def.itemId ?? '그날 씨앗대로'}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Lab({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-pill bg-surface px-3 py-2 text-[12px] text-inkdim ring-1 ring-line active:scale-[0.96]"
    >
      {children}
    </button>
  )
}
