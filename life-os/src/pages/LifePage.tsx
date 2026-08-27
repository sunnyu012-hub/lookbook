import type {
  Checkin,
  DdayEvent,
  DdayInput,
  LifeEvent,
  MounjaroInput,
  MounjaroLog,
  Preferences,
  WeightInput,
  WeightLog,
} from '@/types'
import { PixelImage } from '@/components/pixel/PixelImage'
import { WeightPanel } from '@/components/life/WeightPanel'
import { MounjaroPanel } from '@/components/life/MounjaroPanel'
import { LovePanel } from '@/components/life/LovePanel'
import { DdayPanel } from '@/components/life/DdayPanel'
import { buildLifeModules, type LifeSection } from '@/components/home/MyLife'
import { todayKey } from '@/lib/date'
import { ddayFrom } from '@/lib/dday'
import { mounjaroCycle, weightSummary } from '@/lib/analytics'
import { effects as fx, icons, items, type PixelAsset } from '@/lib/pixelAssets'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

export type LifeTab = LifeSection | 'ddays' | null

interface Props {
  prefs: Preferences
  checkins: Checkin[]
  weights: WeightLog[]
  mounjaro: MounjaroLog[]
  lifeEvents: LifeEvent[]
  ddays: DdayEvent[]
  section: LifeTab
  onSection: (section: LifeTab) => void
  onSaveWeight: (input: WeightInput) => Promise<unknown>
  onRemoveWeight: (date: string) => Promise<void>
  onSaveMounjaro: (input: MounjaroInput) => Promise<unknown>
  onRemoveMounjaro: (date: string) => Promise<void>
  onSaveDday: (input: DdayInput & { id?: string }) => Promise<unknown>
  onRemoveDday: (id: string) => Promise<void>
  onOpenLog: () => void
  onOpenSettings: () => void
  /** 최근 기록 수 — My Rhythm 한 줄에 쓴다 */
  quickLogDays: number
  onOpenRhythm: () => void
  onOpenDna: () => void
}

/**
 * LIFE — 오래 이어지는 기록들.
 * 분석 대시보드가 아니라, 항목마다 한 장씩 넘겨 보는 기록장에 가깝게.
 */
export function LifePage({
  prefs,
  checkins,
  weights,
  mounjaro,
  lifeEvents,
  ddays,
  section,
  onSection,
  onSaveWeight,
  onRemoveWeight,
  onSaveMounjaro,
  onRemoveMounjaro,
  onSaveDday,
  onRemoveDday,
  onOpenLog,
  onOpenSettings,
  quickLogDays,
  onOpenRhythm,
  onOpenDna,
}: Props) {
  if (section) {
    return (
      <div className="space-y-3">
        <header className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSection(null)}
            aria-label="돌아가기"
            className="press h-8 w-8 rounded-px3 border-[1.5px] border-border bg-ivory font-pixel text-[12px] shadow-hard"
          >
            ‹
          </button>
          <h1 className="font-pixel text-[15px] uppercase leading-none tracking-[0.04em]">
            {SECTION_TITLE[section]}
          </h1>
        </header>

        {section === 'love' && (
          <LovePanel
            prefs={prefs}
            lifeEvents={lifeEvents}
            onAdd={onOpenLog}
            onOpenSettings={onOpenSettings}
          />
        )}
        {section === 'mounjaro' && (
          <MounjaroPanel
            prefs={prefs}
            mounjaro={mounjaro}
            checkins={checkins}
            onSave={onSaveMounjaro}
            onRemove={onRemoveMounjaro}
            onOpenSettings={onOpenSettings}
          />
        )}
        {section === 'weight' && (
          <WeightPanel
            prefs={prefs}
            weights={weights}
            onSave={onSaveWeight}
            onRemove={onRemoveWeight}
          />
        )}
        {(section === 'ddays' || section === 'streak') && (
          <DdayPanel ddays={ddays} onSave={onSaveDday} onRemove={onRemoveDday} />
        )}
      </div>
    )
  }

  return (
    <Hub
      prefs={prefs}
      checkins={checkins}
      weights={weights}
      mounjaro={mounjaro}
      ddays={ddays}
      onSection={onSection}
      onOpenSettings={onOpenSettings}
      quickLogDays={quickLogDays}
      onOpenRhythm={onOpenRhythm}
      onOpenDna={onOpenDna}
    />
  )
}

const SECTION_TITLE: Record<Exclude<LifeTab, null>, string> = {
  love: 'Together',
  mounjaro: 'Mounjaro',
  weight: 'Weight',
  streak: 'D-Day',
  ddays: 'D-Day',
}

function Hub({
  prefs,
  checkins,
  weights,
  mounjaro,
  ddays,
  onSection,
  onOpenSettings,
  quickLogDays,
  onOpenRhythm,
  onOpenDna,
}: {
  prefs: Preferences
  checkins: Checkin[]
  weights: WeightLog[]
  mounjaro: MounjaroLog[]
  ddays: DdayEvent[]
  onSection: (section: LifeTab) => void
  onOpenSettings: () => void
  quickLogDays: number
  onOpenRhythm: () => void
  onOpenDna: () => void
}) {
  const today = todayKey()
  const modules = buildLifeModules({ prefs, checkins, weights, mounjaro, ddays })
  const byKey = new Map(modules.map((m) => [m.key, m]))

  const rows: {
    key: Exclude<LifeTab, null>
    icon: PixelAsset
    title: string
    value: string
    sub: string
    tint: string
  }[] = []

  if (prefs.relationshipEnabled && prefs.relationshipStartDate) {
    const d = ddayFrom(prefs.relationshipStartDate, 'since', today)
    rows.push({
      key: 'love',
      icon: fx.heart,
      title: prefs.partnerName ? `${prefs.partnerName}` : '함께한 날',
      value: d.countLabel,
      sub: d.nextMilestone
        ? `${d.nextMilestone.label}까지 ${d.nextMilestone.remaining}일`
        : '오늘도 하루',
      tint: '#FDEFF3',
    })
  }

  if (prefs.mounjaroEnabled) {
    const cycle = mounjaroCycle(mounjaro, prefs, today)
    rows.push({
      key: 'mounjaro',
      icon: icons.log,
      title: 'Mounjaro',
      value: cycle.cycleDay !== null ? `사이클 ${cycle.cycleDay}일차` : '기록 없음',
      sub: `${cycle.totalDoses}번 적어 뒀어요`,
      tint: '#EFF4FB',
    })
  }

  const w = weightSummary(weights, prefs, today)
  rows.push({
    key: 'weight',
    icon: items.milk,
    title: '체중',
    value: w.smoothed !== null ? `${w.smoothed}kg` : '기록 없음',
    sub: byKey.get('weight')?.sub ?? '7일 평균으로 봐요',
    tint: '#F1F8F3',
  })

  rows.push({
    key: 'ddays',
    icon: icons.xp,
    title: 'D-Day',
    value: ddays.length > 0 ? `${ddays.length}개` : '없음',
    sub: '세고 싶은 날들',
    tint: '#FDF6EA',
  })

  return (
    <div className="space-y-3">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-pixel text-[16px] uppercase leading-none tracking-[0.04em]">
            My life
          </h1>
          <p className="ko mt-2">오래 이어지는 기록들을 모아 뒀어요.</p>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          className="press flex items-center gap-1.5 rounded-px3 border-[1.5px] border-border bg-ivory px-2.5 py-1.5 font-pixel text-[9px] uppercase text-inkdim shadow-hard"
        >
          <PixelImage asset={icons.work} height={14} />
          Settings
        </button>
      </header>

      {/*
        My Rhythm 은 위 목록과 성격이 다르다.
        위는 하나씩 넘겨 보는 기록장이고 이건 그 기록들에서 나온 숫자다.
        그래서 줄을 나눠 뒀다.
      */}
      <button
        type="button"
        onClick={() => {
          haptic()
          onOpenRhythm()
        }}
        className="press flex w-full items-center gap-3 rounded-px4 border-[1.5px] border-border bg-skysoft px-3.5 py-3 text-left shadow-hard"
      >
        <PixelImage asset={icons.mood} height={24} />
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-medium leading-tight">My rhythm</span>
          <span className="mt-1 block truncate text-[11.5px] leading-tight text-inkdim">
            {quickLogDays >= 3
              ? `${quickLogDays}일치 기록에서 시간대별 흐름을 봐요`
              : '기록이 조금 더 쌓이면 볼 수 있어요'}
          </span>
        </span>
        <span className="text-[12px] text-inkfaint">›</span>
      </button>

      <button
        type="button"
        onClick={() => {
          haptic()
          onOpenDna()
        }}
        className="press flex w-full items-center gap-3 rounded-px4 border-[1.5px] border-border bg-mintsoft px-3.5 py-3 text-left shadow-hard"
      >
        <PixelImage asset={icons.xp} height={24} />
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-medium leading-tight">My DNA</span>
          <span className="mt-1 block truncate text-[11.5px] leading-tight text-inkdim">
            지금까지 관찰된 나의 패턴
          </span>
        </span>
        <span className="text-[12px] text-inkfaint">›</span>
      </button>

      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.key}>
            <button
              type="button"
              onClick={() => {
                haptic()
                onSection(row.key)
              }}
              className={cn(
                'press flex w-full items-center gap-3 rounded-px4 border-[1.5px] border-border px-3.5 py-3 text-left shadow-hard',
              )}
              style={{ backgroundColor: row.tint }}
            >
              <PixelImage asset={row.icon} height={24} />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium leading-tight">{row.title}</span>
                <span className="mt-1 block truncate text-[11.5px] leading-tight text-inkdim">
                  {row.sub}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block font-pixel text-[14px] leading-none tabular-nums">
                  {row.value}
                </span>
              </span>
              <span className="text-[12px] text-inkfaint">›</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
