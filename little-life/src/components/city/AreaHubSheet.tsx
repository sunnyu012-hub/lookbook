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
  /** 지금 시각. 누가 여기 있고 가게가 열렸는지가 여기서 갈린다 */
  now: Date
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
 * 하루에게 말을 걸려면 시트를 열고 스크롤을 내려야 했다.
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
  now,
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
    () => (area ? areaActions({ area, state, npcs, now }) : []),
    [area, state, npcs, now],
  )
  const areaEvents = useMemo(
    () => (area ? eventsForArea(area.id, events) : []),
    [area, events],
  )
  /**
   * 사람과 장소를 갈라 놓는다.
   *
   * 예전에는 둘을 한 격자에 같이 깔았다. 여섯 명일 때는 괜찮았는데
   * 스물넷이 되니 아침 카페 거리에 사람 칸이 열두 개 쌓이고, 정작
   * 가게는 그 아래로 밀려서 스크롤을 한참 내려야 나왔다.
   *
   * 사람은 이름만 있으면 알아보니까 칩 한 줄로 접고, 칸은 갈 수 있는
   * 곳에만 준다. 사람이 늘어도 시트 길이는 거의 그대로다.
   */
  const people = useMemo(() => actions.filter((a) => a.kind === 'NPC'), [actions])
  const places = useMemo(() => actions.filter((a) => a.kind !== 'NPC'), [actions])

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

      {people.length > 0 && (
        <div className="mt-5">
          <p className="mb-2.5 text-[13px] font-medium text-inkdim">지금 여기</p>
          <ul className="flex flex-wrap gap-2">
            {people.map((action) => (
              <li key={action.key}>
                <PersonChip action={action} onSelect={() => run(action)} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {places.length > 0 && (
        <div className="mt-5">
          <p className="mb-2.5 text-[13px] font-medium text-inkdim">이곳에서</p>
          <ul className="grid grid-cols-2 gap-2">
            {places.map((action) => (
              <li key={action.key}>
                <ActionTile action={action} friendship={null} onSelect={() => run(action)} />
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
 * 사람 한 칩.
 *
 * 자리를 비운 사람도 지운다는 뜻이 아니라 흐리게만 둔다 — 원래 이 동네
 * 사람이 소리 없이 사라지면 "나갔구나" 가 아니라 "없어졌나?" 로 읽힌다.
 * 어디 있는지는 길게 안 적는다. 칩에 문장을 넣으면 그건 칩이 아니다.
 */
function PersonChip({ action, onSelect }: { action: HubAction; onSelect: () => void }) {
  const inside = (
    <>
      <span className="text-[17px] leading-none">{action.icon}</span>
      <span className="text-[13.5px] font-medium">{action.title}</span>
    </>
  )

  const shell = 'inline-flex items-center gap-1.5 rounded-pill border px-3 py-2'

  if (action.disabled) {
    return (
      <span
        className={cn(shell, 'border-line bg-canvas text-inkfaint')}
        title={action.subtitle}
      >
        {inside}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      title={action.subtitle}
      className={cn(
        shell,
        'border-line bg-surface text-ink shadow-soft',
        'transition-transform duration-150 ease-out active:scale-[0.97]',
      )}
    >
      {inside}
    </button>
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
