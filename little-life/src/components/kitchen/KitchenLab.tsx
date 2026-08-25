import type { ReactNode } from 'react'
import type { AppState } from '@/types'
import type { DevKitchenAction } from '@/lib/kitchen/dev'
import { kitchenView, isKitchenUnlocked, unlockProgress } from '@/lib/kitchen/derive'
import { KITCHEN_RECIPES } from '@/lib/kitchen/recipes'
import { ownedCount } from '@/lib/collection/progress'

interface KitchenLabProps {
  state: AppState
  onRun: (action: DevKitchenAction) => void
}

/**
 * 개발용 부엌 검수판.
 *
 * 주소에 ?dev=kitchen 을 붙이면 나온다. 화면 어디에도 들어가는 길은 없다.
 * 정원에서 열두 가지를 다 거둬보지 않고 레시피 열둘을 확인하려고 둔다.
 */
export function KitchenLab({ state, onRun }: KitchenLabProps) {
  const view = kitchenView(state)

  return (
    <div className="min-h-[100dvh] bg-canvas px-4 py-6 text-ink">
      <h1 className="font-game text-[13px] tracking-[0.14em] text-coral-deep">KITCHEN LAB</h1>
      <p className="mt-1 text-[12px] text-inkdim">
        {isKitchenUnlocked(state) ? '열림' : `아직 (${Math.round(unlockProgress(state) * 100)}%)`} ·
        발견 {view.discovered}/{view.total} · 만든 횟수 {view.totalCooked}
      </p>
      <p className="mt-0.5 text-[12px] text-inkdim">
        추천: {view.suggestion ? view.suggestion.def.name : '(만들 수 있는 게 없음)'}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Lab onClick={() => onRun({ kind: 'UNLOCK' })}>부엌 열기</Lab>
        <Lab onClick={() => onRun({ kind: 'INGREDIENTS' })}>재료 +10</Lab>
        <Lab onClick={() => onRun({ kind: 'DISCOVER_ALL' })}>전부 발견</Lab>
        <Lab onClick={() => onRun({ kind: 'RESET' })}>부엌만 초기화</Lab>
      </div>

      <h2 className="mt-6 font-game text-[11px] tracking-[0.12em] text-inkdim">레시피</h2>
      <ul className="mt-2 space-y-1">
        {view.recipes.map((r) => (
          <li key={r.def.id} className="rounded-btn bg-surface px-3 py-2 text-[12px]">
            <div className="flex items-center gap-2">
              <span>{r.def.icon}</span>
              <span className="min-w-0 flex-1 truncate">
                {r.def.name}{' '}
                <span className="font-game text-[10px] text-inkfaint">
                  {r.stage} · {Math.round(r.progress * 100)}% · {r.def.category} · {r.def.rarity}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onRun({ kind: 'COOK', recipeId: r.def.id })}
                className="shrink-0 rounded-pill bg-sunken px-2 py-1 text-[10.5px] text-inkdim"
              >
                만든 걸로
              </button>
            </div>
            <p className="mt-0.5 text-[10.5px] text-inkfaint">
              {r.ingredients.map((i) => `${i.name} ${i.have}/${i.need}`).join(' · ')}
              {r.canCook ? ' · 만들 수 있음' : ''}
            </p>
          </li>
        ))}
      </ul>

      <h2 className="mt-5 font-game text-[11px] tracking-[0.12em] text-inkdim">만든 음식</h2>
      <p className="mt-1 text-[12px] leading-relaxed text-inkdim">
        {KITCHEN_RECIPES.filter((r) => ownedCount(state.collection, r.outputItemId) > 0)
          .map((r) => `${r.name} ×${ownedCount(state.collection, r.outputItemId)}`)
          .join(' · ') || '없음'}
      </p>
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
