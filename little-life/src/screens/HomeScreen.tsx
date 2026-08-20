import { useMemo } from 'react'
import type { Quest, User } from '@/types'
import { CharacterStage } from '@/components/character/CharacterStage'
import { LevelMeter } from '@/components/character/LevelMeter'
import { ExpToastLayer } from '@/components/feedback/ExpToastLayer'
import { QuestCard } from '@/components/quest/QuestCard'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { GREETING, daypart } from '@/lib/date'
import { isTodayQuest, sortQuests } from '@/lib/stats'
import type { ExpToast } from '@/hooks/useFeedback'

interface HomeScreenProps {
  user: User
  quests: Quest[]
  expToasts: ExpToast[]
  onComplete: (id: string) => void
  onAddQuest: () => void
}

const HOME_QUEST_LIMIT = 5

export function HomeScreen({ user, quests, expToasts, onComplete, onAddQuest }: HomeScreenProps) {
  const greeting = GREETING[daypart()]

  const todayOpen = useMemo(() => {
    const open = quests.filter((q) => !q.completed && isTodayQuest(q))
    return sortQuests(open).slice(0, HOME_QUEST_LIMIT)
  }, [quests])

  const remaining = quests.filter((q) => !q.completed && isTodayQuest(q)).length

  // 방금 EXP 를 받았으면 잠깐 신나 있는 표정을 짓는다.
  const mood = expToasts.length > 0 ? 'cheer' : remaining === 0 ? 'happy' : 'idle'

  return (
    <div className="animate-risein">
      <header>
        <p className="text-[13px] text-inkdim">{greeting}</p>
        <h1 className="mt-0.5 text-[26px] font-semibold tracking-[-0.01em] text-ink">{user.name}</h1>
      </header>

      <section className="mt-2">
        <CharacterStage mood={mood} overlay={<ExpToastLayer toasts={expToasts} />} />
        <LevelMeter user={user} />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-game text-[12px] tracking-[0.18em] text-inkdim">TODAY&apos;S QUEST</h2>
          {remaining > HOME_QUEST_LIMIT && (
            <span className="text-[12px] text-inkfaint">+{remaining - HOME_QUEST_LIMIT} more</span>
          )}
        </div>

        {todayOpen.length === 0 ? (
          <EmptyState
            title={
              quests.length === 0 ? '아직 퀘스트가 없어요' : '오늘 할 일을 다 마쳤어요'
            }
            hint={quests.length === 0 ? '작은 것부터 하나 만들어볼까요?' : '쉬어도 좋고, 하나 더 해도 좋아요'}
          />
        ) : (
          <ul className="space-y-2.5">
            {todayOpen.map((quest) => (
              <li key={quest.id}>
                <QuestCard quest={quest} onComplete={onComplete} />
              </li>
            ))}
          </ul>
        )}

        <Button size="lg" className="mt-5 w-full" onClick={onAddQuest}>
          <span className="text-lg leading-none">+</span> ADD QUEST
        </Button>
      </section>
    </div>
  )
}
