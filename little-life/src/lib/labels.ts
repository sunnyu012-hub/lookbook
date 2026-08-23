import type {
  Category,
  CollectionCategory,
  CollectionRarity,
  Difficulty,
  EquipSlot,
  FriendshipLevel,
  ItemType,
  ReputationLevel,
  StatKey,
} from '@/types'

/**
 * 화면에 보이는 한국어 이름을 한곳에 모아둔다.
 *
 * 카테고리·난이도 배지 그림에는 영문이 그려져 있지만(그림은 못 고친다),
 * 글자는 전부 한국어로 읽히게 한다. 그림 속 영문은 장식으로 남는다.
 */

export const CATEGORY_LABEL: Record<Category, string> = {
  LIFE: '생활',
  WORK: '일',
  BODY: '몸',
  PLAY: '놀이',
  MIND: '마음',
  HEART: '관계',
}

export const DIFFICULTY_KO: Record<Difficulty, string> = {
  EASY: '쉬움',
  NORMAL: '보통',
  HARD: '어려움',
}

export const RARITY_LABEL: Record<CollectionRarity, string> = {
  COMMON: '흔함',
  RARE: '귀함',
  EPIC: '특별',
  LEGENDARY: '전설',
  SECRET: '비밀',
}

/** 도감 분류 */
export const COLLECTION_CATEGORY_LABEL: Record<CollectionCategory, string> = {
  FURNITURE: '가구',
  LIGHTING: '조명',
  PLANT: '식물',
  RUG: '러그',
  WALL: '벽',
  LITTLE_THING: '작은 물건',
  KITCHEN: '주방',
  FOOD: '먹을 것',
  BOOK: '책',
  HOBBY: '취미',
  TECH: '기계',
  OUTDOOR: '바깥',
  MAGIC: '보물',
  TROPHY: '트로피',
  MATERIAL: '재료',
}

export const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  EQUIPMENT: '장비',
  CONSUMABLE: '마실 것',
  MATERIAL: '재료',
  COLLECTIBLE: '수집품',
}

export const EQUIP_SLOT_LABEL: Record<EquipSlot, string> = {
  HEAD: '머리',
  TOP: '상의',
  BOTTOM: '하의',
  SHOES: '신발',
  ACCESSORY: '소품',
  CHARM: '부적',
}

export const STAT_LABEL: Record<StatKey, string> = {
  ENERGY: '기운',
  FOCUS: '집중',
  VITALITY: '체력',
  CREATIVITY: '재미',
  CONNECTION: '마음',
  LUCK: '행운',
}

/** 친밀도 단계의 짧은 이름 */
export const FRIENDSHIP_SHORT: Record<FriendshipLevel, string> = {
  STRANGER: '아직 서먹',
  FAMILIAR: '얼굴 아는 사이',
  FRIEND: '친구',
  CLOSE_FRIEND: '가까운 친구',
  SPECIAL_BOND: '특별한 사이',
}

/** 지역 평판 단계의 짧은 이름 */
export const REPUTATION_SHORT: Record<ReputationLevel, string> = {
  VISITOR: '손님',
  REGULAR: '단골',
  LOCAL: '동네 사람',
  FAVORITE: '반가운 얼굴',
  CITY_LEGEND: '이 동네의 전설',
}

/**
 * 조사 붙이기.
 *
 * "낮잠용 플로어 체어 은(는)" 처럼 괄호를 그대로 두면 기계가 쓴 티가 난다.
 * 한글 마지막 글자에 받침이 있는지만 보면 되고, 물건 이름은 전부 한글이라
 * 이 정도면 충분하다. 한글이 아닌 글자로 끝나면 받침 없는 쪽을 쓴다.
 */
export function withJosa(word: string, withBatchim: string, withoutBatchim: string): string {
  const last = word.trim().slice(-1)
  const code = last.charCodeAt(0)
  const isHangul = code >= 0xac00 && code <= 0xd7a3
  if (!isHangul) return `${word}${withoutBatchim}`
  return `${word}${(code - 0xac00) % 28 > 0 ? withBatchim : withoutBatchim}`
}
