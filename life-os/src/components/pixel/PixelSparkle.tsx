import { effects } from '@/lib/pixelAssets'
import { cn } from '@/lib/cn'
import { PixelImage } from './PixelImage'

interface Props {
  size?: number
  /** 두 종류의 반짝임을 번갈아 쓰면 화면이 단조롭지 않다 */
  variant?: 1 | 2
  delay?: number
  className?: string
}

/** 아주 작은 반짝임. 화면당 1~3개만 쓴다. */
export function PixelSparkle({ size = 14, variant = 1, delay = 0, className }: Props) {
  return (
    <PixelImage
      asset={variant === 1 ? effects.sparkle01 : effects.sparkle02}
      height={size}
      className={cn('animate-twinkle', className)}
      style={{ animationDelay: `${delay}ms` }}
    />
  )
}

interface BurstProps {
  /** 켜지는 순간에만 잠깐 뿌린다 (퀘스트 완료, 저장 완료) */
  show: boolean
}

export function SparkleBurst({ show }: BurstProps) {
  if (!show) return null
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden>
      <PixelImage
        asset={effects.sparkle01}
        height={14}
        className="absolute -left-1 -top-1 animate-pop"
      />
      <PixelImage
        asset={effects.sparkle02}
        height={11}
        className="absolute -right-1 top-1 animate-pop"
        style={{ animationDelay: '90ms' }}
      />
    </span>
  )
}
