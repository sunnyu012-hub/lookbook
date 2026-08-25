import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { Checkin, LifeEvent, MounjaroLog, NightCheckout, WeightLog } from '@/types'
import { EnergyBar } from './EnergyBar'
import { PipRow } from './PipRow'
import { PixelImage } from './PixelImage'
import { formatShort, formatSleep } from '@/lib/date'
import { modeMetaOrNull } from '@/lib/energy'
import { MODE_CHARACTER, characters, effects as fx, icons, items as pixelItems } from '@/lib/pixelAssets'
import { CATEGORY_META } from '@/lib/lifeCategories'
import { iconOfTag, tintOfTag } from '@/lib/events'
import type { LifeDomain } from '@/lib/domains'
import type { QuickLog } from '@/lib/os2/types'
import { MOOD_BY_VALUE } from '@/components/quicklog/MoodPicker'
import { timeOf } from '@/components/quicklog/TodayFlow'
import { DomainChips } from '@/components/life/LifeBalanceCard'

interface Props {
  date: string
  dayNumber: number | null
  checkin: Checkin | null
  weight?: WeightLog | null
  mounjaro?: MounjaroLog | null
  events?: LifeEvent[]
  /** 그날 적어 둔 "있었던 일" 태그 */
  tags?: string[]
  /** 그날의 밤 기록 */
  night?: NightCheckout | null
  /** 그날 완료한 퀘스트 수 — 개별로 늘어놓지 않고 한 줄로만 */
  questCount?: number
  /** 그날 기록이 쌓인 영역 */
  domains?: { key: LifeDomain; value: number }[]
  /** 그날의 Quick Log — Check-in 과 나란히 보여 준다. 대체하지 않는다 */
  quickLogs?: QuickLog[]
  onOpenQuickLog?: (log: QuickLog) => void
  onClose: () => void
  onEdit: (date: string) => void
  onDelete: (date: string) => void
}

/** 그날의 기록을 작은 RPG 일지처럼 */
export function DaySheet({
  date,
  dayNumber,
  checkin,
  weight = null,
  mounjaro = null,
  events = [],
  tags = [],
  night = null,
  questCount = 0,
  domains = [],
  quickLogs = [],
  onOpenQuickLog,
  onClose,
  onEdit,
  onDelete,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const meta = modeMetaOrNull(checkin?.mode)

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-ink/30" />

      <div
        className="relative w-full max-w-[460px] animate-risein rounded-t-px5 border-[1.5px] border-border bg-ivory px-4 pt-4"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 18px)' }}
      >
        <header className="mb-3 flex items-center gap-3">
          <PixelImage asset={checkin?.mode ? MODE_CHARACTER[checkin.mode] : characters.idle} height={54} />
          <div className="flex-1">
            <p className="font-pixel text-[14px] uppercase leading-none">
              {dayNumber ? `Day ${String(dayNumber).padStart(3, '0')}` : formatShort(date)}
            </p>
            <p className="plabel mt-1.5">{formatShort(date)}</p>
          </div>
          {meta && <PixelImage asset={meta.pill} height={22} />}
        </header>

        {tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full px-2 py-[3px] text-[11.5px] leading-none"
                style={{ backgroundColor: tintOfTag(tag) }}
              >
                <PixelImage asset={iconOfTag(tag)} height={12} />
                {tag}
              </span>
            ))}
          </div>
        )}

        {quickLogs.length > 0 && (
          <div className="mb-3">
            <p className="plabel mb-1.5">QUICK LOGS</p>
            <ul className="space-y-1">
              {quickLogs.map((log) => (
                <li key={log.id}>
                  <button
                    type="button"
                    disabled={!onOpenQuickLog}
                    onClick={() => onOpenQuickLog?.(log)}
                    className="press flex w-full items-start gap-2 rounded-px3 bg-cream px-2 py-1.5 text-left disabled:opacity-100"
                  >
                    <span className="text-[16px] leading-none" aria-hidden>
                      {MOOD_BY_VALUE[log.mood].emoji}
                    </span>
                    <span className="plabel shrink-0">{timeOf(log.loggedAt)}</span>
                    {log.text && (
                      <span className="min-w-0 flex-1 truncate text-[12.5px]">{log.text}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(questCount > 0 || domains.length > 0) && (
          <div className="mb-3 space-y-2">
            {questCount > 0 && (
              <p className="flex items-center gap-2 text-[12.5px]">
                <PixelImage asset={icons.xp} height={15} />
                <span className="text-inkdim">퀘스트</span>
                <span className="ml-auto font-pixel text-[12px]">{questCount}개 완료</span>
              </p>
            )}
            {domains.length > 0 && (
              <div>
                <p className="plabel mb-1.5">LIFE DOMAINS</p>
                <DomainChips domains={domains} limit={4} />
              </div>
            )}
          </div>
        )}

        {night && (
          <div className="mb-3 rounded-px3 border border-dashed border-border bg-cream px-3 py-2.5">
            <p className="plabel mb-1.5 flex items-center gap-1.5">
              <PixelImage asset={icons.sleep} height={13} />
              밤 기록
            </p>
            {night.daySatisfaction != null && (
              <p className="text-[12.5px] text-inkdim">
                하루 만족도 {night.daySatisfaction} / 5
              </p>
            )}
            {night.bestThing && (
              <p className="mt-1 text-[13px] leading-relaxed">좋았던 것 — {night.bestThing}</p>
            )}
            {night.hardestThing && (
              <p className="mt-1 text-[13px] leading-relaxed">힘들었던 것 — {night.hardestThing}</p>
            )}
            {night.diary && (
              <p className="mt-1 text-[13px] leading-relaxed">“{night.diary}”</p>
            )}
          </div>
        )}

        {checkin ? (
          <>
            {checkin.energyScore != null && meta && (
              <div className="mb-3">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <PixelImage asset={icons.energy} height={16} />
                  <span className="plabel text-ink">Energy</span>
                  <span className="ml-auto font-pixel text-[14px]">
                    {checkin.energyScore}
                    <span className="text-[10px] text-inkdim"> / 100</span>
                  </span>
                </div>
                <EnergyBar score={checkin.energyScore} color={meta.hex} height={12} />
              </div>
            )}

            <dl className="divide-y divide-dashed divide-border border-y border-dashed border-border">
              {checkin.sleepHours != null && (
                <Row label="Sleep" icon={icons.sleep}>
                  <span className="font-pixel text-[12px]">{formatSleep(checkin.sleepHours)}</span>
                </Row>
              )}
              {checkin.mood != null && (
                <Row label="Mood" icon={icons.mood}>
                  <PipRow asset={icons.mood} value={checkin.mood} size={15} label="Mood" />
                </Row>
              )}
              {checkin.focus != null && (
                <Row label="Focus" icon={icons.focus}>
                  <PipRow asset={icons.focus} value={checkin.focus} size={15} label="Focus" />
                </Row>
              )}
              {checkin.bodyPain != null && (
                <Row label="Body" icon={icons.body}>
                  <PipRow asset={icons.body} value={5 - checkin.bodyPain} size={15} label="Body" />
                </Row>
              )}
              <Row label="Items" icon={icons.caffeine}>
                <span className="flex items-center gap-2 text-[12px] text-inkdim">
                  {checkin.caffeineConsumed && (
                    <span className="flex items-center gap-1">
                      <PixelImage asset={icons.caffeine} height={16} />
                      {checkin.caffeineTime ?? ''}
                    </span>
                  )}
                  {checkin.exercise && (
                    <span className="flex items-center gap-1">
                      <PixelImage asset={icons.exercise} height={16} />
                      {checkin.exerciseType ?? ''}
                    </span>
                  )}
                  {!checkin.caffeineConsumed && !checkin.exercise && '없음'}
                </span>
              </Row>
            </dl>

            {(weight || mounjaro || events.length > 0) && (
              <ul className="mt-3 space-y-1.5">
                {weight && (
                  <li className="flex items-center gap-2 text-[12.5px]">
                    <PixelImage asset={pixelItems.milk} height={16} />
                    <span className="text-inkdim">체중</span>
                    <span className="ml-auto font-pixel text-[12px]">{weight.weightKg}kg</span>
                  </li>
                )}
                {mounjaro && (
                  <li className="flex items-center gap-2 text-[12.5px]">
                    <PixelImage asset={icons.log} height={16} />
                    <span className="text-inkdim">투약 기록</span>
                    <span className="ml-auto font-pixel text-[12px]">{mounjaro.doseMg}mg</span>
                  </li>
                )}
                {events.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-[12.5px]">
                    <PixelImage asset={CATEGORY_META[e.category].icon} height={16} />
                    <span className="truncate">{e.title}</span>
                  </li>
                ))}
              </ul>
            )}

            {checkin.highlight && (
              <p className="mt-3 flex items-start gap-1.5 text-[13px] leading-relaxed">
                <PixelImage asset={fx.sparkle01} height={14} className="mt-0.5" />
                {checkin.highlight}
              </p>
            )}

            {checkin.memo && (
              <p className="mt-3 rounded-px3 border border-dashed border-border bg-cream px-3 py-2 text-[13px] leading-relaxed">
                “{checkin.memo}”
              </p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(date)}
                className="press flex-1 rounded-px4 border-[1.5px] border-pinkdeep bg-pink py-3 font-pixel text-[11px] uppercase text-white"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(date)}
                className="press rounded-px4 border-[1.5px] border-border bg-ivory px-4 py-3 font-pixel text-[11px] uppercase text-inkdim"
              >
                Delete
              </button>
            </div>
          </>
        ) : (
          <div className="pb-2">
            <p className="body-ko mb-4">이 날은 기록이 없어요. 지금 채워 넣을 수 있어요.</p>
            <button
              type="button"
              onClick={() => onEdit(date)}
              className="press w-full rounded-px4 border-[1.5px] border-pinkdeep bg-pink py-3 font-pixel text-[11px] uppercase text-white"
            >
              Save this day
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

function Row({
  label,
  icon,
  children,
}: {
  label: string
  icon: import('@/lib/pixelAssets').PixelAsset
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 py-2.5">
      <PixelImage asset={icon} height={16} />
      <dt className="plabel text-ink">{label}</dt>
      <dd className="ml-auto">{children}</dd>
    </div>
  )
}
