import type { Checkin } from '@/types'
import { cn } from '@/lib/cn'
import { monthGrid, weekdayLabels } from '@/lib/date'
import { modeMeta } from '@/lib/energy'

interface Props {
  year: number
  month: number
  byDate: Map<string, Checkin>
  selected: string | null
  onSelect: (date: string) => void
}

export function CalendarGrid({ year, month, byDate, selected, onSelect }: Props) {
  const cells = monthGrid(year, month)

  return (
    <div>
      <div className="mb-3 grid grid-cols-7 gap-1.5">
        {weekdayLabels.map((label, i) => (
          <p key={i} className="label text-center">
            {label}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, i) => {
          if (!cell.key) return <div key={`pad-${i}`} />

          const checkin = byDate.get(cell.key)
          const meta = checkin ? modeMeta(checkin.mode) : null

          return (
            <button
              key={cell.key}
              type="button"
              disabled={cell.isFuture}
              onClick={() => onSelect(cell.key as string)}
              className={cn(
                'press relative flex aspect-square flex-col items-center justify-center rounded-xl border transition-colors duration-200',
                selected === cell.key ? 'border-paper' : 'border-line',
                cell.isFuture && 'opacity-25',
                !checkin && 'bg-transparent',
              )}
              style={
                meta ? { backgroundColor: `${meta.hex}1A`, borderColor: `${meta.hex}55` } : undefined
              }
            >
              <span
                className={cn(
                  'tnum text-[11px]',
                  cell.isToday ? 'text-paper' : checkin ? 'text-paper/70' : 'text-faint',
                )}
              >
                {cell.day}
              </span>
              {checkin ? (
                <span className="tnum mt-0.5 font-display text-[15px]" style={{ color: meta!.hex }}>
                  {checkin.energyScore}
                </span>
              ) : (
                <span className="mt-0.5 text-[15px] leading-none text-elevated">·</span>
              )}
              {cell.isToday && (
                <span className="absolute bottom-1 h-[3px] w-[3px] rounded-full bg-paper" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
