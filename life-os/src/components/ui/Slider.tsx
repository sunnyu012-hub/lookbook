import type { ChangeEvent } from 'react'

interface Props {
  label: string
  value: number
  min: number
  max: number
  step?: number
  /** 값 옆에 붙는 단위 (예: h) */
  suffix?: string
  onChange: (v: number) => void
}

export function Slider({ label, value, min, max, step = 0.5, suffix = '', onChange }: Props) {
  const handle = (e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="klabel">{label}</span>
        <span className="tnum font-display text-3xl leading-none">
          {value}
          <span className="ml-0.5 font-sans text-sm text-muted">{suffix}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handle}
        aria-label={label}
        className="h-9 w-full cursor-pointer"
      />
      <div className="flex justify-between">
        <span className="text-[10px] text-faint">
          {min}
          {suffix}
        </span>
        <span className="text-[10px] text-faint">
          {max}
          {suffix}
        </span>
      </div>
    </div>
  )
}
