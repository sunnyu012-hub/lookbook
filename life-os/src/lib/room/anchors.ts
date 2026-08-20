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
 *
 * 크기는 **키(방 높이 대비 %)** 로 정한다. 가로 폭으로 정하면 세로로 긴 그림이
 * 혼자 거인이 된다 — 실제 가로 폭은 그림의 원본 비율에서 계산한다.
 */

/** Room Base 그림의 가로:세로. 이 비율이 바뀌면 아래 anchor 도 다시 잡아야 한다. */
export const ROOM_ASPECT = '3 / 2'

/** 벽과 바닥이 만나는 높이 (위에서부터 %) — 그림자·소품 배치의 기준선 */
export const FLOOR_LINE = 56

export interface Anchor {
  x: number
  y: number
  /** 이 자리에 놓이는 것의 기본 키 (방 높이 대비 %) */
  scale: number
  /** 사람이 읽는 이름 */
  label: string
}

/**
 * 방 안의 자리들.
 * Room Base 그림이 바뀌면 이 표만 다시 맞추면 된다 — 다른 코드는 이름으로만 부른다.
 */
export const ANCHORS = {
  // ── 사람이 앉거나 서는 자리 (scale = 키)
  bed: { x: 72, y: 72, scale: 15, label: '침대' },
  desk: { x: 34, y: 93, scale: 24, label: '낮은 책상 옆' },
  rug: { x: 40, y: 91, scale: 26, label: '러그' },
  beanbag: { x: 22, y: 94, scale: 29, label: '거울 앞 바닥' },
  center: { x: 40, y: 92, scale: 27, label: '방 가운데' },
  window: { x: 51, y: 45, scale: 8, label: '창가' },

  // ── 고양이 자리
  catBed: { x: 27, y: 96, scale: 8, label: '러그 왼쪽' },
  bedFoot: { x: 71, y: 90, scale: 7, label: '침대 발치 바닥' },
  rugEdge: { x: 50, y: 96, scale: 8, label: '러그 앞' },
  windowSill: { x: 51, y: 46, scale: 6, label: '창턱' },

  // ── 물건 놓는 자리
  nightstand: { x: 94, y: 51, scale: 5, label: '협탁 위' },
  mirrorSide: { x: 34, y: 66, scale: 5, label: '거울 옆' },
  tableTop: { x: 47, y: 78, scale: 4, label: '책상 위' },
  floorLeft: { x: 18, y: 95, scale: 5, label: '왼쪽 바닥' },
  floorRight: { x: 88, y: 92, scale: 5, label: '오른쪽 바닥' },

  // ── 벽
  pinboard: { x: 30, y: 17, scale: 6, label: '클라이밍 보드' },
  wallRight: { x: 78, y: 22, scale: 6, label: '오른쪽 벽' },
  shelfTop: { x: 13, y: 20, scale: 5, label: '선반 위' },
} as const satisfies Record<string, Anchor>

export type AnchorName = keyof typeof ANCHORS

export const anchorOf = (name: AnchorName): Anchor => ANCHORS[name]

/** 자리에서 조금 비켜 놓고 싶을 때 */
export interface Offset {
  dx?: number
  dy?: number
  /** anchor 의 기본 키 대신 쓸 값 (방 높이 대비 %) */
  height?: number
}

export interface Placed {
  x: number
  y: number
  /** 방 높이 대비 % */
  height: number
}

export function place(name: AnchorName, offset: Offset = {}): Placed {
  const a = ANCHORS[name]
  return {
    x: a.x + (offset.dx ?? 0),
    y: a.y + (offset.dy ?? 0),
    height: offset.height ?? a.scale,
  }
}

/** 방의 가로:세로 비율 (3 / 2 → 1.5) */
export const ROOM_RATIO = (() => {
  const [w, h] = ROOM_ASPECT.split('/').map((n) => Number(n.trim()))
  return w / h
})()

/**
 * 키(방 높이 대비 %) → 가로 폭(방 너비 대비 %).
 * 그림의 원본 비율을 그대로 지키면서 키만 맞춘다.
 */
export function widthFromHeight(heightPct: number, assetW: number, assetH: number): number {
  return (heightPct * (assetW / assetH)) / ROOM_RATIO
}

/** 바닥에 놓인 것만 그림자를 깐다 — 벽에 붙은 것은 뜨면 안 되니까 */
export const isOnFloor = (y: number) => y > FLOOR_LINE
