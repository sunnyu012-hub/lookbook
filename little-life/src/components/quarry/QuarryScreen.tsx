import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppState, QuarryFind, QuarrySpotView } from '@/types'
import { Portal } from '@/components/ui/Portal'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { useOverlay } from '@/hooks/useOverlay'
import { DAILY_ATTEMPTS, quarryView } from '@/lib/quarry/derive'
import { QuarryTutorial } from './QuarryTutorial'
import { FoundOverlay } from './FoundOverlay'
import { cn } from '@/components/ui/cn'

interface QuarryScreenProps {
  open: boolean
  state: AppState
  onClose: () => void
  onEnter: () => void
  onExplore: (spotId: string) => QuarryFind | null
  onSeeBlockedPath: () => void
  onOpenBook: () => void
}

/**
 * 오래된 채석장.
 *
 * 조용하고 오래된 자리다. 어둡게 만들지 않는다 — 이 앱의 다른 화면과
 * 같은 아이보리 위에 있다. 폐광도 던전도 아니고, 도시 끝에 남은
 * 사람이 떠난 작업터다.
 *
 * 화면이 하는 일은 하나다 — "오늘 몇 번 남았고 어디를 볼 수 있는지".
 */
export function QuarryScreen({
  open,
  state,
  onClose,
  onEnter,
  onExplore,
  onSeeBlockedPath,
  onOpenBook,
}: QuarryScreenProps) {
  const [openSpot, setOpenSpot] = useState<QuarrySpotView | null>(null)
  const [found, setFound] = useState<QuarryFind | null>(null)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [blockedOpen, setBlockedOpen] = useState(false)
  /** 들여다보는 짧은 순간. 기다리게 하려는 게 아니라 눈이 따라오게 하려는 것이다. */
  const [looking, setLooking] = useState(false)

  useOverlay(open, onClose)

  // 열리는 순간 딱 한 번. (첫 안내를 띄울지 판단하려면 여는 순간의 값이 필요하다)
  const opened = useRef(false)
  useEffect(() => {
    if (!open) {
      opened.current = false
      return
    }
    if (opened.current) return
    opened.current = true
    if (state.quarry.tutorialSeenAt === null) setTutorialOpen(true)
    onEnter()
  }, [open, onEnter, state.quarry.tutorialSeenAt])

  const view = useMemo(() => quarryView(state), [state])

  if (!open) return null

  const look = (spotId: string) => {
    setLooking(true)
    window.setTimeout(() => {
      setLooking(false)
      const result = onExplore(spotId)
      setOpenSpot(null)
      if (result) setFound(result)
    }, 550)
  }

  return (
    <Portal>
      {/* z-45 — 아래 내비게이션(40)은 덮고, 여기서 여는 시트(50)에는 덮인다 */}
      <div className="fixed inset-0 z-[45] flex flex-col bg-canvas">
        <header className="flex items-center gap-2 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+12px)]">
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-pill bg-surface px-3.5 py-2 text-[13px] font-medium text-inkdim ring-1 ring-line"
          >
            ←
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate font-game text-[11px] tracking-[0.14em] text-inkdim">
              OLD QUARRY
            </p>
            <p className="mt-0.5 text-[12px] text-inkdim">
              {view.night ? '밤이라 안쪽이 더 조용하다' : '오늘은 무엇이 있을까?'}
            </p>
          </div>
          <span className="shrink-0 rounded-pill bg-surface px-2.5 py-1.5 font-game text-[10.5px] text-inkdim ring-1 ring-line">
            {view.found}/{view.total}
          </span>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          {/* 오늘 몇 번 남았는지. 제일 위에, 숫자로. */}
          <div className="mb-3 flex items-center gap-3 rounded-card bg-surface px-3.5 py-3 ring-1 ring-line">
            <span className="text-[22px] leading-none">⛏️</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-medium text-ink">오늘의 탐색</span>
              <span className="mt-0.5 block text-[11.5px] text-inkdim">
                아래에서 궁금한 곳을 골라보세요
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1" aria-label={`${view.left}번 남음`}>
              {Array.from({ length: DAILY_ATTEMPTS }, (_, i) => (
                <span
                  key={i}
                  className={cn('h-2 w-2 rounded-full', i < view.left ? 'bg-coral' : 'bg-line')}
                  aria-hidden
                />
              ))}
              <span className="ml-1 font-game text-[12px] text-inkdim">
                {view.left}/{DAILY_ATTEMPTS}
              </span>
            </span>
          </div>

          {view.left === 0 && (
            <p className="mb-3 rounded-card bg-sunken px-3.5 py-2.5 text-center text-[12.5px] leading-relaxed text-inkdim">
              오늘 몫은 다 썼어. 내일 또 와도 되고, 안 와도 괜찮아.
            </p>
          )}

          <ul className="space-y-2">
            {view.spots.map((spot) => (
              <li key={spot.def.id}>
                <button
                  type="button"
                  disabled={view.left === 0}
                  onClick={() => setOpenSpot(spot)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-card border border-line bg-surface px-3.5 py-3.5 text-left',
                    'transition-transform duration-150 ease-out active:scale-[0.98]',
                    'disabled:opacity-55 disabled:active:scale-100',
                  )}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-sunken text-[22px]">
                    {spot.def.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[14.5px] font-medium text-ink">
                        {spot.def.name}
                      </span>
                      {/* 아직 못 본 게 남았다는 것만. 몇 개인지는 안 알려준다 —
                          수를 적으면 그건 채워야 하는 칸이 된다. */}
                      {spot.hasUnseen && (
                        <span className="shrink-0 rounded-pill bg-butter-soft px-1.5 py-0.5 font-game text-[9px] tracking-[0.06em] text-butter-deep">
                          NEW
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-inkdim">
                      {spot.def.teaser}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] text-inkfaint">›</span>
                </button>
              </li>
            ))}

            {/* 아직 갈 수 없는 쪽. 눌러도 어디로도 가지 않는다 — 안내 한 장이 전부다. */}
            <li>
              <button
                type="button"
                onClick={() => {
                  setBlockedOpen(true)
                  onSeeBlockedPath()
                }}
                className="flex w-full items-center gap-3 rounded-card border border-dashed border-line bg-sunken/30 px-3.5 py-3.5 text-left active:scale-[0.98]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-sunken/70 text-[20px] opacity-60">
                  🚧
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-inkdim">막힌 안쪽 길</span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-inkfaint">
                    돌무더기 너머로 길이 이어지는 것 같다
                  </span>
                </span>
              </button>
            </li>
          </ul>

          {view.rarest && (
            <p className="mt-3 text-center text-[12px] text-inkfaint">
              가장 귀한 발견 — {view.rarest.icon} {view.rarest.name}
            </p>
          )}

          <p className="mt-3 text-center text-[12px] leading-relaxed text-inkfaint">
            오늘 안 들러도 아무 일 없어. 생각날 때 한 번 오면 돼.
          </p>
        </div>
      </div>

      {/* 한 자리 들여다보기 */}
      <BottomSheet
        open={openSpot !== null}
        onClose={() => setOpenSpot(null)}
        title={openSpot?.def.name ?? '살펴보기'}
      >
        {openSpot && (
          <div className="text-center">
            <span className="block text-[44px] leading-none">{openSpot.def.icon}</span>
            <h2 className="mt-3 text-[17px] font-semibold text-ink">{openSpot.def.name}</h2>
            <p className="mt-1 text-[13.5px] leading-relaxed text-inkdim">{openSpot.def.teaser}</p>

            <Button
              size="lg"
              className="mt-4 w-full"
              disabled={looking}
              onClick={() => look(openSpot.def.id)}
            >
              {looking ? '살펴보는 중…' : '살펴보기'}
            </Button>
            <p className="mt-2 text-[11.5px] text-inkfaint">오늘 {view.left}번 남았어</p>
          </div>
        )}
      </BottomSheet>

      {/* 막힌 길 */}
      <BottomSheet open={blockedOpen} onClose={() => setBlockedOpen(false)} title="막힌 안쪽 길">
        <div className="text-center">
          <span className="block text-[44px] leading-none opacity-70">🚧</span>
          <h2 className="mt-3 text-[17px] font-semibold text-ink">막힌 안쪽 길</h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-inkdim">
            돌무더기 너머로 길이 이어지는 것 같다.
            <br />
            혼자 치우기에는 좀 많아 보인다.
          </p>
          <p className="mt-4 rounded-card bg-canvas px-3.5 py-3 text-[12.5px] text-inkfaint">
            아직 갈 수 없어요
          </p>
          <Button
            variant="soft"
            size="lg"
            className="mt-4 w-full"
            onClick={() => setBlockedOpen(false)}
          >
            돌아가기
          </Button>
        </div>
      </BottomSheet>

      <FoundOverlay
        find={found}
        onClose={() => setFound(null)}
        onOpenBook={() => {
          setFound(null)
          onClose()
          onOpenBook()
        }}
      />

      <QuarryTutorial open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
    </Portal>
  )
}
