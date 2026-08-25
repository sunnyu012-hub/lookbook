import type { ReactNode } from 'react'
import type { AppState } from '@/types'
import type { DevGardenAction } from '@/lib/garden/dev'
import { devGardenSummary } from '@/lib/garden/dev'
import { gardenView, seedStock } from '@/lib/garden/derive'
import { remainingLabel } from '@/lib/garden/labels'
import { GARDEN_LEVELS } from '@/lib/garden/derive'

interface GardenLabProps {
  state: AppState
  onRun: (action: DevGardenAction) => void
}

/**
 * 개발용 정원 검수판.
 *
 * 주소에 ?dev=garden 을 붙이면 나온다. 화면 어디에도 들어가는 길은 없다.
 * 네 시간을 실제로 기다려보지 않고 자라는 것 · 거두는 것 · 넓어지는 것을
 * 확인하려고 둔다.
 */
export function GardenLab({ state, onRun }: GardenLabProps) {
  const now = new Date()
  const view = gardenView(state, now)
  const seeds = seedStock(state)

  return (
    <div className="min-h-[100dvh] bg-canvas px-4 py-6 text-ink">
      <h1 className="font-game text-[13px] tracking-[0.14em] text-sage-deep">GARDEN LAB</h1>
      <p className="mt-1 text-[12px] text-inkdim">{devGardenSummary(state)}</p>
      <p className="mt-0.5 text-[12px] text-inkdim">
        {view.unlocked ? '열림' : '아직 안 열림'} · 밭 {view.plotsUnlocked}칸 · 발견{' '}
        {view.discoveredCount}/{view.totalCrops} · 심은 횟수 {state.garden.plantedCount}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Lab onClick={() => onRun({ kind: 'UNLOCK' })}>정원 열기</Lab>
        <Lab onClick={() => onRun({ kind: 'SEEDS' })}>씨앗 +10</Lab>
        <Lab onClick={() => onRun({ kind: 'GROW_ALL' })}>전부 다 자람</Lab>
        <Lab onClick={() => onRun({ kind: 'HARVEST_ALL_CROPS' })}>전부 발견</Lab>
        {GARDEN_LEVELS.map((def) => (
          <Lab key={def.level} onClick={() => onRun({ kind: 'SET_XP', xp: def.needXp })}>
            Lv.{def.level}
          </Lab>
        ))}
        <Lab onClick={() => onRun({ kind: 'RESET' })}>정원만 초기화</Lab>
      </div>

      <h2 className="mt-6 font-game text-[11px] tracking-[0.12em] text-inkdim">밭</h2>
      <ul className="mt-2 space-y-1">
        {view.plots.map((p) => (
          <li key={p.plot.id} className="rounded-btn bg-surface px-3 py-2 text-[12px]">
            <span className="font-game text-[10.5px] text-inkfaint">{p.plot.id}</span>{' '}
            {p.state}
            {p.crop && (
              <>
                {' · '}
                {p.crop.icon} {p.crop.name} · 단계 {p.stage} ·{' '}
                {remainingLabel(p.remainingSeconds)}
                <span className="block text-[10.5px] text-inkfaint">
                  심은 때 {p.plot.plantedAt} · 다 자랄 때 {p.plot.readyAt}
                </span>
              </>
            )}
          </li>
        ))}
      </ul>

      <h2 className="mt-5 font-game text-[11px] tracking-[0.12em] text-inkdim">씨앗</h2>
      <p className="mt-1 text-[12px] text-inkdim">
        {seeds.length === 0
          ? '없음'
          : seeds.map((s) => `${s.crop.name} ×${s.count}`).join(' · ')}
      </p>

      <h2 className="mt-5 font-game text-[11px] tracking-[0.12em] text-inkdim">거둔 기록</h2>
      <p className="mt-1 text-[12px] leading-relaxed text-inkdim">
        {Object.keys(state.garden.harvestedCropCounts).length === 0
          ? '없음'
          : Object.entries(state.garden.harvestedCropCounts)
              .map(([id, n]) => `${id} ×${n}`)
              .join(' · ')}
      </p>

      <p className="mt-6 text-[11px] text-inkfaint">지금 시각 {now.toISOString()}</p>
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
