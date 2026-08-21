import { useMemo, useState } from 'react'
import type { Battle, BattleDef, BattleKind, Quest, Routine } from '@/types'
import { FullQuestCard } from '@/components/quest/FullQuestCard'
import { RoutineList } from '@/components/quest/RoutineList'
import { CategoryFilter, type CategoryFilterValue } from '@/components/quest/CategoryFilter'
import { QuestModeTabs, type QuestMode } from '@/components/quest/QuestModeTabs'
import { BattleCard, BattleDefCard } from '@/components/rpg/BattleCard'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CountPill, ScreenHeader, SectionHeader } from '@/components/layout/ScreenHeader'
import { BOSSES, MONSTERS } from '@/lib/rpg/content'
import { CHARACTER_FACE, UI } from '@/lib/assets'
import {
  filterByCategory,
  isTodayQuest,
  sortByNewest,
  sortByRecentlyCompleted,
} from '@/lib/stats'

interface QuestScreenProps {
  quests: Quest[]
  routines: Routine[]
  battles: Battle[]
  onComplete: (id: string) => void
  onRequestDelete: (quest: Quest) => void
  onEdit: (quest: Quest) => void
  onSnooze: (id: string) => void
  onUncomplete: (id: string) => void
  onAddQuest: () => void
  onToggleRoutinePause: (id: string) => void
  onRequestDeleteRoutine: (routine: Routine) => void
  onStartBattle: (def: BattleDef) => void
  onOpenBattle: (battle: Battle) => void
}

export function QuestScreen({
  quests,
  routines,
  battles,
  onComplete,
  onRequestDelete,
  onEdit,
  onSnooze,
  onUncomplete,
  onAddQuest,
  onToggleRoutinePause,
  onRequestDeleteRoutine,
  onStartBattle,
  onOpenBattle,
}: QuestScreenProps) {
  const [mode, setMode] = useState<QuestMode>('DAILY')
  const [filter, setFilter] = useState<CategoryFilterValue>('ALL')

  const today = useMemo(() => quests.filter((q) => isTodayQuest(q)), [quests])
  // 진행률은 필터와 무관하게 오늘 전체를 기준으로 센다.
  const doneToday = today.filter((q) => q.completed).length

  const activeCounts = useMemo(
    () => ({
      MONSTER: battles.filter((b) => b.kind === 'MONSTER' && b.status === 'ACTIVE').length,
      BOSS: battles.filter((b) => b.kind === 'BOSS' && b.status === 'ACTIVE').length,
    }),
    [battles],
  )

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

      <QuestModeTabs value={mode} onChange={setMode} activeCounts={activeCounts} />

      {mode === 'DAILY' ? (
        <DailySection
          today={today}
          routines={routines}
          filter={filter}
          onFilterChange={setFilter}
          onComplete={onComplete}
          onRequestDelete={onRequestDelete}
          onEdit={onEdit}
          onSnooze={onSnooze}
          onUncomplete={onUncomplete}
          onAddQuest={onAddQuest}
          onToggleRoutinePause={onToggleRoutinePause}
          onRequestDeleteRoutine={onRequestDeleteRoutine}
        />
      ) : (
        <BattleSection
          kind={mode === 'MONSTER' ? 'MONSTER' : 'BOSS'}
          battles={battles}
          defs={mode === 'MONSTER' ? MONSTERS : BOSSES}
          onStart={onStartBattle}
          onOpen={onOpenBattle}
        />
      )}
    </div>
  )
}

interface DailySectionProps {
  today: Quest[]
  routines: Routine[]
  filter: CategoryFilterValue
  onFilterChange: (value: CategoryFilterValue) => void
  onComplete: (id: string) => void
  onRequestDelete: (quest: Quest) => void
  onEdit: (quest: Quest) => void
  onSnooze: (id: string) => void
  onUncomplete: (id: string) => void
  onAddQuest: () => void
  onToggleRoutinePause: (id: string) => void
  onRequestDeleteRoutine: (routine: Routine) => void
}

function DailySection({
  today,
  routines,
  filter,
  onFilterChange,
  onComplete,
  onRequestDelete,
  onEdit,
  onSnooze,
  onUncomplete,
  onAddQuest,
  onToggleRoutinePause,
  onRequestDeleteRoutine,
}: DailySectionProps) {
  // 필터는 Active / Completed 양쪽에 똑같이 적용한다.
  const visible = useMemo(() => filterByCategory(today, filter), [today, filter])
  const active = useMemo(() => sortByNewest(visible.filter((q) => !q.completed)), [visible])
  const completed = useMemo(
    () => sortByRecentlyCompleted(visible.filter((q) => q.completed)),
    [visible],
  )

  const nothingInFilter = active.length === 0 && completed.length === 0

  return (
    <>
      <CategoryFilter value={filter} onChange={onFilterChange} />

      {nothingInFilter ? (
        <div className="mt-5">
          <EmptyState
            face={filter === 'ALL' ? CHARACTER_FACE.happy : CHARACTER_FACE.surprised}
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
              <SectionHeader title="Active" trailing={<CountPill value={active.length} />} />
              <ul className="space-y-2.5">
                {active.map((quest) => (
                  <li key={quest.id}>
                    <FullQuestCard
                      quest={quest}
                      onComplete={onComplete}
                      onRequestDelete={onRequestDelete}
                      onEdit={onEdit}
                      onSnooze={onSnooze}
                      onUncomplete={onUncomplete}
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
                      onEdit={onEdit}
                      onSnooze={onSnooze}
                      onUncomplete={onUncomplete}
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

      <RoutineList
        routines={routines}
        onTogglePause={onToggleRoutinePause}
        onDelete={onRequestDeleteRoutine}
      />
    </>
  )
}

interface BattleSectionProps {
  kind: BattleKind
  battles: Battle[]
  defs: BattleDef[]
  onStart: (def: BattleDef) => void
  onOpen: (battle: Battle) => void
}

/**
 * 미뤄둔 일(Monster)과 큰 목표(Boss).
 *
 * 진행 중인 것을 위에, 아직 시작하지 않은 것을 아래에 둔다.
 * 시작은 언제나 사용자가 직접 누를 때만 일어난다 — 저절로 생겨서 쌓이면 그것도 잔소리다.
 */
function BattleSection({ kind, battles, defs, onStart, onOpen }: BattleSectionProps) {
  const mine = useMemo(() => battles.filter((b) => b.kind === kind), [battles, kind])
  const active = mine.filter((b) => b.status === 'ACTIVE')
  const cleared = mine.filter((b) => b.status === 'CLEARED')
  const startedDefIds = new Set(active.map((b) => b.defId))
  const available = defs.filter((d) => !startedDefIds.has(d.id))

  const isBoss = kind === 'BOSS'

  return (
    <div className="mt-1 space-y-6">
      {active.length > 0 && (
        <section>
          <SectionHeader title="In progress" trailing={<CountPill value={active.length} />} />
          <ul className="space-y-2.5">
            {active.map((battle) => (
              <li key={battle.id}>
                <BattleCard battle={battle} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {active.length === 0 && (
        <EmptyState
          face={CHARACTER_FACE.idle}
          title={isBoss ? '지금 붙잡고 있는 큰 일은 없어.' : '지금 쫓고 있는 건 없어.'}
          hint={
            isBoss
              ? '언젠가 해야지 싶은 게 있으면 아래에서 하나 골라봐.'
              : '미뤄둔 일이 떠오르면 아래에서 하나 골라도 좋아.'
          }
        />
      )}

      {available.length > 0 && (
        <section>
          <SectionHeader title={isBoss ? '만날 수 있는 보스' : '동네에 있는 몬스터'} />
          <ul className="space-y-2.5">
            {available.map((def) => (
              <li key={def.id}>
                <BattleDefCard def={def} onStart={onStart} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {cleared.length > 0 && (
        <section>
          <SectionHeader
            title="Cleared"
            trailing={<CountPill value={cleared.length} tone="leaf" />}
          />
          <ul className="space-y-2">
            {cleared.map((battle) => (
              <li key={battle.id}>
                <BattleCard battle={battle} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
