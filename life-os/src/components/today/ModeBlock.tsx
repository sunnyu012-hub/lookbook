import type { EnergyMode } from '@/types'
import { modeMeta } from '@/lib/energy'

export function ModeBlock({ mode }: { mode: EnergyMode }) {
  const meta = modeMeta(mode)

  return (
    <div className="flex flex-col items-center text-center">
      <span className="text-[30px] leading-none" aria-hidden>
        {meta.glyph}
      </span>
      <p
        className="mt-3 font-mono text-[13px] uppercase tracking-label"
        style={{ color: meta.hex }}
      >
        {meta.label}
      </p>
      <p className="mt-4 font-display text-[22px] leading-snug">{meta.headline}</p>
      <p className="mt-1 text-[14px] leading-relaxed text-muted">{meta.body}</p>
    </div>
  )
}
