import type { DropResult } from '@/types'
import { findItem } from '@/lib/rpg/content'
import { RarityBadge, RARITY_STYLE } from '@/components/rpg/RarityBadge'
import { EFFECT } from '@/lib/assets'
import { cn } from '@/components/ui/cn'

interface DropRevealOverlayProps {
  drops: DropResult[]
  onClose: () => void
}

/**
 * 뭔가 떨어졌을 때.
 *
 * 반짝임 하나만 쓰고 화면을 번쩍이게 하지 않는다.
 * 스스로 사라지지만 아무 데나 눌러도 닫힌다 — 기다리게 만들지 않으려는 것이다.
 */
export function DropRevealOverlay({ drops, onClose }: DropRevealOverlayProps) {
  if (drops.length === 0) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-8"
      role="status"
      aria-live="polite"
      onClick={onClose}
    >
      <div className="absolute inset-0 animate-fadein bg-ink/20 backdrop-blur-[2px]" aria-hidden />

      <div className="relative animate-pop rounded-card border border-line bg-surface px-7 py-6 text-center shadow-lift">
        <img
          src={EFFECT.sparkle}
          alt=""
          aria-hidden
          className="mx-auto h-7 w-7 animate-sparkle object-contain"
        />
        <p className="mt-1 text-[14px] font-semibold text-coral-deep">뭔가 떨어졌어</p>

        <ul className="mt-4 space-y-3">
          {drops.map((drop, i) => {
            const def = findItem(drop.itemId)
            if (!def) return null
            const style = RARITY_STYLE[drop.rarity]
            return (
              <li key={`${drop.itemId}-${i}`} className="flex flex-col items-center">
                <span
                  className={cn(
                    'flex h-[68px] w-[68px] items-center justify-center rounded-card text-[36px] ring-1 ring-inset',
                    style.chip,
                    style.ring,
                  )}
                >
                  {def.icon}
                </span>
                <span className="mt-2 text-[15px] font-semibold text-ink">{def.name}</span>
                <span className="mt-1">
                  <RarityBadge rarity={drop.rarity} />
                </span>
              </li>
            )
          })}
        </ul>

        <p className="mt-4 text-[12.5px] text-inkdim">가방에 넣어뒀어.</p>
      </div>
    </div>
  )
}
