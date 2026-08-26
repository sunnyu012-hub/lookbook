import type { ReactNode } from 'react'
import type { AppState } from '@/types'
import type { DevWorkshopAction } from '@/lib/collection/devWorkshop'
import { devWorkshopSummary } from '@/lib/collection/devWorkshop'
import { workshopView } from '@/lib/collection/workshopView'
import { craftedKinds, gardenCraftedKinds } from '@/lib/collection/progress'

interface WorkshopLabProps {
  state: AppState
  onRun: (action: DevWorkshopAction) => void
}

/**
 * 개발용 작업실 검수판.
 *
 * 주소에 ?dev=workshop 을 붙이면 나온다. 화면 어디에도 들어가는 길은 없다.
 */
export function WorkshopLab({ state, onRun }: WorkshopLabProps) {
  const view = workshopView(state)

  return (
    <div className="min-h-[100dvh] bg-canvas px-4 py-6 text-ink">
      <h1 className="font-game text-[13px] tracking-[0.14em] text-coral-deep">WORKSHOP LAB</h1>
      <p className="mt-1 text-[12px] text-inkdim">
        아는 것 {view.known}/{view.total} · 만들어본 가짓수 {craftedKinds(state.collection)} (정원{' '}
        {gardenCraftedKinds(state.collection)})
      </p>
      <p className="mt-0.5 text-[12px] text-inkdim">{devWorkshopSummary(state)}</p>
      <p className="mt-0.5 text-[12px] text-inkdim">
        추천: {view.suggestion ? view.suggestion.item?.nameKo : '(만들 수 있는 게 없음)'}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Lab onClick={() => onRun({ kind: 'MATERIALS' })}>재료 가득</Lab>
        <Lab onClick={() => onRun({ kind: 'KNOW_ALL' })}>전부 알게</Lab>
        <Lab onClick={() => onRun({ kind: 'CRAFT_ALL' })}>전부 만들어보기</Lab>
        <Lab onClick={() => onRun({ kind: 'RESET_CRAFTED' })}>만든 것만 되돌리기</Lab>
      </div>

      <h2 className="mt-6 font-game text-[11px] tracking-[0.12em] text-inkdim">만드는 법</h2>
      <ul className="mt-2 space-y-1">
        {view.recipes.map((r) => (
          <li key={r.def.id} className="rounded-btn bg-surface px-3 py-2 text-[12px]">
            <div className="flex items-center gap-2">
              <span>{r.item?.icon ?? '?'}</span>
              <span className="min-w-0 flex-1 truncate">
                {r.item?.nameKo ?? r.def.resultItemId}{' '}
                <span className="font-game text-[10px] text-inkfaint">
                  {r.def.id} · {r.stage} · {Math.round(r.progress * 100)}% · {r.tab}
                  {r.owned > 0 ? ` · 가짐 ${r.owned}` : ''}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRun({ kind: 'CRAFT', recipeId: r.def.id })}
                className="shrink-0 rounded-pill bg-sunken px-2 py-1 text-[10.5px] text-inkdim"
              >
                만들기
              </button>
            </div>
            <p className="mt-0.5 text-[10.5px] text-inkfaint">
              {r.ingredients.map((i) => `${i.name} ${i.have}/${i.need}`).join(' · ')}
              {r.ready ? ' · 만들 수 있음' : ''}
            </p>
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
