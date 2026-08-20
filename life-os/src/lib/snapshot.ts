/**
 * Today 화면 맨 위의 한 줄 — "지금 내 삶은 이렇다".
 * 설정에서 켜 둔 것만 나온다. 켜지 않은 항목은 아예 만들지 않는다.
 */
import type { Checkin, DdayEvent, LifeEvent, MounjaroLog, Preferences, WeightLog } from '@/types'
import type { SnapshotItem } from '@/components/pixel/SnapshotStrip'
import { todayKey } from './date'
import { ddayFrom } from './dday'
import { effects as fx, icons, items as pixelItems } from './pixelAssets'
import { mounjaroCycle, weightSummary } from './analytics'
import { loggingStreak } from './xp'

export interface SnapshotSources {
  prefs: Preferences
  checkins: Checkin[]
  weights: WeightLog[]
  mounjaro: MounjaroLog[]
  lifeEvents?: LifeEvent[]
  ddays?: DdayEvent[]
  onOpenBody?: () => void
  onOpenTimeline?: () => void
  onOpenSettings?: () => void
}

const KIND_ICON = {
  love: fx.heart,
  health: icons.body,
  life: icons.home,
  goal: icons.xp,
} as const

export function buildSnapshot({
  prefs,
  checkins,
  weights,
  mounjaro,
  ddays = [],
  onOpenBody,
  onOpenTimeline,
  onOpenSettings,
}: SnapshotSources): SnapshotItem[] {
  const today = todayKey()
  const out: SnapshotItem[] = []

  // 연애 D-Day
  if (prefs.relationshipEnabled && prefs.relationshipStartDate) {
    const d = ddayFrom(prefs.relationshipStartDate, 'since', today)
    out.push({
      key: 'love',
      icon: fx.heart,
      label: prefs.partnerName ? prefs.partnerName.slice(0, 6) : 'Together',
      value: d.countLabel,
      sub: d.nextMilestone ? `${d.nextMilestone.label}까지 ${d.nextMilestone.remaining}일` : d.label,
      tint: '#FDEFF3',
      onClick: onOpenTimeline,
    })
  }

  // Mounjaro 사이클
  if (prefs.mounjaroEnabled) {
    const cycle = mounjaroCycle(mounjaro, prefs, today)
    if (cycle.cycleDay !== null) {
      out.push({
        key: 'mounjaro',
        icon: icons.log,
        label: 'Cycle',
        value: `D+${cycle.cycleDay - 1}`,
        sub:
          cycle.daysUntilNext !== null
            ? cycle.daysUntilNext >= 0
              ? `다음 예정 ${cycle.daysUntilNext}일 뒤`
              : `예정일에서 ${-cycle.daysUntilNext}일 지남`
            : undefined,
        tint: '#EFF4FB',
        onClick: onOpenBody,
      })
    } else if (prefs.mounjaroStartDate) {
      out.push({
        key: 'mounjaro',
        icon: icons.log,
        label: 'Cycle',
        value: '—',
        sub: '투약 기록을 적어 주세요',
        tint: '#EFF4FB',
        onClick: onOpenBody,
      })
    }
  }

  // 체중
  const w = weightSummary(weights, prefs, today)
  if (w.smoothed !== null) {
    out.push({
      key: 'weight',
      icon: pixelItems.milk,
      label: 'Weight',
      value: `${w.smoothed}kg`,
      sub:
        w.change30 !== null
          ? `30일 ${w.change30 > 0 ? '+' : ''}${w.change30}kg`
          : '7일 평균',
      tint: '#F1F8F3',
      onClick: onOpenBody,
    })
  }

  // 연속 기록
  const streak = loggingStreak(
    checkins.map((c) => c.date),
    today,
  )
  if (streak > 0) {
    out.push({
      key: 'streak',
      icon: icons.xp,
      label: 'Streak',
      value: `${streak}일`,
      sub: '연속으로 적은 날',
      tint: '#FDF6EA',
    })
  }

  // 직접 넣어 둔 D-Day (고정해 둔 것만)
  ddays
    .filter((d) => d.pinned)
    .slice(0, 3)
    .forEach((d) => {
      const r = ddayFrom(d.startDate, d.countMode, today)
      out.push({
        key: `dday-${d.id}`,
        icon: KIND_ICON[d.kind],
        label: d.title.slice(0, 8),
        value: r.label,
        sub: r.countLabel,
        tint: 'rgba(107, 74, 61, 0.05)',
        onClick: onOpenSettings,
      })
    })

  // Life OS 시작일
  if (prefs.lifeOsStartDate) {
    const d = ddayFrom(prefs.lifeOsStartDate, 'since', today)
    out.push({
      key: 'lifeos',
      icon: icons.home,
      label: 'Life OS',
      value: d.countLabel,
      sub: '함께한 날',
      tint: 'rgba(107, 74, 61, 0.05)',
    })
  }

  return out
}
