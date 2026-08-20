/**
 * 방의 좌표계.
 *
 * 방은 "완성된 그림 한 장"(Room Base)이고, 그 위에 캐릭터·고양이·소품만 얹는다.
 * 가구를 코드로 하나씩 배치하지 않는다 — 가구는 전부 Room Base 그림 안에 들어 있다.
 *
 * 좌표는 방 박스를 100 x 100 으로 본 비율이다.
 *   x = 왼쪽에서부터 (스프라이트의 가로 중심)
 *   y = 위에서부터 (스프라이트가 놓이는 바닥선 = 아래쪽 끝)
 * 그래서 배치는 항상 translate(-50%, -100%) 로 찍는다.
 * 방이 커지든 작아지든 비율이라 같이 움직인다.
 */

/** Room Base 그림의 가로:세로. 이 비율이 바뀌면 아래 anchor 도 다시 잡아야 한다. */
export const ROOM_ASPECT = '3 / 2'

/** 벽과 바닥이 만나는 높이 (위에서부터 %) — 그림자·소품 배치의 기준선 */
export const FLOOR_LINE = 58

export interface Anchor {
  x: number
  y: number
  /** 이 자리에 놓이는 것의 기본 크기 (방 너비 대비 %) */
  scale: number
  /** 사람이 읽는 이름 */
  label: string
}

/**
 * 방 안의 자리들.
 * Room Base 그림이 바뀌면 이 표만 다시 맞추면 된다 — 다른 코드는 이름으로만 부른다.
 */
export const ANCHORS = {
  bed: { x: 73, y: 76, scale: 24, label: '침대' },
  desk: { x: 55, y: 90, scale: 23, label: '낮은 책상' },
  rug: { x: 33, y: 92, scale: 26, label: '러그' },
  beanbag: { x: 15, y: 90, scale: 22, label: '왼쪽 바닥' },
  center: { x: 45, y: 92, scale: 25, label: '방 가운데' },
  window: { x: 50, y: 62, scale: 14, label: '창가' },

  catBed: { x: 13, y: 95, scale: 12, label: '고양이 방석' },
  bedFoot: { x: 62, y: 78, scale: 11, label: '침대 발치' },
  rugEdge: { x: 44, y: 93, scale: 11, label: '러그 가장자리' },
  windowSill: { x: 44, y: 60, scale: 10, label: '창턱' },

  nightstand: { x: 92, y: 70, scale: 8, label: '협탁' },
  mirrorSide: { x: 27, y: 82, scale: 8, label: '거울 옆' },
  tableTop: { x: 63, y: 82, scale: 7, label: '책상 위' },
  floorLeft: { x: 24, y: 95, scale: 9, label: '왼쪽 바닥' },
  floorRight: { x: 80, y: 95, scale: 9, label: '오른쪽 바닥' },

  pinboard: { x: 27, y: 22, scale: 9, label: '핀보드' },
  wallRight: { x: 70, y: 20, scale: 8, label: '오른쪽 벽' },
  shelfTop: { x: 11, y: 22, scale: 8, label: '선반 위' },
} as const satisfies Record<string, Anchor>

export type AnchorName = keyof typeof ANCHORS

export const anchorOf = (name: AnchorName): Anchor => ANCHORS[name]

/** 자리에서 조금 비켜 놓고 싶을 때 */
export interface Offset {
  dx?: number
  dy?: number
  /** anchor 의 기본 크기 대신 쓸 값 */
  width?: number
}

export interface Placed {
  x: number
  y: number
  width: number
}

export function place(name: AnchorName, offset: Offset = {}): Placed {
  const a = ANCHORS[name]
  return {
    x: a.x + (offset.dx ?? 0),
    y: a.y + (offset.dy ?? 0),
    width: offset.width ?? a.scale,
  }
}

/** 바닥에 놓인 것만 그림자를 깐다 — 벽에 붙은 것은 뜨면 안 되니까 */
export const isOnFloor = (y: number) => y > FLOOR_LINE
