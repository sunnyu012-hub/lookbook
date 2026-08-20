import { useMemo } from 'react'
import type { Checkin, EnergyMode, Preferences } from '@/types'
import { PixelImage } from '@/components/pixel/PixelImage'
import { ROOM_ASPECT, isOnFloor, widthFromHeight } from '@/lib/room/anchors'
import { buildScene, timeOfDay, type Motion, type Sprite } from '@/lib/room/scene'
import { RoomBase } from './RoomBase'
import { cn } from '@/lib/cn'

/**
 * 오늘의 방.
 *
 * LAYER 0  Room Base   — 완성된 그림 한 장 (가구 포함)
 * LAYER 1  Props       — 오늘 기록에 따라 나타나는 소품
 * LAYER 2  Character   — 나
 * LAYER 3  Pet         — 고양이
 * LAYER 4  Effects     — zzz · 반짝임 · 하트
 * LAYER 5  Objects     — 세계관 오브젝트 (핀보드 하트 같은 것)
 *
 * 모든 overlay 는 Room Base 와 같은 비율 좌표를 쓴다. 방이 작아져도 같이 움직인다.
 */

/** Tailwind 가 클래스를 미리 스캔해야 해서 동적 문자열을 만들지 않는다 */
const MOTION_CLASS: Record<Motion, string> = {
  breathe: 'animate-breathe',
  floaty: 'animate-floaty',
  hop: 'animate-hop',
  twinkle: 'animate-twinkle',
  zzz: 'animate-zzzrise',
  none: '',
}

interface Props {
  checkin: Checkin | null
  mode: EnergyMode | null
  prefs: Preferences
  injectedToday?: boolean
  /** 오늘 적어 둔 이벤트 태그 */
  events?: string[]
  /** 밤 마무리를 마쳤는지 */
  nightDone?: boolean
  /** 오늘 완료한 퀘스트 수 */
  questsDone?: number
  className?: string
}

export function RoomStage({
  checkin,
  mode,
  prefs,
  injectedToday = false,
  events,
  nightDone,
  questsDone,
  className,
}: Props) {
  const time = useMemo(() => timeOfDay(), [])
  const scene = useMemo(
    () => buildScene({ checkin, mode, prefs, injectedToday, events, nightDone, questsDone, time }),
    [checkin, mode, prefs, injectedToday, events, nightDone, questsDone, time],
  )

  return (
    <div
      className={cn('relative w-full overflow-hidden', className)}
      style={{ aspectRatio: ROOM_ASPECT }}
      role="img"
      aria-label={
        mode
          ? `오늘의 방 — ${mode} 상태의 캐릭터가 ${scene.character.label ?? '방'}에 있어요`
          : '오늘의 방 — 아직 기록이 없어요'
      }
    >
      <RoomBase time={time} />

      {scene.props.map((s) => (
        <Layer key={s.key} sprite={s} />
      ))}
      <Layer sprite={scene.character} />
      <Layer sprite={scene.pet} />
      {scene.effects.map((s) => (
        <Layer key={s.key} sprite={s} />
      ))}
      {scene.objects.map((s) => (
        <Layer key={s.key} sprite={s} />
      ))}

      {/* 방 아래쪽을 아주 살짝 어둡게 — HUD 로 자연스럽게 이어지도록 */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[14%]"
        style={{
          background: 'linear-gradient(180deg, rgba(107, 74, 61, 0) 0%, rgba(107, 74, 61, 0.10) 100%)',
        }}
        aria-hidden
      />
    </div>
  )
}

function Layer({ sprite }: { sprite: Sprite }) {
  const grounded = sprite.shadow && isOnFloor(sprite.y)
  // 키를 정해 두고 가로 폭은 그림 비율에서 뽑는다 — 세로로 긴 그림이 거인이 되지 않게
  const width = widthFromHeight(sprite.height, sprite.asset.width, sprite.asset.height)

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: `${sprite.x}%`,
        top: `${sprite.y}%`,
        width: `${width}%`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      {grounded && (
        <span
          aria-hidden
          className="absolute bottom-[-2%] left-1/2 h-[10%] w-[86%] -translate-x-1/2 rounded-[50%]"
          style={{
            background:
              'radial-gradient(50% 50% at 50% 50%, rgba(107, 74, 61, 0.22) 0%, rgba(107, 74, 61, 0) 70%)',
          }}
        />
      )}
      <img
        src={sprite.asset.src}
        alt=""
        aria-hidden
        draggable={false}
        className={cn('pixelated relative block w-full', MOTION_CLASS[sprite.motion])}
        style={sprite.delay ? { animationDelay: `${sprite.delay}ms` } : undefined}
      />
    </div>
  )
}

/** 방 밖에서도 쓰는 작은 캐릭터 (ME 화면 프로필 등) */
export function CharacterBadge({ mode, height = 64 }: { mode: EnergyMode | null; height?: number }) {
  const scene = useMemo(
    () =>
      buildScene({
        checkin: null,
        mode,
        prefs: { mounjaroEnabled: false, relationshipEnabled: false } as Preferences,
        injectedToday: false,
      }),
    [mode],
  )
  return <PixelImage asset={scene.character.asset} height={height} className="animate-floaty" />
}
