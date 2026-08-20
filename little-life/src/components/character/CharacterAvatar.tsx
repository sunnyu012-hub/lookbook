import type { CharacterLook } from './types'
import { CHARACTER } from '@/lib/assets'
import { cn } from '@/components/ui/cn'

interface CharacterAvatarProps extends CharacterLook {
  className?: string
  /** 방 안에서는 캐릭터가 숨 쉬듯 살짝 움직인다. 작은 썸네일에서는 끈다. */
  animated?: boolean
}

const ANIMATION: Record<CharacterLook['mood'], string> = {
  idle: 'animate-breathe',
  questClear: 'animate-bouncesm',
  levelUp: 'animate-bouncelg',
}

/**
 * 캐릭터 그림 한 장.
 *
 * 기분에 따라 그림만 바꾼다. 어떤 파일을 쓸지는 lib/assets 가 알고 있어서,
 * 나중에 옷·헤어가 생겨 스프라이트가 늘어나도 이 컴포넌트는 그대로 둔다.
 */
export function CharacterAvatar({ mood, className, animated = true }: CharacterAvatarProps) {
  return (
    <img
      // key 를 바꿔야 포즈가 바뀔 때 bounce 애니메이션이 처음부터 다시 돈다
      key={mood}
      src={CHARACTER[mood]}
      alt="내 캐릭터"
      draggable={false}
      className={cn(
        'h-full w-full select-none object-contain object-bottom',
        animated && ANIMATION[mood],
        className,
      )}
      style={{ transformOrigin: 'bottom center' }}
    />
  )
}
