import { useMemo, useState } from 'react'
import type { AppState, SkinCategory, SkinView } from '@/types'
import { SKIN_CATEGORIES } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import { SKIN_CATEGORY_LABEL, ownedSkinCount, skinViews, skinsInCategory } from '@/lib/character/skins'
import { SKINS, skinPrice } from '@/lib/character/skins'
import type { BuySkinResult } from '@/lib/character/derive'
import { CharacterSkinRenderer } from './CharacterSkinRenderer'
import { SkinCard } from './SkinCard'
import { SkinDetailSheet } from './SkinDetailSheet'

interface MyLookSheetProps {
  open: boolean
  state: AppState
  onClose: () => void
  onSelect: (id: string) => void
  onBuy: (id: string) => BuySkinResult
}

type Tab = SkinCategory | 'ALL'
const TABS: Tab[] = ['ALL', ...SKIN_CATEGORIES]

/**
 * 내 모습 — 도감.
 *
 * ── 여기서는 아무것도 안 산다 ──────────────────────────
 *
 * 예전에는 값이 붙은 옷을 누르면 **그 자리에서 코인이 빠져나갔다.**
 * 물어보지도 않았다. 자세히 보려고 눌렀을 뿐인데 750 코인이 사라진다.
 *
 * 지금은 무엇을 누르든 상세 시트가 열릴 뿐이다. 가진 것을 입는 것도,
 * 안 가진 것을 사는 것도 거기 각자 버튼이 있다. 목록의 한 칸은
 * "고르는 곳" 이지 "결제하는 곳" 이 아니다.
 *
 * ── 도감이 하는 일 ─────────────────────────────────────
 *
 * 가진 것 · 가게에서 본 것 · 아직 모르는 것을 구분해서 보여준다.
 * 조건 숫자는 어디에도 안 적는다 — 적어두면 발견이 아니라 과제 목록이 된다.
 *
 * ── 시트 높이를 붙잡아 둔다 ────────────────────────────
 *
 * 분류를 옮길 때마다 칸 수가 달라지는데, 높이를 내용에 맡기면
 * 탭을 누를 때마다 시트가 손가락 밑에서 오르내린다.
 */
export function MyLookSheet({ open, state, onClose, onSelect, onBuy }: MyLookSheetProps) {
  const [tab, setTab] = useState<Tab>('ALL')
  const [note, setNote] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  /**
   * 미리 입어보는 중인 옷.
   *
   * 저장하지 않는다. 이 시트가 닫히면 사라지고, 홈에도 안 나간다 —
   * 안 산 옷이 홈 화면에 남아 있으면 그건 미리보기가 아니라 버그다.
   */
  const [tryOnId, setTryOnId] = useState<string | null>(null)

  const views = useMemo(() => skinViews(state), [state])
  const shown = useMemo(() => skinsInCategory(views, tab), [views, tab])
  const worn = views.find((v) => v.active) ?? views[0]
  const detail = openId ? (views.find((v) => v.def.id === openId) ?? null) : null
  // 위 미리보기는 입어보는 중이면 그쪽을, 아니면 실제로 입은 것을 그린다
  const preview = tryOnId ? (views.find((v) => v.def.id === tryOnId) ?? worn) : worn

  if (!open || !worn || !preview) return null

  const owned = ownedSkinCount(state)

  const closeDetail = () => {
    setOpenId(null)
    // 시트를 닫으면 미리보기도 같이 끝난다
    setTryOnId(null)
  }

  const buy = (view: SkinView) => {
    const result = onBuy(view.def.id)
    if (result.ok) {
      setNote(`${result.skin.name}를 데려왔어.`)
      // 산 옷은 바로 입혀준다 — 방금 산 걸 또 눌러서 입으라고 할 이유가 없다
      onSelect(view.def.id)
      closeDetail()
      return
    }
    if (result.reason === 'NOT_ENOUGH_COINS') {
      setNote(`코인이 조금 모자라. ${skinPrice(view.def) ?? 0} 코인이 필요해.`)
    } else {
      setNote('지금은 데려올 수 없어.')
    }
  }

  return (
    <BottomSheet open onClose={onClose} title="내 모습" fill>
      <div className="flex h-full flex-col">
        {/* 지금 입고 있는 모습 */}
        <div className="shrink-0">
          <h2 className="mb-2 text-[20px] font-semibold text-ink">내 모습</h2>
          <div className="flex items-end gap-3 rounded-card bg-canvas px-4 pb-3 pt-2">
            <div className="h-[148px] w-[110px] shrink-0">
              <CharacterSkinRenderer skinId={preview.def.id} />
            </div>
            <div className="min-w-0 flex-1 pb-2">
              <p className="text-[17px] font-semibold text-ink">{preview.def.name}</p>
              {tryOnId && (
                <p className="mt-0.5 font-game text-[9.5px] tracking-[0.12em] text-coral-deep">
                  입어보는 중
                </p>
              )}
              <p className="mt-1 text-[12.5px] leading-relaxed text-inkdim">
                {preview.def.description}
              </p>
              <p className="mt-2 font-game text-[11px] text-inkfaint">
                {owned} / {SKINS.length}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex shrink-0 gap-1 overflow-x-auto rounded-pill bg-sunken p-1">
          {TABS.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={tab === key}
              onClick={() => {
                setTab(key)
                setNote(null)
              }}
              className={cn(
                'min-h-[34px] flex-1 whitespace-nowrap rounded-pill px-3 text-[12px] font-medium transition-colors duration-200',
                tab === key ? 'bg-surface text-ink shadow-soft' : 'text-inkdim',
              )}
            >
              {key === 'ALL' ? '전체' : SKIN_CATEGORY_LABEL[key]}
            </button>
          ))}
        </div>

        {note && (
          <p className="mt-2.5 shrink-0 rounded-btn bg-sunken px-3.5 py-2.5 text-[12px] leading-relaxed text-inkdim">
            {note}
          </p>
        )}

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          <ul className="grid grid-cols-3 gap-2">
            {shown.map((view) => (
              <li key={view.def.id}>
                <SkinCard view={view} onSelect={() => { setNote(null); setOpenId(view.def.id) }} />
              </li>
            ))}
          </ul>

          {/* 살 수 있는 게 있으면 값을 여기서 한 번에 알려준다.
              칸마다 가격을 박아두면 목록이 가게처럼 보인다. */}
          {shown.some((v) => v.forSale) && (
            <p className="mt-3 text-center text-[11.5px] leading-relaxed text-inkfaint">
              🪙 가 붙은 건 눌러서 자세히 보고, 입어보고, 살 수 있어.
              <br />
              지금 가진 코인 {state.user.coins.toLocaleString()}
            </p>
          )}

          <p className="mt-4 text-center text-[11.5px] leading-relaxed text-inkfaint">
            모습은 능력치와 상관없어. 오늘 마음에 드는 걸로 입으면 돼.
          </p>
        </div>

        <div className="shrink-0 pt-3">
          <Button variant="soft" className="w-full" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>

      <SkinDetailSheet
        view={detail}
        coins={state.user.coins}
        tryingOn={detail !== null && tryOnId === detail.def.id}
        onClose={closeDetail}
        onTryOn={() => detail && setTryOnId(detail.def.id)}
        onStopTryOn={() => setTryOnId(null)}
        onWear={() => {
          if (!detail) return
          onSelect(detail.def.id)
          closeDetail()
        }}
        onBuy={detail?.forSale ? () => buy(detail) : undefined}
      />
    </BottomSheet>
  )
}
