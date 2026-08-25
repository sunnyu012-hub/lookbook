import { useMemo, useState } from 'react'
import type { AppState } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ItemIcon } from './ItemIcon'
import { RarityBadge } from '@/components/rpg/RarityBadge'
import { MATERIAL_CATALOG } from '@/lib/collection/catalog'
import { ownedCount } from '@/lib/collection/progress'
import { workshopView, type WorkshopRecipeView, type WorkshopTab } from '@/lib/collection/workshopView'
import { cn } from '@/components/ui/cn'

interface WorkshopSheetProps {
  open: boolean
  state: AppState
  onClose: () => void
  onCraft: (recipeId: string) => void
}

const TABS: Array<{ key: WorkshopTab | 'ALL'; label: string }> = [
  { key: 'ALL', label: '전체' },
  { key: 'FURNITURE', label: '가구' },
  { key: 'DECOR', label: '장식' },
  { key: 'SPECIAL', label: '특별' },
]

/**
 * 작은 작업실.
 *
 * 만들기는 늘 즉시 끝난다 — 기다리는 시간도, 실패도 없다.
 * 화면이 하는 일은 하나다: "지금 만들 수 있는 것" 을 맨 위로 올리는 것.
 *
 * 아직 모르는 것도 자리는 남긴다. 가까이 온 것에는 낌새 한 줄,
 * 아직 먼 것에는 ??? 만. 전부 펼쳐두면 만들기가 아니라 재료 숙제가 된다.
 */
export function WorkshopSheet({ open, state, onClose, onCraft }: WorkshopSheetProps) {
  const [tab, setTab] = useState<WorkshopTab | 'ALL'>('ALL')
  const [openId, setOpenId] = useState<string | null>(null)
  /** 만드는 짧은 순간. 기다리게 하려는 게 아니라 눈이 따라오게 하려는 것이다. */
  const [crafting, setCrafting] = useState(false)

  const view = useMemo(() => workshopView(state), [state])
  const shown = view.recipes.filter((r) => tab === 'ALL' || r.tab === tab)
  const hiddenCount = shown.filter((r) => r.stage === 'UNKNOWN').length
  const active = openId === null ? null : view.recipes.find((r) => r.def.id === openId) ?? null

  const materials = MATERIAL_CATALOG.filter((m) => ownedCount(state.collection, m.id) > 0)

  if (!open) return null

  const craft = (recipeId: string) => {
    setCrafting(true)
    window.setTimeout(() => {
      setCrafting(false)
      setOpenId(null)
      onCraft(recipeId)
    }, 450)
  }

  return (
    <BottomSheet open onClose={onClose} title="작은 작업실">
      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card bg-canvas text-[28px]">
          🧰
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[18px] font-semibold text-ink">작은 작업실</h2>
          <p className="mt-0.5 text-[12.5px] text-inkdim">
            주운 것과 거둔 것으로 하나씩 만든다.
          </p>
        </div>
        <span className="shrink-0 rounded-pill bg-sunken px-2.5 py-1.5 font-game text-[10.5px] text-inkdim">
          {view.known}/{view.total}
        </span>
      </div>

      {/* 지금 만들 수 있는 것 하나. 없으면 이 줄을 아예 안 만든다 —
          "재료가 없어요" 를 크게 띄우는 건 알림이 아니라 잔소리다. */}
      {view.suggestion && view.suggestion.item && (
        <button
          type="button"
          onClick={() => setOpenId(view.suggestion!.def.id)}
          className="mt-3 flex w-full items-center gap-3 rounded-card border border-coral/30 bg-coral-soft/40 px-3.5 py-3 text-left transition-transform duration-150 ease-out active:scale-[0.98]"
        >
          <span className="text-[28px] leading-none">{view.suggestion.item.icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block font-game text-[9.5px] tracking-[0.12em] text-coral-deep">
              지금 만들 수 있어
            </span>
            <span className="mt-0.5 block truncate text-[15px] font-medium text-ink">
              {view.suggestion.item.nameKo}
            </span>
          </span>
          <span className="shrink-0 text-[12px] text-inkfaint">›</span>
        </button>
      )}

      {/* 가진 재료 */}
      <div className="mt-4">
        <p className="mb-1.5 text-[12.5px] font-medium text-inkdim">가진 재료</p>
        {materials.length === 0 ? (
          <p className="rounded-card bg-canvas px-3.5 py-3 text-[12.5px] text-inkdim">
            아직 없어. 퀘스트를 끝내거나 정원에서 거두다 보면 하나씩 나와.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {materials.map((m) => (
              <li
                key={m.id}
                className="inline-flex items-center gap-1.5 rounded-pill bg-sunken px-2.5 py-1.5 text-[12px] text-inkdim"
              >
                <span>{m.icon}</span>
                {m.nameKo}
                <span className="font-game text-[11px] text-ink">
                  {ownedCount(state.collection, m.id)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 분류 */}
      <div className="-mx-4 mt-4 overflow-x-auto px-4">
        <div className="flex w-max gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'shrink-0 rounded-pill px-3 py-1.5 text-[12px] font-medium transition-colors',
                tab === t.key ? 'bg-coral text-surface' : 'bg-sunken text-inkdim',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2.5 space-y-2">
        {shown
          .filter((r) => r.stage !== 'UNKNOWN')
          .map((recipe) => (
            <RecipeRow
              key={recipe.def.id}
              recipe={recipe}
              onSelect={() => setOpenId(recipe.def.id)}
            />
          ))}

        {hiddenCount > 0 && (
          <div className="flex items-center gap-3 rounded-card border border-dashed border-line bg-sunken/30 px-3.5 py-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-sunken/70 text-[18px] text-inkfaint">
              ?
            </span>
            <p className="text-[12.5px] leading-relaxed text-inkdim">
              아직 모르는 만드는 법이 {hiddenCount}가지 있어.
              <br />
              <span className="text-inkfaint">살다 보면 하나씩 알게 돼.</span>
            </p>
          </div>
        )}
      </div>

      {/* 레시피 한 장 */}
      <BottomSheet
        open={active !== null}
        onClose={() => setOpenId(null)}
        title={active?.item?.nameKo ?? '만드는 법'}
      >
        {active && active.item && (
          <div>
            <div className="flex items-start gap-3">
              <ItemIcon item={active.item} size="lg" />
              <div className="min-w-0 flex-1 pt-0.5">
                <span className="flex items-center gap-1.5">
                  <h2 className="truncate text-[18px] font-semibold text-ink">
                    {active.stage === 'KNOWN' ? active.item.nameKo : '???'}
                  </h2>
                  {active.stage === 'KNOWN' && <RarityBadge rarity={active.item.rarity} />}
                </span>
                <p className="mt-1 text-[13px] leading-relaxed text-inkdim">
                  {active.stage === 'KNOWN'
                    ? active.item.description
                    : active.def.hint ?? active.def.unlockHint}
                </p>
                {active.owned > 0 && (
                  <p className="mt-1 font-game text-[10px] tracking-[0.06em] text-inkfaint">
                    이미 {active.owned}개 있어
                  </p>
                )}
              </div>
            </div>

            {active.stage === 'KNOWN' ? (
              <>
                <p className="mb-2 mt-4 text-[13px] font-medium text-inkdim">재료</p>
                <ul className="space-y-1.5">
                  {active.ingredients.map((i) => {
                    const enough = i.have >= i.need
                    return (
                      <li
                        key={i.itemId}
                        className="flex items-center gap-3 rounded-card bg-canvas px-3.5 py-2.5"
                      >
                        <span className="text-[20px] leading-none">{i.icon}</span>
                        <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">
                          {i.name}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 font-game text-[12px]',
                            enough ? 'text-sage-deep' : 'text-coral-deep',
                          )}
                        >
                          {i.have} / {i.need}
                        </span>
                      </li>
                    )
                  })}
                </ul>

                <button
                  type="button"
                  disabled={!active.ready || crafting}
                  onClick={() => craft(active.def.id)}
                  className={cn(
                    'mt-4 min-h-[48px] w-full rounded-btn text-[14px] font-medium',
                    'transition-transform duration-150 ease-out active:scale-[0.98]',
                    'disabled:cursor-not-allowed disabled:active:scale-100',
                    active.ready && !crafting ? 'bg-coral text-surface' : 'bg-sunken text-inkfaint',
                  )}
                >
                  {crafting ? '만드는 중…' : active.ready ? '만들기' : '재료가 모자라'}
                </button>
              </>
            ) : (
              <p className="mt-4 rounded-card bg-canvas px-3.5 py-4 text-center text-[12.5px] leading-relaxed text-inkdim">
                {active.stage === 'COMING_SOON'
                  ? '지금 가진 것으로는 아직 안 돼.'
                  : '아직 만드는 법을 모르겠어.'}
                <br />
                <span className="text-inkfaint">{active.def.unlockHint}</span>
              </p>
            )}
          </div>
        )}
      </BottomSheet>
    </BottomSheet>
  )
}

function RecipeRow({
  recipe,
  onSelect,
}: {
  recipe: WorkshopRecipeView
  onSelect: () => void
}) {
  const { item, stage } = recipe
  if (!item) return null

  const known = stage === 'KNOWN'

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-card border px-3.5 py-3 text-left',
        'transition-transform duration-150 ease-out active:scale-[0.98]',
        recipe.ready ? 'border-coral/30 bg-coral-soft/25' : 'border-line bg-surface',
      )}
    >
      {known ? (
        <ItemIcon item={item} size="md" />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-sunken/70 text-[18px] text-inkfaint">
          ?
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-medium text-ink">
            {known ? item.nameKo : '???'}
          </span>
          {known && <RarityBadge rarity={item.rarity} />}
        </span>
        <span className="mt-0.5 block truncate text-[11.5px] text-inkdim">
          {!known
            ? recipe.def.hint ?? recipe.def.unlockHint
            : recipe.ready
              ? item.description
              : missingLabel(recipe)}
        </span>
      </span>

      <span className="shrink-0 font-game text-[10px] tracking-[0.08em] text-inkfaint">
        {stage === 'COMING_SOON' ? '아직' : recipe.ready ? '만들 수 있어' : known ? '재료 부족' : '낌새'}
      </span>
    </button>
  )
}

/**
 * 모자란 재료만 한 줄로.
 *
 * 다 갖춘 재료까지 늘어놓으면 눈이 어디를 봐야 할지 모른다.
 * 만들 수 있는 줄에는 아예 안 쓴다 — 거기서는 물건 설명이 더 필요하다.
 */
function missingLabel(recipe: WorkshopRecipeView): string {
  const short = recipe.ingredients.filter((i) => i.have < i.need)
  if (short.length === 0) return recipe.item?.description ?? ''
  return short.map((i) => `${i.name} ${i.have}/${i.need}`).join(' · ')
}
