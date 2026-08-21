import { useMemo } from 'react'
import type { AppState } from '@/types'
import { CharacterRoomCard } from '@/components/character/CharacterRoomCard'
import { ExpToastLayer } from '@/components/feedback/ExpToastLayer'
import { GreetingHeader } from '@/components/home/GreetingHeader'
import { TodayQuestSection } from '@/components/home/TodayQuestSection'
import { DailySummary } from '@/components/home/DailySummary'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Button } from '@/components/ui/Button'
import { isTodayQuest, sortByNewest, todaySummary } from '@/lib/stats'
import { EFFECT } from '@/lib/assets'
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

  // 오늘 할 게 남지 않았으면 빈백에 앉아 쉰다.
  // 연출이 도는 동안에는 그쪽 포즈가 이긴다.
  const restingMood: CharacterMood = openQuests.length === 0 ? 'resting' : 'idle'
  const shownMood: CharacterMood = mood === 'idle' ? restingMood : mood

  return (
    <div className="animate-risein space-y-4">
      <ScreenHeader
        title="HOME"
        trailing={
          <span className="inline-flex items-center gap-1 rounded-pill bg-surface px-3 py-1.5 ring-1 ring-line">
            <img src={EFFECT.star} alt="" aria-hidden className="h-4 w-4 object-contain" />
            <span className="font-game text-[12px] leading-none text-inkdim">
              {state.user.totalExp.toLocaleString('ko-KR')}
            </span>
          </span>
        }
      />

      <GreetingHeader name={state.user.name} />

      <CharacterRoomCard
        user={state.user}
        mood={shownMood}
        overlay={<ExpToastLayer toasts={expToasts} />}
      />

      <TodayQuestSection
        quests={openQuests}
        doneToday={summary.completed}
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
