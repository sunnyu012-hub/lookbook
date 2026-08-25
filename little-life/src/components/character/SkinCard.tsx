import type { SkinView } from '@/types'
import { RARITY_STYLE } from '@/components/rpg/RarityBadge'
import { RARITY_LABEL } from '@/lib/labels'
import { skinPrice } from '@/lib/character/skins'
import { CharacterSkinRenderer } from './CharacterSkinRenderer'
import { cn } from '@/components/ui/cn'

interface SkinCardProps {
  view: SkinView
  onSelect: () => void
}

/**
 * 목록에 한 칸.
 *
 * ── 세 가지 상태 ───────────────────────────────────────
 *
 * 가진 것    그림 그대로. 누르면 바로 입는다.
 * 못 가진 것 흐리게 + 힌트. 조건 숫자는 안 적는다.
 * 감춘 것    실루엣과 ???. 이름도 그림도 안 보여준다 —
 *            얻기 전에 뭐가 있는지 다 알면 찾을 일이 없다.
 */
export function SkinCard({ view, onSelect }: SkinCardProps) {
  const { def, owned, active, hidden, forSale } = view
  const price = skinPrice(def)
  const rarity = RARITY_STYLE[def.rarity]

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        'relative flex flex-col items-center rounded-card border px-2 pb-2.5 pt-2 transition-colors duration-200 active:scale-[0.97]',
        active ? 'border-2 border-coral bg-coral-soft/35' : 'border-line bg-surface',
      )}
    >
      <span
        className={cn(
          'flex h-[92px] w-full items-center justify-center overflow-hidden rounded-btn bg-canvas',
          !owned && 'opacity-100',
        )}
      >
        {hidden ? (
          <span className="text-[26px] leading-none text-inkfaint">❔</span>
        ) : (
          <span
            className={cn(
              'flex h-full w-full items-center justify-center',
              // 못 가진 것은 실루엣처럼 눌러둔다. 흐리게만 두면
              // 그냥 그림이 덜 나온 것처럼 보인다.
              !owned && 'opacity-30 grayscale',
            )}
          >
            <CharacterSkinRenderer skinId={def.id} animated={false} className="h-[86px] w-auto" />
          </span>
        )}
      </span>

      <span className="mt-1.5 w-full truncate text-center text-[12px] font-medium text-ink">
        {hidden ? '???' : def.name}
      </span>

      <span
        className={cn(
          'mt-1 inline-flex h-[18px] items-center rounded-pill px-1.5 text-[9.5px] font-medium',
          rarity.chip,
          rarity.text,
        )}
      >
        {RARITY_LABEL[def.rarity]}
      </span>

      {active && (
        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-coral text-[11px] leading-none text-surface">
          ✓
        </span>
      )}

      {/* 조건을 다 채워서 이제 코인만 있으면 되는 것은 값을 보여준다.
          아직 조건이 남은 것은 자물쇠만 — 값부터 보여주면 사면 되는 줄 안다. */}
      {!owned && !active && (
        forSale && price !== null ? (
          <span className="absolute right-1 top-1 rounded-pill bg-butter-soft px-1.5 py-0.5 font-game text-[9px] text-butter-deep">
            🪙 {price}
          </span>
        ) : (
          <span className="absolute right-1.5 top-1.5 text-[12px] leading-none text-inkfaint">
            🔒
          </span>
        )
      )}
    </button>
  )
}
