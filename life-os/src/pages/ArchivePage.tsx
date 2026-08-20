/**
 * MY ARCHIVE — 내가 어떻게 살아왔는지 찾아볼 수 있는 곳.
 *
 * 데이터베이스 화면처럼 만들지 않는다. 픽셀 다이어리에 가깝게 둔다.
 * 세 가지로만 본다: 달력 / 흐름 / 찾기.
 */
import { useMemo, useState } from 'react'
import type {
  Checkin,
  LifeEvent,
  LifeEventInput,
  MounjaroLog,
  NightCheckout,
  Preferences,
  WeeklyReset,
  WeightLog,
} from '@/types'
import {
  ARCHIVE_KINDS,
  buildArchive,
  groupByDate,
  searchArchive,
  timelineEntries,
  type ArchiveEntry,
  type ArchiveInput,
  type ArchiveKind,
  type ArchivePeriod,
} from '@/lib/analytics/archive'
import { DOMAINS, type LifeDomain } from '@/lib/domains'
import { CalendarGrid, CALENDAR_METRICS, type CalendarMetric, type DayMarkers } from '@/components/pixel/CalendarGrid'
import { DaySheet } from '@/components/pixel/DaySheet'
import { PixelImage } from '@/components/pixel/PixelImage'
import { formatShort, monthLabel, todayKey } from '@/lib/date'
import { MODE_META } from '@/lib/energy'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'
import type { DayQuests } from '@/lib/quests/master'
import type { Quest } from '@/lib/quests/types'
import type { Insight } from '@/lib/analytics/insightEntity'
import { todayDomains } from '@/lib/analytics/lifeBalance'

type View = 'calendar' | 'timeline' | 'explore'

const VIEWS: { key: View; label: string; ko: string }[] = [
  { key: 'calendar', label: 'Calendar', ko: '달력' },
  { key: 'timeline', label: 'Timeline', ko: '흐름' },
  { key: 'explore', label: 'Explore', ko: '찾기' },
]

const PERIODS: { key: ArchivePeriod; label: string }[] = [
  { key: 7, label: '7일' },
  { key: 30, label: '30일' },
  { key: 90, label: '3개월' },
  { key: 'all', label: '전체' },
]

/** 한 번에 그리는 줄 수 — 끝없이 길어지지 않게 끊는다 */
const PAGE = 60

interface Props {
  checkins: Checkin[]
  byDate: Map<string, Checkin>
  nights: NightCheckout[]
  nightsByDate: Map<string, NightCheckout>
  weights: WeightLog[]
  weightsByDate: Map<string, WeightLog>
  mounjaro: MounjaroLog[]
  mounjaroByDate: Map<string, MounjaroLog>
  lifeEvents: LifeEvent[]
  eventsByDate: Map<string, LifeEvent[]>
  eventLog: Record<string, string[]>
  questLog: Record<string, DayQuests>
  customQuests: Quest[]
  weeklyResets: WeeklyReset[]
  insights: Insight[]
  prefs: Preferences
  onEdit: (date: string) => void
  onDelete: (date: string) => Promise<void>
  onAddEvent: (input: LifeEventInput) => Promise<unknown>
  onRemoveEvent: (id: string) => Promise<void>
}

export function ArchivePage(props: Props) {
  const now = new Date()
  const [view, setView] = useState<View>('calendar')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [metric, setMetric] = useState<CalendarMetric>('mode')
  const [selected, setSelected] = useState<string | null>(null)
  const [visible, setVisible] = useState(PAGE)

  // 찾기
  const [query, setQuery] = useState('')
  const [kinds, setKinds] = useState<ArchiveKind[]>([])
  const [domains, setDomains] = useState<LifeDomain[]>([])
  const [period, setPeriod] = useState<ArchivePeriod>('all')

  const archiveInput: ArchiveInput = useMemo(
    () => ({
      checkins: props.checkins,
      nights: props.nights,
      weights: props.weights,
      mounjaro: props.mounjaro,
      lifeEvents: props.lifeEvents,
      eventLog: props.eventLog,
      questLog: props.questLog,
      customQuests: props.customQuests,
      weeklyResets: props.weeklyResets,
      insights: props.insights,
      prefs: props.prefs,
      favoriteQuests: props.prefs.favoriteQuests,
    }),
    [props],
  )

  const entries = useMemo(() => buildArchive(archiveInput), [archiveInput])

  const results = useMemo(
    () => searchArchive(entries, { text: query, kinds, domains, period, today: todayKey() }),
    [entries, query, kinds, domains, period],
  )

  const timeline = useMemo(
    () => groupByDate(timelineEntries(searchArchive(entries, { period: 'all' }))),
    [entries],
  )

  const markers = useMemo(() => {
    const map = new Map<string, DayMarkers>()
    const mark = (date: string, key: keyof DayMarkers) => {
      map.set(date, { ...(map.get(date) ?? {}), [key]: true })
    }
    props.weights.forEach((w) => mark(w.date, 'weight'))
    props.mounjaro.forEach((m) => mark(m.date, 'mounjaro'))
    props.checkins.forEach((c) => c.exercise && mark(c.date, 'exercise'))
    props.lifeEvents.forEach((e) => mark(e.date, 'memory'))
    return map
  }, [props.weights, props.mounjaro, props.checkins, props.lifeEvents])

  const monthly = useMemo(() => {
    const items = props.checkins.filter((c) => {
      const [y, m] = c.date.split('-').map(Number)
      return y === year && m - 1 === month
    })
    const scores = items.map((c) => c.energyScore).filter((s): s is number => s != null)
    return {
      count: items.length,
      avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    }
  }, [props.checkins, year, month])

  const dayNumbers = useMemo(() => {
    const map = new Map<string, number>()
    ;[...props.checkins]
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .forEach((c, i) => map.set(c.date, i + 1))
    return map
  }, [props.checkins])

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  const toggle = <T,>(list: T[], value: T, set: (next: T[]) => void) => {
    haptic()
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  return (
    <div className="space-y-3">
      <header>
        <h1 className="font-pixel text-[16px] uppercase leading-none tracking-[0.04em]">
          My archive
        </h1>
        <p className="plabel mt-1.5">{entries.length}개의 기록이 쌓였어요</p>

        <div className="mt-3 flex gap-1.5">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              aria-pressed={view === v.key}
              onClick={() => {
                haptic()
                setView(v.key)
              }}
              className={cn(
                'flex-1 rounded-px3 border-[1.5px] py-2 font-pixel text-[10px] uppercase tracking-[0.03em]',
                view === v.key
                  ? 'border-pinkdeep bg-pinksoft text-pinkdeep'
                  : 'border-border bg-cream text-inkfaint',
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </header>

      {view === 'calendar' && (
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

          {/* 지표 고르기 */}
          <div className="-mx-4 overflow-x-auto px-4">
            <div className="flex w-max gap-1.5 pb-1">
              {CALENDAR_METRICS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  aria-pressed={metric === m.key}
                  onClick={() => setMetric(m.key)}
                  className={cn(
                    'rounded-full border-[1.5px] px-2.5 py-1.5 font-pixel text-[9px] uppercase',
                    metric === m.key
                      ? 'border-pinkdeep bg-pinksoft text-pinkdeep'
                      : 'border-border bg-cream text-inkfaint',
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <CalendarGrid
            year={year}
            month={month}
            byDate={props.byDate}
            selected={selected}
            onSelect={setSelected}
            metric={metric}
            markers={markers}
            sleepGoalHours={props.prefs.sleepGoalHours}
          />

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1">
            <Legend color="#7DB994" label="체중" />
            <Legend color="#6FA8CE" label="투약" />
            <Legend color="#DFB63F" label="운동" />
            <Legend color="#DE7E92" label="순간" star />
          </div>

          {metric === 'mode' && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1">
              {(['RECOVERY', 'EASY', 'NORMAL', 'POWER'] as const).map((mode) => (
                <span key={mode} className="flex items-center gap-1.5">
                  <PixelImage asset={MODE_META[mode].icon} height={14} />
                  <span className="plabel">{mode}</span>
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'timeline' && (
        <>
          {timeline.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-inkfaint">
              아직 쌓인 기록이 없어요.
            </p>
          ) : (
            <>
              <ul className="mt-1">
                {timeline.slice(0, visible).map(({ date, items }) => (
                  <li key={date} className="list-none">
                    <TimelineDay
                      date={date}
                      items={items}
                      checkin={props.byDate.get(date) ?? null}
                      onOpen={() => setSelected(date)}
                    />
                  </li>
                ))}
              </ul>
              {visible < timeline.length && (
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + PAGE)}
                  className="press w-full rounded-px3 border-[1.5px] border-border bg-ivory py-2.5 font-pixel text-[11px] uppercase text-inkdim shadow-hard"
                >
                  더 보기 ({timeline.length - visible})
                </button>
              )}
            </>
          )}
        </>
      )}

      {view === 'explore' && (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="SEARCH MY LIFE…"
            className="w-full rounded-px4 border-[1.5px] border-border bg-ivory px-3.5 py-3 text-[13.5px] outline-none placeholder:font-pixel placeholder:text-[10px] placeholder:uppercase placeholder:text-inkfaint focus:border-pinkdeep"
          />

          <div className="flex gap-1.5">
            {PERIODS.map((p) => (
              <button
                key={String(p.key)}
                type="button"
                aria-pressed={period === p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  'flex-1 rounded-px3 border-[1.5px] py-1.5 font-pixel text-[9px] uppercase',
                  period === p.key
                    ? 'border-pinkdeep bg-pinksoft text-pinkdeep'
                    : 'border-border bg-cream text-inkfaint',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="-mx-4 overflow-x-auto px-4">
            <div className="flex w-max gap-1.5 pb-1">
              {ARCHIVE_KINDS.map((k) => {
                const on = kinds.includes(k.key)
                return (
                  <button
                    key={k.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(kinds, k.key, setKinds)}
                    className={cn(
                      'flex items-center gap-1 rounded-full border-[1.5px] px-2.5 py-1.5 font-pixel text-[9px] uppercase',
                      on
                        ? 'border-pinkdeep bg-pinksoft text-pinkdeep'
                        : 'border-border bg-cream text-inkfaint',
                    )}
                  >
                    <PixelImage asset={k.icon} height={12} className={on ? undefined : 'opacity-50 saturate-0'} />
                    {k.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="-mx-4 overflow-x-auto px-4">
            <div className="flex w-max gap-1.5 pb-1">
              {DOMAINS.map((d) => {
                const on = domains.includes(d.key)
                return (
                  <button
                    key={d.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(domains, d.key, setDomains)}
                    className={cn(
                      'flex items-center gap-1 rounded-full border-[1.5px] px-2.5 py-1.5 font-pixel text-[9px] uppercase',
                      on ? 'shadow-hard' : 'border-border bg-cream text-inkfaint',
                    )}
                    style={on ? { borderColor: d.accent, backgroundColor: d.tint, color: d.accent } : undefined}
                  >
                    <PixelImage asset={d.icon} height={12} className={on ? undefined : 'opacity-50 saturate-0'} />
                    {d.label}
                  </button>
                )
              })}
            </div>
          </div>

          <p className="plabel px-1">{results.length}개 찾았어요</p>

          {results.length === 0 ? (
            <p className="py-10 text-center text-[13px] leading-relaxed text-inkfaint">
              찾는 게 없어요.
              <br />
              다른 말이나 다른 기간으로 찾아 보세요.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {groupByDate(results)
                .slice(0, visible)
                .map(({ date, items }) => (
                  <li key={date}>
                    <button
                      type="button"
                      onClick={() => setSelected(date)}
                      className="mb-1 flex w-full items-center gap-2 text-left"
                    >
                      <span className="plabel">{formatShort(date)}</span>
                      <span className="h-px flex-1 bg-border" />
                      <span className="text-[11px] text-inkfaint">›</span>
                    </button>
                    <ul className="space-y-1">
                      {items.map((e) => (
                        <EntryRow key={e.id} entry={e} />
                      ))}
                    </ul>
                  </li>
                ))}
            </ul>
          )}
        </>
      )}

      {selected && (
        <DaySheet
          date={selected}
          dayNumber={dayNumbers.get(selected) ?? null}
          checkin={props.byDate.get(selected) ?? null}
          weight={props.weightsByDate.get(selected) ?? null}
          mounjaro={props.mounjaroByDate.get(selected) ?? null}
          events={props.eventsByDate.get(selected) ?? []}
          tags={props.eventLog[selected] ?? []}
          night={props.nightsByDate.get(selected) ?? null}
          questCount={countQuests(props.questLog[selected])}
          domains={todayDomains(selected, archiveInput)}
          onClose={() => setSelected(null)}
          onEdit={(date) => {
            setSelected(null)
            props.onEdit(date)
          }}
          onDelete={(date) => {
            void props.onDelete(date)
            setSelected(null)
          }}
        />
      )}
    </div>
  )
}

const countQuests = (day: DayQuests | undefined) =>
  day ? Object.values(day.completions).reduce((s, n) => s + n, 0) : 0

function Legend({ color, label, star }: { color: string; label: string; star?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      {star ? (
        <span className="text-[9px] leading-none" style={{ color }}>
          ✦
        </span>
      ) : (
        <span className="block h-[6px] w-[6px] rounded-full" style={{ backgroundColor: color }} />
      )}
      <span className="plabel">{label}</span>
    </span>
  )
}

function EntryRow({ entry }: { entry: ArchiveEntry }) {
  return (
    <li className="flex items-start gap-2 rounded-px3 bg-ivory px-2.5 py-2">
      <PixelImage asset={entry.icon} height={15} className="mt-0.5 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="font-pixel text-[9.5px] uppercase tracking-[0.02em] text-inkdim">
          {entry.title}
        </span>
        {entry.detail && (
          <span className="mt-0.5 block text-[12.5px] leading-relaxed">{entry.detail}</span>
        )}
      </span>
      {entry.value && (
        <span className="shrink-0 font-pixel text-[10px] text-inkdim">{entry.value}</span>
      )}
    </li>
  )
}

/** 흐름 한 칸 — 중요한 것만 세운다 */
function TimelineDay({
  date,
  items,
  checkin,
  onOpen,
}: {
  date: string
  items: ArchiveEntry[]
  checkin: Checkin | null
  onOpen: () => void
}) {
  const notable = items.filter((e) => e.notable)
  const rest = items.filter((e) => !e.notable && e.kind !== 'day')
  const meta = checkin?.mode ? MODE_META[checkin.mode] : null

  return (
    <div className="flex gap-3 border-l-[1.5px] border-dashed border-border pl-3">
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
          <span className="ml-auto text-[11px] text-inkfaint">›</span>
        </button>

        {notable.length > 0 && (
          <ul className="mt-1.5 space-y-1">
            {notable.map((e) => (
              <li key={e.id} className="flex items-start gap-1.5">
                <PixelImage asset={e.icon} height={14} className="mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1 text-[12.5px] leading-relaxed">
                  {e.detail ?? e.title}
                </span>
              </li>
            ))}
          </ul>
        )}

        {rest.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {rest.slice(0, 6).map((e) => (
              <span
                key={e.id}
                className="flex items-center gap-1 rounded-full bg-cream px-2 py-[3px] text-[11px]"
              >
                <PixelImage asset={e.icon} height={11} />
                {e.value ?? e.title}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

