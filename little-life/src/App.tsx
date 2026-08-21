import { useCallback, useState } from 'react'
import type { Quest, QuestDraft } from '@/types'
import { AppShell } from '@/components/layout/AppShell'
import { BottomNavigation, type TabKey } from '@/components/navigation/BottomNavigation'
import { QuestCreationSheet } from '@/components/quest/QuestCreationSheet'
import { LevelUpOverlay } from '@/components/feedback/LevelUpOverlay'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Toast } from '@/components/ui/Toast'
import { useGameState } from '@/hooks/useGameState'
import { useFeedback } from '@/hooks/useFeedback'
import { HomeScreen } from '@/screens/HomeScreen'
import { QuestScreen } from '@/screens/QuestScreen'
import { MeScreen } from '@/screens/MeScreen'

export default function App() {
  const { ready, state, addQuest, completeQuest, deleteQuest, renameUser } = useGameState()
  const feedback = useFeedback()

  const [tab, setTab] = useState<TabKey>('home')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Quest | null>(null)

  const handleComplete = useCallback(
    (id: string) => {
      const result = completeQuest(id)
      if (result) feedback.celebrate(result)
    },
    [completeQuest, feedback],
  )

  const handleCreate = useCallback(
    (draft: QuestDraft) => {
      addQuest(draft)
      feedback.notify('Quest added ✦')
    },
    [addQuest, feedback],
  )

  const confirmDelete = useCallback(() => {
    if (pendingDelete) deleteQuest(pendingDelete.id)
    setPendingDelete(null)
  }, [pendingDelete, deleteQuest])

  // 저장된 데이터를 읽기 전에 LV.1 을 잠깐 보여주면 깜빡이는 것처럼 보인다.
  if (!ready) {
    return <div className="min-h-[100dvh] bg-canvas" />
  }

  return (
    <>
      <AppShell tabBar={<BottomNavigation active={tab} onChange={setTab} />}>
        {tab === 'home' && (
          <HomeScreen
            state={state}
            mood={feedback.mood}
            expToasts={feedback.expToasts}
            onComplete={handleComplete}
            onAddQuest={() => setSheetOpen(true)}
            onSeeAll={() => setTab('quest')}
          />
        )}
        {tab === 'quest' && (
          <QuestScreen
            quests={state.quests}
            onComplete={handleComplete}
            onRequestDelete={setPendingDelete}
            onAddQuest={() => setSheetOpen(true)}
          />
        )}
        {tab === 'me' && <MeScreen state={state} onRename={renameUser} />}
      </AppShell>

      <QuestCreationSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCreate={handleCreate}
        history={state.quests}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="이 퀘스트를 지울까?"
        description="이미 받은 EXP 는 그대로 남아 있어."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <LevelUpOverlay level={feedback.levelUp} />
      <Toast message={feedback.toast} />
    </>
  )
}
