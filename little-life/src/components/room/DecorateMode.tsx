import { useMemo, useState } from 'react'
import type { AppState, CollectionItemDef, HomeEffectId, RoomId } from '@/types'
import { Portal } from '@/components/ui/Portal'
import { useOverlay } from '@/hooks/useOverlay'
import { ItemIcon } from '@/components/collection/ItemIcon'
import { RoomCanvas } from './RoomCanvas'
import { CATALOG_CATEGORIES, TROPHY_CATALOG, findCollectionItem } from '@/lib/collection/catalog'
import { CATALOG } from '@/lib/collection/catalog'
import { ROOMS, isRoomUnlocked, unlockLabel } from '@/lib/collection/rooms'
import { discoveredCount, ownedCount, unlockedEffectIds } from '@/lib/collection/progress'
import { HOME_EFFECTS } from '@/lib/collection/sets'
import { COLLECTION_CATEGORY_LABEL } from '@/lib/labels'
import { cn } from '@/components/ui/cn'

/**
 * 꾸미기.
 *
 * 점수를 매기지 않는다. "이렇게 놓으면 +5%" 같은 것도 없다.
 * 예쁜데 능력치가 낮아서 못 쓰는 가구를 만들지 않겠다는 뜻이다.
 * 여기서 하는 건 그냥 내 방을 내가 좋아하는 모양으로 만드는 것뿐이다.
 */

interface DecorateModeProps {
  open: boolean
  state: AppState
  onClose: () => void
  onPlace: (itemId: string) => void
  onMove: (uid: string, x: number, y: number) => void
  onUpdate: (uid: string, patch: { scale?: number; flipped?: boolean }) => void
  onRemove: (uid: string) => void
  onSelectRoom: (roomId: RoomId) => void
  onSelectEffect: (effectId: HomeEffectId | null) => void
  onNotify: (message: string) => void
}

export function DecorateMode({
  open,
  state,
  onClose,
  onPlace,
  onMove,
  onUpdate,
  onRemove,
  onSelectRoom,
  onSelectEffect,
  onNotify,
}: DecorateModeProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [tab, setTab] = useState<'ITEMS' | 'ROOMS' | 'AIR'>('ITEMS')
  useOverlay(open, onClose)

  const collection = state.collection
  const roomId = collection.currentRoomId
  const room = ROOMS.find((r) => r.id === roomId) ?? ROOMS[0]
  const placed = collection.rooms[roomId] ?? []

  const ctx = useMemo(
    () => ({
      level: state.user.level,
      categoryCompleted: state.categoryCompleted,
      discoveredCount: discoveredCount(collection),
    }),
    [state.user.level, state.categoryCompleted, collection],
  )

  /** 가진 것 중 아직 어느 방에도 안 놓은 것 */
  const tray = useMemo(() => {
    const usedByItem: Record<string, number> = {}
    for (const p of Object.values(collection.rooms).flat()) {
      usedByItem[p.itemId] = (usedByItem[p.itemId] ?? 0) + 1
    }

    return [...CATALOG, ...TROPHY_CATALOG]
      .filter((item) => ownedCount(collection, item.id) > 0 && item.placeable)
      .map((item) => ({
        item,
        left: ownedCount(collection, item.id) - (usedByItem[item.id] ?? 0),
      }))
  }, [collection])

  const effects = useMemo(() => unlockedEffectIds(collection), [collection])
  const activeEffect = collection.roomEffects[roomId] ?? null
  const selectedItem = placed.find((p) => p.uid === selected)

  if (!open) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-[65] flex flex-col bg-canvas">
        {/* 위 */}
        <header className="flex items-center gap-2 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+12px)]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-pill bg-surface px-3.5 py-2 text-[13px] font-medium text-inkdim ring-1 ring-line"
          >
            다 됐어
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-[14px] font-semibold text-ink">
            {room.icon} {room.name}
          </p>
          <span className="w-[62px]" />
        </header>

        {/* 방 */}
        <RoomCanvas
          room={room}
          placed={placed}
          effect={activeEffect}
          editing
          selectedUid={selected}
          onSelect={setSelected}
          onMove={onMove}
          className="mx-4 aspect-[16/12] w-auto rounded-card border border-line shadow-soft"
        />

        {/* 고른 것 다루기 */}
        {selectedItem ? (
          <div className="mx-4 mt-2 flex items-center gap-1.5 rounded-card border border-line bg-surface px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-inkdim">
              {findCollectionItem(selectedItem.itemId)?.nameKo ?? ''}
            </span>
            <Tool onClick={() => onUpdate(selectedItem.uid, { scale: selectedItem.scale - 0.15 })}>
              작게
            </Tool>
            <Tool onClick={() => onUpdate(selectedItem.uid, { scale: selectedItem.scale + 0.15 })}>
              크게
            </Tool>
            <Tool onClick={() => onUpdate(selectedItem.uid, { flipped: !selectedItem.flipped })}>
              뒤집기
            </Tool>
            <Tool
              onClick={() => {
                onRemove(selectedItem.uid)
                setSelected(null)
              }}
            >
              치우기
            </Tool>
          </div>
        ) : (
          <p className="mx-4 mt-2 rounded-card bg-sunken/50 px-3 py-2 text-center text-[12px] text-inkdim">
            아래에서 골라 넣고, 방에서 끌어 옮겨.
          </p>
        )}

        {/* 아래 서랍 */}
        <div className="mt-2 flex min-h-0 flex-1 flex-col rounded-t-card border-t border-line bg-surface">
          <div className="flex gap-1.5 px-4 pt-3">
            {(
              [
                ['ITEMS', '가진 것'],
                ['ROOMS', '방'],
                ['AIR', '공기'],
              ] as Array<[typeof tab, string]>
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
                className={cn(
                  'rounded-pill px-3.5 py-1.5 text-[12.5px] font-medium',
                  tab === value ? 'bg-coral text-surface' : 'bg-sunken text-inkdim',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
            {tab === 'ITEMS' && (
              <ItemTray tray={tray} onPlace={onPlace} onNotify={onNotify} />
            )}

            {tab === 'ROOMS' && (
              <ul className="space-y-2">
                {ROOMS.map((r) => {
                  const unlocked = isRoomUnlocked(r, ctx)
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        disabled={!unlocked}
                        onClick={() => {
                          onSelectRoom(r.id)
                          setSelected(null)
                        }}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-card border px-3.5 py-3 text-left',
                          r.id === roomId
                            ? 'border-coral bg-coral-soft/30'
                            : 'border-line bg-surface',
                          !unlocked && 'opacity-60',
                        )}
                      >
                        <span className="text-[22px]">{r.icon}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-medium text-ink">{r.name}</span>
                          <span className="mt-0.5 block text-[11.5px] text-inkdim">
                            {unlocked ? r.description : `${unlockLabel(r)}부터 열려`}
                          </span>
                        </span>
                        {!unlocked && <span className="text-[13px] text-inkfaint">잠김</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            {tab === 'AIR' && (
              <div>
                {effects.length === 0 ? (
                  <p className="rounded-card bg-canvas px-3.5 py-4 text-center text-[12.5px] leading-relaxed text-inkdim">
                    아직 없어.
                    <br />
                    <span className="text-inkfaint">세트를 완성하면 하나씩 생겨.</span>
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 gap-2">
                    <li>
                      <button
                        type="button"
                        onClick={() => onSelectEffect(null)}
                        className={cn(
                          'w-full rounded-card border px-3 py-3 text-left',
                          activeEffect === null
                            ? 'border-coral bg-coral-soft/30'
                            : 'border-line bg-surface',
                        )}
                      >
                        <span className="block text-[13.5px] font-medium text-ink">그대로</span>
                        <span className="mt-0.5 block text-[11px] text-inkdim">아무것도 안 걸기</span>
                      </button>
                    </li>
                    {HOME_EFFECTS.filter((e) => effects.includes(e.id)).map((effect) => (
                      <li key={effect.id}>
                        <button
                          type="button"
                          onClick={() => onSelectEffect(effect.id)}
                          className={cn(
                            'w-full rounded-card border px-3 py-3 text-left',
                            activeEffect === effect.id
                              ? 'border-coral bg-coral-soft/30'
                              : 'border-line bg-surface',
                          )}
                        >
                          <span className="block text-[13.5px] font-medium text-ink">
                            {effect.icon} {effect.name}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-inkdim">
                            {effect.description}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  )
}

function ItemTray({
  tray,
  onPlace,
  onNotify,
}: {
  tray: Array<{ item: CollectionItemDef; left: number }>
  onPlace: (itemId: string) => void
  onNotify: (message: string) => void
}) {
  const [category, setCategory] = useState<string>('ALL')

  const shown = tray.filter((t) => category === 'ALL' || t.item.category === category)

  if (tray.length === 0) {
    return (
      <p className="rounded-card bg-canvas px-3.5 py-4 text-center text-[12.5px] leading-relaxed text-inkdim">
        아직 놓을 게 없어.
        <br />
        <span className="text-inkfaint">가게에 들르거나 퀘스트를 하다 보면 하나씩 생겨.</span>
      </p>
    )
  }

  return (
    <>
      <div className="-mx-4 mb-2 overflow-x-auto px-4">
        <div className="flex w-max gap-1.5">
          <TrayChip on={category === 'ALL'} onClick={() => setCategory('ALL')}>
            전체
          </TrayChip>
          {[...CATALOG_CATEGORIES, 'TROPHY' as const]
            .filter((c) => tray.some((t) => t.item.category === c))
            .map((c) => (
              <TrayChip key={c} on={category === c} onClick={() => setCategory(c)}>
                {COLLECTION_CATEGORY_LABEL[c]}
              </TrayChip>
            ))}
        </div>
      </div>

      <ul className="grid grid-cols-4 gap-2">
        {shown.map(({ item, left }) => {
          const usable = item.hasPlaceableAsset && left > 0

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  if (!item.hasPlaceableAsset) {
                    onNotify('아직 방에 놓을 수 있는 그림이 없어')
                    return
                  }
                  if (left <= 0) {
                    onNotify('가진 건 다 놓여 있어')
                    return
                  }
                  onPlace(item.id)
                }}
                className={cn(
                  'flex w-full flex-col items-center gap-1 rounded-card border px-1 py-2.5',
                  'transition-transform duration-150 ease-out active:scale-[0.96]',
                  usable ? 'border-line bg-surface' : 'border-line/60 bg-sunken/40',
                )}
              >
                <span className="relative">
                  <ItemIcon item={item} size="sm" />
                  {left > 1 && (
                    <span className="absolute -bottom-1 -right-1.5 rounded-pill bg-ink/70 px-1 font-game text-[9px] text-surface">
                      {left}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    'line-clamp-2 min-h-[24px] text-center text-[10px] leading-tight',
                    usable ? 'text-inkdim' : 'text-inkfaint',
                  )}
                >
                  {item.nameKo}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function Tool({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-pill bg-sunken px-2.5 py-1.5 text-[11.5px] font-medium text-inkdim active:scale-[0.96]"
    >
      {children}
    </button>
  )
}

function TrayChip({
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
        'inline-flex h-7 items-center rounded-pill px-2.5 text-[11.5px] font-medium',
        on ? 'bg-coral text-surface' : 'bg-sunken text-inkdim',
      )}
    >
      {children}
    </button>
  )
}
