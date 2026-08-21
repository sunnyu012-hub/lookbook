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
import { EventSheet } from '@/components/home/EventSheet'
import { CapacityCard } from '@/components/home/CapacityCard'
import { FocusCard } from '@/components/home/FocusCard'
import type { DailyFocus } from '@/lib/quests/dailyFocus'
import type { Capacity } from '@/lib/wellness/capacity'
import type { RecoveryCurve } from '@/lib/analytics/recoveryCurve'
import type { QuestStore } from '@/hooks/useQuests'
import { pixelDate, todayKey } from '@/lib/date'
import { loggingStreak } from '@/lib/xp'
import { effects as fx, icons, pets } from '@/lib/pixelAssets'
import { tintOfTag } from '@/lib/events'
import { haptic } from '@/hooks/useHaptic'
import type { LevelState } from '@/lib/level'
import type { ScoreContext } from '@/lib/scoring'
import { cn } from '@/lib/cn'

interface Props {
  today: Checkin | null
  /** 오늘 적어 둔 이벤트 태그 */
  events: string[]
  onSaveEvents: (tags: string[]) => void
  /** 밤 마무리를 마쳤는지 */
  nightDone: boolean
  onNight: () => void
  onOpenQuestBoard: () => void
  onFavoriteQuest: (questId: string) => void
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
  /** 오늘의 결 — 하루 일정을 짜 주지는 않는다 */
  capacity: Capacity | null
  /** 요즘 흐름 — 여기엔 화살표 한 줄만, 자세한 건 눌러서 */
  curve: RecoveryCurve
  onOpenRhythm: () => void
  /** 일요일 저녁에만 슬쩍 뜬다 */
  weeklyDue: boolean
  onOpenWeekly: () => void
  /** 오늘의 작은 목표 — 매일 바뀐다 */
  focus: DailyFocus | null
}

/**
 * HOME — 오늘의 세계.
 * 대시보드가 아니다. 주인공은 방과 캐릭터고, 숫자는 그 아래에서 조용히 받쳐 준다.
 */
export function HomePage({
  today,
  events,
  onSaveEvents,
  nightDone,
  onNight,
  onOpenQuestBoard,
  onFavoriteQuest,
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
  capacity,
  curve,
  onOpenRhythm,
  weeklyDue,
  onOpenWeekly,
  focus,
}: Props) {
  /**
   * 기본 탭은 QUEST 다.
   * 앱을 켰을 때 "오늘 뭘 하면 되는지" 가 먼저 보여야 한다.
   * 컨디션 숫자는 이미 위 HUD 와 CAPACITY 가 말해 주고 있다.
   */
  const [tab, setTab] = useState<HomeTab>('quest')
  const [eventsOpen, setEventsOpen] = useState(false)

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
          events={events}
          nightDone={nightDone}
          questsDone={questStore.doneCount}
          capacity={capacity?.type ?? null}
        />
      </div>

      {loading ? (
        <p className="plabel py-10 text-center">Loading…</p>
      ) : (
        <>
          <TodayHUD today={today} streak={streak} onStartCheckin={onStartCheckin} />

          <CapacityCard capacity={capacity} curve={curve} onOpenCurve={onOpenRhythm} />

          {focus && <FocusCard focus={focus} />}

          {/* ── 오늘 있었던 일 ── */}
          <section>
            <button
              type="button"
              onClick={() => {
                haptic()
                setEventsOpen(true)
              }}
              className="press flex w-full items-center gap-2 rounded-px3 border-[1.5px] border-dashed border-borderdeep bg-cream px-3 py-2.5 text-left"
            >
              <PixelImage asset={icons.camera} height={16} />
              {events.length === 0 ? (
                <span className="flex-1 text-[12.5px] text-inkdim">+ 오늘 있었던 일</span>
              ) : (
                <span className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto">
                  {events.slice(0, 6).map((tag) => (
                    <span
                      key={tag}
                      className="shrink-0 rounded-full px-2 py-[3px] text-[11.5px]"
                      style={{ backgroundColor: tintOfTag(tag) }}
                    >
                      {tag}
                    </span>
                  ))}
                  {events.length > 6 && (
                    <span className="plabel shrink-0 self-center">+{events.length - 6}</span>
                  )}
                </span>
              )}
              <span className="font-pixel text-[11px] text-inkfaint">›</span>
            </button>
          </section>

          <HomeTabs active={tab} onChange={setTab} />

          <section className="panel p-3.5" role="tabpanel">
            {tab === 'status' && (
              <StatusView today={today} scoreContext={scoreContext} onEdit={onStartCheckin} />
            )}
            {tab === 'effects' && <EffectsView today={today} scoreContext={scoreContext} />}
            {tab === 'quest' && (
              <QuestView
                questStore={questStore}
                prefs={prefs}
                onOpenBoard={onOpenQuestBoard}
                onFavorite={onFavoriteQuest}
                focus={focus}
              />
            )}
          </section>

          <MyLife modules={modules} onOpen={onOpenLife} />

          {/* ── 하루 닫기 ── */}
          {today && (
            <button
              type="button"
              onClick={() => {
                haptic()
                onNight()
              }}
              className={cn(
                'press flex w-full items-center justify-center gap-2 rounded-px4 border-[1.5px] py-3',
                'font-pixel text-[11px] uppercase tracking-[0.04em]',
                nightDone
                  ? 'border-border bg-ivory text-inkdim shadow-hard'
                  : 'border-lavenderdeep bg-lavendersoft text-lavenderdeep shadow-hard',
              )}
            >
              <PixelImage asset={pets.catCurl} height={18} />
              {nightDone ? '밤 기록 고치기' : '하루 마무리하기'}
            </button>
          )}

          {/* ── 주간 돌아보기 — 주가 끝나갈 때만 슬쩍 ── */}
          {weeklyDue && (
            <button
              type="button"
              onClick={() => {
                haptic()
                onOpenWeekly()
              }}
              className="press flex w-full items-center gap-2 rounded-px4 border-[1.5px] border-dashed border-borderdeep bg-cream px-3.5 py-3 text-left"
            >
              <PixelImage asset={pets.catSit} height={20} />
              <span className="flex-1">
                <span className="ptitle block">Weekly reset</span>
                <span className="mt-1 block text-[11.5px] text-inkdim">
                  이번 주를 잠깐 돌아볼까요?
                </span>
              </span>
              <span className="font-pixel text-[11px] text-inkfaint">›</span>
            </button>
          )}
        </>
      )}

      {eventsOpen && (
        <EventSheet
          tags={events}
          onClose={() => setEventsOpen(false)}
          onSave={(tags) => {
            onSaveEvents(tags)
            setEventsOpen(false)
          }}
        />
      )}
    </div>
  )
}
