import { useState } from 'react'
import { AREAS, ITEMS, findArea } from '@/lib/rpg/content'
import { todayKey } from '@/lib/date'
import { TIME_LABEL, timeBand } from '@/lib/rpg/time'
import { SHOPS, isShopOpen, shopOpeningLabel, shopStatus } from '@/lib/city/shops'
import { allNpcSpots, isWeekendDay, npcsAway, npcsHere } from '@/lib/city/routine'
import { livingCandidates, workContext } from '@/lib/city/living'
import { NPCS } from '@/lib/city/npcs'
import { KITCHEN_RECIPES } from '@/lib/kitchen/recipes'
import { emptyBonuses } from '@/lib/rpg/rewards'
import { giftOutcome, isGiftable } from '@/lib/city/friendship'
import { giftLines } from '@/lib/city/gift-lines'
import { LIVING_SCENES, sceneCandidates } from '@/lib/city/scenes'
import { createDefaultState } from '@/store/defaultState'
import { NpcFace } from '@/components/city/NpcFace'
import { cn } from '@/components/ui/cn'

/**
 * 개발용 도시 검수판.
 *
 * 주소에 ?dev=city 를 붙이면 나온다. 화면 어디에도 들어가는 길은 없다.
 *
 * 시간을 여기서만 바꿔본다 — 저장에는 손대지 않는다.
 * `fakeTime` 을 저장에 넣으면 검수용 시간이 진짜 저장으로 굳어서,
 * 나중에 그 저장을 연 사람은 영영 화요일 밤에 산다.
 */

const HOURS = [7, 10, 13, 16, 19, 22, 2]

export function CityLab() {
  const [offsetDays, setOffsetDays] = useState(0)
  const [hour, setHour] = useState<number | null>(null)

  const base = new Date()
  const now = new Date(base)
  now.setDate(now.getDate() + offsetDays)
  if (hour !== null) now.setHours(hour, 0, 0, 0)

  const spots = allNpcSpots(now)

  return (
    <div className="min-h-[100dvh] bg-canvas px-4 py-6 text-ink">
      <h1 className="font-game text-[13px] tracking-[0.14em] text-coral-deep">CITY LAB</h1>
      <p className="mt-1 text-[12px] text-inkdim">
        {todayKey(now)} · {TIME_LABEL[timeBand(now)]} · {now.getHours()}시 ·{' '}
        {isWeekendDay(now) ? '주말' : '평일'}
      </p>

      <h2 className="mt-4 font-game text-[11px] tracking-[0.12em] text-inkdim">날</h2>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[0, 1, 2, 3, 4, 5, 6].map((d) => (
          <Lab key={d} on={offsetDays === d} onClick={() => setOffsetDays(d)}>
            {d === 0 ? '오늘' : `+${d}일`}
          </Lab>
        ))}
      </div>

      <h2 className="mt-4 font-game text-[11px] tracking-[0.12em] text-inkdim">시각</h2>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Lab on={hour === null} onClick={() => setHour(null)}>
          지금
        </Lab>
        {HOURS.map((h) => (
          <Lab key={h} on={hour === h} onClick={() => setHour(h)}>
            {h}시
          </Lab>
        ))}
      </div>

      <h2 className="mt-6 font-game text-[11px] tracking-[0.12em] text-inkdim">사람</h2>
      <ul className="mt-2 space-y-1">
        {spots.map(({ npc, spot }) => (
          <li
            key={npc.id}
            className="flex items-center gap-2 rounded-btn bg-surface px-3 py-2 text-[12px]"
          >
            <NpcFace id={npc.id} avatar={npc.avatar} size={22} shape="round" />
            <span className="font-semibold">{npc.name}</span>
            <span className="ml-auto text-inkdim">
              {spot === 'OFFSCREEN' ? '보이지 않음' : findArea(spot).name}
              {spot !== npc.areaId && spot !== 'OFFSCREEN' && ' (원래 동네 아님)'}
            </span>
          </li>
        ))}
      </ul>

      <h2 className="mt-6 font-game text-[11px] tracking-[0.12em] text-inkdim">
        생활 대사 — 지금 이 자리에서 할 말
      </h2>
      <ul className="mt-2 space-y-1">
        {spots.map(({ npc, spot }) => {
          const areaId = spot === 'OFFSCREEN' ? null : spot
          const pool = livingCandidates({ npc, areaId, now })
          return (
            <li key={npc.id} className="rounded-btn bg-surface px-3 py-2 text-[12px]">
              <span className="inline-flex items-center gap-1 font-semibold">
                <NpcFace id={npc.id} avatar={npc.avatar} size={18} shape="round" />
                {npc.name}
              </span>
              <span className="ml-2 text-[11px] text-inkdim">
                {areaId ? findArea(areaId).name : '도시에 없음'} ·{' '}
                {workContext(npc, areaId, now) === 'WORK' ? '일하는 중' : '일 밖'} · 후보{' '}
                {pool.length}
              </span>
              <ul className="mt-1 space-y-0.5">
                {pool.map((line) => (
                  <li key={line.id} className="text-[11.5px] text-inkdim">
                    · {line.text}
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>

      <h2 className="mt-6 font-game text-[11px] tracking-[0.12em] text-inkdim">
        리빙신 — 지금 이 시각의 후보
      </h2>
      <SceneLab now={now} />

      <h2 className="mt-6 font-game text-[11px] tracking-[0.12em] text-inkdim">
        선물 — 사람 × 물건
      </h2>
      <GiftLab />

      <h2 className="mt-6 font-game text-[11px] tracking-[0.12em] text-inkdim">동네</h2>
      <ul className="mt-2 space-y-1">
        {AREAS.map((area) => (
          <li key={area.id} className="rounded-btn bg-surface px-3 py-2 text-[12px]">
            <span className="font-semibold">
              {area.icon} {area.name}
            </span>
            <span className="ml-2 text-inkdim">
              {npcsHere(area.id, now)
                .map((n) => n.name)
                .join(' · ') || '아무도 없음'}
            </span>
            {npcsAway(area.id, now).length > 0 && (
              <span className="ml-2 text-[11px] text-inkdim/70">
                (비움: {npcsAway(area.id, now).map((n) => n.name).join(' · ')})
              </span>
            )}
          </li>
        ))}
      </ul>

      <h2 className="mt-6 font-game text-[11px] tracking-[0.12em] text-inkdim">가게</h2>
      <ul className="mt-2 space-y-1">
        {SHOPS.map((shop) => (
          <li
            key={shop.id}
            className="flex items-center gap-2 rounded-btn bg-surface px-3 py-2 text-[12px]"
          >
            <span>{shop.icon}</span>
            <span className="font-semibold">{shop.name}</span>
            <span className="ml-auto text-inkdim">
              {isShopOpen(shop, now) ? '영업 중' : shopStatus(shop, now) === 'AFTER' ? '영업 종료' : '영업 전'}
              {shopOpeningLabel(shop) ? ` · ${shopOpeningLabel(shop)}` : ' · 늘 열림'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * 여덟 장면이 지금 왜 뜨는지 · 왜 안 뜨는지.
 *
 * 저장은 건드리지 않는다 — 여기서는 아무것도 안 본 새 저장으로만 따진다.
 * 실제 저장의 seenSceneIds 를 여기서 지우면 검수하다가 진짜 기록이 날아간다.
 */
function SceneLab({ now }: { now: Date }) {
  const fresh = createDefaultState()
  const areas = [...new Set(LIVING_SCENES.map((s) => s.areaId))]
  const rows = areas.flatMap((areaId) => sceneCandidates(fresh, areaId, now))

  return (
    <ul className="mt-2 space-y-0.5">
      {rows.map(({ scene, seen, bandOk, hereOk }) => {
        const on = !seen && bandOk && hereOk
        const why = [
          bandOk ? null : '시간대 아님',
          hereOk ? null : '사람이 여기 없음',
          seen ? '이미 봄' : null,
        ].filter(Boolean)
        return (
          <li
            key={scene.id}
            className="flex items-center gap-2 rounded-btn bg-surface px-3 py-1.5 text-[11.5px]"
          >
            <span className={cn('font-game text-[9.5px]', on ? 'text-coral-deep' : 'text-inkfaint')}>
              {on ? '●' : '○'}
            </span>
            <span className="min-w-0 flex-1 truncate">
              {scene.id}
              <span className="ml-1.5 text-inkfaint">
                {findArea(scene.areaId).name} · {scene.bands.join('·')}
              </span>
            </span>
            <span className="shrink-0 text-inkdim">
              {scene.participants
                .map((n) => allNpcSpots(now).find((s) => s.npc.id === n)?.npc.name)
                .join(' × ')}
            </span>
            {why.length > 0 && (
              <span className="shrink-0 text-[10.5px] text-inkfaint">{why.join(' · ')}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * 누구에게 무엇을 주면 어떻게 되는지 한 판에 본다.
 *
 * 저장에는 손대지 않는다 — 여기서 실제로 주지 않고, 결과만 계산해 본다.
 * 스물넷 × 서른을 눈으로 훑는 게 목적이라 화면은 아주 촘촘하다.
 */
function GiftLab() {
  const [npcId, setNpcId] = useState(NPCS[0].id)
  const npc = NPCS.find((n) => n.id === npcId) ?? NPCS[0]

  const things = [
    ...ITEMS.filter(isGiftable).map((i) => ({
      id: i.id,
      name: i.name,
      icon: i.icon,
      tags: i.giftTags ?? [],
    })),
    ...KITCHEN_RECIPES.map((r) => ({
      id: r.outputItemId,
      name: r.name,
      icon: r.icon,
      tags: r.giftTags,
    })),
  ]

  const tone = { LOVE: 'text-coral-deep', LIKE: 'text-inkdim', NEUTRAL: 'text-inkfaint' } as const

  return (
    <div className="mt-2">
      <div className="flex flex-wrap gap-1.5">
        {NPCS.map((n) => (
          <Lab key={n.id} on={n.id === npcId} onClick={() => setNpcId(n.id)}>
            {n.name}
          </Lab>
        ))}
      </div>

      <p className="mt-2 text-[11px] text-inkdim">
        결 {npc.likes.join(' · ')} · 콕 집은 것 {npc.loves.length}개
      </p>

      <ul className="mt-2 space-y-0.5">
        {things.map((thing) => {
          const { preference, gained } = giftOutcome(npc, thing.id, thing.tags, emptyBonuses())
          return (
            <li
              key={thing.id}
              className="flex items-center gap-2 rounded-btn bg-surface px-3 py-1.5 text-[12px]"
            >
              <span>{thing.icon}</span>
              <span className="min-w-0 flex-1 truncate">{thing.name}</span>
              <span className={cn('font-game text-[10px]', tone[preference])}>{preference}</span>
              <span className="w-6 text-right text-[11px] text-inkdim">+{gained}</span>
            </li>
          )
        })}
      </ul>

      <ul className="mt-2 space-y-0.5">
        {(['NEUTRAL', 'LIKE', 'LOVE'] as const).map((pref) => (
          <li key={pref} className="rounded-btn bg-surface px-3 py-1.5 text-[11.5px]">
            <span className={cn('font-game text-[10px]', tone[pref])}>{pref}</span>
            <span className="ml-2 text-inkdim">{giftLines(npc.id, pref).join(' / ')}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Lab({
  on,
  onClick,
  children,
}: {
  on?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-pill px-3 py-1.5 text-[11.5px] ring-1 ${
        on ? 'bg-coral-soft text-ink ring-coral' : 'bg-surface text-inkdim ring-line'
      }`}
    >
      {children}
    </button>
  )
}
