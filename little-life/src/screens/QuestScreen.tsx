import { useMemo, useState } from 'react'
import type { Battle, BattleDef, BattleKind, Quest, Routine } from '@/types'
import { FullQuestCard } from '@/components/quest/FullQuestCard'
import { RoutineList } from '@/components/quest/RoutineList'
import { CategoryFilter, type CategoryFilterValue } from '@/components/quest/CategoryFilter'
import { QuestModeTabs, type QuestMode } from '@/components/quest/QuestModeTabs'
import { BattleCard, BattleDefCard } from '@/components/rpg/BattleCard'
import { BattleLibrarySheet } from '@/components/rpg/BattleLibrarySheet'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { CountPill, ScreenHeader, SectionHeader } from '@/components/layout/ScreenHeader'
import { BOSSES, MONSTERS } from '@/lib/rpg/content'
import { startableDefs, todaysLineup } from '@/lib/rpg/lineup'
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
        title="퀘스트"
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
                퀘스트 만들기
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-5 space-y-6">
          {active.length > 0 && (
            <section>
              <SectionHeader title="진행 중" trailing={<CountPill value={active.length} />} />
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
                title="끝낸 것"
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
        <span className="text-[17px] leading-none">+</span> 퀘스트 추가
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
 * 진행 중인 것을 위에, 지금 하기 좋은 것 몇 개를 그 아래에 둔다.
 * 나머지는 "다른 몬스터 보기" 안에 전부 있다 — 몬스터가 23종이 되면서
 * 전부 펼치면 스무 장이 이어졌고, 그 길이 자체가 고르는 걸 미루게 만들었다.
 *
 * 앞에 몇 개만 보인다고 나머지를 못 하는 게 아니다. 하루 제한도, 재추첨도 없다.
 * 시작은 언제나 사용자가 직접 누를 때만 일어난다 — 저절로 생겨서 쌓이면 그것도 잔소리다.
 *
 * 진행 중인 개수는 막지 않는다. 생활의 여러 갈래를 조금씩 밀어두는 게
 * 이 화면이 원래 하려던 일이다.
 */
function BattleSection({ kind, battles, defs, onStart, onOpen }: BattleSectionProps) {
  const [libraryOpen, setLibraryOpen] = useState(false)

  const mine = useMemo(() => battles.filter((b) => b.kind === kind), [battles, kind])
  const active = useMemo(() => mine.filter((b) => b.status === 'ACTIVE'), [mine])
  const cleared = useMemo(() => mine.filter((b) => b.status === 'CLEARED'), [mine])

  const lineup = useMemo(() => todaysLineup(defs, battles, kind), [defs, battles, kind])
  // 전체 보기에 실제로 뭐가 남아 있는지 — 하나도 없으면 진입점을 만들지 않는다
  const startable = useMemo(() => startableDefs(defs, battles), [defs, battles])

  const isBoss = kind === 'BOSS'

  return (
    <div className="mt-1 space-y-6">
      {active.length > 0 ? (
        <section>
          <SectionHeader title="진행 중" trailing={<CountPill value={active.length} />} />
          <ul className="space-y-2.5">
            {active.map((battle) => (
              <li key={battle.id}>
                <BattleCard battle={battle} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
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

      {lineup.length > 0 && (
        <section>
          <SectionHeader title={isBoss ? '지금 만날 수 있는 보스' : '지금 하기 좋은 몬스터'} />
          <ul className="space-y-2.5">
            {lineup.map((def) => (
              <li key={def.id}>
                <BattleDefCard def={def} onStart={onStart} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {startable.length > 0 && (
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="flex w-full items-center justify-center gap-1 rounded-btn py-2.5 text-[13px] font-medium text-inkdim active:scale-[0.98]"
        >
          {isBoss ? '다른 보스 보기' : '다른 몬스터 보기'}
          <span className="text-[12px] leading-none text-inkfaint">›</span>
        </button>
      )}

      {cleared.length > 0 && (
        <section>
          <SectionHeader
            title="끝낸 것"
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

      <BattleLibrarySheet
        open={libraryOpen}
        kind={kind}
        defs={defs}
        battles={battles}
        onClose={() => setLibraryOpen(false)}
        onStart={onStart}
      />
    </div>
  )
}
