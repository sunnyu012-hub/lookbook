import { useState } from 'react'
import type { WardrobeCategory, WardrobeItem, WardrobeState } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { AvatarRenderer } from './AvatarRenderer'
import { ACTIVE_CATEGORIES, CATEGORY_LABEL } from '@/lib/wardrobe/layers'
import { hiddenByOnePiece, ownedInCategory, wornIn } from '@/lib/wardrobe/state'
import { cn } from '@/components/ui/cn'

/**
 * 옷장.
 *
 * 한 번 누르면 그 자리에서 갈아입는다. 고르기 → 적용 → 확인 같은 건 만들지 않는다.
 * 저장 버튼도 없다 — 누르는 순간이 곧 저장이다.
 *
 * 위쪽은 늘 캐릭터가 보이게 붙여두고, 아래만 넘긴다.
 * 옷을 고르느라 캐릭터가 사라지면 갈아입는 재미가 없어진다.
 */

interface WardrobeSheetProps {
  open: boolean
  wardrobe: WardrobeState
  onClose: () => void
  onWear: (itemId: string) => void
  onTakeOff: (category: WardrobeCategory) => void
  onRandomize: () => void
}

const RARITY_LABEL: Record<WardrobeItem['rarity'], string> = {
  BASIC: '기본',
  COMMON: '흔함',
  RARE: '드묾',
  EPIC: '아주 드묾',
}

const RARITY_TINT: Record<WardrobeItem['rarity'], string> = {
  BASIC: 'text-inkfaint',
  COMMON: 'text-inkdim',
  RARE: 'text-dusty-deep',
  EPIC: 'text-lavender-deep',
}

export function WardrobeSheet({
  open,
  wardrobe,
  onClose,
  onWear,
  onTakeOff,
  onRandomize,
}: WardrobeSheetProps) {
  const [tab, setTab] = useState<WardrobeCategory>('TOP')

  const items = ownedInCategory(wardrobe, tab)
  const current = wornIn(wardrobe.outfit, tab)
  const dimmed = hiddenByOnePiece(wardrobe.outfit, tab)

  return (
    <BottomSheet open={open} onClose={onClose} title="옷장">
      {/* 캐릭터는 늘 붙어 있는다 */}
      <div className="sticky top-0 z-10 -mx-4 mb-2 bg-surface px-4 pb-2">
        <div className="relative h-[38vh] max-h-[300px] min-h-[200px] rounded-card bg-canvas">
          <AvatarRenderer outfit={wardrobe.outfit} className="p-3" />
          <button
            type="button"
            onClick={onRandomize}
            aria-label="아무거나 입혀보기"
            className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-pill bg-surface/90 text-[17px] shadow-soft active:scale-95"
          >
            🎲
          </button>
        </div>
      </div>

      <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {ACTIVE_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setTab(category)}
            className={cn(
              'shrink-0 rounded-pill px-3.5 py-1.5 text-[13px] font-medium transition-colors',
              tab === category ? 'bg-coral text-surface' : 'bg-sunken text-inkdim',
            )}
          >
            {CATEGORY_LABEL[category]}
          </button>
        ))}
      </div>

      {dimmed && (
        <p className="mb-2 text-[12px] leading-snug text-inkdim">
          원피스를 입는 동안에는 안 보여. 벗으면 그대로 돌아와.
        </p>
      )}

      {items.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-inkdim">
          {CATEGORY_LABEL[tab]}는 아직 없어.
        </p>
      ) : (
        <ul className={cn('grid grid-cols-3 gap-2', dimmed && 'opacity-50')}>
          {current && (
            <li className="col-span-3">
              <button
                type="button"
                onClick={() => onTakeOff(tab)}
                className="w-full rounded-card bg-sunken py-2 text-[12.5px] text-inkdim active:scale-[0.99]"
              >
                {CATEGORY_LABEL[tab]} 벗기
              </button>
            </li>
          )}
          {items.map((item) => {
            const worn = current === item.id
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onWear(item.id)}
                  aria-pressed={worn}
                  className={cn(
                    'flex w-full flex-col items-center rounded-card border p-2 transition-transform active:scale-[0.97]',
                    worn ? 'border-coral/50 bg-coral-soft/50' : 'border-line bg-surface',
                  )}
                >
                  <span className="relative flex h-[68px] w-full items-center justify-center">
                    {item.assetKey ? (
                      <img
                        src={item.assetKey}
                        alt=""
                        aria-hidden
                        loading="lazy"
                        draggable={false}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-inkfaint">◌</span>
                    )}
                    {worn && (
                      <span className="absolute right-0 top-0 font-game text-[11px] text-coral-deep">
                        ✓
                      </span>
                    )}
                  </span>
                  <span className="mt-1 w-full truncate text-center text-[11.5px] text-ink">
                    {item.name}
                  </span>
                  <span className={cn('text-[9.5px]', RARITY_TINT[item.rarity])}>
                    {RARITY_LABEL[item.rarity]}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </BottomSheet>
  )
}
