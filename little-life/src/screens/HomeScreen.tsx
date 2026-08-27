import { useMemo } from 'react'
import type { AppState, CityEvent, DiscoveryNote } from '@/types'
import { CharacterRoomCard } from '@/components/character/CharacterRoomCard'
import { GreetingHeader } from '@/components/home/GreetingHeader'
import { TodayInTheCity } from '@/components/home/TodayInTheCity'
import { TodayGrowthCard } from '@/components/home/TodayGrowthCard'
import { NextQuestCard } from '@/components/home/NextQuestCard'
import { isKitchenUnlocked } from '@/lib/kitchen/derive'
import { DeliveryCard } from '@/components/home/DeliveryCard'
import { DiscoveryCards } from '@/components/discovery/DiscoveryCards'
import { activeCompanion } from '@/lib/discovery/companions'
import { CompanionArt } from '@/components/discovery/CompanionArt'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Button } from '@/components/ui/Button'
import { isTodayQuest, todayResults } from '@/lib/stats'
import type { CharacterMood } from '@/components/character/types'

interface HomeScreenProps {
  state: AppState
  mood: CharacterMood
  onComplete: (id: string) => void
  onAddQuest: () => void
  onSeeAll: () => void
  onOpenMap: () => void
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
  /** 방 안의 작은 부엌 */
  onOpenKitchen: () => void
  onOpenQuarry: () => void
  events: CityEvent[]
}

/**
 * 홈.
 *
 * 네 가지만 먼저 보여준다 — 내 캐릭터 · 오늘의 성장 · 지금 할 수 있는 행동 하나 ·
 * 오늘의 작은 소식.
 *
 * 예전에는 장비 · 직업 · 지역 · 코인 · 퀘스트 목록 · 주간 목표 · 도시 소식 ·
 * 통계가 전부 같은 크기의 흰 카드로 이어졌다. 다 중요해 보이면 아무것도
 * 중요하지 않고, 열 장이 넘어가면 화면은 스크롤하는 곳이 된다.
 *
 * 주간 목표와 누적 통계는 나 화면으로 옮겼다 — 그건 오늘의 얘기가 아니다.
 */
export function HomeScreen({
  state,
  mood,
  onComplete,
  onAddQuest,
  onSeeAll,
  onOpenMap,
  onDecorate,
  onOpenCollection,
  onOpenLook,
  onClaimDelivery,
  discoveryNotes,
  onDismissDiscovery,
  onOpenDiscovery,
  onOpenGarden,
  onOpenKitchen,
  onOpenQuarry,
  events,
}: HomeScreenProps) {
  const buddy = activeCompanion(state)
  const openQuests = useMemo(
    () => state.quests.filter((q) => !q.completed && isTodayQuest(q)),
    [state.quests],
  )
  const today = useMemo(() => todayResults(state.quests), [state.quests])

  /**
   * 오늘 내밀 하나.
   *
   * 제일 오래 기다린 것을 고른다. 미루고 있는 건 늘 어제 적어둔 쪽이지
   * 방금 적은 쪽이 아니다. 목록 순서(최신 우선)와 반대인 게 그래서 맞다.
   */
  const next = useMemo(
    () =>
      openQuests.length === 0
        ? null
        : [...openQuests].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0],
    [openQuests],
  )

  // 오늘 할 게 남지 않았으면 빈백에 앉아 쉰다.
  // 연출이 도는 동안에는 그쪽 포즈가 이긴다.
  const restingMood: CharacterMood = openQuests.length === 0 ? 'resting' : 'idle'
  const shownMood: CharacterMood = mood === 'idle' ? restingMood : mood

  return (
    <div className="animate-risein space-y-6">
      <div>
        <ScreenHeader
          title="홈"
          trailing={
            <span className="inline-flex items-center gap-1 rounded-pill bg-surface px-3 py-1.5 ring-1 ring-line">
              <span className="text-[13px] leading-none">🪙</span>
              <span className="font-game text-[12px] leading-none text-inkdim">
                {state.user.coins.toLocaleString('ko-KR')}
              </span>
            </span>
          }
        />
        <GreetingHeader name={state.user.name} />
      </div>

      {/* 뭔가 발견했으면 제일 위에. 아래에 두면 스크롤을 안 내리는 날에는
          그냥 못 보고 지나간다. */}
      <DiscoveryCards
        notes={discoveryNotes}
        onDismiss={onDismissDiscovery}
        onOpenGarden={onOpenGarden}
        onOpenKitchen={onOpenKitchen}
        onOpenQuarry={onOpenQuarry}
      />

      <CharacterRoomCard
        user={state.user}
        mood={shownMood}
        collection={state.collection}
        onDecorate={onDecorate}
        onOpenCollection={onOpenCollection}
        onOpenLook={onOpenLook}
        kitchenOpen={isKitchenUnlocked(state)}
        onOpenKitchen={onOpenKitchen}
      />

      <TodayGrowthCard user={state.user} today={today} />

      <NextQuestCard quest={next} onComplete={onComplete} onSeeAll={onSeeAll} />

      <DeliveryCard state={state} onClaim={onClaimDelivery} />

      <TodayInTheCity
        state={state}
        events={events}
        onOpenMap={onOpenMap}
        onOpenDiscovery={onOpenDiscovery}
      />

      {/* 같이 다니는 아이. 캐릭터 그림에 합성하지 않고 한 줄로 둔다 —
          지금은 이모지라서 그림 위에 얹으면 결이 어긋난다. */}
      <button
        type="button"
        onClick={onOpenDiscovery}
        className="flex w-full items-center gap-2.5 rounded-card border border-line bg-surface px-4 py-3 text-left transition-transform duration-150 ease-out active:scale-[0.99]"
      >
        {buddy ? (
          // 같이 다니는 중이니까 걷는 자세로 둔다
          <CompanionArt def={buddy} pose="walk" className="h-8 w-8 shrink-0" />
        ) : (
          <span className="w-8 shrink-0 text-center text-[18px] leading-none">✦</span>
        )}
        <span className="min-w-0 flex-1 truncate text-[13px] text-inkdim">
          {buddy ? `${buddy.name}와 같이 다니는 중` : '발견한 것 보기'}
        </span>
        <span className="shrink-0 text-[11px] text-inkfaint">›</span>
      </button>

      <div className="space-y-2">
        <Button variant="soft" size="md" className="w-full" onClick={onSeeAll}>
          오늘 퀘스트 전체 보기
        </Button>
        <button
          type="button"
          onClick={onAddQuest}
          className="w-full py-2 text-center text-[12.5px] text-inkfaint active:scale-[0.98]"
        >
          퀘스트 추가하기
        </button>
      </div>
    </div>
  )
}
