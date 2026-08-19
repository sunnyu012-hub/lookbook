import { MODE_META } from '@/lib/energy'
import type { EnergyMode } from '@/types'

const ORDER: EnergyMode[] = ['RECOVERY', 'EASY', 'NORMAL', 'POWER']

export function ModeLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {ORDER.map((mode) => (
        <div key={mode} className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: MODE_META[mode].hex }}
          />
          <span className="label">{mode}</span>
        </div>
      ))}
    </div>
  )
}
