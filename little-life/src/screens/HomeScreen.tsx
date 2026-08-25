import { useMemo } from 'react'
import type { AppState, CityEvent, DiscoveryNote } from '@/types'
import { CharacterRoomCard } from '@/components/character/CharacterRoomCard'
import { ExpToastLayer } from '@/components/feedback/ExpToastLayer'
import { GreetingHeader } from '@/components/home/GreetingHeader'
import { AdventureStatusCard } from '@/components/home/AdventureStatusCard'
import { TodayInTheCity } from '@/components/home/TodayInTheCity'
import { readyCount } from '@/lib/garden/derive'
import { WeeklyGoalsCard } from '@/components/home/WeeklyGoalsCard'
import { DeliveryCard } from '@/components/home/DeliveryCard'
import { DiscoveryCards } from '@/components/discovery/DiscoveryCards'
import { activeCompanion } from '@/lib/discovery/companions'
import { CompanionArt } from '@/components/discovery/CompanionArt'
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
  onOpenMap: () => void
  onOpenBag: () => void
  onOpenMe: () => void
  onDecorate: () => void
  onOpenCollection: () => void
  onOpenLook: () => void
  /** 문 앞에 온 것을 받는다 */
  onClaimDelivery: () => void
  /** 이번에 새로 발견한 것 */
  discoveryNotes: DiscoveryNote[]
  onDismissDiscovery: () => void
  onOpenDiscovery: () => void
  /** 정원에 거둘 게 있을 때 그리로 */
  onOpenGarden: () => void
  events: CityEvent[]
}

export function HomeScreen({
  state,
  mood,
  expToasts,
  onComplete,
  onAddQuest,
  onSeeAll,
  onOpenMap,
  onOpenBag,
  onOpenMe,
  onDecorate,
  onOpenCollection,
  onOpenLook,
  onClaimDelivery,
  discoveryNotes,
  onDismissDiscovery,
  onOpenDiscovery,
  onOpenGarden,
  events,
}: HomeScreenProps) {
  const buddy = activeCompanion(state)
  const gardenReady = readyCount(state)
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
        title="홈"
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

      <AdventureStatusCard
        user={state.user}
        onOpenMap={onOpenMap}
        onOpenBag={onOpenBag}
        onOpenMe={onOpenMe}
      />

      {/* 뭔가 발견했으면 제일 위에. 퀘스트 밑에 두면 스크롤을 안 내리는 날에는
          그냥 못 보고 지나간다. */}
      <DiscoveryCards
        notes={discoveryNotes}
        onDismiss={onDismissDiscovery}
        onOpenGarden={onOpenGarden}
      />

      <CharacterRoomCard
        user={state.user}
        mood={shownMood}
        collection={state.collection}
        onDecorate={onDecorate}
        onOpenCollection={onOpenCollection}
        onOpenLook={onOpenLook}
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
          <span className="text-[17px] leading-none">+</span> 퀘스트 추가
        </Button>
      )}

      <DeliveryCard state={state} onClaim={onClaimDelivery} />

      {/* 정원에 거둘 게 있을 때만 한 줄. 없으면 아무 줄도 안 만든다 —
          "오늘 정원 안 봤어요" 같은 말은 하지 않는다.
          거둘 게 없는 날은 정원 얘기를 아예 꺼내지 않는 게 맞다. */}
      {gardenReady > 0 && (
        <button
          type="button"
          onClick={onOpenGarden}
          className="flex w-full items-center gap-2.5 rounded-card border border-sage-deep/20 bg-sage-soft/50 px-3.5 py-2.5 text-left transition-transform duration-150 ease-out active:scale-[0.98]"
        >
          <span className="w-9 shrink-0 text-center text-[20px] leading-none">🌱</span>
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-sage-deep">
            {gardenReady}개의 작물이 수확을 기다리고 있어
          </span>
          <span className="shrink-0 text-[11px] text-inkfaint">›</span>
        </button>
      )}

      {/* 같이 다니는 아이. 캐릭터 그림에 합성하지 않고 옆에 한 줄로 둔다 —
          지금은 이모지라서 그림 위에 얹으면 결이 어긋난다. */}
      <button
        type="button"
        onClick={onOpenDiscovery}
        className="flex w-full items-center gap-2.5 rounded-card border border-line bg-surface px-3.5 py-2.5 text-left transition-transform duration-150 ease-out active:scale-[0.98]"
      >
        {buddy ? (
          // 같이 다니는 중이니까 걷는 자세로 둔다
          <CompanionArt def={buddy} pose="walk" className="h-9 w-9 shrink-0" />
        ) : (
          <span className="w-9 shrink-0 text-center text-[20px] leading-none">✦</span>
        )}
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-inkdim">
          {buddy ? `${buddy.name}와 같이 다니는 중` : '발견한 것 보기'}
        </span>
        <span className="shrink-0 text-[11px] text-inkfaint">›</span>
      </button>

      <WeeklyGoalsCard state={state} />

      <TodayInTheCity state={state} events={events} onOpenMap={onOpenMap} />

      <DailySummary completed={summary.completed} earnedExp={summary.earnedExp} />
    </div>
  )
}
