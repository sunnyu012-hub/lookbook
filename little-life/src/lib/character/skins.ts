import type {
  AppState,
  CharacterSkin,
  SkinCategory,
  SkinCondition,
  SkinGachaPoolId,
  SkinId,
  SkinPackId,
  SkinRarity,
  SkinUnlock,
  SkinWorld,
  SkinView,
} from '@/types'
import { CHARACTER } from '@/lib/assets'
import { CATALOG } from '@/lib/collection/catalog'
import { discoveredCount, setProgress } from '@/lib/collection/progress'
import { COLLECTION_SETS } from '@/lib/collection/sets'
import { discoveredInGroup } from './groups'
import { SKIN_PACKS, findPack } from './packs'
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

/**
 * 처음 스물넷.
 *
 * 묶음이라는 말이 생기기 전에 나왔다. 그래서 packId 가 없고,
 * 의상실에서는 늘 "전체" 에 들어간다. 여는 조건은 이 아래 아흔여섯이
 * 늘어난 뒤에도 한 글자도 달라지지 않는다.
 */
const LEGACY_SKINS: CharacterSkin[] = [
  {
    id: 'basic_day',
    name: '베이직 데이',
    category: 'DAILY',
    rarity: 'COMMON',
    description: '아무 계획 없는 날에도 잘 어울리는 기본 모습.',
    tags: ['any', 'default'],
    unlock: { kind: 'DEFAULT' },
    acquisition: 'LEGACY_UNLOCK',
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
    acquisition: 'LEGACY_UNLOCK',
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
    acquisition: 'LEGACY_UNLOCK',
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
    acquisition: 'LEGACY_UNLOCK',
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
    acquisition: 'LEGACY_UNLOCK',
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
    acquisition: 'LEGACY_UNLOCK',
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
    acquisition: 'LEGACY_UNLOCK',
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
    acquisition: 'LEGACY_UNLOCK',
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
    acquisition: 'LEGACY_UNLOCK',
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
    acquisition: 'LEGACY_UNLOCK',
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
    acquisition: 'LEGACY_UNLOCK',
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
    acquisition: 'LEGACY_UNLOCK',
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
    acquisition: 'LEGACY_UNLOCK',
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
    acquisition: 'LEGACY_UNLOCK',
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
    acquisition: 'LEGACY_UNLOCK',
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
    acquisition: 'LEGACY_UNLOCK',
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
    acquisition: 'LEGACY_UNLOCK',
    hint: '이안이 진열하지 않는 옷도 있는 것 같다.',
    dialogue: {
      line1: '이안이 말없이 옷걸이를 하나 꺼냈다.',
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
    acquisition: 'LEGACY_UNLOCK',
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
    acquisition: 'LEGACY_UNLOCK',
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
    acquisition: 'LEGACY_UNLOCK',
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
    acquisition: 'LEGACY_UNLOCK',
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
    acquisition: 'LEGACY_UNLOCK',
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
    acquisition: 'LEGACY_UNLOCK',
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
    acquisition: 'LEGACY_UNLOCK',
    hint: '서로 다른 빛들이 충분히 모이면…',
    dialogue: {
      line1: '이름 붙이기 어려운 빛들이 하나로 모였다.',
      line2: '꿈같은 색이 새로운 모습이 되었다.',
    },
    hiddenUntilOwned: true,
    sortOrder: 24,
  },
]

/**
 * 3~10 묶음, 열두 벌씩 아흔여섯.
 *
 * ── 한 줄씩 적는다 ─────────────────────────────────────
 *
 * 묶음 안에서는 분류 · 등급 · 세계 · 결 · 값 · 얻는 길이 전부 같다.
 * 그걸 정의마다 쓰면 아흔여섯 개가 거의 같은 글자로 가득 찬다.
 * 도감 물건 240개를 표로 적은 것과 같은 방식으로, 여기서도
 * 다른 것(id · 이름 · 한 줄 설명)만 적고 나머지는 묶음에서 가져온다.
 *
 * ── 등급을 낮게 둔 이유 ────────────────────────────────
 *
 * 아흔여섯을 전부 흔함 · 귀함으로 뒀다. 특별(EPIC) 위로 올리면
 * 오로라 팝의 "귀한 모습 다섯 벌" 조건이 저절로 쉬워진다 —
 * 새 옷을 늘리면서 예전 조건의 무게를 건드리면 안 된다.
 */
type PackRow = readonly [id: SkinId, name: string, description: string]

const PACK_ROWS: Record<SkinPackId, readonly PackRow[]> = {
  3: [
    ['night_bookkeeper', '심야 서점지기', '새벽 두 시에도 불이 켜져 있는 서점.'],
    ['starlight_patissier', '별빛 파티시에', '반죽에 별을 조금 섞는다는 소문.'],
    ['alley_detective', '골목 탐정', '잃어버린 고양이를 주로 찾는다.'],
    ['magic_postal', '마법 우편배달부', '주소가 없는 편지도 어떻게든 간다.'],
    ['city_archivist', '도시 기록가', '아무도 안 적는 것들을 적어둔다.'],
    ['vintage_shop_buyer', '빈티지숍 바이어', '남의 옷장에서 하루를 보내는 일.'],
    ['little_theater_actor', '작은 극장의 배우', '객석이 스무 자리인 무대.'],
    ['rooftop_gardener', '옥상 정원사', '엘리베이터 없는 건물 옥상까지 물을 이고 간다.'],
    ['dream_mender', '꿈 수선사', '찢어진 데를 티 안 나게 꿰맨다.'],
    ['night_market_trader', '야시장 상인', '해가 져야 문을 여는 가게.'],
    ['treasure_appraiser', '보물 감정사', '대부분은 보물이 아니라고 말해주는 일.'],
    ['neon_dj', '네온 DJ', '새벽 네 시에 제일 좋은 곡을 튼다.'],
  ],
  4: [
    ['cherry_blossom_picnic', '벚꽃 피크닉', '꽃잎이 도시락에도 들어간다.'],
    ['spring_rain_walker', '봄비 산책자', '우산을 써도 안 써도 괜찮은 비.'],
    ['summer_firework_keeper', '여름밤 불꽃지기', '터지기 전까지가 제일 조용하다.'],
    ['marine_vacance', '마린 바캉스', '짐은 적을수록 좋다.'],
    ['peach_holiday', '복숭아빛 휴일', '아무 일도 안 하기로 정한 날.'],
    ['autumn_leaf_explorer', '단풍 탐험가', '길을 잃어도 예쁜 계절.'],
    ['halloween_candy_witch', '핼러윈 캔디 마녀', '주머니가 사탕으로 무겁다.'],
    ['ghost_hotel_bellboy', '유령 호텔 벨보이', '손님이 안 보여도 짐은 무겁다.'],
    ['first_snow_angel', '첫눈의 천사', '올해 처음 내린 눈만 셀 수 있다.'],
    ['christmas_idol', '크리스마스 아이돌', '일 년에 한 번뿐인 무대.'],
    ['new_year_pouch', '새해 복주머니', '뭐가 들었는지는 열어봐야 안다.'],
    ['starlight_ball', '별빛 연말무도회', '한 해의 마지막 밤에만 열린다.'],
  ],
  5: [
    ['strawberry_farmer', '딸기 농장주', '아침에 제일 단 걸 먼저 먹는 특권.'],
    ['herb_witch', '허브 마녀', '주로 감기에 좋은 걸 만든다.'],
    ['crystal_miner', '수정 광부', '깊이 들어갈수록 조용해진다.'],
    ['cave_cartographer', '동굴 지도제작자', '길을 그려두면 다음 사람이 안 헤맨다.'],
    ['monster_chef', '몬스터 요리사', '무섭게 생긴 재료일수록 맛있다.'],
    ['dessert_alchemist', '디저트 연금술사', '설탕과 불의 비율이 전부다.'],
    ['mushroom_forager', '버섯 채집가', '먹어도 되는 것만 골라 담는다.'],
    ['moonlight_angler', '달빛 낚시꾼', '안 잡혀도 상관없는 밤낚시.'],
    ['treasure_hunter', '보물 사냥꾼', '지도에 그려둔 자리는 보통 틀렸다.'],
    ['slime_researcher', '슬라임 연구원', '아직도 뭘 먹는지 모른다.'],
    ['dungeon_idol', '던전 아이돌', '관객이 대부분 몬스터다.'],
    ['legendary_guildmaster', '전설의 길드장', '요즘은 서류 일이 더 많다.'],
  ],
  6: [
    ['dawn_black_cat', '새벽의 검은 고양이', '아무도 안 깬 시간에만 보인다.'],
    ['moonlight_rockstar', '달빛 록스타', '달이 뜬 밤에만 소리가 커진다.'],
    ['dream_ballerina', '꿈속의 발레리나', '바닥에 닿지 않고 도는 춤.'],
    ['neon_angel', '네온 천사', '날개가 도시 불빛 색이다.'],
    ['rose_garden_ghost', '장미 정원의 유령', '나쁜 뜻은 없는 쪽.'],
    ['star_thief_mage', '별을 훔친 마법사', '하나쯤은 없어져도 모를 줄 알았다.'],
    ['time_traveler', '시간 여행자', '어제로 돌아가도 같은 옷을 입는다.'],
    ['mirror_world_me', '거울세계의 나', '가르마가 반대다.'],
    ['city_guardian', '도시의 수호자', '아무도 모르게 하는 편이 편하다.'],
    ['golden_slime_queen', '황금 슬라임 퀸', '왕관이 자꾸 흘러내린다.'],
    ['all_seasons_spirit', '모든 계절의 정령', '네 계절을 한 벌에 담았다.'],
    ['little_life_lead', 'Little Life의 주인공', '이 이야기의 한가운데 서 있는 모습.'],
  ],
  7: [
    ['oatmeal_sweatshirt_daily', '오트밀 맨투맨 데일리', '고민하기 싫은 날에 손이 먼저 간다.'],
    ['coral_tee_light_denim', '코랄 티셔츠와 연청 데님', '한 가지만 밝아도 하루가 가벼워진다.'],
    ['sage_check_shirt_layered', '세이지 체크 셔츠 레이어드', '단추는 안 잠근다.'],
    ['charcoal_cardigan_raw_denim', '차콜 카디건과 생지 데님', '어두운 두 벌인데 답답하지 않다.'],
    ['dusty_blue_work_jacket', '더스티블루 워크재킷', '주머니가 많아서 가방을 덜 든다.'],
    ['cream_knit_vest_long_skirt', '크림 니트 조끼와 롱스커트', '단정한데 조이지 않는다.'],
    ['dusty_red_rugby_shirt', '더스티레드 럭비 셔츠', '굵은 줄무늬는 그것만으로 충분하다.'],
    ['shirring_blouse_cargo_skirt', '셔링 블라우스와 카고 스커트', '위는 얌전하고 아래는 편하게.'],
    ['denim_shirt_setup', '데님 셔츠 셋업', '위아래를 맞추면 고민할 게 없다.'],
    ['lavender_shirt_dress', '라벤더 셔츠 원피스', '하나만 입으면 끝나는 날.'],
    ['city_windbreaker_wide_pants', '도심 바람막이와 와이드 팬츠', '바람이 지나가는데 안 춥다.'],
    ['red_cardigan_cream_pants', '레드 카디건과 크림 팬츠', '한 군데만 붉으면 눈이 거기 간다.'],
  ],
  8: [
    ['early_spring_trench', '꽃샘추위 트렌치코트', '봄인 줄 알았는데 아니었다.'],
    ['fine_dust_day', '미세먼지 있는 날', '창문을 못 여는 날의 차림.'],
    ['spring_wedding_guest', '봄날 하객 코디', '주인공보다 튀면 안 된다.'],
    ['early_summer_shirt', '초여름 셔츠 레이어드', '낮엔 덥고 저녁엔 서늘하다.'],
    ['rainy_season_practical', '장마철 실용 코디', '젖어도 금방 마르는 것들로.'],
    ['heatwave_linen', '폭염의 린넨 셋업', '가볍고 바람이 지나간다.'],
    ['aircon_cardigan', '에어컨 대비 카디건', '밖보다 안이 더 춥다.'],
    ['midsummer_long_skirt', '한여름 롱스커트', '길어도 시원한 쪽.'],
    ['early_autumn_shirt', '초가을 셔츠 레이어드', '아침저녁으로 온도가 다르다.'],
    ['autumn_suede_jacket', '가을 스웨이드 재킷', '일 년에 두 주쯤 딱 맞는 옷.'],
    ['sudden_cold_day', '갑자기 추운 날 플리스', '어제까진 이러지 않았다.'],
    ['cold_wave_long_padding', '한파의 롱패딩', '멋보다 따뜻한 게 먼저다.'],
  ],
  9: [
    ['french_girl_casual', '프렌치 걸 캐주얼', '애쓴 티가 안 나는 게 핵심.'],
    ['minimal_monotone', '미니멀 모노톤', '색을 두 개 넘게 안 쓴다.'],
    ['kitsch_vintage_denim', '키치 빈티지 데님', '어울리는지는 나중에 생각한다.'],
    ['vintage_bookcafe_mood', '빈티지 북카페 무드', '오래된 종이 냄새가 나는 쪽.'],
    ['real_balletcore', '현실적인 발레코어', '실제로 걸어 다닐 수 있는 쪽으로.'],
    ['soft_gorpcore', '소프트 고프코어', '산에 안 가도 되는 등산복.'],
    ['cozy_scandi_mood', '코지 스칸디 무드', '집이 추운 나라의 옷.'],
    ['campus_preppy', '캠퍼스 프레피', '수업에 늦어도 단정해 보인다.'],
    ['retro_sporty', '레트로 스포티', '오래된 운동복이 더 예쁘다.'],
    ['cityboy_overfit', '시티보이 오버핏', '한 치수 크게 입는 게 규칙.'],
    ['romantic_satin_mood', '로맨틱 새틴 무드', '빛을 조금 머금는 천.'],
    ['soft_chic_all_black', '소프트 시크 올블랙', '검정도 부드러울 수 있다.'],
  ],
  10: [
    ['subway_commute', '지하철 출근길', '손잡이를 잡고 서서 가는 삼십 분.'],
    ['work_from_home_day', '재택근무하는 날', '위만 갖춰 입으면 된다.'],
    ['convenience_store_run', '편의점 다녀오는 길', '삼 분이면 돌아온다.'],
    ['after_work_meetup', '퇴근 후 약속', '아침에 미리 정해두고 나온 옷.'],
    ['new_cafe_hunt', '카페 신상 탐방', '사진이 잘 나오는 자리를 먼저 본다.'],
    ['exhibition_day', '전시회 보러 가는 날', '조용한 데서 오래 서 있는다.'],
    ['baseball_cheer', '야구장 응원룩', '이기든 지든 목이 쉰다.'],
    ['hangang_picnic', '한강 피크닉', '돗자리와 바람만 있으면 된다.'],
    ['popup_openrun', '팝업스토어 오픈런', '아침 일찍 줄 서는 날.'],
    ['concert_day', '콘서트 가는 날', '두 시간을 위해 하루를 비운다.'],
    ['airport_day', '공항 가는 날', '벗기 쉽고 입기 쉬운 게 최고다.'],
    ['interview_day', '면접 보러 가는 날', '거울을 세 번 본다.'],
  ],
}

/**
 * 묶음마다 쓰는 기존 분류.
 *
 * SkinCategory 를 지우거나 갈아엎지 않는다 — 스물넷이 쓰고 있고,
 * 의상실의 새 축(세계 · 결)은 그것과 별개로 붙였다.
 */
const PACK_CATEGORY: Record<SkinPackId, SkinCategory> = {
  3: 'ACTIVITY',
  4: 'SEASON',
  5: 'ACTIVITY',
  6: 'SPECIAL',
  7: 'DAILY',
  8: 'SEASON',
  9: 'MOOD',
  10: 'ACTIVITY',
}

/** 의상실에서 파는 새 옷은 값이 다 같다. 능력치가 없으니 값을 나눌 근거도 없다. */
export const NEW_SHOP_SKIN_PRICE = 480

/** 얻은 순간에 나오는 말. 묶음마다 같아도 된다 — 짧고 생활적인 쪽이 낫다. */
const PACK_DIALOGUE: Record<'SHOP' | 'GACHA', string> = {
  SHOP: '새 옷이 옷장에 들어왔다.',
  GACHA: '새 옷이 옷장에 들어왔다.',
}

function packSkins(): CharacterSkin[] {
  const made: CharacterSkin[] = []
  let order = LEGACY_SKINS.length

  for (const pack of SKIN_PACKS) {
    for (const [id, name, description] of PACK_ROWS[pack.id]) {
      order += 1
      made.push({
        id,
        name,
        category: PACK_CATEGORY[pack.id],
        // 특별(EPIC) 위로 올리지 않는다 — 오로라 팝 조건이 저절로 쉬워진다
        rarity: pack.acquisition === 'SHOP' ? 'COMMON' : 'RARE',
        description,
        tags: [],
        unlock:
          pack.acquisition === 'SHOP'
            ? { kind: 'CONDITION', all: [], price: NEW_SHOP_SKIN_PRICE }
            : { kind: 'GACHA', poolId: pack.poolId! },
        acquisition: pack.acquisition,
        packId: pack.id,
        wardrobeTag: pack.tag,
        // 조건을 세는 옷이 아니라서 힌트에 적을 "아직 남은 것" 이 없다.
        // 어디서 만나는지는 의상실이 묶음에서 읽어 말해준다.
        hint: '',
        dialogue: { line1: PACK_DIALOGUE[pack.acquisition] },
        sortOrder: order,
      })
    }
  }

  return made
}

/**
 * 백스무 벌.
 *
 * 처음 스물넷이 앞, 묶음 여덟이 뒤. 순서를 섞지 않는다 —
 * 예전 저장에 들어 있는 id 가 그대로 앞자리에 남아 있어야
 * 무엇이 달라졌는지 눈으로 대볼 수 있다.
 */
export const SKINS: CharacterSkin[] = [...LEGACY_SKINS, ...packSkins()]

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

/**
 * 목록에서 쓰는 작은 그림.
 *
 * 도감 물건이 이미 하는 방식과 같다 — 긴 쪽 128px 짜리를 따로 두고
 * 격자에서는 그걸 쓴다. 아직 안 만들어졌으면 렌더러가 원본으로 돌아간다.
 */
export function skinThumb(def: CharacterSkin): string {
  return `/assets/thumbs/characters/${def.id}.webp`
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
  // 작은 옷장 옷은 채워서 여는 게 아니다. 여기서 0 으로 잘라두면
  // conditionsMet · newlyUnlocked · 살 수 있는지 판정이 전부 이쪽으로 안 온다.
  if (unlock.kind === 'GACHA') return 0
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
      // 작은 옷장 옷은 여기 안 들어온다. 갈래가 CONDITION 이 아니다.
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

/**
 * 이 옷이 어느 세계 것인지.
 *
 * 묶음에서 읽는다. 처음 스물넷은 묶음이 없어서 null 이고,
 * 의상실에서 세계를 골라도 늘 같이 보인다 — 스물넷을 억지로
 * 일상/판타지로 나누느니 항상 보이는 편이 찾기 쉽다.
 */
export function skinWorld(def: CharacterSkin): SkinWorld | null {
  return findPack(def.packId)?.world ?? null
}

/** 작은 옷장 묶음 하나에 든 열두 벌 */
export function skinsInPool(poolId: SkinGachaPoolId): CharacterSkin[] {
  return SKINS.filter((s) => s.unlock.kind === 'GACHA' && s.unlock.poolId === poolId)
}

/** 이 묶음의 열두 벌 */
export function skinsInPack(packId: SkinPackId): CharacterSkin[] {
  return SKINS.filter((s) => s.packId === packId)
}

/**
 * 묶음을 몇 벌이나 모았는지.
 *
 * 저장하지 않는다. 가진 목록과 묶음 표만 있으면 언제든 다시 센다.
 */
export function packProgress(
  state: AppState,
  packId: SkinPackId,
): { found: number; total: number } {
  const inPack = skinsInPack(packId)
  const owned = new Set(state.user.ownedSkinIds)
  return { found: inPack.filter((s) => owned.has(s.id)).length, total: inPack.length }
}

export const SKIN_CATEGORY_LABEL: Record<SkinCategory, string> = {
  DAILY: '일상',
  ACTIVITY: '활동',
  MOOD: '기분',
  SEASON: '계절',
  SPECIAL: '특별',
}
