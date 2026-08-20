import { useMemo, useState } from 'react'
import type { Quest } from '@/types'
import { FullQuestCard } from '@/components/quest/FullQuestCard'
import {
  CategoryFilter,
  type CategoryFilterValue,
} from '@/components/quest/CategoryFilter'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  filterByCategory,
  isTodayQuest,
  sortByNewest,
  sortByRecentlyCompleted,
} from '@/lib/stats'

interface QuestScreenProps {
  quests: Quest[]
  onComplete: (id: string) => void
  onRequestDelete: (quest: Quest) => void
  onAddQuest: () => void
}

export function QuestScreen({
  quests,
  onComplete,
  onRequestDelete,
  onAddQuest,
}: QuestScreenProps) {
  const [filter, setFilter] = useState<CategoryFilterValue>('ALL')

  const today = useMemo(() => quests.filter((q) => isTodayQuest(q)), [quests])
  // 진행률은 필터와 무관하게 오늘 전체를 기준으로 센다.
  const doneToday = today.filter((q) => q.completed).length

  // 필터는 Active / Completed 양쪽에 똑같이 적용한다.
  const visible = useMemo(() => filterByCategory(today, filter), [today, filter])
  const active = useMemo(() => sortByNewest(visible.filter((q) => !q.completed)), [visible])
  const completed = useMemo(
    () => sortByRecentlyCompleted(visible.filter((q) => q.completed)),
    [visible],
  )

  const nothingInFilter = active.length === 0 && completed.length === 0

  return (
    <div className="animate-risein">
      <header>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-ink">Quest Log</h1>
        <p className="mt-1 text-[13px] text-inkdim">
          {today.length === 0
            ? '오늘 만들어둔 퀘스트가 아직 없어.'
            : `${doneToday} of ${today.length} completed today`}
        </p>
      </header>

      <div className="mt-5">
        <CategoryFilter value={filter} onChange={setFilter} />
      </div>

      {nothingInFilter ? (
        <div className="mt-6">
          <EmptyState
            title={filter === 'ALL' ? '지금은 남은 퀘스트가 없어.' : '여긴 아직 비어 있어.'}
            hint={
              filter === 'ALL'
                ? '필요할 때 언제든 새로 만들면 돼.'
                : '이 분야의 퀘스트를 하나 만들어봐도 좋아.'
            }
            action={
              <Button size="sm" onClick={onAddQuest}>
                Create Quest
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-7">
          {active.length > 0 && (
            <section>
              <SectionTitle label="Active" count={active.length} />
              <ul className="space-y-2.5">
                {active.map((quest) => (
                  <li key={quest.id}>
                    <FullQuestCard
                      quest={quest}
                      onComplete={onComplete}
                      onRequestDelete={onRequestDelete}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <SectionTitle label="Completed" count={completed.length} />
              <ul className="space-y-2">
                {completed.map((quest) => (
                  <li key={quest.id}>
                    <FullQuestCard
                      quest={quest}
                      onComplete={onComplete}
                      onRequestDelete={onRequestDelete}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <Button variant="soft" size="md" className="mt-7 w-full" onClick={onAddQuest}>
        <span className="text-[17px] leading-none">+</span> Add Quest
      </Button>
    </div>
  )
}

function SectionTitle({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-3 flex items-baseline gap-2">
      <h2 className="text-[15px] font-semibold text-ink">{label}</h2>
      <span className="font-game text-[11px] tracking-[0.06em] text-inkfaint">{count}</span>
    </div>
  )
}
