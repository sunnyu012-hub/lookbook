import type { NpcId } from '@/types'
import { npcPortrait } from '@/lib/city/portraits'
import { cn } from '@/components/ui/cn'

interface NpcFaceProps {
  id: NpcId
  /** 그림이 없는 사람 자리에 남는 것 */
  avatar: string
  /** 한 변 px. 얼굴은 정사각형으로 잘려 있다 */
  size: number
  /** 시트 머리는 네모, 목록 칩은 동그라미 */
  shape?: 'card' | 'round'
  className?: string
}

/**
 * 사람 하나가 화면에 나오는 자리.
 *
 * 그림이 있으면 그림, 없으면 이모지. 부르는 쪽은 둘을 구분하지 않는다 —
 * 얼굴이 아직 안 온 사람이 있다고 화면마다 조건문을 쓰기 시작하면
 * 나중에 그림이 왔을 때 고칠 데를 다 못 찾는다.
 *
 * 이름은 옆에 글자로 늘 같이 나오니까 그림에는 alt 를 주지 않는다.
 * 읽어주는 기계가 "윤하루 윤하루" 라고 두 번 부르게 된다.
 */
export function NpcFace({ id, avatar, size, shape = 'card', className }: NpcFaceProps) {
  const src = npcPortrait(id)
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden bg-canvas',
        shape === 'round' ? 'rounded-full' : 'rounded-card',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden className="leading-none" style={{ fontSize: Math.round(size * 0.52) }}>
          {avatar}
        </span>
      )}
    </span>
  )
}
