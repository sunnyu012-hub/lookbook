import { useMemo, useState } from 'react'
import type {
  Checkin,
  EnergyMode,
  LifeCategory,
  LifeEvent,
  LifeEventInput,
  MounjaroLog,
  NightCheckout,
  Scale5,
  WeightLog,
} from '@/types'
import { CalendarGrid } from '@/components/pixel/CalendarGrid'
import { DaySheet } from '@/components/pixel/DaySheet'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { ChipRow } from '@/components/checkin/Fields'
import { formatShort, isSameMonth, monthLabel, todayKey } from '@/lib/date'
import { MODE_META, modeMetaOrNull } from '@/lib/energy'
import { CATEGORY_META, CATEGORY_ORDER } from '@/lib/lifeCategories'
import { icons, items as pixelItems } from '@/lib/pixelAssets'
import { iconOfTag, tintOfTag } from '@/lib/events'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

const ORDER: EnergyMode[] = ['RECOVERY', 'EASY', 'NORMAL', 'POWER']

type View = 'timeline' | 'calendar'

/** 타임라인에서 한 번에 그리는 날 수 */
const PAGE = 40

/** '2026-08-20' → 'AUG 2026' */
const monthOf = (date?: string) => {
  if (!date) return ''
  const [y, m] = date.split('-').map(Number)
  return monthLabel(y, m - 1).replace(/^(\w{3})\w*/, '$1')
}

interface Props {
  checkins: Checkin[]
  /** 날짜별 "오늘 있었던 일" 태그 */
  tagsByDate: Record<string, string[]>
  /** 날짜별 밤 기록 */
  nightsByDate: Map<string, NightCheckout>
  byDate: Map<string, Checkin>
  weightsByDate: Map<string, WeightLog>
  mounjaroByDate: Map<string, MounjaroLog>
  eventsByDate: Map<string, LifeEvent[]>
  onEdit: (date: string) => void
  onDelete: (date: string) => Promise<void>
  onAddEvent: (input: LifeEventInput) => Promise<unknown>
  onRemoveEvent: (id: string) => Promise<void>
}

export function TimelinePage({
  checkins,
  tagsByDate,
  nightsByDate,
  byDate,
  weightsByDate,
  mounjaroByDate,
  eventsByDate,
  onEdit,
  onDelete,
  onAddEvent,
  onRemoveEvent,
}: Props) {
  const now = new Date()
  const [view, setView] = useState<View>('timeline')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)
  /** 한 번에 보여주는 날 수 — 스크롤이 끝없이 길어지지 않게 끊는다 */
  const [visible, setVisible] = useState(PAGE)

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  const monthly = useMemo(() => {
    const items = checkins.filter((c) => isSameMonth(c.date, year, month))
    const scores = items.map((c) => c.energyScore).filter((s): s is number => s != null)
    return {
      count: items.length,
      avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    }
  }, [checkins, year, month])

  /** 오래된 기록부터 센 날짜 번호 — 상세 창의 DAY 표기에 쓴다 */
  const dayNumbers = useMemo(() => {
    const map = new Map<string, number>()
    ;[...checkins]
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .forEach((c, i) => map.set(c.date, i + 1))
    return map
  }, [checkins])

  /** 체크인 · 체중 · 투약 · 사건을 날짜로 합친다 */
  const days = useMemo(() => {
    const dates = new Set<string>([
      ...checkins.map((c) => c.date),
      ...weightsByDate.keys(),
      ...mounjaroByDate.keys(),
      ...eventsByDate.keys(),
      ...Object.keys(tagsByDate),
      ...nightsByDate.keys(),
    ])
    return Array.from(dates)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((date) => ({
        date,
        checkin: byDate.get(date) ?? null,
        weight: weightsByDate.get(date) ?? null,
        mounjaro: mounjaroByDate.get(date) ?? null,
        events: eventsByDate.get(date) ?? [],
        tags: tagsByDate[date] ?? [],
        night: nightsByDate.get(date) ?? null,
      }))
  }, [checkins, byDate, weightsByDate, mounjaroByDate, eventsByDate, tagsByDate, nightsByDate])

  return (
    <div className="space-y-3">
      <header>
        <h1 className="font-pixel text-[16px] uppercase leading-none tracking-[0.04em]">
          Adventure Log
        </h1>

        <div className="mt-3 flex gap-1.5">
          {(['timeline', 'calendar'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => {
                haptic()
                setView(v)
              }}
              className={cn(
                'flex-1 rounded-px3 border-[1.5px] py-2 font-pixel text-[11px] uppercase tracking-[0.04em]',
                view === v
                  ? 'border-pinkdeep bg-pinksoft text-pinkdeep'
                  : 'border-border bg-cream text-inkfaint',
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </header>

      {view === 'calendar' ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="이전 달"
                onClick={() => shift(-1)}
                className="press h-8 w-8 rounded-px3 border-[1.5px] border-border bg-ivory font-pixel text-[12px] shadow-hard"
              >
                ‹
              </button>
              <p className="font-pixel text-[14px] uppercase">{monthLabel(year, month)}</p>
              <button
                type="button"
                aria-label="다음 달"
                disabled={year === now.getFullYear() && month === now.getMonth()}
                onClick={() => shift(1)}
                className="press h-8 w-8 rounded-px3 border-[1.5px] border-border bg-ivory font-pixel text-[12px] shadow-hard disabled:opacity-30"
              >
                ›
              </button>
            </div>
            <p className="plabel">
              {monthly.count} days · avg {monthly.avg ?? '--'}
            </p>
          </div>

          <CalendarGrid
            year={year}
            month={month}
            byDate={byDate}
            selected={selected}
            onSelect={setSelected}
          />

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 px-1">
            {ORDER.map((mode) => (
              <span key={mode} className="flex items-center gap-1">
                <PixelImage asset={MODE_META[mode].icon} height={18} />
                <span className="plabel">{mode}</span>
              </span>
            ))}
          </div>
        </>
      ) : (
        <>
          {composing ? (
            <EventComposer
              onCancel={() => setComposing(false)}
              onSubmit={async (input) => {
                await onAddEvent(input)
                setComposing(false)
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                haptic()
                setComposing(true)
              }}
              className="press flex w-full items-center justify-center gap-2 rounded-px4 border-[1.5px] border-dashed border-borderdeep bg-cream py-2.5 text-[12.5px] text-inkdim"
            >
              <PixelImage asset={icons.log} height={16} />
              오늘 있었던 일 적기
            </button>
          )}

          {days.length === 0 ? (
            <p className="body-ko py-10 text-center text-inkdim">
              아직 쌓인 이야기가 없어요. 오늘부터 한 줄씩 남겨 볼까요?
            </p>
          ) : (
            <>
              <ul className="mt-1">
                {days.slice(0, visible).map((day, i, list) => (
                  <li key={day.date} className="list-none">
                    {monthOf(day.date) !== monthOf(list[i - 1]?.date) && (
                      <p className="plabel pb-1.5 pt-3 first:pt-0">{monthOf(day.date)}</p>
                    )}
                    <ul>
                      <DayRow
                        {...day}
                        onOpen={() => setSelected(day.date)}
                        onRemoveEvent={onRemoveEvent}
                      />
                    </ul>
                  </li>
                ))}
              </ul>

              {visible < days.length && (
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + PAGE)}
                  className="press w-full rounded-px3 border-[1.5px] border-border bg-ivory py-2.5 font-pixel text-[11px] uppercase text-inkdim shadow-hard"
                >
                  더 보기 ({days.length - visible})
                </button>
              )}
            </>
          )}
        </>
      )}

      {selected && (
        <DaySheet
          date={selected}
          dayNumber={dayNumbers.get(selected) ?? null}
          checkin={byDate.get(selected) ?? null}
          weight={weightsByDate.get(selected) ?? null}
          mounjaro={mounjaroByDate.get(selected) ?? null}
          events={eventsByDate.get(selected) ?? []}
          tags={tagsByDate[selected] ?? []}
          night={nightsByDate.get(selected) ?? null}
          onClose={() => setSelected(null)}
          onEdit={(date) => {
            setSelected(null)
            onEdit(date)
          }}
          onDelete={(date) => {
            void onDelete(date)
            setSelected(null)
          }}
        />
      )}
    </div>
  )
}

function DayRow({
  date,
  checkin,
  weight,
  mounjaro,
  events,
  tags,
  night,
  onOpen,
  onRemoveEvent,
}: {
  date: string
  checkin: Checkin | null
  weight: WeightLog | null
  mounjaro: MounjaroLog | null
  events: LifeEvent[]
  tags: string[]
  night: NightCheckout | null
  onOpen: () => void
  onRemoveEvent: (id: string) => Promise<void>
}) {
  const meta = modeMetaOrNull(checkin?.mode)
  const line = checkin?.highlight || checkin?.memo || night?.bestThing || checkin?.memo || null

  return (
    <li className="flex gap-3 border-l-[1.5px] border-dashed border-border pl-3">
      <div className="flex-1 pb-4">
        <button type="button" onClick={onOpen} className="flex w-full items-center gap-2 text-left">
          <span className="plabel">{formatShort(date)}</span>
          {meta && checkin?.energyScore != null && (
            <span
              className="rounded-full px-2 py-[3px] font-pixel text-[10px] leading-none"
              style={{ backgroundColor: meta.soft, color: meta.hex }}
            >
              {checkin.energyScore}
            </span>
          )}
          {meta && <PixelImage asset={meta.icon} height={16} />}
          {night && <PixelImage asset={icons.sleep} height={14} />}
          <span className="ml-auto text-[11px] text-inkfaint">›</span>
        </button>

        {line && <p className="mt-1.5 text-[13px] leading-relaxed text-ink">{line}</p>}

        {tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] leading-none"
                style={{ backgroundColor: tintOfTag(tag) }}
              >
                <PixelImage asset={iconOfTag(tag)} height={11} />
                {tag}
              </span>
            ))}
          </div>
        )}

        <ul className="mt-1.5 space-y-1">
          {events.map((e) => (
            <li key={e.id} className="flex items-center gap-1.5">
              <PixelImage asset={CATEGORY_META[e.category].icon} height={15} />
              <span className="flex-1 truncate text-[12.5px]">{e.title}</span>
              <button
                type="button"
                aria-label={`${e.title} 지우기`}
                onClick={() => void onRemoveEvent(e.id)}
                className="px-1 text-[13px] leading-none text-inkfaint"
              >
                ×
              </button>
            </li>
          ))}
          {weight && (
            <li className="flex items-center gap-1.5 text-[12px] text-inkdim">
              <PixelImage asset={pixelItems.milk} height={14} />
              {weight.weightKg}kg
            </li>
          )}
          {mounjaro && (
            <li className="flex items-center gap-1.5 text-[12px] text-inkdim">
              <PixelImage asset={icons.log} height={14} />
              투약 기록 {mounjaro.doseMg}mg
            </li>
          )}
        </ul>
      </div>
    </li>
  )
}

function EventComposer({
  onSubmit,
  onCancel,
}: {
  onSubmit: (input: LifeEventInput) => Promise<void>
  onCancel: () => void
}) {
  const [date, setDate] = useState(todayKey())
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<LifeCategory>('note')
  const [detail, setDetail] = useState('')
  const [mood, setMood] = useState<Scale5 | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!title.trim()) return
    setBusy(true)
    try {
      await onSubmit({ date, title, category, detail: detail || null, mood })
    } finally {
      setBusy(false)
    }
  }

  return (
    <PixelPanel title="New entry" icon={icons.log}>
      <input
        type="date"
        value={date}
        max={todayKey()}
        onChange={(e) => setDate(e.target.value)}
        aria-label="날짜"
        className="mb-2 rounded-px2 border-[1.5px] border-border bg-cream px-2 py-1 font-pixel text-[12px]"
      />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={80}
        placeholder="무슨 일이 있었나요?"
        className="w-full border-b border-dashed border-border bg-transparent pb-1.5 text-[14px] placeholder:text-inkfaint focus:outline-none"
      />
      <div className="mt-2">
        <ChipRow
          options={CATEGORY_ORDER.map((c) => ({
            value: c,
            label: CATEGORY_META[c].label,
            icon: CATEGORY_META[c].icon,
          }))}
          value={category}
          onChange={(v) => setCategory((v as LifeCategory) ?? 'note')}
          ariaLabel="카테고리"
        />
      </div>
      <textarea
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        rows={2}
        maxLength={300}
        placeholder="더 적고 싶으면 (선택)"
        className="mt-2 w-full resize-none bg-transparent text-[13px] leading-relaxed placeholder:text-inkfaint focus:outline-none"
      />
      <div className="mt-1 flex items-center gap-2">
        <span className="plabel">Mood</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={mood === n}
              onClick={() => setMood(mood === n ? null : (n as Scale5))}
              className={cn(
                'h-6 w-6 rounded-px2 font-pixel text-[10px]',
                mood === n ? 'bg-pink text-white' : 'bg-border/30 text-inkdim',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy || !title.trim()}
          onClick={() => void submit()}
          className="press flex-1 rounded-px4 border-[1.5px] border-pinkdeep bg-pink py-2.5 font-pixel text-[11px] uppercase text-white disabled:opacity-45"
        >
          {busy ? 'Saving…' : 'Add'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="press rounded-px4 border-[1.5px] border-border bg-ivory px-4 py-2.5 font-pixel text-[11px] uppercase text-inkdim"
        >
          Cancel
        </button>
      </div>
    </PixelPanel>
  )
}
