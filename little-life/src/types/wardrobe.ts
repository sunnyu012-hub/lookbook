/**
 * 옷장.
 *
 * 능력치 장비(`EquippedItems`)와 일부러 나눠뒀다.
 * 하나는 세지고 싶어서 끼는 것이고, 이건 그냥 입고 싶어서 입는 것이다.
 * 섞으면 "예쁜 걸 입으면 손해" 가 되고, 그러면 아무도 예쁜 걸 안 입는다.
 */

/** 겹쳐 그리는 자리. 순서는 lib/wardrobe/layers.ts 한 곳에서만 정한다. */
export const AVATAR_LAYERS = [
  'BASE',
  'BOTTOM',
  'TOP',
  'ONE_PIECE',
  'SHOES',
  'HAIR_BACK',
  'FACE',
  'HAIR',
  'HEAD',
  'ACCESSORY',
  'BAG',
] as const
export type AvatarLayer = (typeof AVATAR_LAYERS)[number]

/** 옷장 칸. Phase 1 에서는 앞의 넷만 화면에 띄운다. */
export const WARDROBE_CATEGORIES = [
  'TOP',
  'BOTTOM',
  'ONE_PIECE',
  'SHOES',
  'HAIR',
  'HEAD',
  'ACCESSORY',
  'BAG',
  'FACE',
] as const
export type WardrobeCategory = (typeof WARDROBE_CATEGORIES)[number]

export type WardrobeRarity = 'BASIC' | 'COMMON' | 'RARE' | 'EPIC'

/**
 * 옷 한 벌.
 *
 * 좌표는 베이스 그림의 픽셀이다. 렌더러가 통째로 줄여서 쓰기 때문에
 * 화면 크기가 달라져도 어긋나지 않는다.
 */
export interface WardrobeItem {
  id: string
  name: string
  category: WardrobeCategory
  layer: AvatarLayer
  /** 그림 파일. 없으면 이 옷은 그리지 않는다 — 앱이 멈추지는 않는다. */
  assetKey?: string

  rarity: WardrobeRarity
  /** 검색과 코디 추천에 쓸 결. 지금은 표시만 한다. */
  styleTags: string[]

  /** 살 수 있는 값. 없으면 파는 물건이 아니다. */
  price?: number
  /** 처음부터 가지고 있고 뺏기지 않는 옷 */
  basic?: boolean

  // ── 정렬 (scripts/align-wardrobe.py 가 그림에서 계산한다) ──
  offsetX: number
  offsetY: number
  scale: number
  /** 원본 그림 크기 */
  w: number
  h: number
  /** 사람이 눈으로 보고 고쳤으면 그 이유 */
  adjusted?: string

  /**
   * 성별 제한은 두지 않는다.
   * 캐릭터의 결은 머리·표정·옷의 조합으로 드러나면 된다.
   */
  genderRestriction: null
}

/** 지금 입고 있는 것 */
export interface EquippedOutfit {
  topId: string | null
  bottomId: string | null
  onePieceId: string | null
  shoesId: string | null
  hairId: string | null
  headId: string | null
  accessoryId: string | null
  bagId: string | null
  faceId: string | null
}

export interface WardrobeState {
  /** 가지고 있는 옷. 기본 옷은 여기 없어도 늘 입을 수 있다. */
  owned: string[]
  outfit: EquippedOutfit
}
