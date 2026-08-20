import type { PixelAsset } from '@/lib/pixelAssets'
import { cn } from '@/lib/cn'
import { haptic } from '@/hooks/useHaptic'
import { PixelImage } from './PixelImage'

interface Props {
  asset: PixelAsset
  value: number
  max?: number
  size?: number
  /** 주면 입력 위젯이 된다 */
  onChange?: (value: number) => void
  label?: string
}

/**
 * 같은 픽셀 아이콘을 5칸 늘어놓고 채운 만큼만 또렷하게 보여준다.
 * (레퍼런스 시트에 없는 그래픽을 새로 만들지 않기 위해 아이콘을 재사용한다)
 */
export function PipRow({ asset, value, max = 5, size = 22, onChange, label }: Props) {
  const pips = Array.from({ length: max }, (_, i) => i + 1)

  if (!onChange) {
    return (
      <span
        className="inline-flex items-center gap-1"
        aria-label={label ? `${label} ${value}/${max}` : undefined}
      >
        {pips.map((n) => (
          <PixelImage
            key={n}
            asset={asset}
            height={size}
            className={cn(n <= value ? 'opacity-100' : 'opacity-25 saturate-50')}
          />
        ))}
      </span>
    )
  }

  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label={label}>
      {pips.map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${label ?? ''} ${n}`}
          aria-pressed={n <= value}
          onClick={() => {
            haptic()
            onChange(n)
          }}
          className={cn(
            'rounded-px2 p-1 transition-transform duration-150',
            n <= value ? '-translate-y-[2px]' : 'opacity-30 saturate-50',
          )}
        >
          <PixelImage asset={asset} height={size} />
        </button>
      ))}
    </div>
  )
}
