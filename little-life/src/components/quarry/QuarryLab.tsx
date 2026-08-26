import type { ReactNode } from 'react'
import type { AppState } from '@/types'
import type { DevQuarryAction } from '@/lib/quarry/dev'
import {
  DAILY_ATTEMPTS,
  attemptsLeft,
  discoveredMineralIds,
  isQuarryUnlocked,
  minedTotal,
  oldKeyStoryHintFound,
  quarryView,
  unlockProgress,
} from '@/lib/quarry/derive'
import { MINERALS } from '@/lib/quarry/minerals'
import { QUARRY_SPOTS } from '@/lib/quarry/spots'

interface QuarryLabProps {
  state: AppState
  onRun: (action: DevQuarryAction) => void
}

/**
 * 개발용 채석장 검수판.
 *
 * 주소에 ?dev=quarry 를 붙이면 나온다. 화면 어디에도 들어가는 길은 없다.
 */
export function QuarryLab({ state, onRun }: QuarryLabProps) {
  const view = quarryView(state)
  const found = new Set(discoveredMineralIds(state))

  return (
    <div className="min-h-[100dvh] bg-canvas px-4 py-6 text-ink">
      <h1 className="font-game text-[13px] tracking-[0.14em] text-coral-deep">QUARRY LAB</h1>
      <p className="mt-1 text-[12px] text-inkdim">
        {isQuarryUnlocked(state) ? '열림' : `아직 (${Math.round(unlockProgress(state) * 100)}%)`} ·
        발견 {view.found}/{view.total} · 캔 횟수 {minedTotal(state.quarry)} · 오늘{' '}
        {attemptsLeft(state)}/{DAILY_ATTEMPTS}
      </p>
      <p className="mt-0.5 text-[12px] text-inkdim">
        {view.night ? '밤' : '낮'} · 가장 귀한 것 {view.rarest ? view.rarest.name : '없음'} ·
        다음 이야기 {oldKeyStoryHintFound(state) ? '준비됨' : '아직'} · 막힌 길{' '}
        {state.quarry.blockedPathSeen ? '봄' : '안 봄'}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Lab onClick={() => onRun({ kind: 'UNLOCK' })}>채석장 열기</Lab>
        <Lab onClick={() => onRun({ kind: 'REFILL' })}>오늘 몫 채우기</Lab>
        <Lab onClick={() => onRun({ kind: 'FIND_ALL' })}>전부 캔 걸로</Lab>
        <Lab onClick={() => onRun({ kind: 'RESET' })}>채석장만 초기화</Lab>
      </div>

      <h2 className="mt-6 font-game text-[11px] tracking-[0.12em] text-inkdim">광물</h2>
      <ul className="mt-2 space-y-1">
        {MINERALS.map((m) => (
          <li key={m.id} className="flex items-center gap-2 rounded-btn bg-surface px-3 py-2 text-[12px]">
            <span>{m.icon}</span>
            <span className="min-w-0 flex-1 truncate">
              {m.name}{' '}
              <span className="font-game text-[10px] text-inkfaint">
                {m.id} · {m.rarity} · {found.has(m.id) ? `캠 ${state.quarry.foundMineralCounts[m.id] ?? 0}` : '아직'}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onRun({ kind: 'FIND', mineralId: m.id })}
              className="shrink-0 rounded-pill bg-sunken px-2 py-1 text-[10.5px] text-inkdim"
            >
              캔 걸로
            </button>
          </li>
        ))}
      </ul>

      <h2 className="mt-5 font-game text-[11px] tracking-[0.12em] text-inkdim">자리별 표</h2>
      <ul className="mt-2 space-y-1">
        {QUARRY_SPOTS.map((s) => {
          const total = s.drops.reduce((sum, d) => sum + d.weight, 0)
          return (
            <li key={s.id} className="rounded-btn bg-surface px-3 py-2 text-[11.5px]">
              <p className="font-medium">
                {s.icon} {s.name}
                <span className="ml-1 font-game text-[10px] text-inkfaint">{s.id}</span>
              </p>
              <p className="mt-0.5 text-[10.5px] text-inkfaint">
                {s.drops
                  .map((d) => `${d.itemId.replace('mineral_', '')} ${Math.round((d.weight / total) * 100)}%`)
                  .join(' · ')}
                {s.nightFavored ? ` · 밤보정: ${s.nightFavored.map((i) => i.replace('mineral_', '')).join(',')}` : ''}
              </p>
            </li>
          )
        })}
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
