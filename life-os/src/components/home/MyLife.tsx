import type { Checkin, DdayEvent, MounjaroLog, Preferences, WeightLog } from '@/types'
import { PixelImage } from '@/components/pixel/PixelImage'
import { todayKey } from '@/lib/date'
import { ddayFrom } from '@/lib/dday'
import { mounjaroCycle, weightSummary } from '@/lib/analytics'
import { loggingStreak } from '@/lib/xp'
import { effects as fx, icons, items, type PixelAsset } from '@/lib/pixelAssets'
import { haptic } from '@/hooks/useHaptic'

export type LifeSection = 'love' | 'mounjaro' | 'weight' | 'streak'

export interface LifeModule {
  key: LifeSection
  icon: PixelAsset
  label: string
  value: string
  sub: string
  tint: string
  accent: string
}

interface Sources {
  prefs: Preferences
  checkins: Checkin[]
  weights: WeightLog[]
  mounjaro: MounjaroLog[]
  ddays: DdayEvent[]
}

/** 오래 이어지는 것들만. 오늘의 숫자는 위 HUD 가 맡는다. */
export function buildLifeModules({ prefs, checkins, weights, mounjaro }: Sources): LifeModule[] {
  const today = todayKey()
  const out: LifeModule[] = []

  if (prefs.relationshipEnabled && prefs.relationshipStartDate) {
    const d = ddayFrom(prefs.relationshipStartDate, 'since', today)
    out.push({
      key: 'love',
      icon: fx.heart,
      label: 'Love',
      value: d.label,
      sub: prefs.partnerName ? `with ${prefs.partnerName}` : '함께한 날',
      tint: '#FDEFF3',
      accent: '#DE7E92',
    })
  }

  if (prefs.mounjaroEnabled) {
    const cycle = mounjaroCycle(mounjaro, prefs, today)
    out.push({
      key: 'mounjaro',
      icon: icons.log,
      label: 'Mounjaro',
      value: cycle.cycleDay !== null ? `D+${cycle.cycleDay - 1}` : '—',
      sub:
        cycle.daysUntilNext === null
          ? '투약 기록을 적어 주세요'
          : cycle.daysUntilNext >= 0
            ? `다음 예정 ${cycle.daysUntilNext}일 뒤`
            : `예정일에서 ${-cycle.daysUntilNext}일 지남`,
      tint: '#EFF4FB',
      accent: '#6FA8CE',
    })
  }

  const w = weightSummary(weights, prefs, today)
  if (w.smoothed !== null) {
    out.push({
      key: 'weight',
      icon: items.milk,
      label: 'Weight',
      value: `${w.smoothed}kg`,
      sub:
        w.changeAll !== null
          ? `${w.changeAll > 0 ? '+' : ''}${w.changeAll}kg · 7일 평균`
          : '7일 평균',
      tint: '#F1F8F3',
      accent: '#7DB994',
    })
  }

  const streak = loggingStreak(checkins.map((c) => c.date), today)
  out.push({
    key: 'streak',
    icon: icons.xp,
    label: 'Streak',
    value: `${streak}`,
    sub: streak > 0 ? '일 연속 기록' : '오늘부터 시작해요',
    tint: '#FDF6EA',
    accent: '#DFB63F',
  })

  return out
}

/** 2 × 2 격자. 가로로 흘려서 화면 밖으로 잘리지 않게 한다. */
export function MyLife({
  modules,
  onOpen,
}: {
  modules: LifeModule[]
  onOpen: (section: LifeSection) => void
}) {
  if (modules.length === 0) return null

  return (
    <section>
      <div className="mb-2 flex items-center gap-1.5">
        <h2 className="plabel text-ink">My life</h2>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {modules.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => {
              haptic()
              onOpen(m.key)
            }}
            className="press rounded-px4 px-3 py-2.5 text-left"
            style={{ backgroundColor: m.tint }}
          >
            <span className="flex items-center gap-1.5">
              <PixelImage asset={m.icon} height={14} />
              <span
                className="font-pixel text-[10px] uppercase leading-none tracking-[0.05em]"
                style={{ color: m.accent }}
              >
                {m.label}
              </span>
              <span className="ml-auto text-[11px] text-inkfaint">›</span>
            </span>
            <span className="mt-1.5 block font-pixel text-[17px] leading-none tabular-nums">
              {m.value}
            </span>
            <span className="mt-1 block truncate text-[10.5px] leading-tight text-inkdim">
              {m.sub}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
