import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TabKey } from '@/types'
import { AppShell } from '@/components/layout/AppShell'
import { AuthGate } from '@/components/AuthGate'
import { DevTools } from '@/components/DevTools'
import { PixelToast } from '@/components/pixel/PixelToast'
import { PixelImage } from '@/components/pixel/PixelImage'
import { CheckinPage } from '@/pages/CheckinPage'
import { HomePage } from '@/pages/HomePage'
import { LifePage, type LifeTab } from '@/pages/LifePage'
import { MePage } from '@/pages/MePage'
import { SettingsPage } from '@/pages/SettingsPage'
import { TimelinePage } from '@/pages/TimelinePage'
import { NightPage } from '@/pages/NightPage'
import { QuestBoardPage } from '@/pages/QuestBoardPage'
import { CollectionPage } from '@/pages/CollectionPage'
import { ManualPage } from '@/pages/ManualPage'
import { DayComplete, DayStart } from '@/components/home/DayResult'
import { useCheckins } from '@/hooks/useCheckins'
import {
  useDdays,
  useEventTags,
  useLifeEvents,
  useMounjaro,
  useNights,
  useWeights,
} from '@/hooks/useLifeData'
import { usePreferences } from '@/hooks/usePreferences'
import { useQuests } from '@/hooks/useQuests'
import { useSession } from '@/hooks/useSession'
import { levelFromXp } from '@/lib/level'
import { xpBreakdown } from '@/lib/xp'
import { earnedCount, evaluateBadges, markSeen, newlyEarned } from '@/lib/badges'
import { buildManual } from '@/lib/manual'
import { discoverPatterns } from '@/lib/analytics'
import { dayXp } from '@/lib/quests/master'
import { characters } from '@/lib/pixelAssets'
import { todayKey } from '@/lib/date'
import { storageMode } from '@/lib/repository'

interface ToastState {
  title: string
  detail?: string
}

export default function App() {
  const [tab, setTab] = useState<TabKey>('home')
  const [lifeSection, setLifeSection] = useState<LifeTab>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  /** 전체 화면으로 덮는 화면들 */
  const [overlay, setOverlay] = useState<'night' | 'quests' | 'collection' | 'manual' | null>(null)
  const [result, setResult] = useState<'start' | 'complete' | null>(null)
  const [editingDate, setEditingDate] = useState<string>(todayKey())
  const [toast, setToast] = useState<ToastState | null>(null)

  const auth = useSession()
  const prefStore = usePreferences(auth.state)
  const store = useCheckins(auth.state)
  const weightStore = useWeights(auth.state)
  const mounjaroStore = useMounjaro(auth.state)
  const eventStore = useLifeEvents(auth.state)
  const ddayStore = useDdays(auth.state)
  const nightStore = useNights(auth.state)
  const tagStore = useEventTags(auth.state)

  const todayTags = tagStore.tagsFor(todayKey())
  const questStore = useQuests(auth.state, {
    mode: store.today?.mode ?? null,
    events: todayTags,
    prefs: prefStore.prefs,
  })

  const patterns = useMemo(
    () =>
      discoverPatterns({
        checkins: store.checkins,
        prefs: prefStore.prefs,
        lifeEvents: eventStore.events,
        mounjaroLogs: mounjaroStore.logs,
        eventLog: tagStore.log,
      }),
    [store.checkins, prefStore.prefs, eventStore.events, mounjaroStore.logs, tagStore.log],
  )

  /** 퀘스트 완료 총 횟수 (배지용) */
  const questsDoneTotal = useMemo(
    () =>
      Object.values(questStore.log).reduce(
        (sum, d) => sum + Object.values(d.completions).reduce((s, n) => s + n, 0),
        0,
      ),
    [questStore.log],
  )

  // XP 는 "적은 행동" 에서만 나온다 (건강 수치가 좋아진 것에는 주지 않는다)
  const xpNoBadges = useMemo(
    () =>
      xpBreakdown({
        checkins: store.checkins,
        weights: weightStore.logs,
        mounjaro: mounjaroStore.logs,
        lifeEvents: eventStore.events,
        nights: nightStore.nights,
        eventLog: tagStore.log,
        questXp: questStore.questXp,
        discoveries: patterns.length,
      }),
    [
      store.checkins,
      weightStore.logs,
      mounjaroStore.logs,
      eventStore.events,
      nightStore.nights,
      tagStore.log,
      questStore.questXp,
      patterns.length,
    ],
  )

  const badges = useMemo(
    () =>
      evaluateBadges({
        checkins: store.checkins,
        nights: nightStore.nights,
        weights: weightStore.logs,
        mounjaro: mounjaroStore.logs,
        lifeEvents: eventStore.events,
        eventLog: tagStore.log,
        questsDone: questsDoneTotal,
        discoveries: patterns.length,
        level: levelFromXp(xpNoBadges.total).level,
      }),
    [
      store.checkins,
      nightStore.nights,
      weightStore.logs,
      mounjaroStore.logs,
      eventStore.events,
      tagStore.log,
      questsDoneTotal,
      patterns.length,
      xpNoBadges.total,
    ],
  )

  const xp = useMemo(
    () => ({ ...xpNoBadges, badge: earnedCount(badges) * 5, total: xpNoBadges.total + earnedCount(badges) * 5 }),
    [xpNoBadges, badges],
  )
  const level = levelFromXp(xp.total)

  const manualChapters = useMemo(
    () =>
      buildManual({
        checkins: store.checkins,
        nights: nightStore.nights,
        weights: weightStore.logs,
        mounjaro: mounjaroStore.logs,
        lifeEvents: eventStore.events,
        eventLog: tagStore.log,
        prefs: prefStore.prefs,
        scoreContext: prefStore.scoreContext,
      }),
    [
      store.checkins,
      nightStore.nights,
      weightStore.logs,
      mounjaroStore.logs,
      eventStore.events,
      tagStore.log,
      prefStore.prefs,
      prefStore.scoreContext,
    ],
  )

  // 새로 열린 배지를 한 번만 알려 준다
  useEffect(() => {
    if (store.loading || questStore.loading) return
    const fresh = newlyEarned(badges)
    if (fresh.length > 0) {
      const first = fresh[0]
      setToast({
        title: first.secret ? 'Secret discovered!' : `New badge — ${first.name}`,
        detail: first.secret ? `${first.name} 이(가) 열렸어요.` : first.hint,
      })
      markSeen(badges)
    }
  }, [badges, store.loading, questStore.loading])

  // 레벨이 오르는 순간에만 알려준다 (첫 로딩은 제외)
  const lastLevel = useRef<number | null>(null)
  useEffect(() => {
    if (store.loading || questStore.loading) return
    if (lastLevel.current !== null && level.level > lastLevel.current) {
      setToast({ title: `Level Up! LV.${level.level}`, detail: '한 칸 더 자랐어요.' })
    }
    lastLevel.current = level.level
  }, [level.level, store.loading, questStore.loading])

  const openCheckin = useCallback((date: string = todayKey()) => {
    setEditingDate(date)
    setSettingsOpen(false)
    setTab('checkin')
  }, [])

  const openLife = useCallback((section: LifeTab) => {
    setLifeSection(section)
    setSettingsOpen(false)
    setTab('life')
  }, [])

  const toggleFavorite = useCallback(
    (questId: string) => {
      const current = prefStore.prefs.favoriteQuests ?? []
      const next = current.includes(questId)
        ? current.filter((id) => id !== questId)
        : [...current, questId]
      void prefStore.save({ ...prefStore.prefs, favoriteQuests: next })
    },
    [prefStore],
  )

  const handleTab = (next: TabKey) => {
    setOverlay(null)
    setSettingsOpen(false)
    if (next === 'checkin') setEditingDate(todayKey())
    if (next === 'life') setLifeSection(null)
    setTab(next)
  }

  const existing = store.byDate.get(editingDate) ?? null
  /** 오늘까지 며칠째인지 — 오늘 기록이 없으면 다음 날짜로 센다 */
  const dayNumber = store.checkins.length + (store.today ? 0 : 1)

  if (auth.state === 'loading') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3">
        <PixelImage asset={characters.idle} height={96} className="animate-floaty" />
        <p className="plabel">Loading…</p>
      </div>
    )
  }

  if (auth.state === 'signed-out') return <AuthGate />

  const firstError = store.error ?? prefStore.error ?? weightStore.error ?? mounjaroStore.error

  return (
    <AppShell active={tab} onTabChange={handleTab}>
      {storageMode === 'local' && <p className="plabel mb-3 text-right">Local Save</p>}

      {firstError && (
        <p className="mb-3 rounded-px3 border-[1.5px] border-pinkdeep bg-pinksoft px-3 py-2 text-[12px]">
          {firstError}
        </p>
      )}

      {overlay === 'night' ? (
        <NightPage
          morning={store.today}
          existing={nightStore.byDate.get(todayKey()) ?? null}
          onSave={nightStore.save}
          onClose={() => setOverlay(null)}
          onDone={() => {
            setOverlay(null)
            setResult('complete')
          }}
        />
      ) : overlay === 'quests' ? (
        <QuestBoardPage
          questStore={questStore}
          prefs={prefStore.prefs}
          mode={store.today?.mode ?? null}
          events={todayTags}
          onFavorite={toggleFavorite}
          onClose={() => setOverlay(null)}
        />
      ) : overlay === 'collection' ? (
        <CollectionPage
          badges={badges}
          patterns={patterns}
          memories={eventStore.events.map((e) => ({ date: e.date, title: e.title }))}
          onClose={() => setOverlay(null)}
        />
      ) : overlay === 'manual' ? (
        <ManualPage chapters={manualChapters} onClose={() => setOverlay(null)} />
      ) : settingsOpen ? (
        <SettingsPage
          prefs={prefStore.prefs}
          account={auth.email}
          onSave={prefStore.save}
          onSignOut={() => void auth.signOut()}
          onClose={() => setSettingsOpen(false)}
        />
      ) : (
        <>
          {tab === 'home' && (
            <HomePage
              today={store.today}
              checkins={store.checkins}
              weights={weightStore.logs}
              mounjaro={mounjaroStore.logs}
              ddays={ddayStore.ddays}
              prefs={prefStore.prefs}
              level={level}
              dayNumber={dayNumber}
              loading={store.loading}
              questStore={questStore}
              scoreContext={prefStore.scoreContext}
              onStartCheckin={() => openCheckin(todayKey())}
              onOpenLife={openLife}
              onOpenLog={() => setTab('log')}
              events={todayTags}
              onSaveEvents={(tags) => tagStore.setForDate(todayKey(), tags)}
              nightDone={nightStore.byDate.has(todayKey())}
              onNight={() => setOverlay('night')}
              onOpenQuestBoard={() => setOverlay('quests')}
              onFavoriteQuest={toggleFavorite}
            />
          )}

          {tab === 'checkin' && (
            <CheckinPage
              date={editingDate}
              existing={existing}
              scoreContext={prefStore.scoreContext}
              mounjaroEnabled={prefStore.prefs.mounjaroEnabled}
              onSave={(input) => store.save(input, prefStore.scoreContext)}
              onSaveWeight={weightStore.save}
              onSaveMounjaro={mounjaroStore.save}
              onSaveEvent={eventStore.save}
              onSaved={(saved) => {
                setTab('home')
                if (saved.date === todayKey()) setResult('start')
                else setToast({ title: 'Save Complete!', detail: '기록이 저장됐어요.' })
              }}
            />
          )}

          {tab === 'life' && (
            <LifePage
              prefs={prefStore.prefs}
              checkins={store.checkins}
              weights={weightStore.logs}
              mounjaro={mounjaroStore.logs}
              lifeEvents={eventStore.events}
              ddays={ddayStore.ddays}
              section={lifeSection}
              onSection={setLifeSection}
              onSaveWeight={weightStore.save}
              onRemoveWeight={weightStore.remove}
              onSaveMounjaro={mounjaroStore.save}
              onRemoveMounjaro={mounjaroStore.remove}
              onSaveDday={ddayStore.save}
              onRemoveDday={ddayStore.remove}
              onOpenLog={() => setTab('log')}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          )}

          {tab === 'log' && (
            <TimelinePage
              checkins={store.checkins}
              byDate={store.byDate}
              weightsByDate={weightStore.byDate}
              mounjaroByDate={mounjaroStore.byDate}
              eventsByDate={eventStore.byDate}
              tagsByDate={tagStore.log}
              nightsByDate={nightStore.byDate}
              onEdit={openCheckin}
              onAddEvent={eventStore.save}
              onRemoveEvent={eventStore.remove}
              onDelete={async (date) => {
                await store.remove(date)
                setToast({ title: 'Deleted', detail: '기록을 지웠어요.' })
              }}
            />
          )}

          {tab === 'me' && (
            <MePage
              checkins={store.checkins}
              weights={weightStore.logs}
              mounjaro={mounjaroStore.logs}
              lifeEvents={eventStore.events}
              prefs={prefStore.prefs}
              scoreContext={prefStore.scoreContext}
              level={level}
              xp={xp}
              onStartCheckin={() => openCheckin(todayKey())}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenCollection={() => setOverlay('collection')}
              onOpenManual={() => setOverlay('manual')}
              badgesEarned={earnedCount(badges)}
              badgesTotal={badges.length}
              manualChapters={manualChapters}
              devAction={<DevTools onChanged={() => void store.refresh()} />}
            />
          )}
        </>
      )}

      {result === 'start' && store.today && (
        <DayStart checkin={store.today} dayNumber={dayNumber} onClose={() => setResult(null)} />
      )}

      {result === 'complete' && nightStore.byDate.get(todayKey()) && (
        <DayComplete
          checkin={store.today}
          night={nightStore.byDate.get(todayKey())!}
          dayNumber={dayNumber}
          questsDone={questStore.doneCount}
          questTotal={questStore.picks.length}
          xpEarned={dayXp(questStore.today, questStore.featured, questStore.allQuests) + 10}
          onClose={() => setResult(null)}
        />
      )}

      {toast && (
        <PixelToast title={toast.title} detail={toast.detail} onDone={() => setToast(null)} />
      )}
    </AppShell>
  )
}
