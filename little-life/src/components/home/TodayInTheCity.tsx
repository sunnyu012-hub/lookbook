import { useMemo } from 'react'
import type { AppState, CityEvent } from '@/types'
import { SectionHeader } from '@/components/layout/ScreenHeader'
import { findArea } from '@/lib/rpg/content'
import { NPCS, findNpc, meetsLevel } from '@/lib/city/npcs'
import { SHOPS } from '@/lib/city/shops'
import {
  COLLECTION_SHOPS,
  isCollectionShopOpen,
  isWeekend,
  shopsSellingToday,
  todayListings,
} from '@/lib/collection/shops'
import { findCollectionItem } from '@/lib/collection/catalog'
import { pendingDelivery } from '@/lib/collection/delivery'
import { isNightOpen } from '@/lib/rpg/time'
import { withJosa } from '@/lib/labels'
import { cn } from '@/components/ui/cn'

interface TodayInTheCityProps {
  state: AppState
  events: CityEvent[]
  onOpenMap: () => void
}

interface Line {
  icon: string
  text: string
}

/**
 * 오늘만 참인 가게 소식.
 *
 * 가게가 여덟이고 저마다 할 말이 있어서, 다 적으면 이 카드가 가게 소식지가 된다.
 * 그래서 제일 볼 만한 것 두 줄만 고른다.
 *
 * 귀한 것 → 깎아주는 것 → 오늘까지 순으로 본다.
 * 값이 싼 건 내일도 살 수 있지만 오늘 들어온 귀한 것은 오늘뿐이다.
 */
function shopLines(): Line[] {
  const rare: Line[] = []
  const sales: Line[] = []
  const leaving: Line[] = []

  for (const shop of COLLECTION_SHOPS) {
    if (!isCollectionShopOpen(shop)) continue
    const listings = todayListings(shop)

    // 오늘 이 가게에서 제일 귀한 것. 처음 들어온 것일 때만 말한다 —
    // 어제도 있던 게 "들어왔어" 로 뜨면 그건 거짓말이다.
    const find = listings.find((l) => l.rareFind && l.isNew && !l.locked)
    if (find) {
      const item = findCollectionItem(find.itemId)
      if (item && (item.rarity === 'EPIC' || item.rarity === 'LEGENDARY')) {
        rare.push({ icon: '✦', text: `${shop.name}에 ${item.nameKo} 들어왔어.` })
      }
    }

    const sale = listings.find((l) => l.wasPrice !== undefined)
    if (sale) {
      const item = findCollectionItem(sale.itemId)
      if (item) {
        sales.push({ icon: shop.icon, text: `${shop.name} · ${item.nameKo} 오늘 ${sale.price}코인.` })
      }
    }

    // 오늘까지인 것 중에서는 귀한 것만. 흔한 게 빠지는 건 아쉽지 않다.
    const going = listings.find(
      (l) => l.lastDay && !l.locked && (l.limited || findCollectionItem(l.itemId)?.rarity === 'RARE'),
    )
    if (going) {
      const item = findCollectionItem(going.itemId)
      if (item) {
        leaving.push({ icon: '⏳', text: `${shop.name} · ${withJosa(item.nameKo, '은', '는')} 오늘까지.` })
      }
    }
  }

  return [...rare, ...sales, ...leaving].slice(0, 2)
}

/**
 * 오늘의 도시 한 장.
 *
 * 캐릭터보다 위로 올라오지 않는다. 이 앱의 중심은 여전히 내 하루다.
 * 소식은 서너 줄이면 충분하고, 없으면 굳이 만들지 않는다.
 */
export function TodayInTheCity({ state, events, onOpenMap }: TodayInTheCityProps) {
  const lines = useMemo(() => buildLines(state, events), [state, events])
  if (lines.length === 0) return null

  return (
    <section>
      <SectionHeader
        title="오늘의 도시"
        trailing={
          <button
            type="button"
            onClick={onOpenMap}
            className="rounded-pill bg-sunken px-2.5 py-1 text-[11px] font-medium text-inkdim"
          >
            {/* 아래 내비게이션에도 MAP 이 있다. 이름이 같으면 소리로 읽을 때 구별이 안 된다. */}
            지도 열기
          </button>
        }
      />
      <ul className="space-y-1.5">
        {lines.map((line, i) => (
          <li
            key={i}
            className={cn(
              'flex items-start gap-2.5 rounded-card border border-line/70 bg-surface px-3.5 py-3 shadow-soft',
            )}
          >
            <span className="text-[17px] leading-[1.35]">{line.icon}</span>
            <span className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-ink">
              {line.text}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * 오늘 알려줄 만한 것만 고른다.
 *
 * 순서: 도시 이벤트 → 새로 받을 수 있는 의뢰 → 밤 시장 → 오늘 바뀐 진열.
 * 다 합쳐 네 줄을 넘기지 않는다. 넘치면 그냥 목록이 되고, 목록은 안 읽힌다.
 */
function buildLines(state: AppState, events: CityEvent[]): Line[] {
  const lines: Line[] = []

  // 찾던 물건이 오늘 어느 가게에 들어왔는지.
  // 이 카드에서 제일 반가운 줄이라 맨 위에 둔다.
  for (const itemId of state.collection.wishlist) {
    const found = shopsSellingToday(itemId)
    if (found.length === 0) continue
    const item = findCollectionItem(itemId)
    if (!item) continue
    lines.push({ icon: '💫', text: `${found[0].name}에 ${item.nameKo} 들어왔어.` })
    break
  }

  // 문 앞에 온 것. 홈에 카드가 따로 있지만, 여기에도 한 줄 —
  // 아래로 스크롤하지 않는 날에는 카드를 못 보고 지나간다.
  if (pendingDelivery(state)) {
    lines.push({ icon: '📦', text: '문 앞에 뭐가 와 있어.' })
  }

  // 오늘만 참인 것을 먼저. 이벤트는 매일 몇 개씩 있어서 이 자리를 다 먹는다.
  lines.push(...shopLines())

  // 이벤트는 둘까지. 셋 넘어가면 그냥 목록이 된다.
  for (const event of events.slice(0, 2)) {
    const where = event.areaId ? findArea(event.areaId).name : '도시 전체'
    lines.push({ icon: event.icon, text: `${where} · ${event.name} — ${event.effectLabel}` })
  }

  // 지금 받을 수 있는 새 의뢰
  const openChains = NPCS.flatMap((npc) => {
    const npcState = state.npcs[npc.id]
    if (!npcState) return []
    return npc.chains
      .filter((chain) => !npcState.clearedChainIds.includes(chain.id))
      .filter((chain) => meetsLevel(npcState.friendship, chain.requiresLevel))
      .filter((chain) => !state.quests.some((q) => q.chainId === chain.id && !q.completed))
      .map((chain) => ({ npc, chain }))
  })

  if (openChains.length > 0) {
    const { npc } = openChains[0]
    // 의뢰 수가 아니라 사람 수를 센다. Mina 는 의뢰를 두 개 들고 있어서,
    // 의뢰를 세면 6명뿐인 도시에 "다른 6명" 같은 말이 나온다.
    const others = new Set(openChains.map((c) => c.npc.id)).size - 1
    lines.push({
      icon: npc.avatar,
      text:
        others > 0
          ? `${npc.name} — 부탁할 게 있대. 다른 ${others}명도.`
          : `${npc.name} — 부탁할 게 있대.`,
    })
  }

  // 주말에만 서는 장. 평일에도 한 줄 두는 건 "언제 서는지" 를 묻지 않게 하려는 것이다.
  const flea = COLLECTION_SHOPS.find((s) => s.weekendOnly)
  if (flea) {
    lines.push(
      isWeekend()
        ? { icon: '🧺', text: `오늘은 ${flea.name} 서는 날.` }
        : { icon: '🧺', text: `${flea.name} 은 이번 주말에 다시 서.` },
    )
  }

  // 밤에만 여는 곳. 열렸을 때만 지금 무엇이 있는지까지 말한다 —
  // 닫혀 있는 가게의 진열을 미리 알려주면 열릴 때까지 기다리게 된다.
  const market = SHOPS.find((s) => s.nightOnly)
  if (market) {
    const noa = findNpc('NOA')
    lines.push(
      isNightOpen()
        ? { icon: '🏮', text: `${market.name} 열렸어. ${noa?.name ?? ''} 도 나와 있을 거야.` }
        : { icon: '🌙', text: `${market.name} 은 밤 9시가 지나면 열려.` },
    )
  }


  return lines.slice(0, 5)
}
