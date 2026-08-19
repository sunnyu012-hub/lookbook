import { useMemo, useState } from 'react'
import type { Checkin, EnergyMode } from '@/types'
import { CalendarGrid } from '@/components/pixel/CalendarGrid'
import { DaySheet } from '@/components/pixel/DaySheet'
import { PixelIcon } from '@/components/pixel/PixelIcon'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { formatShort, isSameMonth, monthLabel } from '@/lib/date'
import { MODE_META } from '@/lib/energy'

const ORDER: EnergyMode[] = ['RECOVERY', 'EASY', 'NORMAL', 'POWER']

interface Props {
  checkins: Checkin[]
  byDate: Map<string, Checkin>
  onEdit: (date: string) => void
  onDelete: (date: string) => Promise<void>
}

export function HistoryPage({ checkins, byDate, onEdit, onDelete }: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState<string | null>(null)

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  const monthly = useMemo(() => {
    const items = checkins.filter((c) => isSameMonth(c.date, year, month))
    return {
      count: items.length,
      avg: items.length
        ? Math.round(items.reduce((sum, c) => sum + c.energyScore, 0) / items.length)
        : null,
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

  /** 최근에 남긴 한 줄 메모 — 일지 느낌으로 달력 아래에 붙인다 */
  const recentNotes = useMemo(
    () =>
      checkins
        .filter((c) => c.memo)
        .slice(0, 3)
        .map((c) => ({ date: c.date, memo: c.memo as string, mode: c.mode })),
    [checkins],
  )

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()

  return (
    <div className="space-y-3">
      <header>
        <h1 className="font-pixel text-[18px] uppercase leading-none tracking-[0.04em]">
          Adventure Log
        </h1>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="이전 달"
              onClick={() => shift(-1)}
              className="press h-8 w-8 rounded-px2 border-2 border-ink bg-ivory font-pixel text-[12px]"
            >
              ‹
            </button>
            <p className="font-pixel text-[14px] uppercase">{monthLabel(year, month)}</p>
            <button
              type="button"
              aria-label="다음 달"
              disabled={isCurrentMonth}
              onClick={() => shift(1)}
              className="press h-8 w-8 rounded-px2 border-2 border-ink bg-ivory font-pixel text-[12px] disabled:opacity-30"
            >
              ›
            </button>
          </div>
          <p className="plabel">
            {monthly.count} days · avg {monthly.avg ?? '--'}
          </p>
        </div>
      </header>

      <PixelPanel bodyClassName="p-2.5">
        <CalendarGrid
          year={year}
          month={month}
          byDate={byDate}
          selected={selected}
          onSelect={setSelected}
        />
      </PixelPanel>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1">
        {ORDER.map((mode) => (
          <span key={mode} className="flex items-center gap-1">
            <PixelIcon name={MODE_META[mode].icon} size={16} />
            <span className="plabel">{mode}</span>
          </span>
        ))}
      </div>

      {recentNotes.length > 0 && (
        <PixelPanel title="Recent Notes" icon="book">
          <ul className="space-y-2.5">
            {recentNotes.map((entry) => (
              <li key={entry.date} className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelected(entry.date)}
                  className="flex flex-1 items-start gap-2.5 text-left"
                >
                  <PixelIcon name={MODE_META[entry.mode].icon} size={16} className="mt-0.5" />
                  <span className="flex-1">
                    <span className="plabel">{formatShort(entry.date)}</span>
                    <span className="mt-1 block text-[13px] leading-relaxed">“{entry.memo}”</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </PixelPanel>
      )}

      {selected && (
        <DaySheet
          date={selected}
          dayNumber={dayNumbers.get(selected) ?? null}
          checkin={byDate.get(selected) ?? null}
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
