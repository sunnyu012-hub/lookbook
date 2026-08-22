import { useMemo, useState } from 'react'
import type { AreaDef, AreaId, CityEvent, NpcDef, NpcStates, Quest, Reputation } from '@/types'
import { AREAS } from '@/lib/rpg/content'
import { TIME_ICON, TIME_LABEL, isNightOpen, timeBand } from '@/lib/rpg/time'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { ReputationBadge, ReputationMeter, FriendshipHearts } from '@/components/city/CityBadges'
import { eventsForArea } from '@/lib/city/events'
import { npcsInArea } from '@/lib/city/npcs'
import { isShopOpen, shopInArea } from '@/lib/city/shops'
import { isTodayQuest } from '@/lib/stats'
import { cn } from '@/components/ui/cn'

interface MapScreenProps {
  currentAreaId: AreaId
  quests: Quest[]
  reputation: Reputation
  npcs: NpcStates
  events: CityEvent[]
  onSelectArea: (areaId: AreaId) => void
  onOpenNpc: (npc: NpcDef) => void
  onOpenShop: (areaId: AreaId) => void
}

/**
 * 작은 도시.
 *
 * 자유 이동형 맵이 아니라 카드로 된 지도다.
 * 지금 어디에 있는지, 거기서 뭐가 잘 되는지, 누가 있는지만 분명하게 보여준다.
 */
export function MapScreen({
  currentAreaId,
  quests,
  reputation,
  npcs,
  events,
  onSelectArea,
  onOpenNpc,
  onOpenShop,
}: MapScreenProps) {
  const [openArea, setOpenArea] = useState<AreaDef | null>(null)
  const now = new Date()
  const band = timeBand(now)
  const nightOpen = isNightOpen(now)

  const todayQuests = useMemo(
    () => quests.filter((q) => !q.completed && isTodayQuest(q)),
    [quests],
  )

  return (
    <div className="animate-risein">
      <ScreenHeader
        title="MAP"
        trailing={
          <span className="inline-flex items-center gap-1 rounded-pill bg-surface px-3 py-1.5 ring-1 ring-line">
            <span className="text-[13px]">{TIME_ICON[band]}</span>
            <span className="font-game text-[11px] leading-none text-inkdim">
              {TIME_LABEL[band]}
            </span>
          </span>
        }
      />

      <p className="-mt-1 mb-4 text-[13px] text-inkdim">오늘은 어디서 지내볼까?</p>

      <ul className="space-y-2.5">
        {AREAS.map((area) => {
          const isCurrent = area.id === currentAreaId
          const closed = area.nightOnly && !nightOpen
          const related = todayQuests.filter((q) => area.categories.includes(q.category)).length
          const areaEvents = eventsForArea(area.id, events).filter((e) => e.areaId === area.id)
          const people = npcsInArea(area.id).filter((n) => !n.nightOnly || nightOpen)
          const shop = shopInArea(area.id)

          return (
            <li key={area.id}>
              <button
                type="button"
                onClick={() => setOpenArea(area)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-card border px-3.5 py-3.5 text-left',
                  'transition-transform duration-150 ease-out active:scale-[0.98]',
                  isCurrent
                    ? 'border-coral bg-coral-soft/40 ring-[1.5px] ring-inset ring-coral'
                    : 'border-line bg-surface shadow-soft',
                  closed && !isCurrent && 'opacity-65',
                )}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-canvas text-[24px]">
                  {area.icon}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-[15px] font-semibold text-ink">{area.name}</span>
                    {isCurrent && (
                      <span className="shrink-0 rounded-pill bg-coral px-2 py-0.5 font-game text-[9px] tracking-[0.06em] text-surface">
                        CURRENT
                      </span>
                    )}
                    {closed && (
                      <span className="shrink-0 rounded-pill bg-sunken px-2 py-0.5 text-[10px] text-inkdim">
                        Opens at night
                      </span>
                    )}
                  </span>

                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    <ReputationBadge value={reputation[area.id] ?? 0} />
                    {shop && (
                      <span className="inline-flex items-center gap-0.5 rounded-pill bg-butter-soft px-2 py-0.5 font-game text-[9px] tracking-[0.06em] text-butter-deep">
                        🛍️ SHOP
                      </span>
                    )}
                  </span>

                  <span className="mt-1.5 block truncate text-[12px] text-inkdim">
                    {area.buffLabel}
                  </span>

                  {people.length > 0 && (
                    <span className="mt-1 flex items-center gap-1.5">
                      {people.map((npc) => (
                        <span key={npc.id} className="inline-flex items-center gap-0.5">
                          <span className="text-[13px] leading-none">{npc.avatar}</span>
                          <span className="text-[11px] text-inkdim">{npc.name}</span>
                          <FriendshipHearts friendship={npcs[npc.id]?.friendship ?? 0} />
                        </span>
                      ))}
                    </span>
                  )}

                  {areaEvents.map((event) => (
                    <span
                      key={event.id}
                      className="mt-1 block truncate text-[11.5px] text-coral-deep"
                    >
                      {event.icon} Today: {event.name} — {event.effectLabel}
                    </span>
                  ))}

                  {related > 0 && (
                    <span className="mt-0.5 block text-[11px] text-inkfaint">
                      여기 어울리는 오늘 퀘스트 {related}개
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <AreaSheet
        area={openArea}
        isCurrent={openArea?.id === currentAreaId}
        closed={openArea?.nightOnly === true && !nightOpen}
        nightOpen={nightOpen}
        quests={todayQuests}
        reputation={openArea ? (reputation[openArea.id] ?? 0) : 0}
        npcs={npcs}
        events={events}
        onClose={() => setOpenArea(null)}
        onSelect={(id) => {
          onSelectArea(id)
          setOpenArea(null)
        }}
        onOpenNpc={(npc) => {
          setOpenArea(null)
          onOpenNpc(npc)
        }}
        onOpenShop={(id) => {
          setOpenArea(null)
          onOpenShop(id)
        }}
      />
    </div>
  )
}

interface AreaSheetProps {
  area: AreaDef | null
  isCurrent: boolean
  /** 지금은 문을 닫은 곳 */
  closed: boolean
  nightOpen: boolean
  quests: Quest[]
  reputation: number
  npcs: NpcStates
  events: CityEvent[]
  onClose: () => void
  onSelect: (id: AreaId) => void
  onOpenNpc: (npc: NpcDef) => void
  onOpenShop: (id: AreaId) => void
}

function AreaSheet({
  area,
  isCurrent,
  closed,
  nightOpen,
  quests,
  reputation,
  npcs,
  events,
  onClose,
  onSelect,
  onOpenNpc,
  onOpenShop,
}: AreaSheetProps) {
  if (!area) return null

  const related = quests.filter((q) => area.categories.includes(q.category))
  const areaEvents = eventsForArea(area.id, events)
  const people = npcsInArea(area.id)
  const shop = shopInArea(area.id)
  const shopOpen = shop ? isShopOpen(shop) : false

  return (
    <BottomSheet open onClose={onClose} title={area.name}>
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-card bg-canvas text-[32px]">
          {area.icon}
        </span>
        <div className="min-w-0 flex-1 pt-1">
          <h2 className="text-[20px] font-semibold text-ink">{area.name}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-inkdim">{area.description}</p>
        </div>
      </div>

      <ReputationMeter value={reputation} />

      <div className="mt-4 rounded-card bg-coral-soft/50 px-4 py-3.5">
        <p className="font-game text-[10px] tracking-[0.14em] text-coral-deep">{area.buffName}</p>
        <p className="mt-1 text-[14px] text-ink">{area.buffLabel}</p>
      </div>

      {areaEvents.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[13px] font-medium text-inkdim">오늘 여기서</p>
          <ul className="space-y-1.5">
            {areaEvents.map((event) => (
              <li key={event.id} className="rounded-btn bg-canvas px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink">
                  <span>{event.icon}</span>
                  {event.name}
                </p>
                <p className="mt-0.5 text-[12.5px] text-inkdim">{event.description}</p>
                <p className="mt-1 font-game text-[10px] tracking-[0.06em] text-coral-deep">
                  {event.effectLabel}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {people.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[13px] font-medium text-inkdim">여기 있는 사람</p>
          <ul className="space-y-1.5">
            {people.map((npc) => {
              const away = npc.nightOnly === true && !nightOpen
              return (
                <li key={npc.id}>
                  <button
                    type="button"
                    disabled={away}
                    onClick={() => onOpenNpc(npc)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-card border border-line bg-surface px-3.5 py-3 text-left',
                      'transition-transform duration-150 ease-out active:scale-[0.98]',
                      'disabled:opacity-60 disabled:active:scale-100',
                    )}
                  >
                    <span className="text-[24px] leading-none">{npc.avatar}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-medium text-ink">
                        {npc.name}
                      </span>
                      <span className="mt-0.5 block truncate font-game text-[10px] tracking-[0.06em] text-inkfaint">
                        {npc.role}
                      </span>
                    </span>
                    {away ? (
                      <span className="shrink-0 text-[11px] text-inkfaint">밤에만 보여</span>
                    ) : (
                      <FriendshipHearts friendship={npcs[npc.id]?.friendship ?? 0} />
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {shop && (
        <div className="mt-4">
          <Button
            variant="soft"
            size="lg"
            className="w-full"
            disabled={!shopOpen}
            onClick={() => onOpenShop(area.id)}
          >
            🛍️ {shopOpen ? `${shop.name} 들어가기` : `${shop.name} · 지금은 닫혀 있어`}
          </Button>
        </div>
      )}

      <div className="mt-4">
        <p className="mb-2 text-[13px] font-medium text-inkdim">잘 맞는 분야</p>
        <div className="flex flex-wrap gap-1.5">
          {area.categories.map((c) => (
            <CategoryBadge key={c} category={c} />
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[13px] font-medium text-inkdim">여기 어울리는 오늘 퀘스트</p>
        {related.length === 0 ? (
          <p className="text-[13px] text-inkfaint">아직 없어. 하나 만들어도 좋고.</p>
        ) : (
          <ul className="space-y-1.5">
            {related.slice(0, 5).map((q) => (
              <li
                key={q.id}
                className="flex items-center gap-2 rounded-btn bg-canvas px-3 py-2.5 text-[13.5px] text-ink"
              >
                <CategoryBadge category={q.category} />
                <span className="truncate">{q.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <Button
          size="lg"
          className="w-full"
          disabled={isCurrent || closed}
          onClick={() => onSelect(area.id)}
        >
          {isCurrent ? '지금 여기 있어' : closed ? '아직 문을 안 열었어' : '여기로 가기'}
        </Button>
        {closed && !isCurrent && (
          <p className="mt-2 text-center text-[12px] text-inkfaint">밤 9시가 지나면 열려.</p>
        )}
      </div>
    </BottomSheet>
  )
}
