import { useMemo, useState } from 'react'
import type { AppState, CityEvent } from '@/types'
import { SectionHeader } from '@/components/layout/ScreenHeader'
import { BottomSheet } from '@/components/ui/BottomSheet'
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
import { unreadChapters } from '@/lib/discovery/stories'
import { secretViews } from '@/lib/discovery/secrets'
import { hintedCompanions } from '@/lib/discovery/companions'
import { isNightOpen } from '@/lib/rpg/time'
import { withJosa } from '@/lib/labels'
import { cn } from '@/components/ui/cn'

interface TodayInTheCityProps {
  state: AppState
  events: CityEvent[]
  onOpenMap: () => void
  /** 발견 쪽 줄은 지도가 아니라 그리로 간다 */
  onOpenDiscovery: () => void
}

interface Line {
  icon: string
  text: string
  /** 눌렀을 때 어디로. 안 적으면 지도로 간다 — 소식은 대부분 도시 얘기다. */
  to?: 'MAP' | 'DISCOVERY'
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
/** 홈에 바로 내놓는 줄 수. 넷째부터는 "더 보기" 안으로 간다. */
const HOME_LINES = 3

export function TodayInTheCity({
  state,
  events,
  onOpenMap,
  onOpenDiscovery,
}: TodayInTheCityProps) {
  const [allOpen, setAllOpen] = useState(false)

  const lines = useMemo(() => buildLines(state, events), [state, events])
  const shown = lines.slice(0, HOME_LINES)
  const rest = lines.length - shown.length

  if (lines.length === 0) return null

  const goTo = (line: Line) => {
    setAllOpen(false)
    if (line.to === 'DISCOVERY') onOpenDiscovery()
    else onOpenMap()
  }

  return (
    <section>
      <SectionHeader title="오늘의 소식" />
      {/*
        흰 카드를 세 장 만들지 않는다. 한 칸 안에 줄로 나눈다 —
        홈이 길어지는 이유의 절반이 "모든 게 각자 카드" 였다.
      */}
      <ul className="divide-y divide-line/70 overflow-hidden rounded-card border border-line/70 bg-surface shadow-soft">
        {shown.map((line, i) => (
          <NewsRow key={i} line={line} onSelect={() => goTo(line)} />
        ))}

        {/*
          홈에서 펼치지 않는다. 펼치면 홈이 다시 길어지고, 접으면 방금 읽던
          자리가 사라진다. 나머지는 시트에서 한 번에 본다.
        */}
        {rest > 0 && (
          <li>
            <button
              type="button"
              onClick={() => setAllOpen(true)}
              className="flex w-full items-center justify-center gap-1 px-4 py-3 text-[12.5px] font-medium text-inkdim transition-transform duration-150 ease-out active:scale-[0.99]"
            >
              오늘 소식 {rest}개 더 보기
              <span className="text-[11px] leading-none text-inkfaint">›</span>
            </button>
          </li>
        )}
      </ul>

      <BottomSheet open={allOpen} onClose={() => setAllOpen(false)} title="오늘의 소식">
        <h2 className="text-[19px] font-bold text-ink">오늘의 소식</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-inkdim">
          오늘만 참인 것들이야. 눌러서 바로 가도 돼.
        </p>
        <ul className="mt-4 divide-y divide-line/70 overflow-hidden rounded-card border border-line/70 bg-surface">
          {lines.map((line, i) => (
            <NewsRow key={i} line={line} onSelect={() => goTo(line)} />
          ))}
        </ul>
      </BottomSheet>
    </section>
  )
}

/**
 * 소식 한 줄.
 *
 * 두 줄까지 내준다. 한 줄로 잘라버리면 "도시 전체 · 작은 축제 — 모든 코인…"
 * 처럼 정작 무슨 일인지가 사라진다. 그럴 거면 안 적은 것만도 못하다.
 */
function NewsRow({ line, onSelect }: { line: Line; onSelect: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex w-full items-center gap-2.5 px-4 py-3.5 text-left',
          'transition-transform duration-150 ease-out active:scale-[0.99]',
        )}
      >
        <span className="w-6 shrink-0 text-center text-[16px] leading-[1.35]">{line.icon}</span>
        <span className="line-clamp-2 min-w-0 flex-1 text-[13.5px] leading-snug text-ink">
          {line.text}
        </span>
        <span className="shrink-0 text-[11px] text-inkfaint">›</span>
      </button>
    </li>
  )
}

/**
 * 오늘 알려줄 만한 것만 고른다.
 *
 * 순서: 도시 이벤트 → 새로 받을 수 있는 의뢰 → 밤 시장 → 오늘 바뀐 진열.
 *
 * 여기서는 자르지 않는다. 홈에 몇 줄을 낼지, 나머지를 어디서 볼지는
 * 화면이 정한다 — 여기서 잘라버리면 "더 보기" 로도 못 보는 소식이 생긴다.
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

  // 도시 사람이 하고 싶어하는 이야기. 한 명만 말한다 —
  // 넷이 동시에 부르면 그건 알림이 아니라 밀린 일이다.
  const chapter = unreadChapters(state)[0]
  if (chapter) {
    const npc = findNpc(chapter.npcId)
    if (npc) {
      lines.push({ icon: npc.avatar, text: `${npc.name}가 하고 싶은 이야기가 있는 것 같아.` })
    }
  }

  // 어디선가 낌새. 아직 못 찾은 곳 하나만.
  const secret = secretViews(state).find((v) => v.stage === 'HINTED')
  if (secret) {
    lines.push({ icon: '✨', text: secret.def.hint, to: 'DISCOVERY' })
  }

  // 아직 못 만난 아이
  const buddy = hintedCompanions(state)[0]
  if (buddy) {
    lines.push({ icon: '🐾', text: buddy.hint, to: 'DISCOVERY' })
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


  return lines
}
