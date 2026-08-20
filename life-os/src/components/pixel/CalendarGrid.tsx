import type { Checkin } from '@/types'
import { cn } from '@/lib/cn'
import { monthGrid } from '@/lib/date'
import { modeMetaOrNull } from '@/lib/energy'
import { PixelImage } from './PixelImage'

interface Props {
  year: number
  month: number
  byDate: Map<string, Checkin>
  selected: string | null
  onSelect: (date: string) => void
}

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function CalendarGrid({ year, month, byDate, selected, onSelect }: Props) {
  const cells = monthGrid(year, month)

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-1">
        {WEEK.map((label, i) => (
          <p key={i} className="plabel text-center">
            {label}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell.key) return <div key={`pad-${i}`} />
          const checkin = byDate.get(cell.key)
          const meta = modeMetaOrNull(checkin?.mode)

          return (
            <button
              key={cell.key}
              type="button"
              disabled={cell.isFuture}
              onClick={() => onSelect(cell.key as string)}
              className={cn(
                'flex aspect-square flex-col items-center justify-center gap-0.5 rounded-px3 border transition-colors duration-150',
                selected === cell.key ? 'border-pinkdeep shadow-hardpink' : 'border-border',
                cell.isToday && selected !== cell.key && 'border-dashed border-pinkdeep',
                cell.isFuture && 'opacity-35',
              )}
              style={{ backgroundColor: meta ? meta.soft : 'transparent' }}
            >
              <span className="font-pixel text-[9px] leading-none text-inkdim">{cell.day}</span>
              {meta ? (
                <>
                  <PixelImage asset={meta.icon} height={17} />
                  <span className="font-pixel text-[9px] leading-none" style={{ color: meta.hex }}>
                    {checkin?.energyScore ?? '·'}
                  </span>
                </>
              ) : (
                <span className="text-[10px] leading-none text-inkfaint">·</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
