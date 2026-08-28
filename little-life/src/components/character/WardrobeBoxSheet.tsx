import type { AppState, SkinGachaPoolId } from '@/types'
import { useMemo } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import { skinThumb } from '@/lib/character/skins'
import {
  WARDROBE_BOX_PRICE,
  wardrobeBoxViews,
  type WardrobeBoxDrawResult,
  type WardrobeBoxView,
} from '@/lib/character/wardrobe-box'

interface WardrobeBoxSheetProps {
  open: boolean
  state: AppState
  onClose: () => void
  onDraw: (poolId: SkinGachaPoolId) => WardrobeBoxDrawResult
}

/**
 * 작은 옷장.
 *
 * ── 뽑기처럼 보이지 않게 ───────────────────────────────
 *
 * 확률도 등급도 별도 안 적는다. 적어둘 게 없어서가 아니라, 적는 순간
 * 옷장 앞이 아니라 뽑기 화면이 되기 때문이다. 여기서 말하는 건
 * 어떤 묶음인지 · 몇 벌 모았는지 · 얼마인지 셋뿐이다.
 *
 * ── 어느 옷장을 열지는 고른다 ──────────────────────────
 *
 * 마흔여덟 벌을 한 통에 넣지 않는다. 축제 옷이 갖고 싶은데 겨울 코트가
 * 나오면 그건 고른 게 아니라 당한 거다. 묶음을 고르면 그 안에서만 나온다.
 *
 * ── 다 본 옷장은 닫아둔다 ──────────────────────────────
 *
 * 열두 벌을 다 모으면 버튼이 사라진다. 더 눌러도 나올 게 없는데
 * 코인만 빠지는 자리를 남겨두지 않는다.
 */
export function WardrobeBoxSheet({ open, state, onClose, onDraw }: WardrobeBoxSheetProps) {
  const views = useMemo(() => (open ? wardrobeBoxViews(state) : []), [open, state])
  const coins = state.user.coins

  if (!open) return null

  return (
    <BottomSheet open onClose={onClose} title="작은 옷장">
      <div className="flex items-start gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card bg-canvas text-[28px]">
          🚪
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="text-[20px] font-semibold text-ink">작은 옷장</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-inkdim">
            안쪽에 옷이 몇 벌 접혀 있다. 어느 칸을 열어볼지 고른다.
          </p>
        </div>
      </div>

      <p className="mt-4 text-[12.5px] text-inkfaint">
        이미 가진 옷은 나오지 않아. 열두 벌을 다 보면 그 칸은 닫혀.
      </p>

      <ul className="mt-4 space-y-3">
        {views.map((view) => (
          <li key={view.poolId}>
            <BoxCard view={view} coins={coins} onDraw={() => onDraw(view.poolId)} />
          </li>
        ))}
      </ul>

      <p className="mt-5 text-center text-[12px] text-inkfaint">
        지금 가진 코인 🪙 {coins.toLocaleString()}
      </p>
    </BottomSheet>
  )
}

function BoxCard({
  view,
  coins,
  onDraw,
}: {
  view: WardrobeBoxView
  coins: number
  onDraw: () => void
}) {
  const enough = coins >= WARDROBE_BOX_PRICE
  const owned = new Set(view.skins.filter((s) => !view.remaining.includes(s)).map((s) => s.id))

  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3.5 shadow-soft">
      <div className="flex items-baseline gap-2">
        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">
          {view.pack.name}
        </p>
        <span className="shrink-0 font-game text-[11px] text-inkdim">
          {view.found} / {view.total}
        </span>
      </div>
      <p className="mt-1 text-[12.5px] leading-snug text-inkdim">{view.pack.note}</p>

      {/* 뭐가 들어 있는지 몇 벌만 비친다. 가진 건 선명하게, 아직 없는 건 흐리게. */}
      <ul className="mt-3 flex gap-2">
        {view.skins.slice(0, 5).map((skin) => (
          <li
            key={skin.id}
            className={cn(
              'h-12 w-11 overflow-hidden rounded-[10px] bg-canvas',
              !owned.has(skin.id) && 'opacity-35',
            )}
          >
            <img
              src={skinThumb(skin)}
              alt=""
              aria-hidden
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </li>
        ))}
      </ul>

      <div className="mt-3.5 flex items-center justify-between gap-3">
        {view.complete ? (
          <p className="text-[12.5px] text-inkdim">이 칸은 다 둘러봤어.</p>
        ) : (
          <p className={cn('text-[12.5px]', enough ? 'text-inkdim' : 'text-inkfaint')}>
            🪙 {WARDROBE_BOX_PRICE}
            {!enough && ' — 조금 모자라'}
          </p>
        )}

        {!view.complete && (
          <Button size="md" className="min-w-[112px]" disabled={!enough} onClick={onDraw}>
            열어보기
          </Button>
        )}
      </div>
    </div>
  )
}
