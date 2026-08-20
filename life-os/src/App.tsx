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
import { useCheckins } from '@/hooks/useCheckins'
import { useDdays, useLifeEvents, useMounjaro, useWeights } from '@/hooks/useLifeData'
import { usePreferences } from '@/hooks/usePreferences'
import { useQuests } from '@/hooks/useQuests'
import { useSession } from '@/hooks/useSession'
import { levelFromXp } from '@/lib/level'
import { xpBreakdown } from '@/lib/xp'
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
  const [editingDate, setEditingDate] = useState<string>(todayKey())
  const [toast, setToast] = useState<ToastState | null>(null)

  const auth = useSession()
  const prefStore = usePreferences(auth.state)
  const store = useCheckins(auth.state)
  const questStore = useQuests(auth.state)
  const weightStore = useWeights(auth.state)
  const mounjaroStore = useMounjaro(auth.state)
  const eventStore = useLifeEvents(auth.state)
  const ddayStore = useDdays(auth.state)

  // XP 는 "적은 행동" 에서만 나온다 (건강 수치가 좋아진 것에는 주지 않는다)
  const xp = useMemo(
    () =>
      xpBreakdown({
        checkins: store.checkins,
        weights: weightStore.logs,
        mounjaro: mounjaroStore.logs,
        lifeEvents: eventStore.events,
        questLog: questStore.log,
      }),
    [store.checkins, weightStore.logs, mounjaroStore.logs, eventStore.events, questStore.log],
  )
  const level = levelFromXp(xp.total)

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

      {settingsOpen ? (
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
              onSaved={() => {
                setToast({ title: 'Save Complete!', detail: '오늘의 기록이 저장됐어요.' })
                setTab('home')
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
              devAction={<DevTools onChanged={() => void store.refresh()} />}
            />
          )}
        </>
      )}

      {toast && (
        <PixelToast title={toast.title} detail={toast.detail} onDone={() => setToast(null)} />
      )}
    </AppShell>
  )
}
