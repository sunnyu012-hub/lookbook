import { useMemo, useState } from 'react'
import type { AppState, CollectionCategory, CollectionItemDef } from '@/types'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SectionHeader } from '@/components/layout/ScreenHeader'
import { ItemIcon } from './ItemIcon'
import { ItemDetailSheet } from './ItemDetailSheet'
import {
  CATALOG,
  CATALOG_CATEGORIES,
  CROP_CATALOG,
  FOOD_CATALOG,
  TROPHY_CATALOG,
  hasHiddenLeft,
} from '@/lib/collection/catalog'
import { COLLECTION_SETS } from '@/lib/collection/sets'
import { TROPHIES } from '@/lib/collection/trophies'
import { collectionProgress, isDiscovered, isSeen, ownedCount, setProgress } from '@/lib/collection/progress'
import { COLLECTION_CATEGORY_LABEL } from '@/lib/labels'
import { skinCollectionProgress } from '@/lib/character/derive'
import { recipeCollectionProgress } from '@/lib/kitchen/derive'
import { CharacterSkinRenderer } from '@/components/character/CharacterSkinRenderer'
import { cn } from '@/components/ui/cn'

/**
 * 도감.
 *
 * 가방은 "지금 쓸 수 있는 것" 을 보는 곳이고, 여기는 "지금까지 만난 것" 을 보는 곳이다.
 * 그래서 아직 못 만난 칸도 지우지 않고 남겨둔다. 빈 칸이 있어야 채우고 싶어진다.
 *
 * 다만 못 만난 칸에도 갈 곳은 알려준다. "어디선가" 로 끝나면 그건 힌트가 아니다.
 */

type Tab = CollectionCategory | 'ALL' | 'TROPHY_TAB' | 'SETS' | 'CROPS' | 'RECIPES'

const PAGE = 60

interface CollectionBookProps {
  state: AppState
  onToggleWishlist: (itemId: string) => void
  onPlace: (itemId: string) => void
  onOpenWorkshop: () => void
  /** 캐릭터 모습 목록을 연다 */
  onOpenLook: () => void
}

export function CollectionBook({
  state,
  onToggleWishlist,
  onPlace,
  onOpenWorkshop,
  onOpenLook,
}: CollectionBookProps) {
  const [tab, setTab] = useState<Tab>('ALL')
  const [shown, setShown] = useState(PAGE)
  const [openItem, setOpenItem] = useState<CollectionItemDef | null>(null)

  const collection = state.collection
  const progress = useMemo(() => collectionProgress(collection), [collection])

  const items = useMemo(() => {
    if (tab === 'TROPHY_TAB') return TROPHY_CATALOG
    // 작물과 요리는 240칸에 안 들어간다. 여기서 자기 칸을 따로 가진다.
    if (tab === 'CROPS') return CROP_CATALOG
    if (tab === 'RECIPES') return FOOD_CATALOG
    if (tab === 'ALL') return CATALOG
    if (tab === 'SETS') return []
    return CATALOG.filter((i) => i.category === tab)
  }, [tab])

  const visible = items.slice(0, shown)

  const switchTab = (next: Tab) => {
    setTab(next)
    setShown(PAGE)
  }

  const skinProgress = useMemo(() => skinCollectionProgress(state), [state])
  const trophyFound = TROPHY_CATALOG.filter((t) => isDiscovered(collection, t.id)).length
  const cropFound = CROP_CATALOG.filter((c) => isDiscovered(collection, c.id)).length
  // 요리는 "만들어본 적이 있는지" 로 센다. 다 먹어 없어져도 도감에는 남는다.
  const recipeFound = recipeCollectionProgress(state).found
  const setsDone = COLLECTION_SETS.filter((s) => setProgress(s, collection).complete).length

  return (
    <div>
      <Card className="py-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[15px] font-semibold text-ink">도감</p>
            <p className="mt-0.5 text-[12px] text-inkdim">지나가다 하나씩 발견한 것들.</p>
          </div>
          <p className="font-game text-[15px] leading-none text-coral-deep">
            {progress.found}
            <span className="text-[11px] text-inkfaint"> / {progress.total}</span>
            {hasHiddenLeft(collection.discovered) && (
              <span className="text-[11px] text-inkfaint"> +?</span>
            )}
          </p>
        </div>
        <div className="mt-3">
          <ProgressBar
            value={progress.total > 0 ? progress.found / progress.total : 0}
            barClassName="bg-coral"
            aria-label="도감 진행"
          />
        </div>
        <div className="mt-3 flex gap-2 text-[11.5px] text-inkdim">
          <span className="rounded-pill bg-sunken px-2.5 py-1">
            트로피 {trophyFound} / {TROPHIES.length}
          </span>
          <span className="rounded-pill bg-sunken px-2.5 py-1">
            세트 {setsDone} / {COLLECTION_SETS.length}
          </span>
          <span className="rounded-pill bg-sunken px-2.5 py-1">
            작물 {cropFound} / {CROP_CATALOG.length}
          </span>
          <span className="rounded-pill bg-sunken px-2.5 py-1">
            요리 {recipeFound} / {FOOD_CATALOG.length}
          </span>
        </div>
      </Card>

      {/* 캐릭터 모습은 물건이 아니라 여기 목록에 섞지 않는다.
          대신 여기서 몇 가지를 모았는지 보여주고 그쪽으로 넘긴다. */}
      <button
        type="button"
        onClick={onOpenLook}
        className="mt-3 flex w-full items-center gap-3 rounded-card border border-line/70 bg-surface px-4 py-3 text-left shadow-soft active:scale-[0.99]"
      >
        <span className="h-10 w-8 shrink-0">
          <CharacterSkinRenderer skinId={state.user.selectedSkinId} animated={false} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-medium text-ink">캐릭터 모습</span>
          <span className="mt-0.5 block text-[11.5px] text-inkdim">
            오늘 기분에 맞는 모습으로 지내기
          </span>
        </span>
        <span className="shrink-0 font-game text-[13px] text-coral-deep">
          {skinProgress.found}
          <span className="text-[10px] text-inkfaint"> / {skinProgress.total}</span>
        </span>
      </button>

      {/* 분류 */}
      <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-1">
        <div className="flex w-max gap-1.5">
          <Chip on={tab === 'ALL'} onClick={() => switchTab('ALL')}>
            전체
          </Chip>
          {CATALOG_CATEGORIES.map((category) => (
            <Chip key={category} on={tab === category} onClick={() => switchTab(category)}>
              {COLLECTION_CATEGORY_LABEL[category]}
            </Chip>
          ))}
          <Chip on={tab === 'TROPHY_TAB'} onClick={() => switchTab('TROPHY_TAB')}>
            트로피
          </Chip>
          <Chip on={tab === 'CROPS'} onClick={() => switchTab('CROPS')}>
            작물
          </Chip>
          <Chip on={tab === 'RECIPES'} onClick={() => switchTab('RECIPES')}>
            요리
          </Chip>
          <Chip on={tab === 'SETS'} onClick={() => switchTab('SETS')}>
            세트
          </Chip>
        </div>
      </div>

      {tab === 'SETS' ? (
        <SetList state={state} />
      ) : (
        <>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {visible.map((item) => {
              const found = isDiscovered(collection, item.id)
              const owned = ownedCount(collection, item.id)
              const secret = !found && item.hiddenUntilDiscovered === true
              // 가게에서 본 것. 이름과 그림은 알지만 아직 가진 것은 아니다.
              // 비밀 물건은 봤어도 계속 감춘다.
              const glimpsed = !found && !secret && isSeen(collection, item.id)

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setOpenItem(item)}
                    className={cn(
                      'flex w-full flex-col items-center gap-1.5 rounded-card border px-1.5 py-3',
                      'transition-transform duration-150 ease-out active:scale-[0.97]',
                      found
                        ? 'border-line bg-surface'
                        : glimpsed
                          ? 'border-line/70 bg-sunken/10'
                          : 'border-line/60 bg-sunken/30',
                    )}
                  >
                    <span className="relative">
                      {/* 본 것은 그림을 옅게 보여준다. 어떤 물건인지는 알되
                          내 것이 아니라는 게 한눈에 보여야 한다. */}
                      <span className={cn(glimpsed && 'opacity-45 grayscale')}>
                        <ItemIcon item={item} hidden={!found && !glimpsed} size="md" />
                      </span>
                      {owned > 1 && (
                        <span className="absolute -bottom-1 -right-1 rounded-pill bg-ink/70 px-1.5 font-game text-[9px] text-surface">
                          {owned}
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        'line-clamp-2 min-h-[26px] text-center text-[11px] leading-tight',
                        found ? 'text-ink' : 'text-inkfaint',
                      )}
                    >
                      {found || glimpsed ? item.nameKo : '???'}
                    </span>
                    {glimpsed && (
                      <span className="font-game text-[8.5px] leading-none text-inkfaint">
                        본 적 있음
                      </span>
                    )}
                    {collection.wishlist.includes(item.id) && !found && (
                      <span className="text-[10px] leading-none text-coral-deep">♥</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>

          {items.length > visible.length && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="mt-3 w-full rounded-btn bg-sunken py-3 text-[13px] font-medium text-inkdim"
            >
              {items.length - visible.length}개 더 보기
            </button>
          )}
        </>
      )}

      <ItemDetailSheet
        item={openItem}
        state={state}
        onClose={() => setOpenItem(null)}
        onToggleWishlist={onToggleWishlist}
        onPlace={(id) => {
          onPlace(id)
          setOpenItem(null)
        }}
        onOpenWorkshop={() => {
          setOpenItem(null)
          onOpenWorkshop()
        }}
      />
    </div>
  )
}

function SetList({ state }: { state: AppState }) {
  return (
    <div className="mt-3 space-y-2">
      <SectionHeader title="세트" />
      {COLLECTION_SETS.map((set) => {
        const p = setProgress(set, state.collection)
        return (
          <Card key={set.id} className={cn('py-3.5', p.complete && 'ring-1 ring-inset ring-coral/40')}>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-canvas text-[22px]">
                {set.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[14px] font-medium text-ink">
                  {set.name}
                  {p.complete && <span className="text-[11px] text-coral-deep">완성 ✦</span>}
                </p>
                <p className="mt-0.5 truncate text-[11.5px] text-inkdim">{set.description}</p>
              </div>
              <span className="shrink-0 font-game text-[12px] text-inkdim">
                {p.have}/{p.need}
              </span>
            </div>
            <div className="mt-2.5">
              <ProgressBar
                value={p.need > 0 ? p.have / p.need : 0}
                thickness="sm"
                barClassName={p.complete ? 'bg-coral' : 'bg-inkfaint'}
              />
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function Chip({
  children,
  on,
  onClick,
}: {
  children: React.ReactNode
  on: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center rounded-pill px-3 text-[12px] font-medium',
        'transition-transform duration-150 ease-out active:scale-[0.96]',
        on ? 'bg-coral text-surface' : 'bg-surface text-inkdim ring-1 ring-inset ring-line',
      )}
    >
      {children}
    </button>
  )
}
