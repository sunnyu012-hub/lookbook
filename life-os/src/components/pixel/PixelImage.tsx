import type { CSSProperties } from 'react'
import type { PixelAsset } from '@/lib/pixelAssets'
import { cn } from '@/lib/cn'

interface Props {
  asset: PixelAsset
  /** 표시 높이(px). 주지 않으면 원본 크기 */
  height?: number
  /** 표시 너비(px). height 와 함께 주면 비율을 무시한다 */
  width?: number
  className?: string
  style?: CSSProperties
  alt?: string
}

/**
 * 픽셀 PNG 한 장. 원본 비율을 유지하고, 확대 시에도 도트가 살아있게 렌더링한다.
 * alt 를 주지 않으면 장식으로 간주해 접근성 트리에서 숨긴다.
 */
export function PixelImage({ asset, height, width, className, style, alt }: Props) {
  const ratio = asset.width / asset.height
  const w = width ?? (height ? Math.round(height * ratio) : asset.width)
  const h = height ?? (width ? Math.round(width / ratio) : asset.height)

  return (
    <img
      src={asset.src}
      alt={alt ?? ''}
      aria-hidden={alt ? undefined : true}
      width={w}
      height={h}
      draggable={false}
      className={cn('pixelated select-none', className)}
      style={{ width: w, height: h, ...style }}
    />
  )
}
