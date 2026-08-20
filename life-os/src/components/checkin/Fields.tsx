import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { haptic } from '@/hooks/useHaptic'
import type { PixelAsset } from '@/lib/pixelAssets'
import { PixelImage } from '@/components/pixel/PixelImage'

/**
 * 체크인 입력 부품들.
 * 공통 규칙: 모든 항목은 비워 둘 수 있다. 비어 있으면 점수 계산에서 빠질 뿐 0점이 아니다.
 */

export function FieldRow({
  icon,
  label,
  hint,
  filled,
  onClear,
  children,
}: {
  icon?: PixelAsset
  label: string
  hint?: string
  filled?: boolean
  onClear?: () => void
  children: ReactNode
}) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      {icon && <PixelImage asset={icon} height={20} />}
      <span className="w-[78px] shrink-0">
        <span className="block text-[12.5px] leading-tight text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-[10px] leading-tight text-inkfaint">{hint}</span>}
      </span>
      <span className="ml-auto flex items-center gap-1.5">
        {children}
        {onClear && (
          <button
            type="button"
            aria-label={`${label} 지우기`}
            onClick={() => {
              haptic()
              onClear()
            }}
            className={cn(
              'h-6 w-6 rounded-px2 text-[13px] leading-none text-inkfaint transition-opacity',
              filled ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
          >
            ×
          </button>
        )}
      </span>
    </div>
  )
}

export function Divider() {
  return <div className="my-0.5 border-t border-dashed border-border/70" />
}

/**
 * 1~5 눈금. 같은 칸을 다시 누르면 비워진다.
 * value 가 null 이면 아무것도 안 적은 상태 — 흐리게 보여 준다.
 */
export function ScalePips({
  asset,
  value,
  onChange,
  label,
  size = 20,
  max = 5,
  offset = 0,
}: {
  asset: PixelAsset
  value: number | null | undefined
  onChange: (v: number | null) => void
  label: string
  size?: number
  max?: number
  /** 0 부터 시작하는 값(통증 등)일 때 1 을 넣는다 */
  offset?: number
}) {
  const shown = value === null || value === undefined ? 0 : value + offset
  const empty = value === null || value === undefined

  return (
    <div className="inline-flex items-center gap-0.5" role="group" aria-label={label}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${label} ${n}`}
          aria-pressed={!empty && n <= shown}
          onClick={() => {
            haptic()
            onChange(shown === n ? null : n - offset)
          }}
          className={cn(
            'rounded-px2 p-0.5 transition-transform duration-150',
            !empty && n <= shown ? '-translate-y-[2px]' : 'opacity-25 saturate-50',
          )}
        >
          <PixelImage asset={asset} height={size} />
        </button>
      ))}
    </div>
  )
}

export function YesNo({
  value,
  onChange,
}: {
  value: boolean | null | undefined
  onChange: (v: boolean | null) => void
}) {
  return (
    <div className="flex gap-1.5">
      {[false, true].map((option) => (
        <button
          key={String(option)}
          type="button"
          aria-pressed={value === option}
          onClick={() => {
            haptic()
            onChange(value === option ? null : option)
          }}
          className={cn(
            'rounded-px3 border-[1.5px] px-3 py-1.5 font-pixel text-[11px] uppercase',
            value === option
              ? 'border-pinkdeep bg-pinksoft text-pinkdeep'
              : 'border-border bg-cream text-inkfaint',
          )}
        >
          {option ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  )
}

export function StepField({
  value,
  onChange,
  step = 0.5,
  min = 0,
  max = 24,
  format,
  placeholder = '—',
  ariaLabel,
}: {
  value: number | null | undefined
  onChange: (v: number | null) => void
  step?: number
  min?: number
  max?: number
  format: (v: number) => string
  placeholder?: string
  ariaLabel: string
}) {
  const nudge = (delta: number) => {
    haptic()
    const base = value ?? (min + max) / 2
    const next = Math.min(max, Math.max(min, Math.round((base + delta) / step) * step))
    onChange(Math.round(next * 100) / 100)
  }

  return (
    <div className="flex items-center gap-1.5">
      <StepButton label="−" ariaLabel={`${ariaLabel} 줄이기`} onClick={() => nudge(-step)} />
      <span
        className={cn(
          'w-[84px] text-center font-pixel text-[14px] leading-none',
          value === null || value === undefined ? 'text-inkfaint' : 'text-ink',
        )}
      >
        {value === null || value === undefined ? placeholder : format(value)}
      </span>
      <StepButton label="+" ariaLabel={`${ariaLabel} 늘리기`} onClick={() => nudge(step)} />
    </div>
  )
}

function StepButton({
  label,
  ariaLabel,
  onClick,
}: {
  label: string
  ariaLabel: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="press h-8 w-8 rounded-px3 border-[1.5px] border-border bg-cream font-pixel text-[13px] leading-none shadow-hard"
    >
      {label}
    </button>
  )
}

export function NumberField({
  value,
  onChange,
  suffix,
  ariaLabel,
  placeholder = '—',
  width = 'w-[82px]',
  step,
}: {
  value: number | null | undefined
  onChange: (v: number | null) => void
  suffix?: string
  ariaLabel: string
  placeholder?: string
  width?: string
  step?: string
}) {
  return (
    <span className="flex items-center gap-1">
      <input
        type="number"
        inputMode="decimal"
        step={step}
        aria-label={ariaLabel}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className={cn(
          'rounded-px2 border-[1.5px] border-border bg-cream px-2 py-1.5 text-right font-pixel text-[12px] tabular-nums',
          width,
        )}
      />
      {suffix && <span className="text-[11px] text-inkfaint">{suffix}</span>}
    </span>
  )
}

export function ChipRow<T extends string>({
  options,
  value,
  onChange,
  multi,
  ariaLabel,
}: {
  options: { value: T; label: string; icon?: PixelAsset }[]
  value: T[] | T | null | undefined
  onChange: (next: T[] | T | null) => void
  multi?: boolean
  ariaLabel: string
}) {
  const selected = Array.isArray(value) ? value : value ? [value] : []

  return (
    <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1" role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const active = selected.includes(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => {
              haptic()
              if (multi) {
                const next = active ? selected.filter((v) => v !== opt.value) : [...selected, opt.value]
                onChange(next as T[])
              } else {
                onChange(active ? null : opt.value)
              }
            }}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-px3 border-[1.5px] px-2.5 py-1.5 text-[12px] transition-transform duration-150',
              active
                ? '-translate-y-[1px] border-pinkdeep bg-pinksoft'
                : 'border-border bg-cream text-inkdim',
            )}
          >
            {opt.icon && <PixelImage asset={opt.icon} height={16} />}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
