import type { SkinView } from '@/types'
import { RARITY_STYLE } from '@/components/rpg/RarityBadge'
import { RARITY_LABEL } from '@/lib/labels'
import { skinPrice } from '@/lib/character/skins'
import { findPack } from '@/lib/character/packs'
import { CharacterSkinRenderer } from './CharacterSkinRenderer'
import { cn } from '@/components/ui/cn'

interface SkinCardProps {
  view: SkinView
  onSelect: () => void
  /** 묶음 이름을 눌렀을 때. 처음 스물넷은 묶음이 없어서 안 부른다. */
  onPack?: () => void
}

/**
 * 목록에 한 칸.
 *
 * ── 네 가지 상태 ───────────────────────────────────────
 *
 * 가진 것    그림 그대로. 누르면 바로 입는다.
 * 살 수 있는 것 값이 붙는다. 누르면 데려온다.
 * 작은 옷장  자물쇠. 값을 안 보여준다 — 650 은 한 번 여는 값이지
 *            이 옷 한 벌의 값이 아니다. 여기서 값을 적으면 살 수 있는 줄 안다.
 * 감춘 것    실루엣과 ???. 이름도 그림도 안 보여준다.
 *
 * ── 묶음 이름을 버튼 밖에 둔다 ─────────────────────────
 *
 * 카드 자체가 버튼이라 그 안에 또 버튼을 넣을 수 없다.
 * 그래서 이름 아래에 형제로 붙인다. 처음 스물넷은 이 줄이 없다.
 */
export function SkinCard({ view, onSelect, onPack }: SkinCardProps) {
  const { def, owned, active, hidden, forSale } = view
  const price = skinPrice(def)
  const rarity = RARITY_STYLE[def.rarity]
  const pack = findPack(def.packId)
  const fromWardrobe = def.unlock.kind === 'GACHA'

  return (
    <div className="flex h-full flex-col">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={cn(
          // w-full 이 없으면 버튼이 글자 길이만큼만 늘어난다. 칸(grid cell)은 똑같은데
          // 안의 버튼만 제각각이 되고, 이름이 길면 칸 밖으로 삐져나온다.
          'relative flex flex-1 w-full flex-col items-center rounded-card border px-2 pb-2.5 pt-2 transition-colors duration-200 active:scale-[0.97]',
          // 고를 때 테두리를 두껍게 하면 그 칸만 2px 커진다. 색과 ring 으로만 표시한다.
          active ? 'border-coral bg-coral-soft/35 ring-1 ring-coral' : 'border-line bg-surface',
        )}
      >
        <span className="flex h-[92px] w-full items-center justify-center overflow-hidden rounded-btn bg-canvas">
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
              {/* 크기는 위 상자가 정한다. 여기에 h-[..] 를 또 주면
                  렌더러 안의 h-full 과 싸워서 어느 쪽이 이길지 모른다. */}
              <CharacterSkinRenderer skinId={def.id} animated={false} small lazy />
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
            작은 옷장 옷과 아직 조건이 남은 것은 자물쇠만 —
            값부터 보여주면 사면 되는 줄 안다. */}
        {!owned && !active && (
          forSale && price !== null ? (
            <span className="absolute right-1 top-1 rounded-pill bg-butter-soft px-1.5 py-0.5 font-game text-[9px] text-butter-deep">
              🪙 {price}
            </span>
          ) : (
            <span className="absolute right-1.5 top-1.5 text-[12px] leading-none text-inkfaint">
              {fromWardrobe ? '🚪' : '🔒'}
            </span>
          )
        )}
      </button>

      {pack && !hidden && (
        <button
          type="button"
          onClick={onPack}
          className="mt-1 rounded-btn px-1 text-center font-game text-[9px] leading-[14px] text-inkfaint active:text-coral-deep"
        >
          {/* 세 칸짜리 격자에서 한 칸은 110px 남짓이다. 묶음 이름까지 넣으면
              "10팩 · 오늘은 어디 …" 로 잘려서 어느 묶음인지 오히려 안 보인다.
              온전한 이름은 눌렀을 때 위에 뜨는 띠에 있다. */}
          {pack.id}팩
        </button>
      )}
    </div>
  )
}
