import { useMemo, useState } from 'react'
import type { Checkin, DdayEvent, MounjaroLog, Preferences, WeightLog } from '@/types'
import { RoomStage } from '@/components/room/RoomStage'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelSparkle } from '@/components/pixel/PixelSparkle'
import { TodayHUD } from '@/components/home/TodayHUD'
import { HomeTabs, type HomeTab } from '@/components/home/HomeTabs'
import { StatusView } from '@/components/home/StatusView'
import { EffectsView } from '@/components/home/EffectsView'
import { QuestView } from '@/components/home/QuestView'
import { MyLife, buildLifeModules, type LifeSection } from '@/components/home/MyLife'
import type { QuestStore } from '@/hooks/useQuests'
import { pixelDate, todayKey } from '@/lib/date'
import { loggingStreak } from '@/lib/xp'
import { effects as fx, icons } from '@/lib/pixelAssets'
import type { LevelState } from '@/lib/level'
import type { ScoreContext } from '@/lib/scoring'

interface Props {
  today: Checkin | null
  checkins: Checkin[]
  weights: WeightLog[]
  mounjaro: MounjaroLog[]
  ddays: DdayEvent[]
  prefs: Preferences
  level: LevelState
  dayNumber: number
  loading: boolean
  questStore: QuestStore
  scoreContext?: ScoreContext
  onStartCheckin: () => void
  onOpenLife: (section: LifeSection) => void
  onOpenLog: () => void
}

/**
 * HOME — 오늘의 세계.
 * 대시보드가 아니다. 주인공은 방과 캐릭터고, 숫자는 그 아래에서 조용히 받쳐 준다.
 */
export function HomePage({
  today,
  checkins,
  weights,
  mounjaro,
  ddays,
  prefs,
  level,
  dayNumber,
  loading,
  questStore,
  scoreContext,
  onStartCheckin,
  onOpenLife,
  onOpenLog,
}: Props) {
  const [tab, setTab] = useState<HomeTab>('status')

  const streak = useMemo(
    () => loggingStreak(checkins.map((c) => c.date), todayKey()),
    [checkins],
  )
  const modules = useMemo(
    () => buildLifeModules({ prefs, checkins, weights, mounjaro, ddays }),
    [prefs, checkins, weights, mounjaro, ddays],
  )
  const injectedToday = useMemo(
    () => mounjaro.some((m) => m.date === todayKey()),
    [mounjaro],
  )

  return (
    <div className="space-y-3.5">
      {/* ── 헤더 — 카드로 감싸지 않는다 ── */}
      <header className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <PixelImage asset={fx.heart} height={17} />
            <h1 className="font-pixel text-[19px] uppercase leading-none tracking-[0.02em]">
              Life OS
            </h1>
            <PixelSparkle size={10} />
          </div>
          <p className="mt-1.5 text-[11.5px] leading-none text-inkfaint">
            my little life, my big dream
          </p>
        </div>

        <div className="flex items-start gap-2">
          <div className="text-right">
            <p className="font-pixel text-[12px] leading-none text-pinkdeep">
              LV.{level.level} · Day {String(dayNumber).padStart(3, '0')}
            </p>
            <p className="plabel mt-1.5">{pixelDate(todayKey())}</p>
          </div>
          <button
            type="button"
            onClick={onOpenLog}
            aria-label="달력 열기"
            className="press rounded-px3 border-[1.5px] border-border bg-ivory p-1.5 shadow-hard"
          >
            <PixelImage asset={icons.log} height={17} />
          </button>
        </div>
      </header>

      {/* ── 방 — 화면 끝까지 ── */}
      <div className="bleed">
        <RoomStage
          checkin={today}
          mode={today?.mode ?? null}
          prefs={prefs}
          injectedToday={injectedToday}
        />
      </div>

      {loading ? (
        <p className="plabel py-10 text-center">Loading…</p>
      ) : (
        <>
          <TodayHUD today={today} streak={streak} onStartCheckin={onStartCheckin} />

          <HomeTabs active={tab} onChange={setTab} />

          <section className="panel p-3.5" role="tabpanel">
            {tab === 'status' && (
              <StatusView today={today} scoreContext={scoreContext} onEdit={onStartCheckin} />
            )}
            {tab === 'effects' && <EffectsView today={today} scoreContext={scoreContext} />}
            {tab === 'quest' && <QuestView mode={today?.mode ?? null} questStore={questStore} />}
          </section>

          <MyLife modules={modules} onOpen={onOpenLife} />
        </>
      )}
    </div>
  )
}
