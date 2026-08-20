import { useCallback, useState } from 'react'
import type { QuestDraft } from '@/types'
import { AppShell } from '@/components/layout/AppShell'
import { TabBar, type TabKey } from '@/components/layout/TabBar'
import { AddQuestSheet } from '@/components/quest/AddQuestSheet'
import { LevelUpOverlay } from '@/components/feedback/LevelUpOverlay'
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
    },
    [addQuest],
  )

  // 저장된 데이터를 읽기 전에 LV.1 을 잠깐 보여주면 깜빡이는 것처럼 보인다.
  if (!ready) {
    return <div className="min-h-[100dvh] bg-ivory" />
  }

  return (
    <>
      <AppShell tabBar={<TabBar active={tab} onChange={setTab} />}>
        {tab === 'home' && (
          <HomeScreen
            user={state.user}
            quests={state.quests}
            expToasts={feedback.expToasts}
            onComplete={handleComplete}
            onAddQuest={() => setSheetOpen(true)}
          />
        )}
        {tab === 'quest' && (
          <QuestScreen
            quests={state.quests}
            onComplete={handleComplete}
            onDelete={deleteQuest}
            onAddQuest={() => setSheetOpen(true)}
          />
        )}
        {tab === 'me' && <MeScreen user={state.user} quests={state.quests} onRename={renameUser} />}
      </AppShell>

      <AddQuestSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onCreate={handleCreate} />
      <LevelUpOverlay level={feedback.levelUp} />
    </>
  )
}
