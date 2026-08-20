import type { Quest } from '@/types'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionHeader } from '@/components/layout/ScreenHeader'
import { CompactQuestCard } from './CompactQuestCard'

interface TodayQuestSectionProps {
  quests: Quest[]
  doneToday: number
  onComplete: (id: string) => void
  onSeeAll: () => void
  onCreate: () => void
}

const LIMIT = 5

export function TodayQuestSection({
  quests,
  doneToday,
  onComplete,
  onSeeAll,
  onCreate,
}: TodayQuestSectionProps) {
  const shown = quests.slice(0, LIMIT)
  const total = quests.length + doneToday

  return (
    <section>
      <SectionHeader
        title="Today's Quest"
        trailing={
          quests.length > 0 ? (
            <button
              type="button"
              onClick={onSeeAll}
              className="-mr-1 flex items-center gap-1 py-1 pl-3 pr-1 text-[12.5px] text-inkdim active:scale-95"
            >
              <span className="font-game text-[11px]">
                {doneToday}/{total}
              </span>
              <span>See all</span>
            </button>
          ) : null
        }
      />

      {shown.length === 0 ? (
        <EmptyState
          title="오늘은 조용한 하루네."
          hint="하고 싶은 게 생기면 작은 퀘스트 하나만 만들어봐."
          action={
            <Button size="sm" onClick={onCreate}>
              Create Quest
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {shown.map((quest) => (
            <li key={quest.id}>
              <CompactQuestCard quest={quest} onComplete={onComplete} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
