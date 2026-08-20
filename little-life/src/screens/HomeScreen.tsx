import { useMemo } from 'react'
import type { AppState } from '@/types'
import { CharacterRoomCard } from '@/components/character/CharacterRoomCard'
import { ExpToastLayer } from '@/components/feedback/ExpToastLayer'
import { GreetingHeader } from '@/components/home/GreetingHeader'
import { TodayQuestSection } from '@/components/home/TodayQuestSection'
import { DailySummary } from '@/components/home/DailySummary'
import { Button } from '@/components/ui/Button'
import { isTodayQuest, sortByNewest, todaySummary } from '@/lib/stats'
import type { ExpToast } from '@/hooks/useFeedback'
import type { CharacterMood } from '@/components/character/types'

interface HomeScreenProps {
  state: AppState
  mood: CharacterMood
  expToasts: ExpToast[]
  onComplete: (id: string) => void
  onAddQuest: () => void
  onSeeAll: () => void
}

export function HomeScreen({
  state,
  mood,
  expToasts,
  onComplete,
  onAddQuest,
  onSeeAll,
}: HomeScreenProps) {
  const openQuests = useMemo(
    () => sortByNewest(state.quests.filter((q) => !q.completed && isTodayQuest(q))),
    [state.quests],
  )
  const summary = useMemo(() => todaySummary(state.dailyLog), [state.dailyLog])

  return (
    <div className="animate-risein space-y-6">
      <GreetingHeader name={state.user.name} />

      <CharacterRoomCard
        user={state.user}
        mood={mood}
        overlay={<ExpToastLayer toasts={expToasts} />}
      />

      <TodayQuestSection
        quests={openQuests}
        onComplete={onComplete}
        onSeeAll={onSeeAll}
        onCreate={onAddQuest}
      />

      {openQuests.length > 0 && (
        <Button variant="soft" size="md" className="w-full" onClick={onAddQuest}>
          <span className="text-[17px] leading-none">+</span> Add Quest
        </Button>
      )}

      <DailySummary completed={summary.completed} earnedExp={summary.earnedExp} />
    </div>
  )
}
