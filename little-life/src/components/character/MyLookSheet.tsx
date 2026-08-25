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
 * 내 모습.
 *
 * ── 한 번 누르면 끝 ────────────────────────────────────
 *
 * 고르기 → 적용 → 저장 같은 단계를 두지 않는다. 가진 것을 누르면
 * 그 자리에서 위 미리보기가 바뀌고, 홈에도 이미 바뀌어 있다.
 * "적용" 버튼을 만들면 사람들은 그걸 안 누르고 나가서 왜 안 바뀌냐고 한다.
 *
 * ── 시트 높이를 붙잡아 둔다 ────────────────────────────
 *
 * 분류를 옮길 때마다 칸 수가 달라지는데, 높이를 내용에 맡기면
 * 탭을 누를 때마다 시트가 손가락 밑에서 오르내린다.
 */
export function MyLookSheet({ open, state, onClose, onSelect, onBuy }: MyLookSheetProps) {
  const [tab, setTab] = useState<Tab>('ALL')
  const [note, setNote] = useState<string | null>(null)

  const views = useMemo(() => skinViews(state), [state])
  const shown = useMemo(() => skinsInCategory(views, tab), [views, tab])
  const current = views.find((v) => v.active) ?? views[0]

  if (!open || !current) return null

  const owned = ownedSkinCount(state)

  const tap = (view: SkinView) => {
    setNote(null)

    if (view.owned) {
      onSelect(view.def.id)
      return
    }

    // 조건을 다 채운 유료 모습은 눌러서 바로 데려온다
    if (view.forSale) {
      const result = onBuy(view.def.id)
      if (result.ok) {
        setNote(`${result.skin.name}를 데려왔어. 한 번 더 누르면 입어봐.`)
      } else if (result.reason === 'NOT_ENOUGH_COINS') {
        setNote(`코인이 조금 모자라. ${skinPrice(view.def) ?? 0} 코인이 필요해.`)
      }
      return
    }

    // 못 가진 것은 왜 아직인지만 말해준다. 숫자는 말하지 않는다.
    setNote(view.hidden ? '아직 모르는 모습이야.' : view.def.hint)
  }

  return (
    <BottomSheet open onClose={onClose} title="내 모습" fill>
      <div className="flex h-full flex-col">
        {/* 지금 입고 있는 모습 */}
        <div className="shrink-0">
          <h2 className="mb-2 text-[20px] font-semibold text-ink">내 모습</h2>
          <div className="flex items-end gap-3 rounded-card bg-canvas px-4 pb-3 pt-2">
            <div className="h-[148px] w-[110px] shrink-0">
              <CharacterSkinRenderer skinId={current.def.id} />
            </div>
            <div className="min-w-0 flex-1 pb-2">
              <p className="text-[17px] font-semibold text-ink">{current.def.name}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-inkdim">
                {current.def.description}
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
                <SkinCard view={view} onSelect={() => tap(view)} />
              </li>
            ))}
          </ul>

          {/* 살 수 있는 게 있으면 값을 여기서 한 번에 알려준다.
              칸마다 가격을 박아두면 목록이 가게처럼 보인다. */}
          {shown.some((v) => v.forSale) && (
            <p className="mt-3 text-center text-[11.5px] leading-relaxed text-inkfaint">
              🪙 가 붙은 건 눌러서 데려올 수 있어. 지금 가진 코인 {state.user.coins}
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
    </BottomSheet>
  )
}
