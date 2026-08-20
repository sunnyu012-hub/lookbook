import { useCallback, useState } from 'react'
import type { TabKey } from '@/types'
import { AppShell } from '@/components/layout/AppShell'
import { AuthGate } from '@/components/AuthGate'
import { DevTools } from '@/components/DevTools'
import { PixelToast } from '@/components/pixel/PixelToast'
import { CheckinPage } from '@/pages/CheckinPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { InsightsPage } from '@/pages/InsightsPage'
import { TodayPage } from '@/pages/TodayPage'
import { useCheckins } from '@/hooks/useCheckins'
import { useSession } from '@/hooks/useSession'
import { PixelImage } from '@/components/pixel/PixelImage'
import { characters } from '@/lib/pixelAssets'
import { todayKey } from '@/lib/date'
import { storageMode } from '@/lib/repository'

interface ToastState {
  title: string
  detail?: string
}

export default function App() {
  const [tab, setTab] = useState<TabKey>('today')
  const [editingDate, setEditingDate] = useState<string>(todayKey())
  const [toast, setToast] = useState<ToastState | null>(null)
  const auth = useSession()
  const store = useCheckins(auth.state)

  const openCheckin = useCallback((date: string = todayKey()) => {
    setEditingDate(date)
    setTab('checkin')
  }, [])

  const handleTab = (next: TabKey) => {
    if (next === 'checkin') setEditingDate(todayKey())
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

  return (
    <AppShell active={tab} onTabChange={handleTab}>
      {storageMode === 'local' && <p className="plabel mb-3 text-right">Local Save</p>}

      {store.error && (
        <p className="mb-3 rounded-px3 border-[1.5px] border-pinkdeep bg-pinksoft px-3 py-2 text-[12px]">
          {store.error}
        </p>
      )}

      {tab === 'today' && (
        <TodayPage
          today={store.today}
          dayNumber={dayNumber}
          loading={store.loading}
          onStartCheckin={() => openCheckin(todayKey())}
        />
      )}

      {tab === 'checkin' && (
        <CheckinPage
          date={editingDate}
          existing={existing}
          onSave={store.save}
          onSaved={() => {
            setToast({ title: 'Save Complete!', detail: '오늘의 기록이 저장됐어요.' })
            setTab('today')
          }}
        />
      )}

      {tab === 'history' && (
        <HistoryPage
          checkins={store.checkins}
          byDate={store.byDate}
          onEdit={openCheckin}
          onDelete={async (date) => {
            await store.remove(date)
            setToast({ title: 'Deleted', detail: '기록을 지웠어요.' })
          }}
        />
      )}

      {tab === 'insights' && (
        <InsightsPage
          checkins={store.checkins}
          onStartCheckin={() => openCheckin(todayKey())}
          devAction={<DevTools onChanged={() => void store.refresh()} />}
          account={auth.email}
          onSignOut={() => void auth.signOut()}
        />
      )}

      {toast && (
        <PixelToast title={toast.title} detail={toast.detail} onDone={() => setToast(null)} />
      )}
    </AppShell>
  )
}
