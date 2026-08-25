import type {
  AppState,
  CharacterSkin,
  SkinCategory,
  SkinCondition,
  SkinId,
  SkinRarity,
  SkinUnlock,
  SkinView,
} from '@/types'
import { CHARACTER } from '@/lib/assets'
import { CATALOG } from '@/lib/collection/catalog'
import { discoveredCount, setProgress } from '@/lib/collection/progress'
import { COLLECTION_SETS } from '@/lib/collection/sets'
import { discoveredInGroup } from './groups'
import type { CharacterMood } from '@/components/character/types'

/**
 * 열두 가지 모습.
 *
 * ── 조건을 정하면서 지킨 것 ────────────────────────────
 *
 * 하나. 전부 이미 하고 있는 것에서 나온다. 모습을 얻으려고 따로 해야 하는 일이 없다.
 * 둘.  숫자를 미리 알려주지 않는다. 힌트는 분위기만 말한다 —
 *      "몸 퀘스트 30개" 를 적어두면 그건 발견이 아니라 과제 목록이다.
 * 셋.  능력치가 없다. 오늘 마음에 드는 걸 입으면 된다.
 */

export const SKINS: CharacterSkin[] = [
  {
    id: 'basic_day',
    name: '베이직 데이',
    category: 'DAILY',
    rarity: 'COMMON',
    description: '아무 계획 없는 날에도 잘 어울리는 기본 모습.',
    tags: ['any', 'default'],
    unlock: { kind: 'DEFAULT' },
    unlockType: 'DEFAULT',
    hint: '',
    sortOrder: 1,
    // 처음부터 있던 네 자세를 그대로 쓴다. 기뻐하는 그림과 레벨업 그림이
    // 이 모습에만 있는 이유다 — 나머지 열한 벌은 아직 서 있는 한 장뿐이라
    // 그 순간에도 같은 그림으로 폴짝 뛴다.
    poses: {
      questClear: CHARACTER.questClear,
      levelUp: CHARACTER.levelUp,
      resting: CHARACTER.resting,
    },
  },
  {
    id: 'cozy_home',
    name: '코지 홈',
    category: 'DAILY',
    rarity: 'COMMON',
    description: '오늘은 집이 제일 좋은 날.',
    tags: ['home', 'rest', 'evening'],
    unlock: { kind: 'CONDITION', all: [{ kind: 'CATEGORY_QUESTS', category: 'LIFE', count: 10 }] },
    unlockType: 'QUEST',
    hint: '집안일을 자주 하는 사람에게 어울리는 모습.',
    dialogue: { line1: '집에서 보내는 시간이 쌓여 하나의 모습이 되었다.' },
    sortOrder: 2,
  },
  {
    id: 'weekend_casual',
    name: '위켄드 캐주얼',
    category: 'DAILY',
    rarity: 'COMMON',
    description: '정해진 건 없고, 일단 나가보는 날.',
    tags: ['weekend', 'walk', 'day'],
    unlock: { kind: 'CONDITION', all: [], price: 400 },
    unlockType: 'SHOP',
    hint: '어디 가게에서 본 것 같기도 하다.',
    dialogue: { line1: '가볍게 걸치고 나가기 좋은 한 벌이 생겼다.' },
    sortOrder: 3,
  },
  {
    id: 'cafe_work',
    name: '카페 워크',
    category: 'DAILY',
    rarity: 'RARE',
    description: '커피 한 잔과 작은 집중.',
    tags: ['work', 'cafe', 'day'],
    unlock: { kind: 'CONDITION', all: [{ kind: 'AREA_REPUTATION', areaId: 'CAFE_STREET', value: 20 }] },
    unlockType: 'QUEST',
    hint: '카페 거리에 자주 가는 사람에게서 보이는 모습.',
    dialogue: { line1: '카페 거리에서 얼굴이 익을 만큼 지냈다.' },
    sortOrder: 4,
  },
  {
    id: 'climbing_day',
    name: '클라이밍 데이',
    category: 'ACTIVITY',
    rarity: 'RARE',
    description: '오늘은 벽을 조금 올라가볼까.',
    tags: ['body', 'outdoor', 'day'],
    unlock: { kind: 'CONDITION', all: [{ kind: 'CATEGORY_QUESTS', category: 'BODY', count: 30 }] },
    unlockType: 'QUEST',
    hint: '몸을 많이 움직이는 날에 어울리는 모습.',
    dialogue: { line1: '움직인 날들이 쌓여 이런 차림이 어울리게 됐다.' },
    sortOrder: 5,
  },
  {
    id: 'creative_day',
    name: '크리에이티브 데이',
    category: 'ACTIVITY',
    rarity: 'RARE',
    description: '뭔가 만들고 싶은 기분.',
    tags: ['make', 'study', 'day'],
    unlock: { kind: 'CONDITION', all: [{ kind: 'AREA_REPUTATION', areaId: 'CREATIVE_DISTRICT', value: 25 }] },
    unlockType: 'QUEST',
    hint: '창작 골목에서 시간을 보내다 보면 보이는 모습.',
    dialogue: { line1: '창작 골목에서 보낸 시간이 옷이 되었다.' },
    sortOrder: 6,
  },
  {
    id: 'rainy_day',
    name: '레이니 데이',
    category: 'MOOD',
    rarity: 'RARE',
    description: '비 오는 날엔 천천히.',
    tags: ['rain', 'quiet', 'mind'],
    unlock: { kind: 'CONDITION', all: [{ kind: 'CATEGORY_QUESTS', category: 'MIND', count: 20 }] },
    unlockType: 'QUEST',
    hint: '생각을 정리하는 시간이 쌓이면 어느 날 보인다.',
    dialogue: { line1: '천천히 걷는 날에 어울리는 모습이 생겼다.' },
    sortOrder: 7,
  },
  {
    id: 'night_owl',
    name: '나이트 아울',
    category: 'MOOD',
    rarity: 'EPIC',
    description: '도시가 조용해진 뒤의 모습.',
    tags: ['night', 'quiet', 'home'],
    unlock: { kind: 'CONDITION', all: [{ kind: 'BAND_QUESTS', band: 'NIGHT', count: 25 }] },
    unlockType: 'QUEST',
    hint: '도시가 조용해질 때 자주 보이는 모습.',
    dialogue: { line1: '늦은 시간에 움직인 날들이 모였다.' },
    sortOrder: 8,
  },
  {
    id: 'date_day',
    name: '데이트 데이',
    category: 'SPECIAL',
    rarity: 'EPIC',
    description: '누굴 만나러 가는 날은 조금 더 신경 쓰게 된다.',
    tags: ['heart', 'meet', 'day'],
    unlock: { kind: 'CONDITION', all: [{ kind: 'FRIENDSHIP_TOTAL', value: 60 }] },
    unlockType: 'NPC_STORY',
    hint: '도시 사람들과 가까워질수록 가까워지는 모습.',
    dialogue: { line1: '누굴 만나러 가는 날에 어울리는 차림이 생겼다.' },
    sortOrder: 9,
  },
  {
    id: 'spring_picnic',
    name: '스프링 피크닉',
    category: 'SEASON',
    rarity: 'EPIC',
    description: '바람이 좋아서 조금 더 걷고 싶은 날.',
    tags: ['spring', 'outdoor', 'day'],
    unlock: { kind: 'CONDITION', all: [{ kind: 'SEASON', months: [3, 4, 5], count: 15 }] },
    unlockType: 'SEASON',
    hint: '봄에 지내다 보면 생기는 모습.',
    dialogue: { line1: '봄에 지낸 날들이 한 벌이 되었다.' },
    sortOrder: 10,
  },
  {
    id: 'winter_cozy',
    name: '윈터 코지',
    category: 'SEASON',
    rarity: 'EPIC',
    description: '손은 차갑고 옷은 포근하다.',
    tags: ['winter', 'outdoor', 'day'],
    unlock: { kind: 'CONDITION', all: [{ kind: 'SEASON', months: [12, 1, 2], count: 15 }] },
    unlockType: 'SEASON',
    hint: '겨울에 지내다 보면 생기는 모습.',
    dialogue: { line1: '겨울에 지낸 날들이 한 벌이 되었다.' },
    sortOrder: 11,
  },
  {
    id: 'moon_alley',
    name: '문 앨리',
    category: 'SPECIAL',
    rarity: 'SECRET',
    description: '어쩐지 평소와 다른 밤.',
    tags: ['night', 'secret'],
    unlock: { kind: 'CONDITION', all: [{ kind: 'SECRET', secretId: 'MOON_ALLEY' }] },
    unlockType: 'SECRET_AREA',
    hint: '평소에는 보이지 않는 골목과 관련이 있다.',
    dialogue: {
      line1: '골목 안쪽에서 본 색이 그대로 남았다.',
      line2: '이 모습은 낮보다 밤에 더 잘 어울린다.',
    },
    hiddenUntilOwned: true,
    sortOrder: 12,
  },

  // ── 2차 · 달콤 ────────────────────────────────────────
  {
    id: 'strawberry_bonbon',
    name: '스트로베리 봉봉',
    category: 'SPECIAL',
    rarity: 'RARE',
    description: '달콤한 하루를 그대로 입은 것 같은 모습.',
    tags: ['sweet', 'pink', 'cute', 'special'],
    unlock: {
      kind: 'CONDITION',
      all: [
        { kind: 'COLLECTION_GROUP', group: 'SWEET', count: 3 },
        { kind: 'COLLECTION_TOTAL', count: 25 },
      ],
      price: 420,
    },
    unlockType: 'SHOP',
    hint: '달콤한 것들을 조금 모으다 보면…',
    dialogue: {
      line1: 'June이 작은 상자를 내밀었다.',
      line2: '"달콤한 날엔 이런 모습도 어울릴 거야."',
    },
    sortOrder: 13,
  },
  {
    id: 'milky_ballet',
    name: '밀키 발레',
    category: 'SPECIAL',
    rarity: 'RARE',
    description: '말랑하고 우아한 리본 무드.',
    tags: ['sweet', 'balletcore', 'cream', 'special'],
    unlock: {
      kind: 'CONDITION',
      all: [{ kind: 'COLLECTION_GROUP', group: 'SOFT', count: 5 }],
      price: 480,
    },
    unlockType: 'COLLECTION',
    hint: '리본과 크림빛 물건들이 열쇠.',
    dialogue: {
      line1: '말랑한 크림빛 무드가 하나의 모습이 되었다.',
      line2: '조용히 리본을 묶고 나갈 준비를 한다.',
    },
    sortOrder: 14,
  },
  {
    id: 'toy_candy_pop',
    name: '토이 캔디 팝',
    category: 'SPECIAL',
    rarity: 'RARE',
    description: '사탕처럼 통통 튀는 귀여움.',
    tags: ['sweet', 'pastel', 'playful', 'special'],
    unlock: {
      kind: 'CONDITION',
      all: [
        { kind: 'CATEGORY_QUESTS', category: 'PLAY', count: 12 },
        { kind: 'AREA_REPUTATION', areaId: 'CREATIVE_DISTRICT', value: 8 },
      ],
    },
    unlockType: 'EVENT',
    hint: '평범한 날 갑자기 알록달록한 가게가 나타난다면?',
    dialogue: {
      line1: '오늘의 행운은 사탕처럼 튀어 올랐다.',
      line2: '알록달록한 기분이 그대로 옷이 되었다.',
    },
    sortOrder: 15,
  },
  {
    id: 'angel_picnic',
    name: '엔젤 피크닉',
    category: 'SPECIAL',
    rarity: 'EPIC',
    description: '햇살과 꽃내음을 모은 듯한 모습.',
    tags: ['sweet', 'soft', 'flower', 'special'],
    unlock: {
      kind: 'CONDITION',
      all: [
        { kind: 'COLLECTION_GROUP', group: 'FLOWER', count: 8 },
        { kind: 'COLLECTION_CATEGORY', category: 'PLANT', count: 4 },
      ],
    },
    unlockType: 'COLLECTION',
    hint: '꽃이 충분히 모이면 입을 수 있는 모습.',
    dialogue: {
      line1: '꽃과 햇살을 충분히 모으면 이런 모습이 된다.',
      line2: '가볍게 바람을 따라 나가보고 싶어진다.',
    },
    sortOrder: 16,
  },

  // ── 2차 · 락 ──────────────────────────────────────────
  {
    id: 'soft_rock_chic',
    name: '소프트 락 시크',
    category: 'SPECIAL',
    rarity: 'EPIC',
    description: '부드러운 얼굴로 입는 조용한 락시크.',
    tags: ['rock', 'chic', 'black', 'fashion'],
    unlock: {
      kind: 'CONDITION',
      all: [
        { kind: 'AREA_REPUTATION', areaId: 'CREATIVE_DISTRICT', value: 45 },
        { kind: 'FRIENDSHIP', npcId: 'JUNE', value: 20 },
      ],
      price: 750,
    },
    unlockType: 'SHOP',
    hint: 'June이 진열하지 않는 옷도 있는 것 같다.',
    dialogue: {
      line1: 'June이 비밀스럽게 옷걸이를 하나 꺼냈다.',
      line2: '"너라면 이 무드도 잘 소화할 것 같아."',
    },
    sortOrder: 17,
  },
  {
    id: 'pink_punk',
    name: '핑크 펑크',
    category: 'SPECIAL',
    rarity: 'EPIC',
    description: '장난스럽고 선명한 핑크 펑크 무드.',
    tags: ['rock', 'punk', 'pink', 'fashion'],
    unlock: {
      kind: 'CONDITION',
      all: [
        { kind: 'OWN_SKINS', ids: ['soft_rock_chic'] },
        { kind: 'CATEGORY_QUESTS', category: 'PLAY', count: 15 },
        { kind: 'AREA_REPUTATION', areaId: 'NIGHT_TOWN', value: 6 },
      ],
    },
    unlockType: 'QUEST',
    hint: '검정만으로는 조금 심심한 날.',
    dialogue: {
      line1: '오늘은 조금 더 튀어도 괜찮다.',
      line2: '핑크와 펑크가 생각보다 잘 어울린다.',
    },
    sortOrder: 18,
  },
  {
    id: 'vintage_band_girl',
    name: '빈티지 밴드 걸',
    category: 'SPECIAL',
    rarity: 'RARE',
    description: '좋아하는 밴드 티를 꺼내 입은 특별한 날.',
    tags: ['rock', 'vintage', 'band', 'fashion'],
    unlock: {
      kind: 'CONDITION',
      all: [
        { kind: 'COLLECTION_GROUP', group: 'MUSIC', count: 3 },
        { kind: 'STORY_CHAPTER', chapterId: 'LULU_2' },
      ],
      price: 520,
    },
    unlockType: 'NPC_STORY',
    hint: '오래된 음악을 좋아하는 누군가와 관련이 있다.',
    dialogue: {
      line1: '오래된 음악 냄새가 나는 옷이다.',
      line2: '좋아하는 곡을 틀고 그대로 밖으로 나가고 싶다.',
    },
    sortOrder: 19,
  },
  {
    id: 'midnight_leather',
    name: '미드나이트 레더',
    category: 'SPECIAL',
    rarity: 'LEGENDARY',
    description: '조용한 밤도시에 어울리는 어두운 반짝임.',
    tags: ['rock', 'night', 'leather', 'special'],
    unlock: {
      kind: 'CONDITION',
      all: [
        { kind: 'SECRET', secretId: 'MOON_ALLEY' },
        { kind: 'BAND_QUESTS', band: 'NIGHT', count: 15 },
        { kind: 'STORY_CHAPTER', chapterId: 'NOA_3' },
        { kind: 'BOSS_CLEARS', count: 1 },
      ],
    },
    unlockType: 'SECRET_AREA',
    hint: '도시가 어두워질수록 가까워지는 모습.',
    dialogue: {
      line1: '골목 끝의 상자 안에는 조용한 밤빛이 들어 있었다.',
      line2: '이 모습은 낮보다 밤에 더 잘 어울린다.',
    },
    hiddenUntilOwned: true,
    sortOrder: 20,
  },

  // ── 2차 · 무대 ────────────────────────────────────────
  {
    id: 'pink_idol_stage',
    name: '핑크 아이돌 스테이지',
    category: 'SPECIAL',
    rarity: 'EPIC',
    description: '무대 위에서 제일 먼저 눈에 들어오는 핑크.',
    tags: ['idol', 'stage', 'pink', 'special'],
    unlock: {
      kind: 'CONDITION',
      all: [{ kind: 'CATEGORY_QUESTS', category: 'PLAY', count: 20 }],
    },
    unlockType: 'EVENT',
    hint: '무대에 오르기 전에도 작은 준비가 필요하다.',
    dialogue: {
      line1: '작은 무대의 조명이 한 번 더 밝아졌다.',
      line2: '오늘의 주인공은 너다.',
    },
    sortOrder: 21,
  },
  {
    id: 'navy_star_idol',
    name: '네이비 스타 아이돌',
    category: 'SPECIAL',
    rarity: 'EPIC',
    description: '밤하늘 같은 무드의 스테이지 룩.',
    tags: ['idol', 'stage', 'navy', 'star'],
    unlock: {
      kind: 'CONDITION',
      all: [
        { kind: 'OWN_SKINS', ids: ['pink_idol_stage'] },
        { kind: 'BAND_QUESTS', band: 'NIGHT', count: 10 },
        { kind: 'COLLECTION_GROUP', group: 'STAR', count: 5 },
      ],
    },
    unlockType: 'EVENT',
    hint: '별빛이 있는 무대도 존재하는 것 같다.',
    dialogue: {
      line1: '별빛이 닿는 무대는 밤일수록 아름답다.',
      line2: '조용한 밤공기 위로 박수가 번진다.',
    },
    sortOrder: 22,
  },
  {
    id: 'white_encore',
    name: '화이트 앙코르',
    category: 'SPECIAL',
    rarity: 'LEGENDARY',
    description: '마지막까지 빛나는 앙코르의 순간.',
    tags: ['idol', 'white', 'encore', 'special'],
    unlock: {
      kind: 'CONDITION',
      all: [
        { kind: 'OWN_SKINS', ids: ['pink_idol_stage', 'navy_star_idol'] },
        { kind: 'STORIES_READ', count: 10 },
        { kind: 'COLLECTION_TOTAL', count: 100 },
      ],
    },
    unlockType: 'NPC_STORY',
    hint: '마지막 무대는 처음부터 열리지 않는다.',
    dialogue: {
      line1: '무대가 끝난 뒤에도 마지막 빛은 남아 있다.',
      line2: '이건 앙코르를 위한 모습이다.',
    },
    hiddenUntilOwned: true,
    sortOrder: 23,
  },
  {
    id: 'aurora_pop',
    name: '오로라 팝',
    category: 'SPECIAL',
    rarity: 'LEGENDARY',
    description: '반짝이는 오로라를 닮은 꿈같은 무드.',
    tags: ['idol', 'aurora', 'pastel', 'special'],
    unlock: {
      kind: 'CONDITION',
      all: [
        { kind: 'OWN_RARE_SKINS', count: 5 },
        { kind: 'COLLECTION_GROUP', group: 'TREASURE', count: 10 },
        { kind: 'SECRETS_FOUND', count: 3 },
        { kind: 'SETS_DONE', count: 1 },
      ],
    },
    unlockType: 'SECRET_AREA',
    hint: '서로 다른 빛들이 충분히 모이면…',
    dialogue: {
      line1: '이름 붙이기 어려운 빛들이 하나로 모였다.',
      line2: '꿈같은 색이 새로운 모습이 되었다.',
    },
    hiddenUntilOwned: true,
    sortOrder: 24,
  },
]

/** 그림이 없거나 이상한 id 가 들어와도 여기로 돌아온다 */
export const DEFAULT_SKIN_ID: SkinId = 'basic_day'

export function findSkin(id: string): CharacterSkin | null {
  return SKINS.find((s) => s.id === id) ?? null
}

/**
 * 이 모습의 그림 한 장.
 *
 * 화면마다 경로를 조합하지 않는다. 새 모습이 늘어도 여기만 안다.
 */
export function skinArt(def: CharacterSkin, pose: CharacterMood = 'idle'): string {
  if (pose !== 'idle') {
    const special = def.poses?.[pose]
    if (special) return special
  }
  return `/assets/characters/${def.id}.webp`
}

/** 이 모습에 이 자세 그림이 따로 있는지 */
export function hasPose(def: CharacterSkin, pose: CharacterMood): boolean {
  if (pose === 'idle') return true
  return def.poses?.[pose] !== undefined
}

/** 처음부터 가지고 있는 것 */
export function defaultOwnedSkinIds(): SkinId[] {
  return SKINS.filter((s) => s.unlock.kind === 'DEFAULT').map((s) => s.id)
}

// ── 조건에 얼마나 왔는지 ─────────────────────────────────

/**
 * 조건 하나에 얼마나 왔는지 (0~1).
 *
 * 전부 이미 있는 기록에서 센다. 발견 층(lib/discovery)이 세는 것과 같은 자리를
 * 본다 — 같은 사실을 두 군데서 따로 세면 언젠가 어긋난다.
 */
export function conditionProgress(state: AppState, condition: SkinCondition): number {
  switch (condition.kind) {
    case 'CATEGORY_QUESTS':
      return clamp((state.categoryCompleted[condition.category] ?? 0) / condition.count)

    case 'BAND_QUESTS': {
      const done = Object.values(state.usageProfiles).reduce(
        (sum, profile) => sum + (profile.completedByBand[condition.band] ?? 0),
        0,
      )
      return clamp(done / condition.count)
    }

    case 'AREA_REPUTATION':
      return clamp((state.reputation[condition.areaId] ?? 0) / condition.value)

    case 'FRIENDSHIP':
      return clamp((state.npcs[condition.npcId]?.friendship ?? 0) / condition.value)

    case 'FRIENDSHIP_TOTAL': {
      const total = Object.values(state.npcs).reduce((sum, npc) => sum + npc.friendship, 0)
      return clamp(total / condition.value)
    }

    case 'SEASON':
      return clamp(seasonCompleted(state, condition.months) / condition.count)

    case 'SECRET':
      return state.discovery.foundSecretIds.includes(condition.secretId) ? 1 : 0

    case 'SECRETS_FOUND':
      return clamp(state.discovery.foundSecretIds.length / condition.count)

    case 'STORY_CHAPTER':
      return state.discovery.readChapterIds.includes(condition.chapterId) ? 1 : 0

    case 'STORIES_READ':
      return clamp(state.discovery.readChapterIds.length / condition.count)

    case 'COLLECTION_TOTAL':
      return clamp(discoveredCount(state.collection) / condition.count)

    case 'COLLECTION_CATEGORY': {
      const found = CATALOG.filter(
        (item) =>
          item.category === condition.category &&
          state.collection.discovered[item.id] !== undefined,
      ).length
      return clamp(found / condition.count)
    }

    case 'COLLECTION_GROUP':
      return clamp(
        discoveredInGroup(state.collection.discovered, condition.group) / condition.count,
      )

    case 'SETS_DONE': {
      const done = COLLECTION_SETS.filter((set) => setProgress(set, state.collection).complete)
        .length
      return clamp(done / condition.count)
    }

    case 'BOSS_CLEARS':
      return clamp(state.bossClears / condition.count)

    case 'OWN_SKINS': {
      const owned = new Set(state.user.ownedSkinIds)
      const have = condition.ids.filter((id) => owned.has(id)).length
      return clamp(have / Math.max(1, condition.ids.length))
    }

    case 'OWN_RARE_SKINS': {
      const owned = new Set(state.user.ownedSkinIds)
      const have = SKINS.filter((s) => owned.has(s.id) && RARE_ENOUGH.has(s.rarity)).length
      return clamp(have / condition.count)
    }
  }
}

/** "귀한 모습" 으로 치는 등급 */
const RARE_ENOUGH = new Set<SkinRarity>(['EPIC', 'LEGENDARY', 'SECRET'])

/**
 * 이 모습을 얻기까지 얼마나 왔는지 (0~1).
 *
 * 조건 여럿은 평균이 아니라 **제일 덜 온 것** 으로 본다.
 * 넷 중 셋을 채워도 하나가 0 이면 아직 못 얻는 게 맞고,
 * 평균으로 보여주면 75% 라고 해놓고 안 열려서 더 답답하다.
 */
export function skinProgress(state: AppState, unlock: SkinUnlock): number {
  if (unlock.kind === 'DEFAULT') return 1
  if (unlock.all.length === 0) return 1
  return Math.min(...unlock.all.map((c) => conditionProgress(state, c)))
}

/** 조건은 다 채웠는지 (코인은 안 본다) */
export function conditionsMet(state: AppState, unlock: SkinUnlock): boolean {
  return skinProgress(state, unlock) >= 1
}

/** 그 계절에 끝낸 퀘스트 수. 날짜 열쇠에서 달을 읽는다. */
function seasonCompleted(state: AppState, months: number[]): number {
  let total = 0
  for (const [day, stat] of Object.entries(state.dailyLog)) {
    const month = Number(day.slice(5, 7))
    if (months.includes(month)) total += stat.completed
  }
  return total
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/** 코인으로 데려올 수 있는 것이면 값, 아니면 null */
export function skinPrice(def: CharacterSkin): number | null {
  if (def.unlock.kind !== 'CONDITION') return null
  return def.unlock.price ?? null
}

/**
 * 지금 조건을 채워서 새로 얻게 된 모습들.
 *
 * 값이 붙은 것은 여기서 주지 않는다 — 조건을 채우면 "살 수 있게" 될 뿐이고,
 * 데려오는 건 사람이 코인을 내고 한다.
 */
export function newlyUnlocked(state: AppState): CharacterSkin[] {
  const owned = new Set(state.user.ownedSkinIds)
  return SKINS.filter(
    (def) =>
      !owned.has(def.id) &&
      def.unlock.kind === 'CONDITION' &&
      def.unlock.price === undefined &&
      conditionsMet(state, def.unlock),
  )
}

// ── 화면에서 보는 모양 ───────────────────────────────────

export function skinViews(state: AppState): SkinView[] {
  const owned = new Set(state.user.ownedSkinIds)

  return [...SKINS]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((def) => {
      const has = owned.has(def.id)
      const price = skinPrice(def)
      return {
        def,
        owned: has,
        active: state.user.selectedSkinId === def.id,
        progress: has ? 1 : skinProgress(state, def.unlock),
        // 조건을 다 채웠고 값이 붙어 있으면, 이제 코인만 있으면 된다
        forSale: !has && price !== null && conditionsMet(state, def.unlock),
        hidden: !has && def.hiddenUntilOwned === true,
      }
    })
}

export function ownedSkinCount(state: AppState): number {
  return SKINS.filter((s) => state.user.ownedSkinIds.includes(s.id)).length
}

export function skinsInCategory(views: SkinView[], category: SkinCategory | 'ALL'): SkinView[] {
  if (category === 'ALL') return views
  return views.filter((v) => v.def.category === category)
}

export const SKIN_CATEGORY_LABEL: Record<SkinCategory, string> = {
  DAILY: '일상',
  ACTIVITY: '활동',
  MOOD: '기분',
  SEASON: '계절',
  SPECIAL: '특별',
}
