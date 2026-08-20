import type { CharacterLook } from './types'
import { cn } from '@/components/ui/cn'

interface CharacterAvatarProps extends CharacterLook {
  className?: string
}

/** 몸통 실루엣. 옷을 잘라내는 clipPath 와 같은 모양을 써야 해서 상수로 뺐다. */
const BODY_PATH =
  'M80 40 C105 40 120 58 120 84 C120 112 103 130 80 130 C57 130 40 112 40 84 C40 58 55 40 80 40 Z'

/**
 * MVP 캐릭터 placeholder.
 *
 * 이미지 에셋 없이 SVG 로만 그린다. 나중에 그림이 생기면
 * 이 컴포넌트 안만 갈아끼우면 되고, 쓰는 쪽은 바뀌지 않는다.
 */
export function CharacterAvatar({ mood, className }: CharacterAvatarProps) {
  const cheering = mood === 'cheer'
  const smiling = mood !== 'idle'

  return (
    <svg
      viewBox="0 0 160 160"
      className={cn('h-full w-full', className)}
      role="img"
      aria-label="내 캐릭터"
    >
      {/* 바닥 그림자 — 아주 옅게 */}
      <ellipse cx="80" cy="139" rx="34" ry="6" className="fill-ink/[0.07]" />

      <defs>
        {/* 옷은 몸통 실루엣 안쪽으로만 칠해진다 — 나중에 옷을 갈아입혀도 삐져나오지 않게 */}
        <clipPath id="ll-body-clip">
          <path d={BODY_PATH} />
        </clipPath>
      </defs>

      <g className={cheering ? 'animate-floaty' : 'animate-breathe'} style={{ transformOrigin: '80px 90px' }}>
        {/* 머리 위 새싹 */}
        <rect x="79" y="26" width="2.4" height="14" rx="1.2" className="fill-sage-deep/60" />
        <path d="M80 30 C80 21 74 16 67 15 C67 23 72 29 80 30 Z" className="fill-sage" />

        {/* 귀 — 몸통보다 먼저 그리되 위로 삐져나오게 둔다 */}
        <ellipse
          cx="55"
          cy="46"
          rx="9"
          ry="12"
          transform="rotate(-20 55 46)"
          className="fill-milk stroke-line"
          strokeWidth="2.5"
        />
        <ellipse
          cx="105"
          cy="46"
          rx="9"
          ry="12"
          transform="rotate(20 105 46)"
          className="fill-milk stroke-line"
          strokeWidth="2.5"
        />

        {/* 몸통 */}
        <path d={BODY_PATH} className="fill-milk stroke-line" strokeWidth="2.5" />

        {/* 옷 — 목선이 살짝 파인 셔츠. 몸통 실루엣 안쪽으로만 칠해진다 */}
        <g clipPath="url(#ll-body-clip)">
          <path d="M30 108 Q80 126 130 108 L130 140 L30 140 Z" className="fill-dusty" />
          <path
            d="M30 108 Q80 126 130 108"
            className="stroke-dusty-deep/35"
            strokeWidth="3"
            fill="none"
          />
        </g>

        {/* 몸통 테두리를 옷 위에 한 번 더 그어 실루엣을 또렷하게 */}
        <path d={BODY_PATH} className="stroke-line" strokeWidth="2.5" fill="none" />

        {/* 볼터치 */}
        <ellipse cx="57" cy="90" rx="8" ry="5" className="fill-pink/45" />
        <ellipse cx="103" cy="90" rx="8" ry="5" className="fill-pink/45" />

        {/* 눈 */}
        <g className="animate-blink" style={{ transformOrigin: '80px 80px' }}>
          <ellipse cx="67" cy="80" rx="4" ry="5" className="fill-ink" />
          <ellipse cx="93" cy="80" rx="4" ry="5" className="fill-ink" />
          <circle cx="68.4" cy="78.2" r="1.3" className="fill-milk" />
          <circle cx="94.4" cy="78.2" r="1.3" className="fill-milk" />
        </g>

        {/* 입 — 기분에 따라 곡선만 바뀐다 */}
        <path
          d={smiling ? 'M73 95 Q80 102.5 87 95' : 'M75 96 Q80 99.5 85 96'}
          className="stroke-ink"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* 기분 좋을 때만 뜨는 작은 반짝임 (파티클은 쓰지 않는다) */}
      {cheering && (
        <g className="animate-twinkle">
          <path d="M34 52 l2.2 4.8 4.8 2.2 -4.8 2.2 -2.2 4.8 -2.2 -4.8 -4.8 -2.2 4.8 -2.2 Z" className="fill-butter" />
          <path d="M126 74 l1.7 3.6 3.6 1.7 -3.6 1.7 -1.7 3.6 -1.7 -3.6 -3.6 -1.7 3.6 -1.7 Z" className="fill-butter" />
        </g>
      )}
    </svg>
  )
}
