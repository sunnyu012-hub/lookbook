import { useEffect, useState } from 'react'
import type { DiscoveryResult } from '@/types'
import { Portal } from '@/components/ui/Portal'
import { ItemIcon } from './ItemIcon'
import { RarityBadge, RARITY_STYLE } from '@/components/rpg/RarityBadge'
import { findCollectionItem } from '@/lib/collection/catalog'
import { EFFECT } from '@/lib/assets'
import { cn } from '@/components/ui/cn'

interface DiscoveryOverlayProps {
  /** 이번에 처음 만난 것들. 여러 개면 하나씩 넘긴다. */
  discoveries: DiscoveryResult[]
  progress: { found: number; total: number }
  onClose: () => void
  onOpenCollection: () => void
  onPlace: (itemId: string) => void
}

/**
 * 처음 만났을 때.
 *
 * 두 번째부터는 이 화면을 띄우지 않는다. 같은 연출을 세 번 보면
 * 네 번째부터는 그냥 닫아야 하는 것이 된다.
 */
export function DiscoveryOverlay({
  discoveries,
  progress,
  onClose,
  onOpenCollection,
  onPlace,
}: DiscoveryOverlayProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [discoveries])

  if (discoveries.length === 0) return null

  const current = discoveries[Math.min(index, discoveries.length - 1)]
  const item = findCollectionItem(current.itemId)
  if (!item) return null

  const style = RARITY_STYLE[item.rarity]
  const last = index >= discoveries.length - 1
  const placeable = item.placeable && item.hasPlaceableAsset

  const next = () => {
    if (last) onClose()
    else setIndex((i) => i + 1)
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center px-7"
        role="status"
        aria-live="polite"
      >
        {/* 바깥을 눌러도 닫힌다. 버튼을 찾아야만 사라지는 창은 그 자체로 일이 된다. */}
        <div
          className="absolute inset-0 animate-fadein bg-ink/25 backdrop-blur-[2px]"
          onClick={onClose}
          aria-hidden
        />

        <div className="relative w-full max-w-[320px] animate-pop rounded-card border border-line bg-surface px-6 py-6 text-center shadow-lift">
          <img
            src={EFFECT.sparkle}
            alt=""
            aria-hidden
            className="mx-auto h-7 w-7 animate-sparkle object-contain"
          />
          <p className="mt-1 font-game text-[12px] tracking-wide text-coral-deep">NEW DISCOVERY</p>

          <span
            className={cn(
              'mx-auto mt-4 flex h-[88px] w-[88px] items-center justify-center rounded-card ring-1 ring-inset',
              style.chip,
              style.ring,
            )}
          >
            <ItemIcon item={item} size="xl" />
          </span>

          <p className="mt-3 text-[17px] font-semibold text-ink">{item.nameKo}</p>
          <p className="mt-1.5">
            <RarityBadge rarity={item.rarity} />
          </p>
          <p className="mt-2.5 text-[13px] leading-relaxed text-inkdim">{item.description}</p>

          <p className="mt-4 rounded-btn bg-canvas px-3 py-2 font-game text-[11px] text-inkdim">
            도감 +1 · {progress.found} / {progress.total}
          </p>

          {discoveries.length > 1 && (
            <p className="mt-2 text-[11.5px] text-inkfaint">
              {index + 1} / {discoveries.length}
            </p>
          )}

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => {
                onOpenCollection()
                onClose()
              }}
              className="min-h-[44px] flex-1 rounded-btn bg-sunken text-[13px] font-medium text-inkdim active:scale-[0.97]"
            >
              도감에서 보기
            </button>
            {placeable ? (
              <button
                type="button"
                onClick={() => {
                  onPlace(item.id)
                  onClose()
                }}
                className="min-h-[44px] flex-1 rounded-btn bg-coral text-[13px] font-medium text-surface active:scale-[0.97]"
              >
                방에 놓기
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                className="min-h-[44px] flex-1 rounded-btn bg-coral text-[13px] font-medium text-surface active:scale-[0.97]"
              >
                {last ? '좋아' : '다음'}
              </button>
            )}
          </div>

          {placeable && (
            <button
              type="button"
              onClick={next}
              className="mt-2 w-full py-1.5 text-[12px] text-inkfaint"
            >
              {last ? '나중에' : '다음'}
            </button>
          )}
        </div>
      </div>
    </Portal>
  )
}
