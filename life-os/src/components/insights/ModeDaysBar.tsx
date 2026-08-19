import type { EnergyMode } from '@/types'
import { MODE_META } from '@/lib/energy'

const ORDER: EnergyMode[] = ['RECOVERY', 'EASY', 'NORMAL', 'POWER']

interface Props {
  modeDays: Record<EnergyMode, number>
  total: number
}

export function ModeDaysBar({ modeDays, total }: Props) {
  return (
    <div>
      <div className="mb-5 flex h-2 gap-0.5 overflow-hidden rounded-full">
        {ORDER.map((mode) => {
          const ratio = total ? (modeDays[mode] / total) * 100 : 0
          if (ratio === 0) return null
          return (
            <div
              key={mode}
              className="h-full transition-[width] duration-700 ease-soft"
              style={{ width: `${ratio}%`, backgroundColor: MODE_META[mode].hex }}
            />
          )
        })}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {ORDER.map((mode) => (
          <div key={mode}>
            <p
              className="tnum font-display text-[28px] leading-none"
              style={{ color: MODE_META[mode].hex }}
            >
              {modeDays[mode]}
            </p>
            <p className="label mt-1.5">{mode}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
