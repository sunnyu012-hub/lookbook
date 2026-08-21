import { useCallback, useState } from 'react'
import type { Quest, QuestDraft, Routine } from '@/types'
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
  const {
    ready,
    state,
    addQuest,
    completeQuest,
    deleteQuest,
    renameUser,
    toggleRoutinePause,
    deleteRoutine,
  } = useGameState()
  const feedback = useFeedback()

  const [tab, setTab] = useState<TabKey>('home')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Quest | null>(null)
  const [pendingRoutineDelete, setPendingRoutineDelete] = useState<Routine | null>(null)

  const handleComplete = useCallback(
    (id: string) => {
      const result = completeQuest(id)
      if (result) feedback.celebrate(result)
    },
    [completeQuest, feedback],
  )

  const handleCreate = useCallback(
    (draft: QuestDraft) => {
      const created = addQuest(draft)
      // 오늘 해당하지 않는 요일이면 오늘 퀘스트는 안 생긴다. 그걸 그대로 말해준다.
      feedback.notify(created ? 'Quest added ✦' : '반복만 저장했어 · 해당 요일에 생겨')
    },
    [addQuest, feedback],
  )

  const confirmDelete = useCallback(() => {
    if (pendingDelete) deleteQuest(pendingDelete.id)
    setPendingDelete(null)
  }, [pendingDelete, deleteQuest])

  const confirmRoutineDelete = useCallback(() => {
    if (pendingRoutineDelete) deleteRoutine(pendingRoutineDelete.id)
    setPendingRoutineDelete(null)
  }, [pendingRoutineDelete, deleteRoutine])

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
            routines={state.routines}
            onComplete={handleComplete}
            onRequestDelete={setPendingDelete}
            onAddQuest={() => setSheetOpen(true)}
            onToggleRoutinePause={toggleRoutinePause}
            onRequestDeleteRoutine={setPendingRoutineDelete}
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

      <ConfirmDialog
        open={pendingRoutineDelete !== null}
        title="이 반복을 그만둘까?"
        description="오늘 이미 만들어진 퀘스트는 그대로 남아 있어."
        confirmLabel="Delete"
        onConfirm={confirmRoutineDelete}
        onCancel={() => setPendingRoutineDelete(null)}
      />

      <LevelUpOverlay level={feedback.levelUp} />
      <Toast message={feedback.toast} />
    </>
  )
}
