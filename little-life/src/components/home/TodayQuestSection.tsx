import type { Quest } from '@/types'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CompactQuestCard } from './CompactQuestCard'

interface TodayQuestSectionProps {
  quests: Quest[]
  onComplete: (id: string) => void
  onSeeAll: () => void
  onCreate: () => void
}

const LIMIT = 5

export function TodayQuestSection({
  quests,
  onComplete,
  onSeeAll,
  onCreate,
}: TodayQuestSectionProps) {
  const shown = quests.slice(0, LIMIT)

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[16px] font-semibold text-ink">Today&apos;s Quest</h2>
        {quests.length > 0 && (
          <button
            type="button"
            onClick={onSeeAll}
            className="-mr-1 py-1 pl-3 pr-1 text-[13px] text-inkdim active:scale-95"
          >
            See all
          </button>
        )}
      </div>

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
