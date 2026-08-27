import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppState, CreatureStepDef, DungeonFind, DungeonSpotView } from '@/types'
import { Portal } from '@/components/ui/Portal'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { useOverlay } from '@/hooks/useOverlay'
import {
  ENERGY_PER_ROOM,
  ENERGY_PER_SEARCH,
  FIRST_ROOM_ID,
  deepestRoomId,
  dungeonView,
  nextRoomId,
} from '@/lib/dungeon/derive'
import { ambientInRoom, isInnerDoorOpen, stepsInRoom } from '@/lib/dungeon/creatureDerive'
import { CreatureSheet } from './CreatureSheet'
import { DungeonTutorial } from './DungeonTutorial'
import { FoundOverlay } from './FoundOverlay'
import { cn } from '@/components/ui/cn'

interface DungeonScreenProps {
  open: boolean
  state: AppState
  onClose: () => void
  onEnter: () => void
  onGoDeeper: (fromRoomId: string) => string | null
  onSearch: (spotId: string) => DungeonFind | null
  /** 생명체와 한 걸음. 읽을 줄을 돌려준다. */
  onTakeStep: (stepId: string, choiceIndex: number) => string[] | null
  onOpenBook: () => void
}

/** 에너지가 없을 때 하는 말. 부족하다고 하지 않는다. */
const NO_ENERGY = '오늘은 여기까지 둘러봐도 괜찮을 것 같아.'

/**
 * 잠든 돌문.
 *
 * 화면이 하는 일은 세 가지다 — 지금 어디에 있는지, 여기서 뭘 볼 수 있는지,
 * 어디로 갈 수 있는지. 지도도 미니맵도 없다. 한 줄로 이어진 다섯 칸이라
 * 그릴 게 없다.
 *
 * 진행도를 %로 안 보여준다. "안쪽까지 가봤다" 정도면 충분하다 —
 * 숫자를 띄우는 순간 놀러 온 곳이 아니라 채워야 할 칸이 된다.
 */
export function DungeonScreen({
  open,
  state,
  onClose,
  onEnter,
  onGoDeeper,
  onSearch,
  onTakeStep,
  onOpenBook,
}: DungeonScreenProps) {
  const [roomId, setRoomId] = useState<string>(FIRST_ROOM_ID)
  const [openSpot, setOpenSpot] = useState<DungeonSpotView | null>(null)
  const [found, setFound] = useState<DungeonFind | null>(null)
  const [movingTo, setMovingTo] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [openStep, setOpenStep] = useState<CreatureStepDef | null>(null)

  useOverlay(open, onClose)

  // 열리는 순간 딱 한 번. 첫 안내를 띄울지는 여는 순간의 값으로 판단한다.
  const opened = useRef(false)
  useEffect(() => {
    if (!open) {
      opened.current = false
      return
    }
    if (opened.current) return
    opened.current = true
    if (state.dungeon.tutorialSeenAt === null) setTutorialOpen(true)
    onEnter()
    // 지난번에 가장 안쪽까지 갔던 자리에서 다시 시작한다.
    // 매번 문 앞부터 걸어 들어오게 하면 그건 둘러보기가 아니라 되돌아가기다.
    setRoomId(deepestRoomId(state) ?? FIRST_ROOM_ID)
  }, [open, onEnter, state])

  const view = useMemo(() => dungeonView(state), [state])

  if (!open) return null

  const room = view.rooms.find((r) => r.def.id === roomId) ?? view.rooms[0]
  // 이 방에서 지금 밟을 수 있는 걸음과, 친해진 뒤 가끔 보이는 모습
  const steps = stepsInRoom(state, room.def.id)
  const ambient = ambientInRoom(state, room.def.id)
  const doorOpen = isInnerDoorOpen(state)
  const next = nextRoomId(room.def.id)
  const nextRoom = next ? view.rooms.find((r) => r.def.id === next) : null
  const nextIsNew = nextRoom !== null && nextRoom !== undefined && !nextRoom.discovered
  // 안쪽 방은 셋과 친해져야 열린다. 열렸는지는 저장하지 않는다.
  const shutDoor = nextRoom?.def.id === 'INNER_HALL' && !doorOpen
  const canGoNext =
    nextRoom !== null && !shutDoor && (!nextIsNew || view.energy >= ENERGY_PER_ROOM)
  const visited = view.rooms.filter((r) => r.discovered)

  const search = (spotId: string) => {
    setSearching(true)
    window.setTimeout(() => {
      setSearching(false)
      const result = onSearch(spotId)
      setOpenSpot(null)
      if (result) setFound(result)
    }, 550)
  }

  const goNext = () => {
    if (!next) return
    setMovingTo(true)
    window.setTimeout(() => {
      setMovingTo(false)
      const moved = onGoDeeper(room.def.id)
      if (moved) setRoomId(moved)
    }, 420)
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
              SLEEPING GATE
            </p>
            <p className="mt-0.5 text-[12px] text-inkdim">잠든 돌문</p>
          </div>
          {/* 에너지는 작게. 크게 띄우면 그게 오늘의 할 일이 된다. */}
          <span
            className="shrink-0 rounded-pill bg-surface px-2.5 py-1.5 font-game text-[10.5px] text-inkdim ring-1 ring-line"
            aria-label={`탐험 에너지 ${view.energy}`}
          >
            🔦 {view.energy}
          </span>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          {/* 지금 있는 곳 */}
          <div className="rounded-card bg-surface px-4 py-5 text-center ring-1 ring-line">
            <span className="block text-[44px] leading-none">{room.def.icon}</span>
            <h2 className="mt-2 text-[17px] font-semibold text-ink">{room.def.name}</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-inkdim">{room.def.description}</p>
          </div>

          {/* 오늘 보이는 모습. 눌러도 아무 일 없고 진행도 없다. */}
          {ambient.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {ambient.map((line) => (
                <p
                  key={line}
                  className="rounded-card bg-sage-soft/50 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-inkdim"
                >
                  {line}
                </p>
              ))}
            </div>
          )}

          {/* 지금 여기서 만날 수 있는 것 */}
          {steps.length > 0 && (
            <>
              <p className="mb-2 mt-4 text-[12px] text-inkdim">여기</p>
              <ul className="space-y-2">
                {steps.map((step) => (
                  <li key={step.id}>
                    <button
                      type="button"
                      onClick={() => setOpenStep(step)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-card border border-line bg-surface px-3.5 py-3.5 text-left',
                        'transition-transform duration-150 ease-out active:scale-[0.98]',
                      )}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-sunken text-[22px]">
                        {step.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-medium text-ink">
                          {step.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-inkdim">
                          {step.teaser}
                        </span>
                      </span>
                      <span className="shrink-0 text-[12px] text-inkfaint">›</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* 여기서 볼 수 있는 것 */}
          <p className="mb-2 mt-4 text-[12px] text-inkdim">둘러보기</p>
          <ul className="space-y-2">
            {room.spots.map((spot) => (
              <li key={spot.def.id}>
                <button
                  type="button"
                  disabled={spot.searched}
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
                    <span className="block truncate text-[14.5px] font-medium text-ink">
                      {spot.def.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-inkdim">
                      {spot.searched ? '이미 들여다봤어' : spot.def.teaser}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] text-inkfaint">
                    {spot.searched ? '✓' : '›'}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* 안쪽으로 */}
          {nextRoom && (
            <>
              <p className="mb-2 mt-4 text-[12px] text-inkdim">다른 곳으로</p>
              <button
                type="button"
                disabled={!canGoNext || movingTo}
                onClick={goNext}
                className={cn(
                  'flex w-full items-center gap-3 rounded-card border border-line bg-surface px-3.5 py-3.5 text-left',
                  'transition-transform duration-150 ease-out active:scale-[0.98]',
                  'disabled:opacity-55 disabled:active:scale-100',
                )}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-btn bg-sunken text-[22px]">
                  {nextRoom.discovered ? nextRoom.def.icon : '🔦'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-medium text-ink">
                    {nextRoom.discovered ? nextRoom.def.name : '더 안쪽으로'}
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] text-inkdim">
                    {movingTo
                      ? '걸어가는 중…'
                      : nextRoom.discovered
                        ? '가본 곳이야'
                        : shutDoor
                          ? '아직 안 열린다'
                          : `처음 가는 길 · 탐험 에너지 ${ENERGY_PER_ROOM}`}
                  </span>
                </span>
                <span className="shrink-0 text-[12px] text-inkfaint">›</span>
              </button>
            </>
          )}

          {/* 가본 곳으로 돌아가기. 공짜다. */}
          {visited.length > 1 && (
            <>
              <p className="mb-2 mt-4 text-[12px] text-inkdim">가본 곳</p>
              <div className="flex flex-wrap gap-1.5">
                {visited.map((r) => (
                  <button
                    key={r.def.id}
                    type="button"
                    onClick={() => setRoomId(r.def.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-pill px-3 py-2 text-[12.5px] ring-1 transition-colors',
                      r.def.id === room.def.id
                        ? 'bg-coral text-white ring-coral'
                        : 'bg-surface text-inkdim ring-line',
                    )}
                  >
                    <span aria-hidden>{r.def.icon}</span>
                    {r.def.name}
                    {r.hasUnsearched && r.def.id !== room.def.id && (
                      <span className="h-1.5 w-1.5 rounded-full bg-butter-deep" aria-hidden />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {view.energy < ENERGY_PER_SEARCH && (
            <p className="mt-4 rounded-card bg-sunken px-3.5 py-2.5 text-center text-[12.5px] leading-relaxed text-inkdim">
              {NO_ENERGY}
            </p>
          )}

          <p className="mt-3 text-center text-[12px] leading-relaxed text-inkfaint">
            {view.traceFound
              ? '안쪽 문은 아직 안 열린다. 그래도 여기까지는 언제든 다시 올 수 있어.'
              : '문은 이제 안 잠겨. 생각날 때 한 번 오면 돼.'}
          </p>
        </div>
      </div>

      {/* 한 자리 들여다보기 */}
      <BottomSheet
        open={openSpot !== null}
        onClose={() => setOpenSpot(null)}
        title={openSpot?.def.name ?? '들여다보기'}
      >
        {openSpot && (
          <div className="text-center">
            <span className="block text-[44px] leading-none">{openSpot.def.icon}</span>
            <h2 className="mt-3 text-[17px] font-semibold text-ink">{openSpot.def.name}</h2>
            <p className="mt-1 text-[13.5px] leading-relaxed text-inkdim">{openSpot.def.teaser}</p>

            {view.energy >= ENERGY_PER_SEARCH ? (
              <>
                <Button
                  size="lg"
                  className="mt-4 w-full"
                  disabled={searching}
                  onClick={() => search(openSpot.def.id)}
                >
                  {searching ? '들여다보는 중…' : '조사하기'}
                </Button>
                <p className="mt-2 text-[11.5px] text-inkfaint">
                  탐험 에너지 {ENERGY_PER_SEARCH} · 지금 {view.energy}
                </p>
              </>
            ) : (
              <>
                <p className="mt-4 rounded-card bg-canvas px-3.5 py-3 text-[12.5px] leading-relaxed text-inkdim">
                  {NO_ENERGY}
                </p>
                <Button
                  variant="soft"
                  size="lg"
                  className="mt-3 w-full"
                  onClick={() => setOpenSpot(null)}
                >
                  돌아가기
                </Button>
              </>
            )}
          </div>
        )}
      </BottomSheet>

      <CreatureSheet step={openStep} onClose={() => setOpenStep(null)} onTake={onTakeStep} />

      <FoundOverlay
        find={found}
        onClose={() => setFound(null)}
        onOpenBook={() => {
          setFound(null)
          onClose()
          onOpenBook()
        }}
      />

      <DungeonTutorial open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
    </Portal>
  )
}
