import type {
  AppState,
  AreaDef,
  CollectionShopDef,
  NpcDef,
  NpcStates,
  SecretView,
} from '@/types'
import { npcsInArea } from './npcs'
import { isShopOpen, shopInArea } from './shops'
import { collectionShopsInArea, isCollectionShopOpen, openingLabel } from '@/lib/collection/shops'
import { hasFreshStock } from '@/lib/collection/progress'
import { secretsInArea } from '@/lib/discovery/secrets'
import { isGardenUnlocked, unlockProgress } from '@/lib/garden/derive'
import { isQuarryUnlocked, unlockProgress as quarryProgress } from '@/lib/quarry/derive'
import { isGateFound } from '@/lib/dungeon/derive'
import { isNightOpen } from '@/lib/rpg/time'
import { todayKey } from '@/lib/date'

/**
 * 이 동네에서 지금 **할 수 있는 것**.
 *
 * 지도가 설명 카드 목록이던 게 문제였다. 카페 거리를 눌러도 평판 막대와
 * 버프 설명과 어울리는 퀘스트 목록이 나오고, 정작 미나에게 말을 걸려면
 * 그 아래로 한참 내려가야 했다. 지도는 읽는 곳이 아니라 **가는 곳**이다.
 *
 * 그래서 화면이 아니라 여기서 목록을 만든다. 사람·가게·정원·채석장·작업실이
 * 전부 같은 모양(HubAction)으로 나오면, 화면은 그걸 격자로 깔기만 하면 된다.
 *
 * 새 시스템을 만들지 않는다 — 전부 이미 있던 npcs·shops·garden·quarry·dungeon·
 * secrets 에서 읽어온다. 저장하는 것도 없다.
 */

export type HubActionKind =
  | 'NPC'
  | 'SHOP'
  | 'COLLECTION_SHOP'
  | 'WORKSHOP'
  | 'GARDEN'
  | 'QUARRY'
  | 'DUNGEON'
  | 'SECRET'

export interface HubAction {
  key: string
  kind: HubActionKind
  icon: string
  title: string
  /** 한 줄 설명. 두 줄로 넘어가지 않게 짧게 만든다. */
  subtitle: string
  /**
   * 지금은 못 누르는 것.
   *
   * 목록에서 빼지 않는다 — 주말에만 서는 장을 평일에 감춰버리면
   * "언제 열려?" 를 물을 곳이 없어진다. 자리는 두고 흐리게만 만든다.
   */
  disabled: boolean
  /** 아직 못 찾은 곳. 이름 대신 낌새만 보여준다. */
  hidden?: boolean
  /** 오늘 아직 안 들른 가게 */
  fresh?: boolean
  npc?: NpcDef
  shop?: CollectionShopDef
  secret?: SecretView
}

interface HubInput {
  area: AreaDef
  state: AppState
  npcs: NpcStates
  now?: Date
}

/**
 * 격자에 깔 순서.
 *
 * 사람이 먼저다. 가게는 언제든 그대로 있지만 사람은 오늘 할 말이 있다.
 * 그다음이 가게, 그다음이 이 동네에서만 갈 수 있는 곳들이다.
 */
export function areaActions({ area, state, now = new Date() }: HubInput): HubAction[] {
  const nightOpen = isNightOpen(now)
  const actions: HubAction[] = []

  // ── 사람 ──────────────────────────────────────────────
  for (const npc of npcsInArea(area.id)) {
    const away = npc.nightOnly === true && !nightOpen
    actions.push({
      key: `npc:${npc.id}`,
      kind: 'NPC',
      icon: npc.avatar,
      title: npc.name,
      subtitle: away ? '밤에만 보여' : npc.role,
      disabled: away,
      npc,
    })
  }

  // ── 가게 ──────────────────────────────────────────────
  const shop = shopInArea(area.id)
  if (shop) {
    const open = isShopOpen(shop, now)
    actions.push({
      key: `shop:${shop.id}`,
      kind: 'SHOP',
      icon: shop.icon,
      title: shop.name,
      subtitle: open ? '구경하기' : '지금은 닫혀 있어',
      disabled: !open,
    })
  }

  for (const collectionShop of collectionShopsInArea(area.id)) {
    const open = isCollectionShopOpen(collectionShop, now)
    actions.push({
      key: `cshop:${collectionShop.id}`,
      kind: 'COLLECTION_SHOP',
      icon: collectionShop.icon,
      title: collectionShop.name,
      subtitle: open ? '오늘 진열 보기' : (openingLabel(collectionShop) ?? '지금은 닫혀 있어'),
      disabled: !open,
      // 오늘 아직 안 들른 가게. 안 갔다고 뭐라 하는 게 아니라 어디를 보면 되는지만 알려준다.
      fresh: open && hasFreshStock(state.collection, collectionShop.id, todayKey(now)),
      shop: collectionShop,
    })
  }

  // ── 이 동네에만 있는 곳 ───────────────────────────────
  if (area.id === 'HOME_BASE') {
    actions.push({
      key: 'workshop',
      kind: 'WORKSHOP',
      icon: '🧰',
      title: '작은 작업실',
      subtitle: '주운 재료로 만들기',
      disabled: false,
    })
  }

  if (area.id === 'GREEN_PARK') {
    // 아직 못 찾았으면 조건을 숫자로 적지 않는다 — 그건 할 일 목록이 된다.
    actions.push(
      isGardenUnlocked(state)
        ? {
            key: 'garden',
            kind: 'GARDEN',
            icon: '🌿',
            title: '작은 정원',
            subtitle: '심어둔 것 보기',
            disabled: false,
          }
        : {
            key: 'garden',
            kind: 'GARDEN',
            icon: '🌿',
            title: '???',
            subtitle:
              unlockProgress(state) >= 0.5
                ? '공원 너머에 작은 길이 있는 것 같다'
                : '공원 안쪽은 아직 잘 모르겠다',
            disabled: true,
            hidden: true,
          },
    )

    actions.push(
      isQuarryUnlocked(state)
        ? {
            key: 'quarry',
            kind: 'QUARRY',
            icon: '⛏️',
            title: '공원 바깥쪽 길',
            subtitle: '오래된 채석장으로',
            disabled: false,
          }
        : {
            key: 'quarry',
            kind: 'QUARRY',
            icon: '🪨',
            title: '오래된 길',
            subtitle:
              quarryProgress(state) >= 0.5
                ? '바깥쪽으로 길이 이어지는 것 같다'
                : '이 너머는 아직 잘 모르겠다',
            disabled: true,
            hidden: true,
          },
    )

    // 채석장 안쪽. 문을 찾기 전에는 여기 아무것도 안 뜬다 —
    // 못 가는 곳을 지도에 미리 찍어두면 그건 기대가 아니라 잠긴 문이다.
    if (isGateFound(state)) {
      actions.push({
        key: 'dungeon',
        kind: 'DUNGEON',
        icon: '🚪',
        title: '잠든 돌문',
        subtitle: '이제 문이 열린다',
        disabled: false,
      })
    }
  }

  // ── 낌새 ──────────────────────────────────────────────
  // 안 보이면 아무 줄도 안 만든다. 모든 동네에 늘 표시가 뜨면 그 표시에 뜻이 없어진다.
  for (const view of secretsInArea(state, area.id)) {
    const found = view.stage === 'FOUND'
    actions.push({
      key: `secret:${view.def.id}`,
      kind: 'SECRET',
      icon: found ? view.def.icon : '✨',
      title: found ? view.def.name : '뭔가 더 있는 것 같다',
      subtitle: found ? view.def.description : view.def.hint,
      // 비밀 장소는 눌러서 여는 곳이 아니라 알아채는 것이다
      disabled: true,
      hidden: !found,
      secret: view,
    })
  }

  return actions
}

/**
 * 지도 카드에 적을 짧은 한 줄.
 *
 * "미나 · 카페 · 상점" 처럼 여기 뭐가 있는지만. 평판 숫자도, 하트도, 퀘스트 개수도
 * 여기 안 적는다 — 카드 여섯 장에 그게 다 붙으면 지도가 아니라 표가 된다.
 *
 * 반 칸짜리 카드에 셋을 적으면 세 번째가 "June..." 으로 잘린다.
 * 잘린 이름은 안 적은 것만도 못하다 — 그래서 몇 개까지 적을지는 부르는 쪽이 정한다.
 */
export function areaHighlights(area: AreaDef, max = 3, now: Date = new Date()): string[] {
  const nightOpen = isNightOpen(now)
  const names: string[] = []

  for (const npc of npcsInArea(area.id)) {
    if (npc.nightOnly && !nightOpen) continue
    names.push(npc.name)
  }

  const shop = shopInArea(area.id)
  if (shop) names.push(shop.name)
  for (const collectionShop of collectionShopsInArea(area.id)) {
    names.push(collectionShop.name)
  }

  return names.slice(0, max)
}
