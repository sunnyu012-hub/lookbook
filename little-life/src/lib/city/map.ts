import type { AppState, AreaDef, AreaId, CityEvent, NpcDef } from '@/types'
import { AREAS, findArea } from '@/lib/rpg/content'
import { todayKey } from '@/lib/date'
import { isNightOpen } from '@/lib/rpg/time'
import { npcsHere } from './routine'
import { isShopOpen, shopInArea, shopStatus } from './shops'
import { eventsForArea } from './events'
import { collectionShopsInArea, isCollectionShopOpen } from '@/lib/collection/shops'
import { hasFreshStock } from '@/lib/collection/progress'
import { isQuarryUnlocked } from '@/lib/quarry/derive'

/**
 * 그림 지도 위에 뭘 어디에 올릴지.
 *
 * ── 그림에는 아무것도 박지 않는다 ───────────────────────
 *
 * 배경 그림 한 장은 고정이다. 사람 얼굴 · 영업 상태 · 새 소식 · 잠금은
 * 전부 위에 얹는 overlay 다. 그림에 구워 넣으면 시간대마다 · 사람이
 * 옮겨갈 때마다 그림을 새로 그려야 하고, 그러면 도시는 절대 안 움직인다.
 *
 * ── 저장하지 않는다 ─────────────────────────────────────
 *
 * 여기서 만드는 건 전부 `now` 와 기존 저장에서 계산한 값이다. 지도는
 * G 에서 만든 자리 계산(routine)과 영업시간(shops)을 보여주기만 한다.
 * 지도가 자기 상태를 따로 들면 그때부터 "지도가 아는 것" 과
 * "실제" 가 갈라진다.
 *
 * ── 좌표는 퍼센트다 ─────────────────────────────────────
 *
 * 기준 캔버스는 1024 × 1536 (2:3) 이지만 화면 폭은 기기마다 다르다.
 * 픽셀로 적으면 작은 폰에서 라벨이 건물 밖으로 나간다.
 */

/** 배경 그림. 이 경로에 파일이 없으면 지도 대신 예전 카드 목록이 뜬다. */
export const CITY_MAP_BASE_SRC = '/assets/city/city_map_base.png'

/** 시안을 그린 기준 캔버스. 좌표를 다시 잴 때 쓰는 값이다. */
export const MAP_CANVAS = { width: 1024, height: 1536 } as const

/**
 * 가장자리 여백.
 *
 * 아래가 유독 넓은 건 탭 바가 거기 있어서다 — 라벨이 그 밑으로 들어가면
 * 누를 수 없는 글씨가 된다.
 */
export const MAP_SAFE_AREA_PCT = {
  top: 32 / MAP_CANVAS.height,
  right: 24 / MAP_CANVAS.width,
  bottom: 132 / MAP_CANVAS.height,
  left: 24 / MAP_CANVAS.width,
} as const

export interface PctBox {
  x: number
  y: number
  w: number
  h: number
}

export interface PctPoint {
  x: number
  y: number
}

/** 채석장은 동네(AreaDef)가 아니라 공원 바깥의 작은 자리다. */
export type CityMapRegionId = AreaId | 'OLD_QUARRY'

export interface CityMapRegionDef {
  id: CityMapRegionId
  /** 눌렀을 때 열리는 동네 시트 */
  targetAreaId: AreaId
  hitBoxPct: PctBox
  labelAnchorPct: PctPoint
  statusAnchorPct: PctPoint
  /** 사람 얼굴을 놓을 자리. 사람이 안 오는 곳은 null */
  npcAnchorPct: PctPoint | null
  /**
   * 지도에서 바로 누르라고 권하는 자리인지.
   *
   * 채석장은 false 다 — 공원 안에서 가는 곳이라 지도에서 메인 동네처럼
   * 다루지 않는다. 그래도 자리는 보여준다.
   */
  directTap: boolean
}

/**
 * 동네 자리표.
 *
 * 시안(1024 × 1536)에서 잰 초안이라 최종 그림이 오면 미세 조정이 필요하다.
 * 구조는 그대로 두고 숫자만 고친다.
 *
 * 순서가 곧 겹칠 때의 우선순위다 — 뒤에 오는 것이 위에 깔린다.
 * 채석장이 맨 뒤인 이유: 공원 상자 **안에** 있는 작은 자리라
 * 앞에 두면 공원이 통째로 덮어버린다.
 */
export const CITY_MAP_REGIONS: CityMapRegionDef[] = [
  {
    id: 'GREEN_PARK',
    targetAreaId: 'GREEN_PARK',
    hitBoxPct: { x: 0.02, y: 0.026, w: 0.391, h: 0.339 },
    labelAnchorPct: { x: 0.221, y: 0.086 },
    statusAnchorPct: { x: 0.221, y: 0.114 },
    npcAnchorPct: { x: 0.223, y: 0.135 },
    directTap: true,
  },
  {
    id: 'CAFE_STREET',
    targetAreaId: 'CAFE_STREET',
    hitBoxPct: { x: 0.547, y: 0.059, w: 0.342, h: 0.228 },
    labelAnchorPct: { x: 0.711, y: 0.104 },
    statusAnchorPct: { x: 0.711, y: 0.134 },
    npcAnchorPct: { x: 0.711, y: 0.163 },
    directTap: true,
  },
  {
    id: 'CREATIVE_DISTRICT',
    targetAreaId: 'CREATIVE_DISTRICT',
    hitBoxPct: { x: 0.342, y: 0.28, w: 0.332, h: 0.215 },
    labelAnchorPct: { x: 0.5, y: 0.352 },
    statusAnchorPct: { x: 0.5, y: 0.381 },
    npcAnchorPct: { x: 0.447, y: 0.409 },
    directTap: true,
  },
  {
    id: 'HOME_BASE',
    targetAreaId: 'HOME_BASE',
    hitBoxPct: { x: 0.347, y: 0.449, w: 0.313, h: 0.215 },
    labelAnchorPct: { x: 0.5, y: 0.537 },
    statusAnchorPct: { x: 0.5, y: 0.564 },
    npcAnchorPct: { x: 0.5, y: 0.587 },
    directTap: true,
  },
  {
    id: 'NIGHT_TOWN',
    targetAreaId: 'NIGHT_TOWN',
    hitBoxPct: { x: 0.02, y: 0.596, w: 0.342, h: 0.228 },
    labelAnchorPct: { x: 0.156, y: 0.673 },
    statusAnchorPct: { x: 0.156, y: 0.703 },
    npcAnchorPct: { x: 0.156, y: 0.729 },
    directTap: true,
  },
  {
    id: 'TRAINING_ZONE',
    targetAreaId: 'TRAINING_ZONE',
    hitBoxPct: { x: 0.605, y: 0.586, w: 0.352, h: 0.221 },
    labelAnchorPct: { x: 0.771, y: 0.674 },
    statusAnchorPct: { x: 0.771, y: 0.702 },
    npcAnchorPct: { x: 0.771, y: 0.726 },
    directTap: true,
  },
  {
    // 눌러도 채석장이 바로 열리지 않는다. 공원 시트가 열리고 거기
    // "공원 바깥쪽 길" 로 들어간다 — 가는 길을 건너뛰면 이 자리가
    // 왜 공원 옆에 붙어 있는지가 사라진다.
    id: 'OLD_QUARRY',
    targetAreaId: 'GREEN_PARK',
    hitBoxPct: { x: 0.008, y: 0.005, w: 0.151, h: 0.085 },
    labelAnchorPct: { x: 0.072, y: 0.038 },
    statusAnchorPct: { x: 0.072, y: 0.06 },
    npcAnchorPct: null,
    directTap: false,
  },
]

/** 한 자리에 얼굴 몇 개까지. 넘치면 +N 으로 접는다. */
export const NPC_CHIPS_VISIBLE = 3

export type RegionTone = 'CURRENT' | 'OPEN' | 'CLOSED' | 'QUIET'

export interface CityMapRegionView {
  def: CityMapRegionDef
  /** 채석장은 동네가 아니라서 null */
  area: AreaDef | null
  label: string
  icon: string
  /** 지도에 적는 한 줄. 길게 쓰지 않는다 — 설명은 시트에서 한다. */
  statusLine: string
  tone: RegionTone
  /** 지금 여기 있는 사람 (최대 NPC_CHIPS_VISIBLE) */
  npcs: NpcDef[]
  /** 자리에 못 들어간 사람 수 */
  overflow: number
  /** 오늘 여기 뭔가 있다는 작은 점 */
  dot: boolean
  current: boolean
}

interface CityMapInput {
  state: AppState
  events: CityEvent[]
  currentAreaId: AreaId
  now?: Date
}

/** 그림 밖으로 나가지 않게. 좌표를 다시 잴 때 실수를 여기서 받아준다. */
export function clampAnchor(point: PctPoint): PctPoint {
  const { top, right, bottom, left } = MAP_SAFE_AREA_PCT
  return {
    x: Math.min(Math.max(point.x, left), 1 - right),
    y: Math.min(Math.max(point.y, top), 1 - bottom),
  }
}

/**
 * 이 자리를 지금 지도에 그릴지.
 *
 * 채석장은 찾기 전에는 지도에 없다. 못 가는 곳을 미리 찍어두면
 * 그건 기대가 아니라 잠긴 문이다 (이야기 쪽에서 이미 정한 규칙이다).
 */
export function isRegionVisible(def: CityMapRegionDef, state: AppState): boolean {
  if (def.id === 'OLD_QUARRY') return isQuarryUnlocked(state)
  return true
}

/** 이 동네에 오늘 뭔가 있는지 (도시 이벤트 · 아직 안 본 오늘 진열) */
function hasNews(areaId: AreaId, state: AppState, events: CityEvent[], now: Date): boolean {
  if (eventsForArea(areaId, events).length > 0) return true
  const day = todayKey(now)
  return collectionShopsInArea(areaId).some(
    (shop) => isCollectionShopOpen(shop, now) && hasFreshStock(state.collection, shop.id, day),
  )
}

/**
 * 지도에 적는 한 줄.
 *
 * 문장을 길게 쓰지 않는다. 지도는 훑는 화면이라 두 줄이 되는 순간
 * 아무도 안 읽는다. 자세한 건 눌러서 여는 시트에 이미 다 있다.
 */
function statusOf(area: AreaDef, npcCount: number, now: Date): { line: string; tone: RegionTone } {
  if (area.nightOnly && !isNightOpen(now)) return { line: '밤에 열려', tone: 'CLOSED' }

  const shop = shopInArea(area.id)
  if (shop) {
    if (isShopOpen(shop, now)) return { line: '영업 중', tone: 'OPEN' }
    return {
      line: shopStatus(shop, now) === 'AFTER' ? '영업 종료' : '아직 안 열었어',
      tone: 'CLOSED',
    }
  }

  if (npcCount > 0) return { line: '사람이 있는 것 같다', tone: 'OPEN' }
  return { line: '지금은 조용함', tone: 'QUIET' }
}

/**
 * 지금 지도에 올릴 것 전부.
 *
 * 사람은 G 의 `npcsHere` 를 그대로 쓴다 — 지도가 자기만의 자리 계산을
 * 따로 하면 시트에 보이는 사람과 지도에 보이는 사람이 달라진다.
 * OFFSCREEN 인 사람은 애초에 어느 동네에도 안 들어 있어서 저절로 빠진다.
 */
export function cityMapViews({
  state,
  events,
  currentAreaId,
  now = new Date(),
}: CityMapInput): CityMapRegionView[] {
  const views: CityMapRegionView[] = []

  for (const def of CITY_MAP_REGIONS) {
    if (!isRegionVisible(def, state)) continue

    if (def.id === 'OLD_QUARRY') {
      views.push({
        def,
        area: null,
        label: '오래된 채석장',
        icon: '⛏️',
        statusLine: '공원 바깥쪽 길로',
        tone: 'QUIET',
        npcs: [],
        overflow: 0,
        dot: false,
        current: false,
      })
      continue
    }

    const area = findArea(def.id)
    const here = def.npcAnchorPct ? npcsHere(area.id, now) : []
    const status = statusOf(area, here.length, now)
    const current = area.id === currentAreaId

    views.push({
      def,
      area,
      label: area.name,
      icon: area.icon,
      statusLine: current ? '지금 여기' : status.line,
      tone: current ? 'CURRENT' : status.tone,
      npcs: here.slice(0, NPC_CHIPS_VISIBLE),
      overflow: Math.max(0, here.length - NPC_CHIPS_VISIBLE),
      dot: hasNews(area.id, state, events, now),
      current,
    })
  }

  return views
}

/** 자리표가 빠진 동네가 없는지 (테스트와 개발용 검수판이 본다) */
export function areasWithoutRegion(): AreaId[] {
  const mapped = new Set(CITY_MAP_REGIONS.map((r) => r.id))
  return AREAS.filter((a) => !mapped.has(a.id)).map((a) => a.id)
}
