import { ICON_COLS, ICON_NAMES, ICON_ROWS, ICON_SHEET, type IconName } from '@/lib/sprites.generated'
import { cn } from '@/lib/cn'

interface Props {
  name: IconName
  /** 16 / 24 / 32 를 기본으로 쓴다 */
  size?: 16 | 24 | 32
  className?: string
  label?: string
}

/**
 * 스프라이트 시트 한 칸을 잘라 쓰는 픽셀 아이콘.
 * 아트를 바꾸려면 public/sprites/icons.png 만 교체하면 된다 (칸 순서는 sprites.generated.ts).
 */
export function PixelIcon({ name, size = 16, className, label }: Props) {
  const index = ICON_NAMES.indexOf(name)
  const col = index % ICON_COLS
  const row = Math.floor(index / ICON_COLS)

  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('pixel-img inline-block shrink-0 bg-no-repeat align-middle', className)}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${ICON_SHEET})`,
        backgroundSize: `${ICON_COLS * size}px ${ICON_ROWS * size}px`,
        backgroundPosition: `-${col * size}px -${row * size}px`,
      }}
    />
  )
}
