import { useState } from 'react'
import { AREAS, findArea } from '@/lib/rpg/content'
import { todayKey } from '@/lib/date'
import { TIME_LABEL, timeBand } from '@/lib/rpg/time'
import { SHOPS, isShopOpen, shopOpeningLabel, shopStatus } from '@/lib/city/shops'
import { allNpcSpots, isWeekendDay, npcsAway, npcsHere } from '@/lib/city/routine'

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
            <span>{npc.avatar}</span>
            <span className="font-semibold">{npc.name}</span>
            <span className="ml-auto text-inkdim">
              {spot === 'OFFSCREEN' ? '보이지 않음' : findArea(spot).name}
              {spot !== npc.areaId && spot !== 'OFFSCREEN' && ' (원래 동네 아님)'}
            </span>
          </li>
        ))}
      </ul>

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
