import type { CharacterLook } from './types'
import { cn } from '@/components/ui/cn'

interface CharacterAvatarProps extends CharacterLook {
  className?: string
}

/**
 * MVP 캐릭터 — 소프트 치비 스타일의 생활형 아바타.
 *
 * 머리 74 / 전체 157 → 약 2.1등신. 이미지 에셋 없이 SVG 로만 그린다.
 * 나중에 진짜 그림이 생기면 이 컴포넌트 안만 갈아끼우면 되고,
 * 쓰는 쪽(CharacterRoomCard, ProfileHeader)은 바뀌지 않는다.
 */
export function CharacterAvatar({ mood, className }: CharacterAvatarProps) {
  const clearing = mood === 'questClear'
  const leveling = mood === 'levelUp'
  const happy = clearing || leveling

  const bodyAnimation = leveling
    ? 'animate-bouncelg'
    : clearing
      ? 'animate-bouncesm'
      : 'animate-breathe'

  return (
    <svg
      viewBox="0 0 160 200"
      className={cn('h-full w-full', className)}
      role="img"
      aria-label="내 캐릭터"
    >
      <g className={bodyAnimation} style={{ transformOrigin: '80px 180px' }}>
        {/* 다리 */}
        <rect x="66" y="136" width="13" height="40" rx="6.5" className="fill-skin" />
        <rect x="81" y="136" width="13" height="40" rx="6.5" className="fill-skin" />

        {/* 양말 */}
        <rect x="62" y="166" width="18" height="14" rx="7" className="fill-surface stroke-line" strokeWidth="2" />
        <rect x="80" y="166" width="18" height="14" rx="7" className="fill-surface stroke-line" strokeWidth="2" />

        {/* 반바지 */}
        <path
          d="M56 128 H104 V150 Q104 156 98 156 H86 Q82 156 82 151 Q82 156 78 156 H62 Q56 156 56 150 Z"
          className="fill-dusty stroke-line"
          strokeWidth="2"
        />

        {/* 상의 — 헐렁한 홈웨어 */}
        <path
          d="M54 110 Q54 92 72 90 H88 Q106 92 106 110 V132 Q106 138 100 138 H60 Q54 138 54 132 Z"
          className="fill-pink stroke-line"
          strokeWidth="2"
        />

        {/* 팔 */}
        <rect x="43" y="100" width="13" height="38" rx="6.5" className="fill-pink stroke-line" strokeWidth="2" />
        <rect x="104" y="100" width="13" height="38" rx="6.5" className="fill-pink stroke-line" strokeWidth="2" />

        {/* 손 */}
        <circle cx="49.5" cy="140" r="7" className="fill-skin stroke-line" strokeWidth="2" />
        <circle cx="110.5" cy="140" r="7" className="fill-skin stroke-line" strokeWidth="2" />

        {/* 머리카락 뒤통수 */}
        <ellipse cx="80" cy="60" rx="42" ry="39" className="fill-hair" />

        {/* 귀 */}
        <ellipse cx="41" cy="64" rx="6" ry="8" className="fill-skin stroke-skinshade" strokeWidth="1.5" />
        <ellipse cx="119" cy="64" rx="6" ry="8" className="fill-skin stroke-skinshade" strokeWidth="1.5" />

        {/* 얼굴 */}
        <ellipse cx="80" cy="63" rx="39" ry="35" className="fill-skin" />

        {/* 앞머리 */}
        <path
          d="M41 62 Q41 24 80 24 Q119 24 119 62 Q119 50 110 49 Q104 36 80 36 Q56 36 50 49 Q41 50 41 62 Z"
          className="fill-hair"
        />
        <path
          d="M50 49 Q56 36 80 36 Q104 36 110 49"
          className="stroke-hairdeep/25"
          strokeWidth="2"
          fill="none"
        />

        {/* 볼터치 */}
        <ellipse cx="55" cy="76" rx="8" ry="4.5" className="fill-rose/60" />
        <ellipse cx="105" cy="76" rx="8" ry="4.5" className="fill-rose/60" />

        {/* 눈 */}
        <g className="animate-blink" style={{ transformOrigin: '80px 68px' }}>
          {happy ? (
            // 기쁠 때는 ^ ^ 모양으로 접힌다
            <>
              <path
                d="M59 70 Q65 62 71 70"
                className="stroke-ink"
                strokeWidth="3.4"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M89 70 Q95 62 101 70"
                className="stroke-ink"
                strokeWidth="3.4"
                strokeLinecap="round"
                fill="none"
              />
            </>
          ) : (
            <>
              <ellipse cx="65" cy="68" rx="4" ry="5.2" className="fill-ink" />
              <ellipse cx="95" cy="68" rx="4" ry="5.2" className="fill-ink" />
              <circle cx="66.5" cy="66" r="1.4" className="fill-surface" />
              <circle cx="96.5" cy="66" r="1.4" className="fill-surface" />
            </>
          )}
        </g>

        {/* 입 */}
        {happy ? (
          <path
            d="M73 82 Q80 91 87 82 Q80 85 73 82 Z"
            className="fill-ink"
          />
        ) : (
          <path
            d="M75 82 Q80 86 85 82"
            className="stroke-ink"
            strokeWidth="2.4"
            strokeLinecap="round"
            fill="none"
          />
        )}
      </g>

      {/* 반짝임 — 파티클을 뿌리지 않고 서너 개만 */}
      {happy && (
        <g>
          <Sparkle x={26} y={54} size={8} delay={0} />
          <Sparkle x={132} y={72} size={6} delay={220} />
          {leveling && <Sparkle x={118} y={34} size={7} delay={420} />}
          {leveling && <Sparkle x={36} y={104} size={5} delay={620} />}
        </g>
      )}
    </svg>
  )
}

function Sparkle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const s = size
  return (
    <path
      d={`M${x} ${y - s} L${x + s * 0.28} ${y - s * 0.28} L${x + s} ${y} L${x + s * 0.28} ${y + s * 0.28} L${x} ${y + s} L${x - s * 0.28} ${y + s * 0.28} L${x - s} ${y} L${x - s * 0.28} ${y - s * 0.28} Z`}
      className="animate-sparkle fill-butter"
      style={{ animationDelay: `${delay}ms` }}
    />
  )
}
