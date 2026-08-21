import { useMemo, useState } from 'react'
import type { EquipSlot, EquippedItems, InventoryEntry, ItemDef, ItemType } from '@/types'
import { findItem } from '@/lib/rpg/content'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { RarityBadge, RARITY_STYLE } from '@/components/rpg/RarityBadge'
import { CHARACTER_FACE, EFFECT } from '@/lib/assets'
import { cn } from '@/components/ui/cn'

type BagFilter = 'ALL' | ItemType

const FILTERS: Array<{ value: BagFilter; label: string }> = [
  { value: 'ALL', label: 'ALL' },
  { value: 'EQUIPMENT', label: 'EQUIPMENT' },
  { value: 'MATERIAL', label: 'MATERIAL' },
  { value: 'COLLECTIBLE', label: 'COLLECTIBLE' },
]

interface BagScreenProps {
  inventory: InventoryEntry[]
  equipped: EquippedItems
  coins: number
  onEquip: (itemId: string) => void
  onUnequip: (slot: EquipSlot) => void
}

export function BagScreen({ inventory, equipped, coins, onEquip, onUnequip }: BagScreenProps) {
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
        title="BAG"
        trailing={
          <span className="inline-flex items-center gap-1 rounded-pill bg-surface px-3 py-1.5 ring-1 ring-line">
            <span className="text-[13px]">🪙</span>
            <span className="font-game text-[12px] leading-none text-inkdim">
              {coins.toLocaleString('ko-KR')}
            </span>
          </span>
        }
      />
      <p className="-mt-1 mb-4 text-[13px] text-inkdim">주워온 것들.</p>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'inline-flex h-9 items-center rounded-pill px-3.5 font-game text-[10px] tracking-[0.08em]',
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
                        <span className="rounded-pill bg-coral px-1.5 py-0.5 font-game text-[9px] tracking-[0.06em] text-surface">
                          EQUIPPED
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
}

function ItemSheet({ def, entry, equipped, onClose, onEquip, onUnequip }: ItemSheetProps) {
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
          <span className="font-game text-[10px] tracking-[0.08em] text-inkfaint">{def.type}</span>
        </div>
        <p className="mt-3 text-[13.5px] leading-relaxed text-inkdim">{def.description}</p>
      </div>

      <div className="mt-5 space-y-2">
        <Row label="효과" value={def.effectLabel} highlight />
        <Row label="슬롯" value={slot ?? '장착할 수 없음'} />
        <Row label="얻은 곳" value={entry?.source ?? '—'} />
        {entry && entry.quantity > 1 && <Row label="수량" value={`${entry.quantity}개`} />}
      </div>

      <div className="mt-6">
        {slot === null ? (
          <p className="text-center text-[12.5px] text-inkfaint">
            아직 쓸 곳이 없는 물건이야. 그냥 가지고 있어도 돼.
          </p>
        ) : isEquipped ? (
          <Button variant="soft" size="lg" className="w-full" onClick={() => onUnequip(slot)}>
            Unequip
          </Button>
        ) : (
          <Button size="lg" className="w-full" onClick={() => onEquip(def.id)}>
            <img src={EFFECT.sparkle} alt="" aria-hidden className="h-4 w-4 object-contain" />
            Equip
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
