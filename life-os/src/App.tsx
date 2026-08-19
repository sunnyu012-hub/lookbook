import { useCallback, useState } from 'react'
import type { TabKey } from '@/types'
import { AppShell } from '@/components/layout/AppShell'
import { DevTools } from '@/components/DevTools'
import { Toast } from '@/components/ui/Toast'
import { CheckinPage } from '@/pages/CheckinPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { InsightsPage } from '@/pages/InsightsPage'
import { TodayPage } from '@/pages/TodayPage'
import { useCheckins } from '@/hooks/useCheckins'
import { todayKey } from '@/lib/date'
import { storageMode } from '@/lib/repository'

export default function App() {
  const [tab, setTab] = useState<TabKey>('today')
  const [editingDate, setEditingDate] = useState<string>(todayKey())
  const [toast, setToast] = useState<string | null>(null)
  const store = useCheckins()

  const openCheckin = useCallback((date: string = todayKey()) => {
    setEditingDate(date)
    setTab('checkin')
  }, [])

  const handleTab = (next: TabKey) => {
    if (next === 'checkin') setEditingDate(todayKey())
    setTab(next)
  }

  const existing = store.byDate.get(editingDate) ?? null

  return (
    <AppShell active={tab} onTabChange={handleTab}>
      {storageMode === 'local' && (
        <p className="label mb-4 text-right">LOCAL STORAGE MODE</p>
      )}

      {store.error && (
        <p className="mb-4 rounded-2xl border border-recovery/40 bg-recovery/10 px-4 py-3 text-[13px] text-recovery">
          {store.error}
        </p>
      )}

      {tab === 'today' && (
        <TodayPage
          today={store.today}
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
            setToast('기록했어요.')
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
            setToast('기록을 지웠어요.')
          }}
        />
      )}

      {tab === 'insights' && (
        <InsightsPage
          checkins={store.checkins}
          onStartCheckin={() => openCheckin(todayKey())}
          devAction={<DevTools onChanged={() => void store.refresh()} />}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </AppShell>
  )
}
