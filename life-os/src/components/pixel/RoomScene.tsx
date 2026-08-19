import type { EnergyMode } from '@/types'
import {
  CHARACTER_PLACEMENT,
  FLOOR_LINE,
  MODE_EFFECTS,
  PET_PLACEMENT,
  ROOM_ITEMS,
  type RoomItem,
} from '@/lib/roomLayout'
import { MODE_CHARACTER, characters } from '@/lib/pixelAssets'
import { cn } from '@/lib/cn'

interface Props {
  mode: EnergyMode | null
}

/** Tailwind 가 클래스명을 정적으로 찾을 수 있도록 매핑해 둔다 */
const MOTION_CLASS = {
  breathe: 'animate-breathe',
  floaty: 'animate-floaty',
  hop: 'animate-hop',
} as const

/** 방 좌표(0~100)를 CSS 로 */
const place = (x: number, bottom: number, width: number) => ({
  left: `${x}%`,
  bottom: `${bottom}%`,
  width: `${width}%`,
})

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
 * 벽/바닥만 CSS 로 깔고 나머지는 전부 실제 픽셀 에셋을 겹쳐 올린다.
 * 배치는 lib/roomLayout.ts 에 있어서, 나중에 컨디션에 따라 방을 바꾸기도 쉽다.
 */
export function RoomScene({ mode }: Props) {
  const active: EnergyMode = mode ?? 'NORMAL'
  const placement = CHARACTER_PLACEMENT[active]
  const pet = PET_PLACEMENT[active]
  const character = mode ? MODE_CHARACTER[active] : characters.idle
  const idle = mode ? placement : { ...CHARACTER_PLACEMENT.POWER, motion: 'breathe' as const }

  const visible = ROOM_ITEMS.filter((item) => !placement.hides.includes(item.key))

  return (
    <div className="relative overflow-hidden rounded-px4 border-[1.5px] border-border bg-ivory shadow-hard">
      <div className="relative w-full" style={{ aspectRatio: '4 / 3' }}>
        {/* 벽 / 바닥 */}
        <div className="absolute inset-x-0 top-0 bg-[#FBEFE1]" style={{ bottom: `${FLOOR_LINE}%` }} />
        <div className="absolute inset-x-0 bottom-0 bg-[#EBCFAD]" style={{ height: `${FLOOR_LINE}%` }}>
          <div className="h-[3%] w-full bg-[#DDBB95]" />
          <div className="mt-[12%] h-[2%] w-full bg-[#E2C29D]/70" />
          <div className="mt-[16%] h-[2%] w-full bg-[#E2C29D]/70" />
        </div>

        {(['wall', 'furniture', 'props'] as const).map((layer) => (
          <div key={layer} className="absolute inset-0">
            {visible.filter((i) => i.layer === layer).map((item) => (
              <Item key={item.key} item={item} />
            ))}
          </div>
        ))}

        {/* 캐릭터 */}
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
          style={place(idle.x, idle.bottom, idle.width)}
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
    </div>
  )
}
