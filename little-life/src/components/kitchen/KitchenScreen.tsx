import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppState, KitchenRecipeView, RecipeCategory } from '@/types'
import { Portal } from '@/components/ui/Portal'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { useOverlay } from '@/hooks/useOverlay'
import { kitchenView } from '@/lib/kitchen/derive'
import { ownedCount } from '@/lib/collection/progress'
import { findCollectionItem } from '@/lib/collection/catalog'
import { ItemIcon } from '@/components/collection/ItemIcon'
import { KitchenTutorial } from './KitchenTutorial'
import { CookedOverlay, type CookedNote } from './CookedOverlay'
import { DishIcon } from './DishIcon'
import { cn } from '@/components/ui/cn'

interface KitchenScreenProps {
  open: boolean
  state: AppState
  onClose: () => void
  onEnter: () => void
  onCook: (recipeId: string) => CookedNote | null
  onEat: (recipeId: string) => boolean
  onToggleFavorite: (recipeId: string) => void
  onOpenBook: () => void
  onOpenGarden: () => void
  onNotify: (message: string) => void
}

const TABS: Array<{ key: RecipeCategory | 'ALL'; label: string }> = [
  { key: 'ALL', label: '전체' },
  { key: 'MEAL', label: '식사' },
  { key: 'DRINK', label: '마실 것' },
  { key: 'DESSERT', label: '달콤한 것' },
  { key: 'SNACK', label: '간단한 것' },
  { key: 'SPECIAL', label: '특별' },
]

/**
 * 작은 부엌.
 *
 * 오래 기다리는 조리 시간도, 실패도, 상하는 음식도 없다.
 * 재료가 있으면 그 자리에서 만들어진다.
 *
 * 화면이 하는 일은 하나다 — "지금 뭘 만들 수 있는지" 를 먼저 보여주는 것.
 */
export function KitchenScreen({
  open,
  state,
  onClose,
  onEnter,
  onCook,
  onEat,
  onToggleFavorite,
  onOpenBook,
  onOpenGarden,
  onNotify,
}: KitchenScreenProps) {
  const [tab, setTab] = useState<RecipeCategory | 'ALL'>('ALL')
  const [openId, setOpenId] = useState<string | null>(null)
  const [cooked, setCooked] = useState<CookedNote | null>(null)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  /** 만드는 짧은 순간. 기다리게 하려는 게 아니라 눈이 따라오게 하려는 것이다. */
  const [cooking, setCooking] = useState(false)

  useOverlay(open, onClose)

  // 열리는 순간 딱 한 번. (첫 안내를 띄울지 판단하려면 여는 순간의 값이 필요하다)
  const opened = useRef(false)
  useEffect(() => {
    if (!open) {
      opened.current = false
      return
    }
    if (opened.current) return
    opened.current = true
    if (state.kitchen.tutorialSeenAt === null) setTutorialOpen(true)
    onEnter()
  }, [open, onEnter, state.kitchen.tutorialSeenAt])

  const view = useMemo(() => kitchenView(state), [state])
  const shown = view.recipes.filter((r) => tab === 'ALL' || r.def.category === tab)
  const active = openId === null ? null : view.recipes.find((r) => r.def.id === openId) ?? null

  if (!open) return null

  const cook = (recipeId: string) => {
    setCooking(true)
    window.setTimeout(() => {
      setCooking(false)
      const note = onCook(recipeId)
      if (note) {
        setCooked(note)
        setOpenId(null)
      }
    }, 500)
  }

  return (
    <Portal>
      {/* z-45 — 아래 내비게이션(40)은 덮고, 여기서 여는 시트(50)에는 덮인다 */}
      <div className="fixed inset-0 z-[45] flex flex-col bg-canvas">
        <header className="flex items-center gap-2 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+12px)]">
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-pill bg-surface px-3.5 py-2 text-[13px] font-medium text-inkdim ring-1 ring-line"
          >
            ←
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate font-game text-[11px] tracking-[0.14em] text-coral-deep">
              TINY KITCHEN
            </p>
            <p className="mt-0.5 text-[12px] text-inkdim">오늘은 뭘 만들어볼까?</p>
          </div>
          <span className="shrink-0 rounded-pill bg-surface px-2.5 py-1.5 font-game text-[10.5px] text-inkdim ring-1 ring-line">
            📖 {view.discovered}/{view.total}
          </span>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          {/* 지금 만들 수 있는 것 하나. 없으면 이 줄을 아예 안 만든다 —
              "재료가 없어요" 를 크게 띄우는 건 알림이 아니라 잔소리다. */}
          {view.suggestion && (
            <button
              type="button"
              onClick={() => setOpenId(view.suggestion!.def.id)}
              className="mb-3 flex w-full items-center gap-3 rounded-card border border-coral/30 bg-coral-soft/40 px-3.5 py-3 text-left transition-transform duration-150 ease-out active:scale-[0.98]"
            >
              <DishIcon def={view.suggestion.def} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="block font-game text-[9.5px] tracking-[0.12em] text-coral-deep">
                  지금 만들 수 있어
                </span>
                <span className="mt-0.5 block truncate text-[15px] font-medium text-ink">
                  {view.suggestion.def.name}
                </span>
              </span>
              <span className="shrink-0 text-[12px] text-inkfaint">›</span>
            </button>
          )}

          {/* 분류 */}
          <div className="-mx-4 mb-3 overflow-x-auto px-4">
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

          <ul className="grid grid-cols-2 gap-2.5">
            {shown.map((recipe) => (
              <li key={recipe.def.id}>
                <RecipeCard
                  recipe={recipe}
                  onSelect={() => {
                    if (recipe.stage === 'UNKNOWN') return
                    setOpenId(recipe.def.id)
                  }}
                />
              </li>
            ))}
          </ul>

          <p className="mt-3 text-center text-[12px] leading-relaxed text-inkfaint">
            한 번 만든 요리는 계속 기억해. 음식을 다 써도 사라지지 않아.
          </p>
        </div>
      </div>

      {/* 레시피 한 장 */}
      <BottomSheet
        open={active !== null}
        onClose={() => setOpenId(null)}
        title={active?.def.name ?? '레시피'}
      >
        {active && (
          <div>
            <div className="flex items-start gap-3">
              {active.stage === 'DISCOVERED' ? (
                <DishIcon def={active.def} size="xl" className="shrink-0" />
              ) : (
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-card bg-canvas text-[26px] text-inkfaint/60">
                  ?
                </span>
              )}
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 className="text-[18px] font-semibold text-ink">
                  {active.stage === 'DISCOVERED' ? active.def.name : '???'}
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-inkdim">
                  {active.stage === 'DISCOVERED' ? active.def.description : active.def.hint}
                </p>
                {active.cooked > 0 && (
                  <p className="mt-1 font-game text-[10px] tracking-[0.06em] text-inkfaint">
                    {active.cooked}번 만들었어
                  </p>
                )}
              </div>
              {active.stage === 'DISCOVERED' && (
                <button
                  type="button"
                  aria-label="즐겨찾기"
                  aria-pressed={active.favorite}
                  onClick={() => onToggleFavorite(active.def.id)}
                  className="shrink-0 text-[20px] leading-none active:scale-[0.9]"
                >
                  {active.favorite ? '♥' : '♡'}
                </button>
              )}
            </div>

            {active.stage === 'DISCOVERED' ? (
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
                        <IngredientIcon itemId={i.itemId} icon={i.icon} />
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

                {active.def.buff && (
                  <p className="mt-3 rounded-btn bg-canvas px-3 py-2 text-[12px] text-inkdim">
                    먹으면 — {active.def.buff.label}
                  </p>
                )}

                <Button
                  size="lg"
                  className="mt-4 w-full"
                  disabled={!active.canCook || cooking}
                  onClick={() => cook(active.def.id)}
                >
                  {cooking ? '만드는 중…' : active.canCook ? '만들기' : '재료가 모자라'}
                </Button>

                {/* 재료가 모자라면 어디서 나는지만 알려준다. 끌고 가지 않는다. */}
                {!active.canCook && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenId(null)
                      onClose()
                      onOpenGarden()
                    }}
                    className="mt-2 w-full rounded-btn bg-sage-soft px-3 py-2.5 text-[12.5px] text-sage-deep active:scale-[0.98]"
                  >
                    🌿 정원에서 얻을 수 있어
                  </button>
                )}

                {ownedCount(state.collection, active.def.outputItemId) > 0 && active.def.buff && (
                  <Button
                    variant="soft"
                    size="lg"
                    className="mt-2 w-full"
                    onClick={() => {
                      if (onEat(active.def.id)) {
                        onNotify(`${active.def.name}을(를) 먹었어 — ${active.def.buff!.label}`)
                        setOpenId(null)
                      }
                    }}
                  >
                    먹기 (가진 것 {ownedCount(state.collection, active.def.outputItemId)})
                  </Button>
                )}
              </>
            ) : (
              <p className="mt-4 rounded-card bg-canvas px-3.5 py-4 text-center text-[12.5px] leading-relaxed text-inkdim">
                아직 잘 모르겠는 요리야.
                <br />
                <span className="text-inkfaint">정원에서 더 거두다 보면 떠오를지도.</span>
              </p>
            )}
          </div>
        )}
      </BottomSheet>

      <CookedOverlay
        note={cooked}
        onClose={() => setCooked(null)}
        onOpenBook={() => {
          setCooked(null)
          onClose()
          onOpenBook()
        }}
      />

      <KitchenTutorial open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
    </Portal>
  )
}

/**
 * 레시피 한 칸.
 *
 * 칸 크기는 전부 같다. 이름이 길어도 칸이 혼자 넓어지지 않는다.
 */
function RecipeCard({ recipe, onSelect }: { recipe: KitchenRecipeView; onSelect: () => void }) {
  const { def, stage, canCook, favorite, cooked } = recipe
  const hidden = stage !== 'DISCOVERED' && def.hiddenUntilDiscovered === true

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={stage === 'UNKNOWN'}
      className={cn(
        'flex h-full w-full flex-col items-center rounded-card border px-2 pb-2.5 pt-2 transition-colors duration-200 active:scale-[0.97]',
        canCook
          ? 'border-coral bg-coral-soft/35 ring-1 ring-coral'
          : stage === 'DISCOVERED'
            ? 'border-line bg-surface'
            : 'border-dashed border-line bg-canvas',
        stage === 'UNKNOWN' && 'active:scale-100',
      )}
    >
      <span className="flex h-[62px] w-full items-center justify-center rounded-btn bg-canvas/80 leading-none">
        {stage === 'DISCOVERED' ? (
          <DishIcon def={def} size="lg" className="bg-transparent" />
        ) : hidden || stage === 'UNKNOWN' ? (
          // 이모지 물음표는 이 팔레트에서 혼자 새빨갛게 튄다
          <span className="text-[26px] text-inkfaint/60">?</span>
        ) : (
          // 아직 못 만든 건 그림자만. 모양이 보여야 궁금해진다.
          <DishIcon def={def} size="lg" hidden className="bg-transparent" />
        )}
      </span>

      {/* 두 줄 높이로 고정한다 — 이름 길이가 제각각이어도 칸 크기는 같아야 한다 */}
      <span className="mt-1.5 line-clamp-2 h-[32px] w-full text-center text-[11.5px] font-medium leading-[16px] text-ink">
        {stage === 'DISCOVERED' ? def.name : hidden ? '???' : def.name}
      </span>

      <span className="mt-0.5 flex h-[16px] items-center gap-1 text-[10px] text-inkfaint">
        {stage === 'UNKNOWN' ? (
          '???'
        ) : stage === 'HINTED' ? (
          '뭔가 떠오를 것 같아'
        ) : canCook ? (
          <span className="text-coral-deep">만들 수 있어</span>
        ) : (
          `재료 ${recipe.missingKinds}가지 모자라`
        )}
        {favorite && <span className="text-coral">♥</span>}
        {cooked > 0 && <span className="font-game">×{cooked}</span>}
      </span>
    </button>
  )
}

/**
 * 재료 한 알.
 *
 * 작물 그림도 이미 들어와 있다 (public/assets/items/crops/). 음식과 같은 이유로
 * 여기도 이모지를 그리고 있었다 — 정원에서 본 당근과 부엌에서 본 당근이 달랐다.
 */
function IngredientIcon({ itemId, icon }: { itemId: string; icon: string }) {
  const item = findCollectionItem(itemId)
  if (!item) {
    return (
      <span aria-hidden className="text-[20px] leading-none">
        {icon}
      </span>
    )
  }
  return <ItemIcon item={item} size="sm" />
}
