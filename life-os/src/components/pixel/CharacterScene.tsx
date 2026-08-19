import type { EnergyMode } from '@/types'
import {
  CHARACTER_FRAMES,
  CHARACTER_SHEET,
  CHARACTER_SIZE,
  CHARACTER_STATES,
  ROOM_SHEET,
  ROOM_SIZE,
} from '@/lib/sprites.generated'
import { modeMeta } from '@/lib/energy'
import { PixelIcon } from './PixelIcon'

/** 방(160x112) 좌표계 기준 캐릭터 위치. 스프라이트를 바꾸면 여기만 손보면 된다. */
const POS: Record<EnergyMode, { x: number; y: number }> = {
  RECOVERY: { x: 80, y: 52 },
  EASY: { x: 26, y: 70 },
  NORMAL: { x: 26, y: 70 },
  POWER: { x: 26, y: 70 },
}

/** 상태마다 idle 속도를 다르게 — 지쳐 있으면 느리게, 기운 있으면 빠르게 */
const SPEED: Record<EnergyMode, string> = {
  RECOVERY: '2.8s',
  EASY: '2.2s',
  NORMAL: '1.6s',
  POWER: '0.7s',
}

const pct = (value: number, total: number) => `${(value / total) * 100}%`

interface Props {
  mode: EnergyMode | null
}

export function CharacterScene({ mode }: Props) {
  const active: EnergyMode = mode ?? 'NORMAL'
  const meta = modeMeta(active)
  const row = CHARACTER_STATES.indexOf(meta.sprite)
  const pos = POS[active]

  return (
    <div
      className="panel relative overflow-hidden p-0"
      style={{ aspectRatio: `${ROOM_SIZE.width} / ${ROOM_SIZE.height}` }}
    >
      <img
        src={ROOM_SHEET}
        alt=""
        className="pixel-img absolute inset-0 h-full w-full"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* 캐릭터 — 2프레임 스프라이트 시트를 background-position 으로 넘긴다 */}
      <div
        className="pixel-img absolute"
        style={{
          left: pct(pos.x, ROOM_SIZE.width),
          top: pct(pos.y, ROOM_SIZE.height),
          width: pct(CHARACTER_SIZE, ROOM_SIZE.width),
          aspectRatio: '1 / 1',
          backgroundImage: `url(${CHARACTER_SHEET})`,
          backgroundSize: `${CHARACTER_FRAMES * 100}% ${CHARACTER_STATES.length * 100}%`,
          backgroundPositionY: `${(row / (CHARACTER_STATES.length - 1)) * 100}%`,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
          animation: `sprite2 ${SPEED[active]} step-end infinite`,
          opacity: mode ? 1 : 0.45,
        }}
      />

      {/* 상태별 장식 */}
      {mode === 'RECOVERY' && (
        <>
          <span
            className="absolute animate-float"
            style={{ left: pct(96, ROOM_SIZE.width), top: pct(44, ROOM_SIZE.height) }}
          >
            <PixelIcon name="zzz" size={16} />
          </span>
          <span
            className="absolute animate-float"
            style={{
              left: pct(107, ROOM_SIZE.width),
              top: pct(34, ROOM_SIZE.height),
              animationDelay: '1.3s',
            }}
          >
            <PixelIcon name="zzz" size={16} />
          </span>
        </>
      )}

      {mode === 'POWER' &&
        [
          { x: 18, y: 58, delay: '0s' },
          { x: 60, y: 50, delay: '0.5s' },
          { x: 66, y: 84, delay: '0.9s' },
        ].map((s) => (
          <span
            key={`${s.x}-${s.y}`}
            className="absolute animate-twinkle"
            style={{
              left: pct(s.x, ROOM_SIZE.width),
              top: pct(s.y, ROOM_SIZE.height),
              animationDelay: s.delay,
            }}
          >
            <PixelIcon name="sparkle" size={16} />
          </span>
        ))}

      {mode === 'EASY' && (
        <span
          className="absolute animate-float"
          style={{ left: pct(24, ROOM_SIZE.width), top: pct(58, ROOM_SIZE.height) }}
        >
          <PixelIcon name="sparkle" size={16} />
        </span>
      )}
    </div>
  )
}
