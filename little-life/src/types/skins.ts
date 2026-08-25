import type { Category } from './index'
import type { AreaId, TimeBand } from './rpg'
import type { NpcId } from './city'
import type { CollectionCategory } from './collection'
import type { SecretId } from './discovery'

/**
 * 캐릭터 모습.
 *
 * ── 통 그림 한 장 ──────────────────────────────────────
 *
 * 상의 · 하의 · 헤어 · 표정을 따로 겹치지 않는다. 한 장에 머리부터 신발,
 * 들고 있는 것까지 다 들어 있다. 모습을 바꾸는 건 그림 파일 하나를 바꾸는 일이다.
 *
 * 레이어로 조합하는 쪽을 먼저 만들어봤는데, 조합 가짓수가 늘수록
 * "어떤 조합이든 어색하지 않게" 그리는 일이 감당이 안 됐다.
 * 완성된 한 장이 훨씬 예쁘고, 새 모습을 더하는 것도 그림 한 장이면 끝난다.
 *
 * ── 능력치가 없다 ──────────────────────────────────────
 *
 * EXP 도 코인도 스탯도 붙이지 않는다. 붙이는 순간 "예쁜 것" 과 "효율적인 것" 이
 * 갈라지고, 사람들은 안 예쁜 걸 입게 된다. 그건 이 기능의 목적이 아니다.
 */

export const SKIN_IDS = [
  // 1차 — 일상
  'basic_day',
  'cozy_home',
  'weekend_casual',
  'cafe_work',
  'climbing_day',
  'creative_day',
  'rainy_day',
  'night_owl',
  'date_day',
  'spring_picnic',
  'winter_cozy',
  'moon_alley',
  // 2차 — 달콤
  'strawberry_bonbon',
  'milky_ballet',
  'toy_candy_pop',
  'angel_picnic',
  // 2차 — 락
  'soft_rock_chic',
  'pink_punk',
  'vintage_band_girl',
  'midnight_leather',
  // 2차 — 무대
  'pink_idol_stage',
  'navy_star_idol',
  'white_encore',
  'aurora_pop',
] as const
export type SkinId = (typeof SKIN_IDS)[number]

export const SKIN_CATEGORIES = ['DAILY', 'ACTIVITY', 'MOOD', 'SEASON', 'SPECIAL'] as const
export type SkinCategory = (typeof SKIN_CATEGORIES)[number]

export type SkinRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'SECRET'

/**
 * 조건 하나.
 *
 * 전부 이미 쌓여 있는 기록에서 센다 — 발견 층과 같은 방식이다.
 * 따로 적립하지 않으니 나중에 조건을 바꿔도 저장된 값과 어긋날 일이 없고,
 * 업데이트를 켜는 순간 그동안의 기록이 그대로 반영된다.
 *
 * 기한이 없고, 되돌아가지 않고, 연속으로 뭘 해야 하는 것도 없다.
 * 며칠 쉬었다고 7/10 이 0 이 되면 그건 조건이 아니라 빚이다.
 */
export type SkinCondition =
  /** 이 분야 퀘스트를 이만큼 */
  | { kind: 'CATEGORY_QUESTS'; category: Category; count: number }
  /** 이 시간대에 이만큼 */
  | { kind: 'BAND_QUESTS'; band: TimeBand; count: number }
  /** 이 동네 평판 */
  | { kind: 'AREA_REPUTATION'; areaId: AreaId; value: number }
  /** 이 사람과의 친밀도 */
  | { kind: 'FRIENDSHIP'; npcId: NpcId; value: number }
  /** 도시 사람들과의 친밀도 합 */
  | { kind: 'FRIENDSHIP_TOTAL'; value: number }
  /** 이 계절에 이만큼 (달 번호는 1~12) */
  | { kind: 'SEASON'; months: number[]; count: number }
  /** 이 비밀 장소를 찾으면 */
  | { kind: 'SECRET'; secretId: SecretId }
  /** 비밀 장소를 몇 곳이나 찾았는지 */
  | { kind: 'SECRETS_FOUND'; count: number }
  /** 이 이야기 한 장을 읽으면 */
  | { kind: 'STORY_CHAPTER'; chapterId: string }
  /** 이야기를 몇 장이나 읽었는지 */
  | { kind: 'STORIES_READ'; count: number }
  /** 도감에서 알아본 것 전체 */
  | { kind: 'COLLECTION_TOTAL'; count: number }
  /** 도감의 이 갈래에서 몇 가지나 */
  | { kind: 'COLLECTION_CATEGORY'; category: CollectionCategory; count: number }
  /** 정해둔 물건 목록 중 몇 가지나 (달콤한 것 · 별 · 음악처럼 갈래를 가로지르는 묶음) */
  | { kind: 'COLLECTION_GROUP'; group: SkinItemGroup; count: number }
  /** 세트를 몇 개나 완성했는지 */
  | { kind: 'SETS_DONE'; count: number }
  /** 보스를 몇 번이나 넘었는지 */
  | { kind: 'BOSS_CLEARS'; count: number }
  /** 이 모습들을 이미 가지고 있어야 */
  | { kind: 'OWN_SKINS'; ids: SkinId[] }
  /** 이 등급 이상 모습을 몇 벌이나 */
  | { kind: 'OWN_RARE_SKINS'; count: number }

/**
 * 갈래를 가로지르는 물건 묶음.
 *
 * 도감 분류(가구 · 조명 …)로는 "달콤한 것" 이나 "음악과 관련된 것" 을 셀 수 없다.
 * 그런 묶음만 여기 이름을 붙여두고, 실제 목록은 lib/character/groups.ts 에 있다.
 */
export const SKIN_ITEM_GROUPS = ['SWEET', 'SOFT', 'FLOWER', 'STAR', 'MUSIC', 'TREASURE'] as const
export type SkinItemGroup = (typeof SKIN_ITEM_GROUPS)[number]

/**
 * 어떻게 얻는지.
 *
 * DEFAULT 는 처음부터 가지고 있는 것.
 * 나머지는 조건을 전부 채우면 열린다. price 가 있으면 열린 뒤에 코인으로 데려온다 —
 * "조건을 채우면 June 이 안쪽에서 꺼내주는 옷" 이 그런 모양이다.
 */
export type SkinUnlock =
  | { kind: 'DEFAULT' }
  | { kind: 'CONDITION'; all: SkinCondition[]; price?: number }

/** 어떤 길로 얻는지 — 화면과 보고서에서 한 마디로 부르려고 둔다 */
export type SkinUnlockType =
  | 'DEFAULT'
  | 'SHOP'
  | 'QUEST'
  | 'COLLECTION'
  | 'NPC_STORY'
  | 'SECRET_AREA'
  | 'SEASON'
  | 'EVENT'

/**
 * 얻는 순간 한 번 나오는 말.
 *
 * 두 줄이면 충분하다. 폰에서 카드 안에 들어가야 한다.
 */
export interface SkinUnlockDialogue {
  line1: string
  line2?: string
}

export interface CharacterSkin {
  id: SkinId
  /** 화면에 보이는 이름 */
  name: string
  category: SkinCategory
  rarity: SkinRarity
  /** 한 줄 설명. 조건이 아니라 분위기를 적는다. */
  description: string
  /**
   * 언제 어울리는 모습인지.
   *
   * 지금은 화면에서 쓰지 않는다. 나중에 "비 오는 날엔 이 모습 어때?" 같은
   * 제안을 붙일 때 여기를 본다.
   */
  tags: string[]
  unlock: SkinUnlock
  /** 어떤 길로 얻는지 */
  unlockType: SkinUnlockType
  /** 아직 못 얻었을 때 흘리는 말. 조건을 숫자로 말하지 않는다. */
  hint: string
  /** 얻은 순간에 나오는 말 */
  dialogue?: SkinUnlockDialogue
  /** 얻기 전에는 이름도 그림도 감춘다 */
  hiddenUntilOwned?: boolean
  /** 목록에서의 순서 */
  sortOrder: number
  /**
   * 자세별 그림.
   *
   * 지금 실제로 쓰는 건 idle 하나다. 나중에 어떤 모습에 특별한 자세가
   * 생기면 여기에 더하면 되고, 없는 자세는 idle 로 돌아간다.
   */
  poses?: Partial<Record<'questClear' | 'levelUp' | 'resting', string>>
  /**
   * 자리 보정.
   *
   * 열두 장을 자를 때 발끝과 서 있는 자리를 이미 맞춰뒀기 때문에
   * 보통은 필요 없다. 한 장만 유난히 클 때 여기서 손본다.
   * 화면 컴포넌트마다 margin 을 따로 주지 않으려고 둔 자리다.
   */
  offsetX?: number
  offsetY?: number
  scale?: number
}

/** 화면에서 쓰는 모양 — 정의에 지금 상태를 붙인다 */
export interface SkinView {
  def: CharacterSkin
  owned: boolean
  /** 지금 입고 있는지 */
  active: boolean
  /** 0~1. 아직 못 얻은 것이 얼마나 왔는지 */
  progress: number
  /** 조건은 다 채웠고 이제 코인만 있으면 되는 상태 */
  forSale: boolean
  /** 이름도 그림도 감출지 */
  hidden: boolean
}
