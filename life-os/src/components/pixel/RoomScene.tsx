import type { EnergyMode } from '@/types'
import {
  CHARACTER_PLACEMENT,
  FLOOR_LINE,
  MODE_EFFECTS,
  PET_PLACEMENT,
  ROOM_ASPECT,
  ROOM_ITEMS,
  type RoomItem,
} from '@/lib/roomLayout'
import { MODE_CHARACTER, characters } from '@/lib/pixelAssets'
import { cn } from '@/lib/cn'

interface Props {
  mode: EnergyMode | null
}

const MOTION_CLASS = {
  breathe: 'animate-breathe',
  floaty: 'animate-floaty',
  hop: 'animate-hop',
} as const

const place = (x: number, bottom: number, width: number) => ({
  left: `${x}%`,
  bottom: `${bottom}%`,
  width: `${width}%`,
})

/** 바닥 그림자 — 물건이 공간에 놓인 것처럼 보이게 하는 가장 싼 방법 */
function Shadow({ x, bottom, width }: { x: number; bottom: number; width: number }) {
  return (
    <span
      aria-hidden
      className="absolute rounded-[50%]"
      style={{
        left: `${x + width * 0.06}%`,
        bottom: `${Math.max(0, bottom - 0.8)}%`,
        width: `${width * 0.88}%`,
        height: '3.2%',
        background:
          'radial-gradient(ellipse at center, rgba(120, 86, 62, 0.22) 0%, rgba(120, 86, 62, 0) 70%)',
      }}
    />
  )
}

function Item({ item }: { item: RoomItem }) {
  return (
    <img
      src={item.asset.src}
      alt=""
      aria-hidden
      draggable={false}
      className={cn('pixelated absolute h-auto select-none', item.sway && 'animate-floaty')}
      style={place(item.x, item.bottom, item.width)}
    />
  )
}

/**
 * 캐릭터가 사는 방.
 * 화면 폭을 꽉 채우는 하나의 장면으로 보이게 하고, 프레임은 아래쪽 얇은 선만 남긴다.
 * 배치는 lib/roomLayout.ts 에 있다.
 */
export function RoomScene({ mode }: Props) {
  const active: EnergyMode = mode ?? 'NORMAL'
  const placement = CHARACTER_PLACEMENT[active]
  const pet = PET_PLACEMENT[active]
  const character = mode ? MODE_CHARACTER[active] : characters.idle

  const visible = ROOM_ITEMS.filter((item) => !placement.hides.includes(item.key))

  return (
    <div
      className="relative w-full overflow-hidden border-b-[1.5px] border-borderdeep/50"
      style={{ aspectRatio: ROOM_ASPECT }}
    >
      {/* 벽 — 위로 갈수록 살짝 밝아져 공간에 깊이가 생긴다 */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          bottom: `${FLOOR_LINE}%`,
          background: 'linear-gradient(180deg, #FDF4E9 0%, #F8E9D8 100%)',
        }}
      />
      {/* 걸레받이 */}
      <div
        className="absolute inset-x-0"
        style={{ bottom: `${FLOOR_LINE}%`, height: '2.2%', background: '#E3C7A6' }}
      />
      {/* 바닥 — 아래로 갈수록 진해져 원근감을 만든다 */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          height: `${FLOOR_LINE}%`,
          background: 'linear-gradient(180deg, #EFD6B6 0%, #E2C09B 100%)',
        }}
      />
      {/* 마룻바닥 결 */}
      {[16, 40, 66, 88].map((top) => (
        <div
          key={top}
          aria-hidden
          className="absolute inset-x-0"
          style={{
            bottom: `${FLOOR_LINE - (FLOOR_LINE * top) / 100}%`,
            height: '0.9%',
            background: 'rgba(190, 148, 108, 0.35)',
          }}
        />
      ))}

      {(['wall', 'furniture', 'props'] as const).map((layer) => (
        <div key={layer} className="absolute inset-0">
          {visible
            .filter((i) => i.layer === layer)
            .map((item) => (
              <div key={item.key}>
                {item.grounded && <Shadow x={item.x} bottom={item.bottom} width={item.width} />}
                <Item item={item} />
              </div>
            ))}
        </div>
      ))}

      {/* 캐릭터 */}
      <Shadow x={placement.x} bottom={placement.bottom} width={placement.width} />
      <img
        src={character.src}
        alt=""
        aria-hidden
        draggable={false}
        className={cn(
          'pixelated absolute h-auto select-none',
          mode ? MOTION_CLASS[placement.motion] : MOTION_CLASS.breathe,
          !mode && 'opacity-70',
        )}
        style={place(placement.x, placement.bottom, placement.width)}
      />

      {/* 반려묘 */}
      <img
        src={pet.asset.src}
        alt=""
        aria-hidden
        draggable={false}
        className="pixelated absolute h-auto animate-breathe select-none"
        style={place(pet.x, pet.bottom, pet.width)}
      />

      {/* 상태 이펙트 */}
      {mode &&
        MODE_EFFECTS[active].map((fx) => (
          <img
            key={fx.key}
            src={fx.asset.src}
            alt=""
            aria-hidden
            draggable={false}
            className={cn('pixelated absolute h-auto select-none', fx.animation)}
            style={{ ...place(fx.x, fx.bottom, fx.width), animationDelay: `${fx.delay ?? 0}ms` }}
          />
        ))}
    </div>
  )
}
