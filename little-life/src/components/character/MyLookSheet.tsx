import { useMemo, useState } from 'react'
import type { AppState, SkinId, SkinPackId, SkinView, SkinWorld, WardrobeTag } from '@/types'
import { WARDROBE_TAGS } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import { SKINS, packProgress, skinPrice, skinViews, skinWorld } from '@/lib/character/skins'
import {
  SKIN_WORLD_LABEL,
  WARDROBE_TAG_LABEL,
  findPack,
} from '@/lib/character/packs'
import type { BuySkinResult } from '@/lib/character/derive'
import { CharacterSkinRenderer } from './CharacterSkinRenderer'
import { SkinCard } from './SkinCard'
import { SkinDetailSheet } from './SkinDetailSheet'

interface MyLookSheetProps {
  open: boolean
  state: AppState
  onClose: () => void
  onSelect: (id: string) => void
  /** 한 벌을 들춰봤다고 적어둔다 — 도감이 기억한다 */
  onSee: (id: string) => void
  onBuy: (id: string) => BuySkinResult
}

type Shelf = 'MINE' | 'NEW'
type WorldTab = 'ALL' | SkinWorld

/**
 * 의상실.
 *
 * ── 백스무 벌을 한 화면에 세우지 않는다 ────────────────
 *
 * 스물넷일 때는 분류 다섯 개로 충분했다. 백스무 벌이 되면 "특별" 칸에
 * 백 벌이 몰려서 분류가 분류 노릇을 못 한다. 그래서 제일 위에
 * 가진 것과 아직 없는 것부터 가른다 — 옷장 앞에서 실제로 하는 일이 그거다.
 *
 * ── 줄을 세 줄 넘게 쓰지 않는다 ────────────────────────
 *
 * 폰에서 목록보다 거르는 칸이 더 커지면 옷을 고르는 화면이 아니다.
 * 내 옷/새 옷 · 세계 · 결 세 줄이고, 결 줄은 옆으로 흐른다.
 * 묶음 여덟 개를 위에 늘어놓지 않는다 — 묶음은 카드에 붙은 이름표다.
 *
 * ── 여기서는 아무것도 안 산다 ──────────────────────────
 *
 * 예전에는 값이 붙은 옷을 누르면 **그 자리에서 코인이 빠져나갔다.**
 * 물어보지도 않았다. 자세히 보려고 눌렀을 뿐인데 코인이 사라진다.
 *
 * 지금은 무엇을 누르든 상세 시트가 열릴 뿐이다. 입는 것도 사는 것도
 * 거기 각자 버튼이 있다. 목록의 한 칸은 "고르는 곳" 이지
 * "결제하는 곳" 이 아니다.
 *
 * ── 시트 높이를 붙잡아 둔다 ────────────────────────────
 *
 * 거르는 걸 바꿀 때마다 칸 수가 달라지는데, 높이를 내용에 맡기면
 * 누를 때마다 시트가 손가락 밑에서 오르내린다.
 */
export function MyLookSheet({ open, state, onClose, onSelect, onSee, onBuy }: MyLookSheetProps) {
  const [shelf, setShelf] = useState<Shelf>('MINE')
  const [world, setWorld] = useState<WorldTab>('ALL')
  const [tag, setTag] = useState<WardrobeTag | null>(null)
  const [pack, setPack] = useState<SkinPackId | null>(null)
  const [note, setNote] = useState<string | null>(null)
  /**
   * 방금 데려온 것.
   *
   * 사자마자 목록에서 빼면 뒤에 있던 칸들이 앞으로 당겨진다. 손가락은
   * 아직 그 자리에 있으니까, 한 번 더 눌렀을 때 고른 적 없는 옷이 팔린다.
   * 실제로 그렇게 480 코인이 두 번 나갔다.
   *
   * 그래서 거르는 걸 바꾸기 전까지는 그 자리에 그대로 둔다.
   * "한 번 더 누르면 입어봐" 라고 해놓고 칸이 사라지지도 않는다.
   */
  const [justBought, setJustBought] = useState<SkinId[]>([])
  /** 자세히 보는 중인 옷 */
  const [openId, setOpenId] = useState<string | null>(null)
  /**
   * 미리 입어보는 중인 옷.
   *
   * 저장하지 않는다. 시트가 닫히면 사라지고 홈에도 안 나간다 —
   * 안 산 옷이 홈 화면에 남아 있으면 그건 미리보기가 아니라 버그다.
   */
  const [tryOnId, setTryOnId] = useState<string | null>(null)

  /**
   * 닫혀 있으면 세지 않는다.
   *
   * 이 계산은 백스무 벌마다 조건을 다시 세고, 그중 몇 개는 도감 240개와
   * 세트 스물일곱을 훑는다. 예전에는 시트가 닫혀 있어도 상태가 바뀔 때마다
   * 돌았다 — 스물넷일 때는 티가 안 났지만 백스무 벌에서는 아니다.
   * 훅 순서를 지켜야 해서 useMemo 는 늘 부르고, 안에서만 건너뛴다.
   */
  const views = useMemo(() => (open ? skinViews(state) : []), [open, state])

  const shown = useMemo(() => {
    let list = views.filter((v) =>
      shelf === 'MINE' ? v.owned : !v.owned || justBought.includes(v.def.id),
    )
    if (pack !== null) return list.filter((v) => v.def.packId === pack)
    // 처음 스물넷은 묶음이 없어서 세계도 없다. 억지로 나누느니 늘 보여준다.
    if (world !== 'ALL') list = list.filter((v) => (skinWorld(v.def) ?? world) === world)
    if (tag !== null) list = list.filter((v) => v.def.wardrobeTag === tag)
    return list
  }, [views, shelf, world, tag, pack, justBought])

  const worn = views.find((v) => v.active) ?? views[0]
  const detail = openId ? (views.find((v) => v.def.id === openId) ?? null) : null
  // 위 미리보기는 입어보는 중이면 그쪽을, 아니면 실제로 입은 것을 그린다
  const current = tryOnId ? (views.find((v) => v.def.id === tryOnId) ?? worn) : worn
  if (!open || !current) return null

  const owned = views.filter((v) => v.owned).length
  const packDef = findPack(pack ?? undefined)
  const packSeen = pack === null ? null : packProgress(state, pack)

  /** 거르는 걸 바꾸면 목록을 새로 그린다 — 그때 방금 산 것도 제자리로 간다 */
  const reset = () => {
    setNote(null)
    setJustBought([])
  }

  /**
   * 무엇을 누르든 상세 시트를 열 뿐이다. 여기서 코인은 안 움직인다.
   *
   * 여는 순간 "들춰봤다" 로 적힌다. 그래서 다음에 목록으로 돌아오면
   * 그 칸은 실루엣이 아니라 진짜 그림이다 — 도감이 채워지는 자리다.
   * 아직 이름도 못 본 옷(hidden)은 적지 않는다. 들춰봐도 ??? 였으니까.
   */
  const tap = (view: SkinView) => {
    setNote(null)
    setOpenId(view.def.id)
    if (!view.hidden) onSee(view.def.id)
  }

  const closeDetail = () => {
    setOpenId(null)
    // 시트를 닫으면 미리보기도 같이 끝난다
    setTryOnId(null)
  }

  const buy = (view: SkinView) => {
    const result = onBuy(view.def.id)
    if (result.ok) {
      setJustBought((prev) => [...prev, view.def.id])
      setNote('새 옷이 옷장에 들어왔다.')
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
    closeDetail()
  }

  const openPack = (id: SkinPackId | undefined) => {
    if (id === undefined) return
    reset()
    setPack(id)
  }

  return (
    <BottomSheet open onClose={onClose} title="의상실" fill>
      <div className="flex h-full flex-col">
        {/* 지금 입고 있는 모습.
            시트의 title 은 화면에 안 보이는 이름표(aria-label)라서
            여기 한 줄이 없으면 열었을 때 무슨 화면인지 안 적혀 있다. */}
        <div className="shrink-0">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-[19px] font-semibold text-ink">의상실</h2>
            <span className="font-game text-[11.5px] text-inkfaint">
              {owned} / {SKINS.length}
            </span>
          </div>
          <div className="flex items-end gap-3 rounded-card bg-canvas px-4 pb-3 pt-2">
            {/* 크기는 이 상자가 정한다 — 렌더러 안의 그림은 h-full w-full 이다.
                폭을 빠듯하게 잡으면 안 된다. 캔버스가 제일 넓은 한 벌에 맞춰져
                있어서(433 × 508), 폭이 모자라면 폭으로 재느라 캐릭터가 작아진다. */}
            <div className="h-[124px] w-[112px] shrink-0">
              <CharacterSkinRenderer skinId={current.def.id} />
            </div>
            <div className="min-w-0 flex-1 pb-2">
              <p className="text-[16px] font-semibold text-ink">{current.def.name}</p>
              {tryOnId && (
                <p className="mt-0.5 font-game text-[9.5px] tracking-[0.12em] text-coral-deep">
                  입어보는 중
                </p>
              )}
              <p className="mt-1 line-clamp-3 text-[12.5px] leading-relaxed text-inkdim">
                {current.def.description}
              </p>
            </div>
          </div>
        </div>

        {/* 내 옷 · 새 옷 */}
        <div className="mt-3 flex shrink-0 gap-1 rounded-pill bg-sunken p-1">
          {(['MINE', 'NEW'] as Shelf[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={shelf === key}
              onClick={() => {
                setShelf(key)
                reset()
              }}
              className={cn(
                'min-h-[36px] flex-1 rounded-pill px-3 text-[13px] font-medium transition-colors duration-200',
                shelf === key ? 'bg-surface text-ink shadow-soft' : 'text-inkdim',
              )}
            >
              {key === 'MINE' ? '내 옷' : '새 옷'}
            </button>
          ))}
        </div>

        {pack !== null && packDef ? (
          /* 묶음 하나만 보는 중 */
          <button
            type="button"
            onClick={() => {
              setPack(null)
              reset()
            }}
            className="mt-2 flex shrink-0 items-center gap-2 rounded-pill bg-coral-soft/40 px-3 py-1.5 text-[11.5px] text-coral-deep ring-1 ring-coral/40"
          >
            <span className="min-w-0 flex-1 truncate text-left">
              {packDef.id}팩 · {packDef.name}
            </span>
            {packSeen && (
              <span className="shrink-0 font-game text-[10px]">
                {packSeen.found} / {packSeen.total}
              </span>
            )}
            <span className="shrink-0 text-[12px] leading-none">✕</span>
          </button>
        ) : (
          <>
            {/* 어느 세계 옷인지 */}
            <div className="mt-2 flex shrink-0 gap-1">
              {(['ALL', 'DAILY', 'FANTASY'] as WorldTab[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={world === key}
                  onClick={() => {
                    setWorld(key)
                    reset()
                  }}
                  className={cn(
                    'min-h-[30px] flex-1 rounded-pill px-2 text-[12px] transition-colors duration-200',
                    world === key
                      ? 'bg-ink/[0.06] font-medium text-ink'
                      : 'text-inkdim ring-1 ring-line',
                  )}
                >
                  {key === 'ALL' ? '전체' : SKIN_WORLD_LABEL[key]}
                </button>
              ))}
            </div>

            {/* 결. 옆으로 흐른다 — 화면을 두 줄 넘게 먹지 않는다. */}
            <div className="-mx-1 mt-1.5 flex shrink-0 gap-1 overflow-x-auto px-1 pb-0.5">
              {WARDROBE_TAGS.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={tag === key}
                  onClick={() => {
                    setTag(tag === key ? null : key)
                    reset()
                  }}
                  className={cn(
                    'min-h-[26px] shrink-0 whitespace-nowrap rounded-pill px-2.5 text-[11px] transition-colors duration-200',
                    tag === key
                      ? 'bg-coral text-surface'
                      : 'bg-surface text-inkdim ring-1 ring-line',
                  )}
                >
                  {WARDROBE_TAG_LABEL[key]}
                </button>
              ))}
            </div>
          </>
        )}

        {note && (
          <p className="mt-2 shrink-0 rounded-btn bg-sunken px-3.5 py-2.5 text-[12px] leading-relaxed text-inkdim">
            {note}
          </p>
        )}

        <div className="mt-2.5 min-h-0 flex-1 overflow-y-auto">
          {shown.length === 0 ? (
            <p className="mt-8 text-center text-[12px] leading-relaxed text-inkfaint">
              {shelf === 'MINE'
                ? '여기 해당하는 옷은 아직 없어.'
                : '이 갈래는 다 가지고 있어.'}
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-2">
              {shown.map((view) => (
                <li key={view.def.id}>
                  <SkinCard
                    view={view}
                    onSelect={() => tap(view)}
                    onPack={() => openPack(view.def.packId)}
                  />
                </li>
              ))}
            </ul>
          )}

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
