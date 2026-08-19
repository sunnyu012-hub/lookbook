interface Props {
  label: string
  value: string
  unit?: string
  caption?: string
  color?: string
}

/** 큰 숫자 한 줄 — Insights 화면의 기본 단위 */
export function StatRow({ label, value, unit, caption, color }: Props) {
  return (
    <div className="flex items-end justify-between border-b border-line py-5 last:border-b-0">
      <div>
        <p className="klabel">{label}</p>
        {caption && <p className="mt-1.5 text-[12px] text-faint">{caption}</p>}
      </div>
      <p className="tnum font-display text-[40px] leading-none" style={color ? { color } : undefined}>
        {value}
        {unit && <span className="ml-1 font-sans text-[13px] text-muted">{unit}</span>}
      </p>
    </div>
  )
}
