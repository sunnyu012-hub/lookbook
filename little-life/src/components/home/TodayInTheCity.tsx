import { useMemo } from 'react'
import type { AppState, CityEvent } from '@/types'
import { SectionHeader } from '@/components/layout/ScreenHeader'
import { findArea } from '@/lib/rpg/content'
import { NPCS, findNpc, meetsLevel } from '@/lib/city/npcs'
import { SHOPS } from '@/lib/city/shops'
import { isNightOpen } from '@/lib/rpg/time'
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

  for (const event of events) {
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

  // 밤에만 여는 곳
  const market = SHOPS.find((s) => s.nightOnly)
  if (market) {
    const noa = findNpc('NOA')
    lines.push(
      isNightOpen()
        ? { icon: '🏮', text: `${market.name} 열렸어. ${noa?.name ?? ''} 도 나와 있을 거야.` }
        : { icon: '🌙', text: `${market.name} 은 밤 9시가 지나면 열려.` },
    )
  }

  return lines.slice(0, 4)
}
