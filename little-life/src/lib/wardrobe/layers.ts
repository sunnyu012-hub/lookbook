import type { AvatarLayer, WardrobeCategory } from '@/types/wardrobe'

/**
 * 겹쳐 그리는 순서.
 *
 * **화면마다 따로 정하지 않는다.** 홈에서와 옷장에서 앞뒤가 다르면
 * 그건 두 캐릭터가 되는 거고, 어느 쪽이 맞는지 아무도 모르게 된다.
 * 순서는 여기 한 곳에서만 바꾼다.
 *
 * 작은 수가 뒤(먼저 그린다), 큰 수가 앞이다.
 */
export const LAYER_ORDER: Record<AvatarLayer, number> = {
  HAIR_BACK: 0,
  BASE: 10,
  // 하의 그림에 다리와 신발이 같이 그려져 있어서 신발보다 먼저 깔린다.
  // 신발만 따로 그린 그림이 생기면 그때 SHOES 를 위로 올리면 된다.
  BOTTOM: 20,
  SHOES: 25,
  TOP: 30,
  ONE_PIECE: 35,
  FACE: 40,
  HAIR: 50,
  HEAD: 60,
  ACCESSORY: 70,
  BAG: 80,
}

/** 옷장 칸이 어느 자리에 그려지는지 */
export const LAYER_BY_CATEGORY: Record<WardrobeCategory, AvatarLayer> = {
  TOP: 'TOP',
  BOTTOM: 'BOTTOM',
  ONE_PIECE: 'ONE_PIECE',
  SHOES: 'SHOES',
  HAIR: 'HAIR',
  HEAD: 'HEAD',
  ACCESSORY: 'ACCESSORY',
  BAG: 'BAG',
  FACE: 'FACE',
}

/** Phase 1 에서 옷장 화면에 띄우는 칸 */
export const ACTIVE_CATEGORIES: WardrobeCategory[] = ['TOP', 'BOTTOM', 'ONE_PIECE', 'SHOES']

export const CATEGORY_LABEL: Record<WardrobeCategory, string> = {
  TOP: '상의',
  BOTTOM: '하의',
  ONE_PIECE: '원피스',
  SHOES: '신발',
  HAIR: '머리',
  HEAD: '모자',
  ACCESSORY: '장신구',
  BAG: '가방',
  FACE: '표정',
}
