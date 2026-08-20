import { useMemo, useState } from 'react'
import type { Quest } from '@/types'
import { FullQuestCard } from '@/components/quest/FullQuestCard'
import { CategoryFilter, type CategoryFilterValue } from '@/components/quest/CategoryFilter'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CountPill, ScreenHeader, SectionHeader } from '@/components/layout/ScreenHeader'
import { UI } from '@/lib/assets'
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
      <ScreenHeader
        title="QUEST"
        trailing={
          <span className="inline-flex items-center gap-1 rounded-pill bg-surface px-3 py-1.5 ring-1 ring-line">
            <img src={UI.check} alt="" aria-hidden className="h-4 w-4 object-contain" />
            <span className="font-game text-[12px] leading-none text-inkdim">
              {doneToday} / {today.length}
            </span>
          </span>
        }
      />

      <CategoryFilter value={filter} onChange={setFilter} />

      {nothingInFilter ? (
        <div className="mt-5">
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
        <div className="mt-5 space-y-6">
          {active.length > 0 && (
            <section>
              <SectionHeader
                title="Active"
                trailing={<CountPill value={active.length} />}
              />
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
              <SectionHeader
                title="Completed"
                trailing={<CountPill value={completed.length} tone="leaf" />}
              />
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

      <Button variant="soft" size="md" className="mt-6 w-full" onClick={onAddQuest}>
        <span className="text-[17px] leading-none">+</span> Add Quest
      </Button>
    </div>
  )
}
