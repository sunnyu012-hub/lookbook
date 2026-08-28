import { useMemo, useState } from 'react'
import type {
  AppState,
  AreaDef,
  AreaId,
  CityEvent,
  CollectionShopDef,
  NpcDef,
  NpcStates,
  Reputation,
} from '@/types'
import { AREAS } from '@/lib/rpg/content'
import { TIME_ICON, TIME_LABEL, isNightOpen, timeBand } from '@/lib/rpg/time'
import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { AreaCard } from '@/components/city/AreaCard'
import { useCityClock } from '@/hooks/useCityClock'
import { AreaHubSheet } from '@/components/city/AreaHubSheet'
import { eventsForArea } from '@/lib/city/events'

interface MapScreenProps {
  currentAreaId: AreaId
  reputation: Reputation
  npcs: NpcStates
  events: CityEvent[]
  /** 비밀 장소·정원·채석장이 보이는지 판단하려고 */
  state: AppState
  onSelectArea: (areaId: AreaId) => void
  onOpenNpc: (npc: NpcDef) => void
  onOpenShop: (areaId: AreaId) => void
  /** 도감 상점 */
  onOpenCollectionShop: (shop: CollectionShopDef) => void
  /** 작은 작업실 (집에만 있다) */
  onOpenWorkshop: () => void
  /** 공원 너머 작은 정원 */
  onOpenGarden: () => void
  onOpenQuarry: () => void
  /** 채석장 안쪽의 잠든 돌문. 찾기 전에는 이 칸 자체가 안 뜬다. */
  onOpenDungeon: () => void
}

/**
 * 작은 도시.
 *
 * 지도는 읽는 곳이 아니라 **가는 곳**이다.
 *
 * 예전에는 여섯 동네가 같은 너비로 세로로 쌓였고, 카드마다 평판 막대 · 하트 ·
 * 이벤트 설명 · 어울리는 퀘스트 개수가 다 붙어 있었다. 눌러서 열면 또 설명이
 * 먼저 나와서, 미나에게 말을 걸려면 시트를 열고 한참 내려가야 했다.
 *
 * 지금은 동네를 두 칸씩 깔고, 눌러 들어가면 **할 수 있는 것**이 격자로 나온다.
 * 사람 · 가게 · 정원 · 채석장 · 작업실 어디든 두 번 누르면 닿는다.
 */
export function MapScreen({
  currentAreaId,
  reputation,
  npcs,
  events,
  state,
  onSelectArea,
  onOpenNpc,
  onOpenShop,
  onOpenCollectionShop,
  onOpenWorkshop,
  onOpenGarden,
  onOpenQuarry,
  onOpenDungeon,
}: MapScreenProps) {
  const [openArea, setOpenArea] = useState<AreaDef | null>(null)
  // 켜둔 채로 시간이 흘러도 도시가 아침에 멈춰 있지 않게.
  const now = useCityClock()
  const band = timeBand(now)
  const nightOpen = isNightOpen(now)

  // 지금 있는 곳은 한 줄을 다 쓴다. 나머지는 두 칸씩.
  // masonry 처럼 들쭉날쭉하게 만들지 않는다 — 눈이 순서를 잃는다.
  const here = useMemo(() => AREAS.find((a) => a.id === currentAreaId) ?? AREAS[0], [currentAreaId])
  const others = useMemo(() => AREAS.filter((a) => a.id !== here.id), [here])

  const eventOf = (area: AreaDef): CityEvent | null =>
    eventsForArea(area.id, events).find((e) => e.areaId === area.id) ?? null

  const closedNow = (area: AreaDef) => area.nightOnly === true && !nightOpen

  return (
    <div className="animate-risein">
      <ScreenHeader
        title="지도"
        trailing={
          <span className="inline-flex items-center gap-1 rounded-pill bg-surface px-3 py-1.5 ring-1 ring-line">
            <span className="text-[13px]">{TIME_ICON[band]}</span>
            <span className="font-game text-[11px] leading-none text-inkdim">
              {TIME_LABEL[band]}
            </span>
          </span>
        }
      />

      <p className="-mt-1 mb-5 text-[13px] text-inkdim">오늘은 어디서 지내볼까?</p>

      <AreaCard
        area={here}
        isCurrent
        closed={closedNow(here)}
        event={eventOf(here)}
        wide
        now={now}
        onOpen={setOpenArea}
      />

      <ul className="mt-3 grid grid-cols-2 gap-3">
        {others.map((area) => (
          <li key={area.id}>
            <AreaCard
              area={area}
              isCurrent={false}
              closed={closedNow(area)}
              event={eventOf(area)}
              now={now}
              onOpen={setOpenArea}
            />
          </li>
        ))}
      </ul>

      <AreaHubSheet
        area={openArea}
        isCurrent={openArea?.id === currentAreaId}
        closed={openArea ? closedNow(openArea) : false}
        reputation={openArea ? (reputation[openArea.id] ?? 0) : 0}
        npcs={npcs}
        events={events}
        state={state}
        now={now}
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
        onOpenCollectionShop={(collectionShop) => {
          setOpenArea(null)
          onOpenCollectionShop(collectionShop)
        }}
        onOpenWorkshop={() => {
          setOpenArea(null)
          onOpenWorkshop()
        }}
        onOpenGarden={() => {
          setOpenArea(null)
          onOpenGarden()
        }}
        onOpenQuarry={() => {
          setOpenArea(null)
          onOpenQuarry()
        }}
        onOpenDungeon={() => {
          setOpenArea(null)
          onOpenDungeon()
        }}
      />
    </div>
  )
}
