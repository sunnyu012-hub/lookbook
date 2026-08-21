import { ROOM } from '@/lib/assets'

interface RoomProp {
  src: string
  /** 모두 % 단위. 카드 크기가 달라져도 배치가 유지된다. */
  left?: number
  right?: number
  bottom: number
  width: number
}

/**
 * 방에 놓인 물건들.
 *
 * 지금은 고정 배치지만, 나중에 방 꾸미기가 붙으면
 * 이 배열을 저장된 데이터로 바꾸기만 하면 된다.
 */
const PROPS: RoomProp[] = [
  { src: ROOM.window, left: 4, bottom: 46, width: 29 },
  { src: ROOM.mobile, right: 24, bottom: 62, width: 10 },
  { src: ROOM.frame, right: 5, bottom: 54, width: 12 },
  { src: ROOM.shelf, left: 1, bottom: 21, width: 26 },
  { src: ROOM.cocoa, left: 22, bottom: 40, width: 8 },
  { src: ROOM.lamp, right: 3, bottom: 20, width: 12 },
  { src: ROOM.plant, right: 16, bottom: 20, width: 14 },
  { src: ROOM.cushion, left: 20, bottom: 13, width: 13 },
  { src: ROOM.slippers, right: 28, bottom: 11, width: 12 },
]

interface RoomSceneProps {
  /**
   * 캐릭터가 빈백에 앉아 쉬는 그림에는 빈백이 이미 들어 있다.
   * 그럴 때 방에 있는 빈백까지 그리면 두 개가 된다.
   */
  hideBeanbag?: boolean
}

/** 캐릭터 뒤에 깔리는 작은 생활 공간. 정보를 방해하지 않게 조용히 둔다. */
export function RoomScene({ hideBeanbag = false }: RoomSceneProps) {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {/* 벽 / 바닥 */}
      <div className="absolute inset-0 bg-[#FBEEDC]" />
      <div className="absolute inset-x-0 bottom-0 h-[26%] bg-[#F0DCC2]" />
      <div className="absolute inset-x-0 bottom-[26%] h-px bg-[#E3C6A5]" />

      {/* 러그 */}
      <img
        src={ROOM.rug}
        alt=""
        className="absolute bottom-[3%] left-1/2 w-[62%] -translate-x-1/2 select-none"
        draggable={false}
      />

      {!hideBeanbag && (
        <img
          src={ROOM.beanbag}
          alt=""
          draggable={false}
          className="absolute bottom-[15%] left-[27%] w-[25%] select-none"
        />
      )}

      {PROPS.map((prop) => (
        <img
          key={prop.src}
          src={prop.src}
          alt=""
          draggable={false}
          className="absolute select-none"
          style={{
            left: prop.left !== undefined ? `${prop.left}%` : undefined,
            right: prop.right !== undefined ? `${prop.right}%` : undefined,
            bottom: `${prop.bottom}%`,
            width: `${prop.width}%`,
          }}
        />
      ))}
    </div>
  )
}
