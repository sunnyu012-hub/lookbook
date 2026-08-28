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
 * ── 네 가지 상태 ───────────────────────────────────────
 *
 * 가진 것     그림 그대로.
 * 가게에서 본 것  그림 그대로 + 값. 안 샀어도 본 건 기억한다 —
 *             봤는데 다음 날 다시 실루엣이 되면 그건 도감이 아니다.
 * 못 가진 것  실루엣 + 힌트. 조건 숫자는 안 적는다.
 * 감춘 것     ❔ 와 ???. 이름도 그림도 안 보여준다 —
 *             얻기 전에 뭐가 있는지 다 알면 찾을 일이 없다.
 *
 * 어느 칸을 눌러도 여기서 무슨 일이 일어나지는 않는다. 상세 시트가 열린다.
 */
export function SkinCard({ view, onSelect }: SkinCardProps) {
  const { def, owned, active, hidden, forSale, seen } = view
  // 봤으면 그림을 그대로 보여준다. 가진 것과 같은 밝기다.
  const revealed = owned || seen
  const price = skinPrice(def)
  const rarity = RARITY_STYLE[def.rarity]

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        // w-full 이 없으면 버튼이 글자 길이만큼만 늘어난다. 칸(grid cell)은 똑같은데
        // 안의 버튼만 제각각이 되고, 이름이 길면 칸 밖으로 삐져나온다.
        // 버튼은 기본 width 가 auto 라 내용에 맞춰 줄어드는 게 맞는 동작이다 —
        // 여기서는 칸을 채워야 하니 명시한다.
        'relative flex h-full w-full flex-col items-center rounded-card border px-2 pb-2.5 pt-2 transition-colors duration-200 active:scale-[0.97]',
        // 고를 때 테두리를 두껍게 하면 그 칸만 2px 커진다. 색과 ring 으로만 표시한다.
        active ? 'border-coral bg-coral-soft/35 ring-1 ring-coral' : 'border-line bg-surface',
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
              // 아직 못 만난 것은 실루엣처럼 눌러둔다. 흐리게만 두면
              // 그냥 그림이 덜 나온 것처럼 보인다.
              !revealed && 'opacity-30 grayscale',
            )}
          >
            <CharacterSkinRenderer skinId={def.id} animated={false} className="h-[86px] w-auto" />
          </span>
        )}
      </span>

      {/* 이름 길이가 제각각이라 높이를 두 줄로 고정한다.
          한 줄로 자르면 "크리에이티브 데이" 가 "크리에이티브 데…" 가 되고,
          내용에 맡기면 두 줄짜리 칸만 아래로 길어진다. */}
      <span className="mt-1.5 line-clamp-2 h-[32px] w-full text-center text-[11.5px] font-medium leading-[16px] text-ink">
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
        ) : seen ? (
          // 가게에서 봤지만 아직 조건이 안 찬 것. 값 대신 봤다는 표시만.
          <span className="absolute right-1 top-1 rounded-pill bg-sunken px-1.5 py-0.5 font-game text-[9px] text-inkdim">
            봤음
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
