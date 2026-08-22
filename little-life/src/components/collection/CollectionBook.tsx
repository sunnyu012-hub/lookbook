import { useMemo, useState } from 'react'
import type { AppState, CollectionCategory, CollectionItemDef } from '@/types'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SectionHeader } from '@/components/layout/ScreenHeader'
import { ItemIcon } from './ItemIcon'
import { ItemDetailSheet } from './ItemDetailSheet'
import { CATALOG, CATALOG_CATEGORIES, TROPHY_CATALOG, hasHiddenLeft } from '@/lib/collection/catalog'
import { COLLECTION_SETS } from '@/lib/collection/sets'
import { TROPHIES } from '@/lib/collection/trophies'
import { collectionProgress, isDiscovered, ownedCount, setProgress } from '@/lib/collection/progress'
import { COLLECTION_CATEGORY_LABEL } from '@/lib/labels'
import { cn } from '@/components/ui/cn'

/**
 * 도감.
 *
 * 가방은 "지금 쓸 수 있는 것" 을 보는 곳이고, 여기는 "지금까지 만난 것" 을 보는 곳이다.
 * 그래서 아직 못 만난 칸도 지우지 않고 남겨둔다. 빈 칸이 있어야 채우고 싶어진다.
 *
 * 다만 못 만난 칸에도 갈 곳은 알려준다. "어디선가" 로 끝나면 그건 힌트가 아니다.
 */

type Tab = CollectionCategory | 'ALL' | 'TROPHY_TAB' | 'SETS'

const PAGE = 60

interface CollectionBookProps {
  state: AppState
  onToggleWishlist: (itemId: string) => void
  onPlace: (itemId: string) => void
  onOpenWorkshop: () => void
}

export function CollectionBook({
  state,
  onToggleWishlist,
  onPlace,
  onOpenWorkshop,
}: CollectionBookProps) {
  const [tab, setTab] = useState<Tab>('ALL')
  const [shown, setShown] = useState(PAGE)
  const [openItem, setOpenItem] = useState<CollectionItemDef | null>(null)

  const collection = state.collection
  const progress = useMemo(() => collectionProgress(collection), [collection])

  const items = useMemo(() => {
    if (tab === 'TROPHY_TAB') return TROPHY_CATALOG
    if (tab === 'ALL') return CATALOG
    if (tab === 'SETS') return []
    return CATALOG.filter((i) => i.category === tab)
  }, [tab])

  const visible = items.slice(0, shown)

  const switchTab = (next: Tab) => {
    setTab(next)
    setShown(PAGE)
  }

  const trophyFound = TROPHY_CATALOG.filter((t) => isDiscovered(collection, t.id)).length
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
        </div>
      </Card>

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

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setOpenItem(item)}
                    className={cn(
                      'flex w-full flex-col items-center gap-1.5 rounded-card border px-1.5 py-3',
                      'transition-transform duration-150 ease-out active:scale-[0.97]',
                      found ? 'border-line bg-surface' : 'border-line/60 bg-sunken/30',
                    )}
                  >
                    <span className="relative">
                      <ItemIcon item={item} hidden={!found} size="md" />
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
                      {found ? item.nameKo : secret ? '???' : '???'}
                    </span>
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
