import { useMemo, useState } from 'react'
import type { Checkin } from '@/types'
import { CalendarGrid } from '@/components/history/CalendarGrid'
import { DaySheet } from '@/components/history/DaySheet'
import { ModeLegend } from '@/components/history/ModeLegend'
import { isSameMonth, monthLabel } from '@/lib/date'

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
    if (items.length === 0) return { count: 0, avg: null as number | null }
    return {
      count: items.length,
      avg: Math.round(items.reduce((sum, c) => sum + c.energyScore, 0) / items.length),
    }
  }, [checkins, year, month])

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()

  return (
    <div>
      <header className="mb-7">
        <p className="label mb-2">HISTORY</p>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-[30px] leading-none tracking-tight">
            {monthLabel(year, month)}
          </h1>
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-label="이전 달"
              onClick={() => shift(-1)}
              className="press h-9 w-9 rounded-full border border-line text-muted"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="다음 달"
              disabled={isCurrentMonth}
              onClick={() => shift(1)}
              className="press h-9 w-9 rounded-full border border-line text-muted disabled:opacity-30"
            >
              ›
            </button>
          </div>
        </div>
      </header>

      <div className="mb-6 flex items-end gap-6 border-b border-line pb-5">
        <div>
          <p className="tnum font-display text-[34px] leading-none">{monthly.count}</p>
          <p className="klabel mt-2">기록한 날</p>
        </div>
        <div>
          <p className="tnum font-display text-[34px] leading-none">{monthly.avg ?? '--'}</p>
          <p className="klabel mt-2">평균 에너지</p>
        </div>
      </div>

      <CalendarGrid
        year={year}
        month={month}
        byDate={byDate}
        selected={selected}
        onSelect={setSelected}
      />

      <div className="mt-6">
        <ModeLegend />
      </div>

      {selected && (
        <DaySheet
          date={selected}
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
