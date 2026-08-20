import { useMemo, useState } from 'react'
import type { Category, Quest } from '@/types'
import { CATEGORIES } from '@/types'
import { QuestCard } from '@/components/quest/QuestCard'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { isTodayQuest, sortQuests } from '@/lib/stats'

interface QuestScreenProps {
  quests: Quest[]
  onComplete: (id: string) => void
  onDelete: (id: string) => void
  onAddQuest: () => void
}

type Filter = 'ALL' | Category

const FILTERS: Filter[] = ['ALL', ...CATEGORIES]

export function QuestScreen({ quests, onComplete, onDelete, onAddQuest }: QuestScreenProps) {
  const [filter, setFilter] = useState<Filter>('ALL')

  const today = useMemo(() => sortQuests(quests.filter((q) => isTodayQuest(q))), [quests])
  const visible = useMemo(
    () => (filter === 'ALL' ? today : today.filter((q) => q.category === filter)),
    [today, filter],
  )

  const done = today.filter((q) => q.completed).length
  const total = today.length

  return (
    <div className="animate-risein">
      <header>
        <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-ink">Today</h1>
        <div className="mt-3 flex items-center gap-3">
          <ProgressBar
            value={total === 0 ? 0 : done / total}
            thickness="sm"
            barClassName="bg-sage-deep"
            className="flex-1"
          />
          <span className="font-game text-[12px] tracking-[0.06em] text-inkdim">
            {done} / {total}
          </span>
        </div>
      </header>

      {/* 필터 — 가로로 넘치면 스크롤된다 */}
      <div className="-mx-5 mt-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2">
          {FILTERS.map((f) => (
            <Chip key={f} active={f === filter} onClick={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
        </div>
      </div>

      <section className="mt-5">
        {visible.length === 0 ? (
          <EmptyState
            title={filter === 'ALL' ? '오늘의 퀘스트가 비어 있어요' : `${filter} 퀘스트가 없어요`}
            hint="하나 만들어두면 캐릭터가 기다릴게요"
          />
        ) : (
          <ul className="space-y-2.5">
            {visible.map((quest) => (
              <li key={quest.id}>
                <QuestCard quest={quest} onComplete={onComplete} onDelete={onDelete} />
              </li>
            ))}
          </ul>
        )}

        <Button size="lg" variant="soft" className="mt-5 w-full" onClick={onAddQuest}>
          <span className="text-lg leading-none">+</span> ADD QUEST
        </Button>
      </section>
    </div>
  )
}
