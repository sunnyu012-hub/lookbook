import { useMemo, useState } from 'react'
import type {
  ActiveBuff,
  AppState,
  EquipSlot,
  EquippedItems,
  InventoryEntry,
  ItemDef,
  ItemType,
} from '@/types'
import { CollectionBook } from '@/components/collection/CollectionBook'
import { findItem } from '@/lib/rpg/content'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { RarityBadge, RARITY_STYLE } from '@/components/rpg/RarityBadge'
import { CHARACTER_FACE, EFFECT } from '@/lib/assets'
import { CATEGORY_LABEL, EQUIP_SLOT_LABEL, ITEM_TYPE_LABEL } from '@/lib/labels'
import { cn } from '@/components/ui/cn'

type BagFilter = 'ALL' | ItemType

const FILTERS: Array<{ value: BagFilter; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: 'EQUIPMENT', label: '장비' },
  { value: 'CONSUMABLE', label: '마실 것' },
  { value: 'MATERIAL', label: '재료' },
  { value: 'COLLECTIBLE', label: '수집품' },
]

interface BagScreenProps {
  state: AppState
  inventory: InventoryEntry[]
  equipped: EquippedItems
  coins: number
  activeBuffs: ActiveBuff[]
  onEquip: (itemId: string) => void
  onUnequip: (slot: EquipSlot) => void
  onUse: (itemId: string) => void
  /** 도감에서 바로 할 수 있는 것들 */
  onToggleWishlist: (itemId: string) => void
  onPlace: (itemId: string) => void
  onOpenWorkshop: () => void
  /** 처음 열 때 도감부터 보여줄지 */
  initialView?: BagView
}

type BagView = 'BAG' | 'BOOK'

export function BagScreen({
  state,
  inventory,
  equipped,
  coins,
  activeBuffs,
  onEquip,
  onUnequip,
  onUse,
  onToggleWishlist,
  onPlace,
  onOpenWorkshop,
  initialView = 'BAG',
}: BagScreenProps) {
  const [view, setView] = useState<BagView>(initialView)
  const [filter, setFilter] = useState<BagFilter>('ALL')
  const [openItem, setOpenItem] = useState<ItemDef | null>(null)

  const equippedIds = useMemo(
    () => new Set(Object.values(equipped).filter((v): v is string => v !== null)),
    [equipped],
  )

  const rows = useMemo(() => {
    return inventory
      .map((entry) => ({ entry, def: findItem(entry.itemId) }))
      .filter((row): row is { entry: InventoryEntry; def: ItemDef } => row.def !== null)
      .filter((row) => filter === 'ALL' || row.def.type === filter)
      .sort((a, b) => a.def.name.localeCompare(b.def.name))
  }, [inventory, filter])

  return (
    <div className="animate-risein">
      <ScreenHeader
        title="가방"
        trailing={
          <span className="inline-flex items-center gap-1 rounded-pill bg-surface px-3 py-1.5 ring-1 ring-line">
            <span className="text-[13px]">🪙</span>
            <span className="font-game text-[12px] leading-none text-inkdim">
              {coins.toLocaleString('ko-KR')}
            </span>
          </span>
        }
      />
      <p className="-mt-1 mb-3 text-[13px] text-inkdim">주워온 것들.</p>

      {/* 가방은 지금 쓸 수 있는 것, 도감은 지금까지 만난 것 */}
      <div className="mb-4 flex gap-1.5">
        {(
          [
            ['BAG', '가방'],
            ['BOOK', '도감'],
          ] as Array<[BagView, string]>
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            onClick={() => setView(value)}
            className={cn(
              'flex-1 rounded-pill py-2 text-[13px] font-medium',
              'transition-transform duration-150 ease-out active:scale-[0.98]',
              view === value ? 'bg-coral text-surface' : 'bg-sunken text-inkdim',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {view === 'BOOK' ? (
        <CollectionBook
          state={state}
          onToggleWishlist={onToggleWishlist}
          onPlace={onPlace}
          onOpenWorkshop={onOpenWorkshop}
        />
      ) : (
      <>
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'inline-flex h-9 items-center rounded-pill px-3.5 text-[12px] font-medium',
              'transition-transform duration-150 ease-out active:scale-[0.96]',
              filter === f.value
                ? 'bg-coral text-surface'
                : 'bg-surface text-inkdim ring-1 ring-inset ring-line',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {activeBuffs.length > 0 && (
        <div className="mt-4 rounded-card border border-butter/50 bg-butter-soft/50 px-4 py-3.5">
          <p className="text-[12px] font-medium text-butter-deep">지금 걸린 것</p>
          <ul className="mt-2 space-y-1">
            {activeBuffs.map((buff) => (
              <li key={buff.id} className="flex items-center gap-2 text-[13px] text-ink">
                <span className="text-[16px] leading-none">{buff.icon}</span>
                <span className="min-w-0 flex-1 truncate">{buff.name}</span>
                <span className="shrink-0 font-game text-[10px] text-butter-deep">
                  {buff.category ? CATEGORY_LABEL[buff.category] : '아무'} +{buff.expPct}%
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[12px] text-inkdim">다음 퀘스트 하나에 걸려.</p>
        </div>
      )}

      <div className="mt-5">
        {rows.length === 0 ? (
          <EmptyState
            face={CHARACTER_FACE.idle}
            title="가방이 아직 가벼워."
            hint="퀘스트를 하다 보면 뭔가 하나씩 나올 거야."
          />
        ) : (
          <ul className="grid grid-cols-2 gap-2.5">
            {rows.map(({ entry, def }) => {
              const isEquipped = equippedIds.has(def.id)
              return (
                <li key={def.id}>
                  <button
                    type="button"
                    onClick={() => setOpenItem(def)}
                    className={cn(
                      'flex h-full w-full flex-col items-start rounded-card border bg-surface p-3 text-left',
                      'transition-transform duration-150 ease-out active:scale-[0.97]',
                      isEquipped ? 'border-coral ring-1 ring-inset ring-coral/40' : 'border-line',
                    )}
                  >
                    <span className="flex w-full items-start justify-between">
                      <span className="text-[28px] leading-none">{def.icon}</span>
                      {entry.quantity > 1 && (
                        <span className="font-game text-[11px] text-inkdim">×{entry.quantity}</span>
                      )}
                    </span>
                    <span className="mt-2 line-clamp-2 text-[13px] font-medium leading-snug text-ink">
                      {def.name}
                    </span>
                    <span className="mt-1.5 flex items-center gap-1">
                      <RarityBadge rarity={def.rarity} />
                      {isEquipped && (
                        <span className="rounded-pill bg-coral px-1.5 py-0.5 text-[10px] font-medium text-surface">
                          장착 중
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      </>
      )}

      <ItemSheet
        def={openItem}
        entry={inventory.find((e) => e.itemId === openItem?.id) ?? null}
        equipped={equipped}
        onClose={() => setOpenItem(null)}
        onEquip={(id) => {
          onEquip(id)
          setOpenItem(null)
        }}
        onUnequip={(slot) => {
          onUnequip(slot)
          setOpenItem(null)
        }}
        onUse={(itemId) => {
          onUse(itemId)
          setOpenItem(null)
        }}
      />
    </div>
  )
}

interface ItemSheetProps {
  def: ItemDef | null
  entry: InventoryEntry | null
  equipped: EquippedItems
  onClose: () => void
  onEquip: (itemId: string) => void
  onUnequip: (slot: EquipSlot) => void
  onUse: (itemId: string) => void
}

function ItemSheet({ def, entry, equipped, onClose, onEquip, onUnequip, onUse }: ItemSheetProps) {
  if (!def) return null

  const slot = def.equipSlot
  const isEquipped = slot !== null && equipped[slot] === def.id
  const style = RARITY_STYLE[def.rarity]

  return (
    <BottomSheet open onClose={onClose} title={def.name}>
      <div className={cn('rounded-card px-5 py-6 text-center ring-1 ring-inset', style.chip, style.ring)}>
        <span className="text-[52px] leading-none">{def.icon}</span>
      </div>

      <div className="mt-4 text-center">
        <h2 className="text-[19px] font-semibold text-ink">{def.name}</h2>
        <div className="mt-1.5 flex items-center justify-center gap-1.5">
          <RarityBadge rarity={def.rarity} />
          <span className="text-[11px] text-inkfaint">{ITEM_TYPE_LABEL[def.type]}</span>
        </div>
        <p className="mt-3 text-[13.5px] leading-relaxed text-inkdim">{def.description}</p>
      </div>

      <div className="mt-5 space-y-2">
        <Row label="효과" value={def.effectLabel} highlight />
        <Row label="슬롯" value={slot ? EQUIP_SLOT_LABEL[slot] : '장착할 수 없음'} />
        <Row label="얻은 곳" value={entry?.source ?? '—'} />
        {entry && entry.quantity > 1 && <Row label="수량" value={`${entry.quantity}개`} />}
      </div>

      <div className="mt-6">
        {def.consumable ? (
          <>
            <Button size="lg" className="w-full" onClick={() => onUse(def.id)}>
              <img src={EFFECT.sparkle} alt="" aria-hidden className="h-4 w-4 object-contain" />
              마시기
            </Button>
            <p className="mt-2 text-center text-[12px] text-inkfaint">
              다음 {def.consumable.category ? CATEGORY_LABEL[def.consumable.category] : '아무'} 퀘스트 하나에 걸려. 서둘러 쓸 필요는 없어.
            </p>
          </>
        ) : slot === null ? (
          <p className="text-center text-[12.5px] text-inkfaint">
            아직 쓸 곳이 없는 물건이야. NPC 에게 선물할 수는 있어.
          </p>
        ) : isEquipped ? (
          <Button variant="soft" size="lg" className="w-full" onClick={() => onUnequip(slot)}>
            벗기
          </Button>
        ) : (
          <Button size="lg" className="w-full" onClick={() => onEquip(def.id)}>
            <img src={EFFECT.sparkle} alt="" aria-hidden className="h-4 w-4 object-contain" />
            장착하기
          </Button>
        )}
      </div>
    </BottomSheet>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-btn bg-canvas px-4 py-3">
      <span className="text-[12.5px] text-inkdim">{label}</span>
      <span className={cn('text-[13px]', highlight ? 'font-medium text-coral-deep' : 'text-ink')}>
        {value}
      </span>
    </div>
  )
}
