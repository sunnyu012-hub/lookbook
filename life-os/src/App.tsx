import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TabKey } from '@/types'
import type { QuickLogInput } from '@/lib/os2/types'
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
import { ArchivePage } from '@/pages/ArchivePage'
import { NightPage } from '@/pages/NightPage'
import { QuickLogPage } from '@/pages/QuickLogPage'
import { LifeTreePage } from '@/pages/LifeTreePage'
import { LifeBalanceDetail } from '@/pages/LifeBalancePage'
import { RhythmPage } from '@/pages/RhythmPage'
import { WeeklyResetPage } from '@/pages/WeeklyResetPage'
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
  useWeeklyResets,
  useWeights,
} from '@/hooks/useLifeData'
import { usePreferences } from '@/hooks/usePreferences'
import { useQuestLegacy } from '@/hooks/useQuestLegacy'
import { useQuickLogs } from '@/hooks/useQuickLogs'
import { useMyTags } from '@/hooks/useMyTags'
import { useSession } from '@/hooks/useSession'
import { levelFromXp } from '@/lib/level'
import { XP_RULES, xpBreakdown } from '@/lib/xp'
import { earnedCount, evaluateBadges, markSeen, newlyEarned } from '@/lib/badges'
import { buildManual } from '@/lib/manual'
import { discoverPatterns } from '@/lib/analytics'
import { buildInsightList } from '@/lib/analytics/insightEntity'
import { computeLifeBalance } from '@/lib/analytics/lifeBalance'
import { buildLifeTree, markTreeSeen, newlyOpened } from '@/lib/analytics/lifeTree'
import { recoveryCurve } from '@/lib/analytics/recoveryCurve'
import { todayCapacity } from '@/lib/wellness/capacity'
import { nextUnlocks } from '@/lib/analytics/nextUnlock'
import {
  WEEKLY_RESET_XP,
  focusByDate,
  weekStartOf,
  weekSummary,
} from '@/lib/analytics/weeklyReset'
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
  const [overlay, setOverlay] = useState<
    'night' | 'quicklog' | 'collection' | 'manual' | 'tree' | 'rhythm' | 'weekly' | 'balance' | null
  >(null)
  const [result, setResult] = useState<'start' | 'complete' | null>(null)
  const [editingDate, setEditingDate] = useState<string>(todayKey())
  /** 상세로 열어 둔 Quick Log */
  const [openLog, setOpenLog] = useState<string | null>(null)
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
  const weeklyStore = useWeeklyResets(auth.state)
  const quickLogStore = useQuickLogs(auth.state)
  const myTagStore = useMyTags(auth.state)

  const todayTags = tagStore.tagsFor(todayKey())

  /** 오늘의 결 — 하루 일정을 짜 주지는 않고, 결만 정해서 추천과 방에 넘긴다 */
  const capacity = useMemo(
    () =>
      todayCapacity({
        checkin: store.today,
        events: todayTags,
        sleepGoalHours: prefStore.prefs.sleepGoalHours,
      }),
    [store.today, todayTags, prefStore.prefs.sleepGoalHours],
  )

  /**
   * Quest 는 Life OS 2.0 에서 사라졌다. 지난 기록만 읽어서
   * Life Balance · Life Tree · XP 의 과거 값이 그대로 남게 한다.
   */
  const questStore = useQuestLegacy(auth.state)

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

  /**
   * 모든 화면이 같은 관찰을 쓰도록 한 번만 만든다.
   * Patterns / My Manual / Life Tree / Archive 가 전부 이 목록을 참조한다.
   */
  const insights = useMemo(
    () =>
      buildInsightList({
        checkins: store.checkins,
        prefs: prefStore.prefs,
        lifeEvents: eventStore.events,
        mounjaroLogs: mounjaroStore.logs,
        eventLog: tagStore.log,
      }),
    [store.checkins, prefStore.prefs, eventStore.events, mounjaroStore.logs, tagStore.log],
  )

  const balanceInput = useMemo(
    () => ({
      checkins: store.checkins,
      nights: nightStore.nights,
      lifeEvents: eventStore.events,
      eventLog: tagStore.log,
      questLog: questStore.log,
      customQuests: questStore.customQuests,
      weeklyFocus: focusByDate(weeklyStore.resets),
    }),
    [
      store.checkins,
      nightStore.nights,
      eventStore.events,
      tagStore.log,
      questStore.log,
      questStore.customQuests,
      weeklyStore.resets,
    ],
  )

  const balance = useMemo(() => computeLifeBalance({ ...balanceInput, days: 7 }), [balanceInput])

  const lifeTree = useMemo(
    () =>
      buildLifeTree({
        checkins: store.checkins,
        nights: nightStore.nights,
        lifeEvents: eventStore.events,
        weights: weightStore.logs,
        mounjaro: mounjaroStore.logs,
        eventLog: tagStore.log,
        questLog: questStore.log,
        customQuests: questStore.customQuests,
        weeklyResets: weeklyStore.resets,
      }),
    [
      store.checkins,
      nightStore.nights,
      eventStore.events,
      weightStore.logs,
      mounjaroStore.logs,
      tagStore.log,
      questStore.log,
      questStore.customQuests,
      weeklyStore.resets,
    ],
  )

  const curve = useMemo(
    () => recoveryCurve({ checkins: store.checkins, metric: 'overall', days: 7 }),
    [store.checkins],
  )

  /** 이번 주 요약 — 주간 돌아보기 화면과 ME 에서 같이 쓴다 */
  const thisWeek = useMemo(
    () => weekSummary({ ...balanceInput, weekStart: weekStartOf() }),
    [balanceInput],
  )
  const thisWeekReset = weeklyStore.byWeekStart.get(weekStartOf()) ?? null


  /**
   * 주간 돌아보기를 권할 때 — 금·토·일에만, 아직 안 썼을 때만.
   * 매일 띄우면 숙제가 된다.
   */
  const weeklyDue = useMemo(() => {
    if (thisWeekReset) return false
    const day = new Date(`${todayKey()}T00:00:00`).getDay()
    return day === 0 || day === 6 || day === 5
  }, [thisWeekReset])

  /** 퀘스트 완료 총 횟수 (배지용) — 지난 기록 기준 */
  const questsDoneTotal = questStore.doneTotal

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
        weeklyResets: weeklyStore.resets.length,
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
      weeklyStore.resets.length,
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
        weeklyResets: weeklyStore.resets.length,
        treeNodes: lifeTree.discovered,
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
      weeklyStore.resets.length,
      lifeTree.discovered,
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
        insights,
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
      insights,
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

/** 곧 열릴 것 세 개 — 잠긴 화면만 보면 답답하다 */
  const unlocks = useMemo(
    () => nextUnlocks({ tree: lifeTree, badges, chapters: manualChapters }),
    [lifeTree, badges, manualChapters],
  )

  // 새로 열린 Life Tree Node 를 한 번만 알려 준다
  useEffect(() => {
    if (store.loading || questStore.loading || weeklyStore.loading) return
    const fresh = newlyOpened(lifeTree)
    if (fresh.length > 0) {
      const first = fresh.find((n) => n.parent !== null) ?? fresh[0]
      setToast({
        title: '✦ New part of you ✦',
        detail: `${first.title} · ${first.ko} 이(가) 열렸어요.`,
      })
      markTreeSeen(lifeTree)
    }
  }, [lifeTree, store.loading, questStore.loading, weeklyStore.loading])

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

  const handleTab = (next: TabKey) => {
    setOverlay(null)
    setSettingsOpen(false)
    if (next === 'checkin') setEditingDate(todayKey())
    if (next === 'life') setLifeSection(null)
    setTab(next)
  }

  const existing = store.byDate.get(editingDate) ?? null
  const openedLog = useMemo(
    () => quickLogStore.logs.find((l) => l.id === openLog) ?? null,
    [quickLogStore.logs, openLog],
  )

  /**
   * Quick Log 저장.
   * 사진만 실패한 경우에도 기록은 이미 저장돼 있다 — 그럴 때만 한 줄 덧붙인다.
   */
  const saveQuickLog = useCallback(
    async (input: QuickLogInput, photo: File | null) => {
      const result = await quickLogStore.createLog(input, photo)
      if (!result) return
      setToast({
        title: '기록했어요 ✦',
        detail: result.photoWarning ?? undefined,
      })
    },
    [quickLogStore],
  )

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
      ) : overlay === 'quicklog' && openedLog ? (
        <QuickLogPage
          log={openedLog}
          tagStore={myTagStore}
          onSave={async (input, photo) => {
            const result = await quickLogStore.updateLog(openedLog.id, input, photo)
            if (result?.photoWarning) setToast({ title: '기록했어요 ✦', detail: result.photoWarning })
          }}
          onRemove={async () => {
            await quickLogStore.removeLog(openedLog.id)
            setOpenLog(null)
            setOverlay(null)
            setToast({ title: 'Deleted', detail: '기록을 지웠어요.' })
          }}
          onClose={() => {
            setOpenLog(null)
            setOverlay(null)
          }}
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
      ) : overlay === 'tree' ? (
        <LifeTreePage
          tree={lifeTree}
          insights={insights}
          unlocks={unlocks}
          onClose={() => setOverlay(null)}
          onOpenManual={() => setOverlay('manual')}
        />
      ) : overlay === 'balance' ? (
        <LifeBalanceDetail
          balanceInput={balanceInput}
          onClose={() => setOverlay(null)}
          onOpenTree={() => setOverlay('tree')}
        />
      ) : overlay === 'rhythm' ? (
        <RhythmPage checkins={store.checkins} onClose={() => setOverlay(null)} />
      ) : overlay === 'weekly' ? (
        <WeeklyResetPage
          summary={thisWeek}
          existing={thisWeekReset}
          onSave={weeklyStore.save}
          onClose={() => setOverlay(null)}
          onDone={() => {
            setOverlay(null)
            setToast({
              title: 'Week closed',
              detail: thisWeekReset ? '고쳐서 저장했어요.' : `이번 주를 닫았어요. +${WEEKLY_RESET_XP} XP`,
            })
          }}
        />
      ) : settingsOpen ? (
        <SettingsPage
          prefs={prefStore.prefs}
          account={auth.email}
          exportData={{
            checkins: store.checkins,
            nights: nightStore.nights,
            weights: weightStore.logs,
            mounjaro: mounjaroStore.logs,
            lifeEvents: eventStore.events,
            ddays: ddayStore.ddays,
            eventLog: tagStore.log,
            questLog: questStore.log,
            customQuests: questStore.customQuests,
            weeklyResets: weeklyStore.resets,
            prefs: prefStore.prefs,
          }}
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
              scoreContext={prefStore.scoreContext}
              onStartCheckin={() => openCheckin(todayKey())}
              onOpenLife={openLife}
              onOpenLog={() => setTab('log')}
              events={todayTags}
              onSaveEvents={(tags) => tagStore.setForDate(todayKey(), tags)}
              nightDone={nightStore.byDate.has(todayKey())}
              onNight={() => setOverlay('night')}
              capacity={capacity}
              curve={curve}
              onOpenRhythm={() => setOverlay('rhythm')}
              weeklyDue={weeklyDue}
              onOpenWeekly={() => setOverlay('weekly')}
              todayLogs={quickLogStore.todayLogs}
              tagStore={myTagStore}
              onSaveQuickLog={saveQuickLog}
              onOpenQuickLog={(log) => {
                setOpenLog(log.id)
                setOverlay('quicklog')
              }}
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
            <ArchivePage
              checkins={store.checkins}
              byDate={store.byDate}
              nights={nightStore.nights}
              nightsByDate={nightStore.byDate}
              weights={weightStore.logs}
              weightsByDate={weightStore.byDate}
              mounjaro={mounjaroStore.logs}
              mounjaroByDate={mounjaroStore.byDate}
              lifeEvents={eventStore.events}
              eventsByDate={eventStore.byDate}
              eventLog={tagStore.log}
              questLog={questStore.log}
              customQuests={questStore.customQuests}
              weeklyResets={weeklyStore.resets}
              insights={insights}
              prefs={prefStore.prefs}
              quickLogsFor={quickLogStore.logsFor}
              onOpenQuickLog={(log) => {
                setOpenLog(log.id)
                setOverlay('quicklog')
              }}
              onEdit={openCheckin}
              onAddEvent={eventStore.save}
              onRemoveEvent={eventStore.remove}
              onDelete={async (date: string) => {
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
              balance={balance}
              onOpenBalance={() => setOverlay('balance')}
              tree={lifeTree}
              onOpenTree={() => setOverlay('tree')}
              curve={curve}
              onOpenRhythm={() => setOverlay('rhythm')}
              insightList={insights}
              unlocks={unlocks}
              weeklyResets={weeklyStore.resets.length}
              onOpenWeekly={() => setOverlay('weekly')}
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
          xpEarned={XP_RULES.morningCheckin + XP_RULES.nightCheckout}
          onClose={() => setResult(null)}
        />
      )}

      {toast && (
        <PixelToast title={toast.title} detail={toast.detail} onDone={() => setToast(null)} />
      )}
    </AppShell>
  )
}
