import type { SkinView } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { RARITY_STYLE } from '@/components/rpg/RarityBadge'
import { RARITY_LABEL } from '@/lib/labels'
import { skinPrice, skinWorld } from '@/lib/character/skins'
import { ACQUISITION_NOTE, SKIN_WORLD_LABEL, findPack } from '@/lib/character/packs'
import { CharacterSkinRenderer } from './CharacterSkinRenderer'
import { cn } from '@/components/ui/cn'

interface SkinDetailSheetProps {
  view: SkinView | null
  coins: number
  onClose: () => void
  /** 가진 것을 진짜로 입는다 */
  onWear: () => void
  /** 살 수 있을 때만 넘어온다. 없으면 살 수 있는 상태가 아니라는 뜻이다. */
  onBuy?: () => void
}

/**
 * 옷 한 벌을 자세히.
 *
 * ── 왜 생겼는지 ────────────────────────────────────────
 *
 * 의상실에서 옷을 누르면 **그 자리에서 코인이 빠져나갔다.** 물어보지도
 * 않았다. 자세히 보려고 눌렀을 뿐인데 코인이 사라진다.
 * 목록의 한 칸은 "고르는 곳" 이지 "결제하는 곳" 이 아니다.
 *
 * 그래서 누르면 여기가 열린다. 여기서 하는 일은 둘이다 —
 * 크게 보기 · 사기. 코인은 **사기 버튼을 눌렀을 때만** 움직인다.
 *
 * ── 입어보기는 뺐다 ────────────────────────────────────
 *
 * 한때 안 가진 옷도 미리 입어보게 했다. 그런데 미리보기가 그려지는 자리는
 * 의상실 맨 위인데, 이 시트가 그 위를 덮는다 — 입어봐도 볼 수가 없었다.
 * 볼 수 없는 미리보기는 기능이 아니다.
 *
 * ── 색을 빼지 않는다 ───────────────────────────────────
 *
 * 목록 칸의 실루엣은 "아직 못 만난 것" 이라는 표시라 맞다. 그런데 여기는
 * **자세히 보려고** 여는 곳이다. 값을 치를지 정하는데 회색 그림자만
 * 보여주면 고를 수가 없다. 아직 만날 수 없는 것만 실루엣으로 남는다.
 */
export function SkinDetailSheet({
  view,
  coins,
  onClose,
  onWear,
  onBuy,
}: SkinDetailSheetProps) {
  if (!view) return null

  const { def, owned, active, hidden, forSale, seen } = view
  const price = skinPrice(def)
  const rarity = RARITY_STYLE[def.rarity]
  const pack = findPack(def.packId)
  const world = skinWorld(def)
  const canAfford = price !== null && coins >= price
  const buyable = forSale && price !== null && onBuy !== undefined
  // 값은 붙어 있는데 오늘은 안 걸린 옷
  const comesToRack = !owned && !forSale && price !== null
  const inColor = owned || seen || buyable

  return (
    <BottomSheet open onClose={onClose} title={hidden ? '???' : def.name}>
      <div>
        {/* 크게 한 장. 목록 칸에서는 86px 이라 무늬가 안 보인다.
            그렇다고 화면을 다 먹으면 아래 버튼이 밀려서 안 보인다 —
            여기서 제일 중요한 건 "살까 말까" 를 정하는 버튼이다. */}
        <div className="flex justify-center rounded-card bg-canvas py-3">
          {hidden ? (
            <span className="flex h-[168px] items-center text-[44px] text-inkfaint">❔</span>
          ) : (
            <div className={cn('h-[168px] w-[152px]', !inColor && 'opacity-30 grayscale')}>
              <CharacterSkinRenderer skinId={def.id} animated={false} />
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <h2 className="min-w-0 flex-1 truncate text-[18px] font-semibold text-ink">
            {hidden ? '???' : def.name}
          </h2>
          <span
            className={cn(
              'shrink-0 rounded-pill px-2 py-0.5 text-[10.5px] font-medium',
              rarity.chip,
              rarity.text,
            )}
          >
            {RARITY_LABEL[def.rarity]}
          </span>
          {world && (
            <span className="shrink-0 rounded-pill bg-sunken px-2 py-0.5 text-[10.5px] text-inkdim">
              {SKIN_WORLD_LABEL[world]}
            </span>
          )}
        </div>

        {/* 가진 것·본 것·살 수 있는 것은 설명을, 아직인 것은 힌트와 어디서 만나는지를.
            남은 숫자는 어디에도 안 적는다 — 적어두면 발견이 아니라 과제 목록이 된다. */}
        <p className="mt-1.5 text-[13px] leading-relaxed text-inkdim">
          {inColor
            ? def.description
            : hidden
              ? '아직 모르는 모습이야.'
              : [def.hint, ACQUISITION_NOTE[def.acquisition]].filter(Boolean).join(' ') ||
                '아직은 만날 수 없어.'}
        </p>

        {pack && !hidden && (
          <p className="mt-1 font-game text-[10px] tracking-[0.06em] text-inkfaint">
            {pack.id}팩 · {pack.name}
          </p>
        )}

        {active && (
          <p className="mt-3 rounded-btn bg-coral-soft/50 px-3.5 py-2.5 text-[12.5px] text-coral-deep">
            지금 입고 있는 모습이야.
          </p>
        )}

        <div className="mt-4 space-y-2">
          {owned && !active && (
            <Button size="lg" className="w-full" onClick={onWear}>
              이걸로 입기
            </Button>
          )}

          {comesToRack && (
            <p className="rounded-btn bg-sunken px-3.5 py-2.5 text-center text-[12px] leading-relaxed text-inkdim">
              오늘은 안 걸렸어. 의상실에 다시 걸리는 날 데려올 수 있어.
              <br />
              <span className="text-inkfaint">서두를 것 없어 — 없어지지 않아.</span>
            </p>
          )}

          {buyable && (
            <>
              <Button size="lg" className="w-full" disabled={!canAfford} onClick={onBuy}>
                🪙 {price} 코인으로 데려오기
              </Button>
              <p className="text-center text-[11.5px] text-inkfaint">
                {canAfford
                  ? `지금 가진 코인 ${coins.toLocaleString()}`
                  : `${(price - coins).toLocaleString()} 코인만 더 모으면 돼`}
              </p>
            </>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}
