import { useEffect, useMemo, useRef, useState } from 'react'
import type { AppState, GardenPlotView } from '@/types'
import { Portal } from '@/components/ui/Portal'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { useOverlay } from '@/hooks/useOverlay'
import { GARDEN_DEW_SECONDS } from '@/lib/garden/crops'
import { dewCount, gardenView, nearestRareHint, seedStock } from '@/lib/garden/derive'
import { STAGE_ICON, STAGE_LABEL, remainingLabel } from '@/lib/garden/labels'
import { CompanionArt } from '@/components/discovery/CompanionArt'
import { activeCompanion } from '@/lib/discovery/companions'
import { SeedSheet } from './SeedSheet'
import { GardenTutorial } from './GardenTutorial'
import { HarvestOverlay, type HarvestNote } from './HarvestOverlay'
import { cn } from '@/components/ui/cn'

interface GardenScreenProps {
  open: boolean
  state: AppState
  onClose: () => void
  onEnter: () => void
  onPlant: (plotIndex: number, cropId: string) => boolean
  onHarvest: (plotIndex: number) => HarvestNote | null
  onUseDew: (plotIndex: number) => boolean
  onOpenBook: () => void
  onNotify: (message: string) => void
}

/**
 * 작은 정원.
 *
 * 농장 경영 게임처럼 보이면 안 된다. 화면 가득한 숫자도,
 * 빨간 경고도, 물 부족 게이지도, 시들음 표시도 없다.
 * 남은 시간은 작고 부드럽게 한 줄로만 보여준다.
 */
export function GardenScreen({
  open,
  state,
  onClose,
  onEnter,
  onPlant,
  onHarvest,
  onUseDew,
  onOpenBook,
  onNotify,
}: GardenScreenProps) {
  const [openPlot, setOpenPlot] = useState<number | null>(null)
  const [harvested, setHarvested] = useState<HarvestNote | null>(null)
  const [repeatCropId, setRepeatCropId] = useState<string | null>(null)
  const [bagOpen, setBagOpen] = useState(false)
  const [tutorialOpen, setTutorialOpen] = useState(false)
  /** 남은 시간을 조금씩 다시 그린다 — 초 단위로 깜빡이게 하지는 않는다 */
  const [tick, setTick] = useState(0)

  useOverlay(open, onClose)

  /**
   * 열리는 순간 딱 한 번만 지난다.
   *
   * onEnter 가 "첫 안내를 봤다" 를 그 자리에서 적기 때문에, 그 값으로
   * 안내를 띄울지 판단하면 적자마자 조건이 거짓이 돼서 한 프레임 만에 사라진다.
   * 그래서 열린 순간의 값을 여기서 붙잡아 둔다.
   */
  const opened = useRef(false)
  useEffect(() => {
    if (!open) {
      opened.current = false
      return
    }
    if (opened.current) return
    opened.current = true
    if (state.garden.tutorialSeenAt === null) setTutorialOpen(true)
    onEnter()
  }, [open, onEnter, state.garden.tutorialSeenAt])

  useEffect(() => {
    if (!open) return
    const id = window.setInterval(() => setTick((n) => n + 1), 30_000)
    return () => window.clearInterval(id)
  }, [open])

  const view = useMemo(() => gardenView(state, new Date()), [state, tick])
  const dew = dewCount(state)
  const seeds = seedStock(state)
  const rareHint = useMemo(() => nearestRareHint(state), [state])
  const buddy = activeCompanion(state)

  if (!open) return null

  const active = openPlot === null ? null : view.plots[openPlot]

  const open_ = view.plots.filter((p) => p.state !== 'LOCKED' || p.crop !== null)
  const firstLocked = view.plots.find((p) => p.state === 'LOCKED' && p.crop === null)
  const shown = firstLocked ? [...open_, firstLocked] : open_

  const handlePlot = (plot: GardenPlotView) => {
    if (plot.state === 'LOCKED') {
      onNotify('정원이 더 넓어지면 열려')
      return
    }
    if (plot.state === 'READY') {
      const note = onHarvest(plot.index)
      if (note) {
        setHarvested(note)
        setRepeatCropId(note.crop.id)
      }
      return
    }
    setOpenPlot(plot.index)
  }

  return (
    <Portal>
      {/*
        z-45 인 이유: 아래 내비게이션(40)은 덮고, 시트(50)에는 덮여야 한다.
        여기서 씨앗 시트를 열기 때문에, 화면이 시트보다 위에 있으면
        시트가 보이기는 하는데 눌리지 않는다.
      */}
      <div className="fixed inset-0 z-[45] flex flex-col bg-canvas">
        {/* 위 */}
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
            <p className="truncate font-game text-[11px] tracking-[0.14em] text-sage-deep">
              LITTLE GARDEN
            </p>
            <p className="mt-0.5 text-[12px] text-inkdim">정원 Lv.{view.level}</p>
          </div>
          <span className="shrink-0 rounded-pill bg-surface px-2.5 py-1.5 font-game text-[10.5px] text-inkdim ring-1 ring-line">
            🌱 {view.discoveredCount}/{view.totalCrops}
          </span>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          {/* 지금 거둘 게 있으면 한 줄. 없으면 아무 줄도 안 만든다 —
              늘 떠 있는 안내는 며칠 지나면 배경이 된다. */}
          {view.readyCount > 0 && (
            <p className="mb-2.5 rounded-card bg-sage-soft px-3.5 py-2.5 text-center text-[13px] text-sage-deep">
              🌱 {view.readyCount}개가 수확을 기다리고 있어
            </p>
          )}

          {/*
            정원.

            잠긴 칸을 네 개씩 늘어놓지 않는다. 자물쇠가 화면 절반을 채우면
            그건 정원이 아니라 아직 못 산 것의 목록처럼 보인다.
            한 칸만 남겨서 "여기가 더 열린다" 는 것만 알려준다.
            (심어둔 게 있는 칸은 잠겼어도 늘 보여준다 — 거둘 수 있어야 하니까)
          */}
          <ul className="grid grid-cols-2 gap-2.5">
            {shown.map((plot) => (
              <li key={plot.plot.id}>
                <PlotCard plot={plot} onClick={() => handlePlot(plot)} />
              </li>
            ))}
          </ul>

          {/* 같이 다니는 아이가 있으면 정원에도 따라온다.
              여기서 뭘 해주지는 않는다 — 하는 일이 생기는 순간
              "데려와야 이득" 이 되고, 그러면 안 데려온 날이 손해가 된다. */}
          {buddy ? (
            <div className="mt-3 flex items-center justify-center gap-2">
              <CompanionArt def={buddy} pose="idle" className="h-8 w-8 shrink-0" />
              <p className="text-[12px] text-inkfaint">
                {buddy.name}도 따라왔어. 며칠 못 들러도 괜찮아 — 아무것도 시들지 않아.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-center text-[12px] leading-relaxed text-inkfaint">
              며칠 못 들러도 괜찮아. 아무것도 시들지 않아.
            </p>
          )}

          {/* 씨앗 가방 */}
          <button
            type="button"
            onClick={() => setBagOpen(true)}
            className={cn(
              'mt-4 flex w-full items-center gap-3 rounded-card border border-line bg-surface px-3.5 py-3 text-left',
              'transition-transform duration-150 ease-out active:scale-[0.98]',
            )}
          >
            <span className="text-[22px] leading-none">🎒</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium text-ink">씨앗 가방</span>
              <span className="mt-0.5 block truncate text-[11.5px] text-inkdim">
                {seeds.length === 0
                  ? '아직 씨앗이 없어'
                  : `${seeds.length}가지 · ${seeds.reduce((n, s) => n + s.count, 0)}개`}
                {dew > 0 && ` · 아침 이슬 ${dew}`}
              </span>
            </span>
          </button>

          {/* 아직 못 만난 것 하나. 조건을 적어주지는 않는다 —
              "무엇을 몇 번" 이 적히는 순간 정원이 체크리스트가 된다. */}
          {rareHint && (
            <p className="mt-3 rounded-card bg-butter-soft/50 px-3.5 py-2.5 text-center text-[12.5px] leading-relaxed text-butter-deep">
              {rareHint.crop.discovery?.reveal ?? '이 정원에 아직 못 본 게 있는 것 같다.'}
            </p>
          )}

          {/* 다음 단계까지 */}
          {view.nextLevelXp !== null && (
            <p className="mt-3 text-center font-game text-[10.5px] tracking-[0.06em] text-inkfaint">
              {view.xp} / {view.nextLevelXp} — 더 거두면 밭이 늘어나
            </p>
          )}
        </div>
      </div>

      {/* 빈 밭 — 무엇을 심을까 */}
      <SeedSheet
        open={active?.state === 'EMPTY'}
        state={state}
        repeatCropId={repeatCropId}
        onClose={() => setOpenPlot(null)}
        onPick={(cropId) => {
          if (openPlot === null) return
          if (onPlant(openPlot, cropId)) setOpenPlot(null)
        }}
      />

      {/* 자라는 중 */}
      <BottomSheet
        open={active?.state === 'GROWING'}
        onClose={() => setOpenPlot(null)}
        title={active?.crop ? active.crop.name : '자라는 중'}
      >
        {active?.crop && (
          <div className="text-center">
            <h2 className="mb-3 text-[17px] font-semibold text-ink">{active.crop.name}</h2>
            <span className="block text-[44px] leading-none">{STAGE_ICON[active.stage] || active.crop.icon}</span>
            <p className="mt-2 text-[15px] font-medium text-ink">{STAGE_LABEL[active.stage]}</p>
            <p className="mt-1 text-[13px] text-inkdim">
              {remainingLabel(active.remainingSeconds)} 남았어
            </p>

            {dew > 0 ? (
              <Button
                variant="soft"
                size="lg"
                className="mt-4 w-full"
                onClick={() => {
                  if (openPlot === null) return
                  if (onUseDew(openPlot)) {
                    onNotify(`아침 이슬을 뿌렸어 — ${GARDEN_DEW_SECONDS / 60}분 빨라졌어`)
                    setOpenPlot(null)
                  }
                }}
              >
                💧 아침 이슬 쓰기 (×{dew})
              </Button>
            ) : (
              <p className="mt-4 text-[12px] text-inkfaint">
                그냥 두면 알아서 다 자라.
              </p>
            )}
          </div>
        )}
      </BottomSheet>

      {/* 씨앗 가방 */}
      <BottomSheet open={bagOpen} onClose={() => setBagOpen(false)} title="씨앗 가방">
        <h2 className="mb-3 text-[17px] font-semibold text-ink">씨앗 가방</h2>
        {seeds.length === 0 ? (
          <p className="rounded-card bg-canvas px-3.5 py-5 text-center text-[13px] leading-relaxed text-inkdim">
            아직 씨앗이 없어.
            <br />
            <span className="text-inkfaint">퀘스트를 하다 보면 가끔 하나씩 생겨.</span>
          </p>
        ) : (
          <ul className="space-y-1.5">
            {seeds.map(({ crop, count }) => (
              <li
                key={crop.id}
                className="flex items-center gap-3 rounded-card bg-canvas px-3.5 py-2.5"
              >
                <span className="text-[20px] leading-none">{crop.icon}</span>
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="truncate text-[13.5px] text-ink">{crop.name} 씨앗</span>
                  {/* 찾아낸 것에만 붙는다. 씨앗 고르는 시트와 같은 표시를 쓴다. */}
                  {crop.discovery && (
                    <span className="shrink-0 rounded-pill bg-butter-soft px-1.5 py-0.5 font-game text-[9px] tracking-[0.08em] text-butter-deep">
                      RARE
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-game text-[12px] text-inkdim">×{count}</span>
              </li>
            ))}
            {dew > 0 && (
              <li className="flex items-center gap-3 rounded-card bg-canvas px-3.5 py-2.5">
                <span className="text-[20px] leading-none">💧</span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">아침 이슬</span>
                <span className="shrink-0 font-game text-[12px] text-inkdim">×{dew}</span>
              </li>
            )}
          </ul>
        )}
      </BottomSheet>

      <HarvestOverlay
        note={harvested}
        onClose={() => setHarvested(null)}
        onOpenBook={() => {
          setHarvested(null)
          onClose()
          onOpenBook()
        }}
      />

      <GardenTutorial open={tutorialOpen} onClose={() => setTutorialOpen(false)} />
    </Portal>
  )
}

/**
 * 밭 한 칸.
 *
 * 다 자란 칸만 조금 눈에 띈다. 자라는 중인 칸을 재촉하지 않는다 —
 * 여덟 칸이 전부 "빨리 와" 하고 있으면 그건 정원이 아니라 알림함이다.
 */
function PlotCard({ plot, onClick }: { plot: GardenPlotView; onClick: () => void }) {
  const ready = plot.state === 'READY'
  const locked = plot.state === 'LOCKED'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={plot.crop ? `${plot.crop.name} — ${STAGE_LABEL[plot.stage]}` : '빈 밭'}
      className={cn(
        'flex h-full w-full flex-col items-center rounded-card border px-2 pb-2.5 pt-3 transition-colors duration-200 active:scale-[0.97]',
        ready
          ? 'border-sage bg-sage-soft/60 ring-1 ring-sage'
          : locked
            ? 'border-dashed border-line bg-canvas'
            : 'border-line bg-surface',
      )}
    >
      <span
        className={cn(
          'flex h-[72px] w-full items-center justify-center rounded-btn text-[34px] leading-none',
          locked ? 'bg-transparent' : 'bg-canvas',
        )}
      >
        {locked ? (
          <span className="text-[20px] opacity-40">🔒</span>
        ) : plot.crop ? (
          <span className={cn(ready && 'animate-bouncesm')}>
            {ready ? plot.crop.icon : STAGE_ICON[plot.stage] || plot.crop.icon}
          </span>
        ) : (
          <span className="text-[20px] text-inkfaint">＋</span>
        )}
      </span>

      {/* 두 줄 높이로 고정한다. 칸마다 글자 수가 달라도 밭 크기는 같아야 한다. */}
      <span className="mt-1.5 line-clamp-2 h-[32px] w-full text-center text-[11.5px] font-medium leading-[16px] text-ink">
        {locked
          ? '더 넓어지면'
          : plot.crop
            ? ready
              ? `${plot.crop.name} — 거둘 수 있어`
              : `${plot.crop.name} · ${remainingLabel(plot.remainingSeconds)}`
            : '심어보기'}
      </span>
    </button>
  )
}
