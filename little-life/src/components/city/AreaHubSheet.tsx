import { useMemo } from 'react'
import type {
  AppState,
  AreaDef,
  AreaId,
  CityEvent,
  CollectionShopDef,
  NpcDef,
  NpcStates,
} from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { FriendshipHearts, ReputationBadge } from '@/components/city/CityBadges'
import { areaActions, type HubAction } from '@/lib/city/hub'
import { eventsForArea } from '@/lib/city/events'
import { cn } from '@/components/ui/cn'

interface AreaHubSheetProps {
  area: AreaDef | null
  isCurrent: boolean
  /** 지금은 문을 닫은 곳 */
  closed: boolean
  reputation: number
  npcs: NpcStates
  events: CityEvent[]
  state: AppState
  onClose: () => void
  onSelect: (id: AreaId) => void
  onOpenNpc: (npc: NpcDef) => void
  onOpenShop: (id: AreaId) => void
  onOpenCollectionShop: (shop: CollectionShopDef) => void
  onOpenWorkshop: () => void
  onOpenGarden: () => void
  onOpenQuarry: () => void
  onOpenDungeon: () => void
}

/**
 * 동네 안에서 할 수 있는 것들.
 *
 * 예전 시트는 설명이 먼저였다 — 평판 막대, 버프 설명, 이벤트 설명, 사람 목록,
 * 가게 목록, 어울리는 분야, 오늘 퀘스트 다섯 줄, 그리고 맨 아래 "여기로 가기".
 * 미나에게 말을 걸려면 시트를 열고 스크롤을 내려야 했다.
 *
 * 여기서는 **할 수 있는 것이 먼저**다. 사람도 가게도 정원도 같은 크기의 칸으로
 * 두 줄씩 깔린다. 지도에서 두 번 누르면 어디든 닿는다.
 */
export function AreaHubSheet({
  area,
  isCurrent,
  closed,
  reputation,
  npcs,
  events,
  state,
  onClose,
  onSelect,
  onOpenNpc,
  onOpenShop,
  onOpenCollectionShop,
  onOpenWorkshop,
  onOpenGarden,
  onOpenQuarry,
  onOpenDungeon,
}: AreaHubSheetProps) {
  const actions = useMemo(
    () => (area ? areaActions({ area, state, npcs }) : []),
    [area, state, npcs],
  )
  const areaEvents = useMemo(
    () => (area ? eventsForArea(area.id, events) : []),
    [area, events],
  )

  if (!area) return null

  const run = (action: HubAction) => {
    if (action.disabled) return
    switch (action.kind) {
      case 'NPC':
        if (action.npc) onOpenNpc(action.npc)
        return
      case 'SHOP':
        onOpenShop(area.id)
        return
      case 'COLLECTION_SHOP':
        if (action.shop) onOpenCollectionShop(action.shop)
        return
      case 'WORKSHOP':
        onOpenWorkshop()
        return
      case 'GARDEN':
        onOpenGarden()
        return
      case 'QUARRY':
        onOpenQuarry()
        return
      case 'DUNGEON':
        onOpenDungeon()
        return
      default:
        return
    }
  }

  return (
    <BottomSheet open onClose={onClose} title={area.name}>
      <div className="flex items-start gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card bg-canvas text-[28px]">
          {area.icon}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-1.5">
            <h2 className="min-w-0 truncate text-[20px] font-semibold text-ink">{area.name}</h2>
            {isCurrent && (
              <span className="shrink-0 rounded-pill bg-coral px-2 py-0.5 text-[10px] font-medium text-surface">
                지금 여기
              </span>
            )}
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-inkdim">{area.description}</p>
        </div>
      </div>

      {/* 오늘 · 버프. 카드를 두 장 쓰지 않고 한 칸 안에 접어 넣는다. */}
      <div className="mt-4 rounded-card bg-coral-soft/50 px-4 py-3.5">
        {areaEvents.length > 0 ? (
          <>
            <p className="font-game text-[10px] tracking-[0.14em] text-coral-deep">오늘</p>
            {areaEvents.map((event) => (
              <p key={event.id} className="mt-1 text-[14px] text-ink">
                {event.icon} {event.name}
                <span className="ml-1.5 text-[12.5px] text-coral-deep">{event.effectLabel}</span>
              </p>
            ))}
            <p className="mt-1.5 text-[12.5px] text-inkdim">{area.buffLabel}</p>
          </>
        ) : (
          <>
            <p className="font-game text-[10px] tracking-[0.14em] text-coral-deep">{area.buffName}</p>
            <p className="mt-1 text-[14px] text-ink">{area.buffLabel}</p>
          </>
        )}
      </div>

      {actions.length > 0 && (
        <div className="mt-5">
          <p className="mb-2.5 text-[13px] font-medium text-inkdim">이곳에서</p>
          <ul className="grid grid-cols-2 gap-2">
            {actions.map((action) => (
              <li key={action.key}>
                <ActionTile
                  action={action}
                  friendship={action.npc ? (npcs[action.npc.id]?.friendship ?? 0) : null}
                  onSelect={() => run(action)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <ReputationBadge value={reputation} />
        <Button
          size="lg"
          className="min-w-[140px]"
          disabled={isCurrent || closed}
          onClick={() => onSelect(area.id)}
        >
          {isCurrent ? '지금 여기 있어' : closed ? '아직 문을 안 열었어' : '여기로 가기'}
        </Button>
      </div>
      {closed && !isCurrent && (
        <p className="mt-2 text-right text-[12px] text-inkfaint">밤 9시가 지나면 열려.</p>
      )}
    </BottomSheet>
  )
}

/**
 * 칸 하나.
 *
 * 카드 안에 다시 버튼을 넣지 않는다. 칸 전체가 누르는 곳이다 —
 * 작은 글씨 링크를 조준하게 만드는 화면은 한 손으로 쓰기 어렵다.
 */
function ActionTile({
  action,
  friendship,
  onSelect,
}: {
  action: HubAction
  friendship: number | null
  onSelect: () => void
}) {
  const content = (
    <>
      <span className="flex items-center gap-1.5">
        <span className={cn('text-[22px] leading-none', action.hidden && 'opacity-45')}>
          {action.icon}
        </span>
        {action.fresh && (
          <span className="rounded-pill bg-coral-soft px-1.5 py-0.5 font-game text-[8.5px] text-coral-deep">
            NEW
          </span>
        )}
      </span>
      <span className="mt-2 block truncate text-[14px] font-medium text-ink">{action.title}</span>
      <span className="mt-0.5 block text-[11.5px] leading-snug text-inkdim line-clamp-2">
        {action.subtitle}
      </span>
      {friendship !== null && !action.disabled && (
        <span className="mt-1.5 block">
          <FriendshipHearts friendship={friendship} />
        </span>
      )}
    </>
  )

  const shell = cn(
    'flex min-h-[104px] w-full flex-col rounded-card border px-3.5 py-3 text-left',
    action.hidden
      ? 'border-dashed border-line bg-canvas'
      : 'border-line bg-surface shadow-soft',
    // 흐리게는 하되 안 보이게 하지는 않는다. 어디에 있는지는 알아야 한다.
    action.disabled && 'opacity-70',
  )

  if (action.disabled) {
    return <div className={shell}>{content}</div>
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(shell, 'transition-transform duration-150 ease-out active:scale-[0.97]')}
    >
      {content}
    </button>
  )
}
