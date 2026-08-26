import type { Category, CropDef, CropId, CropVariant, RareDiscovery, Rarity } from '@/types'
import { CROP_IDS } from '@/types'

/**
 * 정원에서 자라는 것들.
 *
 * 이 표가 정원의 전부다. 화면 코드에는 작물 이름이 하나도 없다.
 * 여기 한 줄을 더하면 씨앗 · 도감 · 드롭 · 수확이 전부 알아서 안다.
 *
 * 자라는 시간은 "오늘 아침에 심으면 저녁에 거둔다" 를 기준으로 잡았다.
 * 3~10시간. 이보다 짧으면 앱을 붙들고 있게 되고,
 * 이보다 길면 심어둔 걸 잊는다.
 */

const HOUR = 3600

type Row = readonly [
  id: CropId,
  name: string,
  icon: string,
  rarity: Rarity,
  hours: number,
  min: number,
  max: number,
  desc: string,
  tags: string,
]

/** 지금 씨앗이 도는 여덟 가지 */
const ROWS: Row[] = [
  ['strawberry', '딸기', '🍓', 'COMMON', 4, 2, 4, '작고 달콤한 빨간 열매.', 'fruit'],
  ['tomato', '토마토', '🍅', 'COMMON', 5, 2, 4, '햇빛을 좋아하는 동그란 열매.', 'fruit'],
  ['potato', '감자', '🥔', 'COMMON', 6, 2, 5, '땅속에서 조용히 자란다.', 'root'],
  ['basil', '바질', '🌿', 'COMMON', 3, 2, 3, '향긋한 초록 잎.', 'herb'],
  ['lavender', '라벤더', '💜', 'RARE', 7, 1, 3, '정원에 작은 향기를 남긴다.', 'herb,flower'],
  ['carrot', '당근', '🥕', 'COMMON', 5, 2, 4, '조금 삐뚤어도 맛은 같다.', 'root'],
  ['pumpkin', '호박', '🎃', 'RARE', 10, 1, 2, '시간은 오래 걸리지만 든든하다.', 'fruit'],
  [
    'tiny_mushroom',
    '작은 버섯',
    '🍄',
    'RARE',
    8,
    1,
    3,
    '언제부터 있었는지 아무도 모른다.',
    'mushroom',
  ],
]

/**
 * 아직 씨앗이 돌지 않는 것들.
 *
 * 도감에 ??? 로 자리만 있다. 만날 방법을 지금 만들지 않는 이유는,
 * 없는 조건을 급하게 지어내면 나중에 이야기가 생겼을 때 그걸 다시 뜯어야 하기 때문이다.
 */
const RARE: Row[] = [
  ['star_flower', '별빛꽃', '✨', 'EPIC', 12, 1, 2, '해가 진 뒤에야 작은 빛을 낸다.', 'flower,magic,night'],
  ['moon_herb', '달빛허브', '🌙', 'EPIC', 10, 1, 2, '밤이 깊어질수록 향이 짙어진다.', 'herb,magic,night'],
  ['dream_strawberry', '꿈딸기', '🌌', 'EPIC', 12, 1, 2, '딸기인데 색이 조금 비현실적이다.', 'fruit,sweet,magic'],
  ['golden_strawberry', '황금 딸기', '🌟', 'LEGENDARY', 14, 1, 1, '아주 드물게 보이는 따뜻한 금빛.', 'fruit,rare,gold'],
]

/**
 * 희귀 작물을 찾는 조건.
 *
 * 전부 이미 쌓여 있는 기록에서 센다. 되돌아가는 값이 하나도 없어서
 * "며칠 쉬었더니 멀어졌다" 가 생길 수 없다.
 *
 * 황금 딸기만 조건이 없다 — 그건 찾는 게 아니라 딸기를 거두다 섞여 나온다.
 */
const DISCOVERY: Partial<Record<CropId, RareDiscovery>> = {
  star_flower: {
    conditions: [
      { kind: 'GARDEN_LEVEL', level: 2 },
      { kind: 'CROPS_DISCOVERED', count: 6 },
      { kind: 'NIGHT_QUESTS', count: 5 },
    ],
    reveal: '밤이 되자 정원 한쪽에서 작은 빛이 보인다.',
    reseedChance: 6,
    nightOnly: true,
  },
  moon_herb: {
    conditions: [
      { kind: 'GARDEN_LEVEL', level: 2 },
      { kind: 'CROP_HARVESTED', cropId: 'lavender', count: 5 },
      { kind: 'NIGHT_QUESTS', count: 8 },
    ],
    reveal: '라벤더 사이에 처음 보는 잎이 자라고 있다.',
    reseedChance: 6,
    nightOnly: true,
  },
  dream_strawberry: {
    conditions: [
      { kind: 'GARDEN_LEVEL', level: 3 },
      { kind: 'CROP_HARVESTED', cropId: 'strawberry', count: 15 },
      { kind: 'RECIPES_COOKED', count: 5 },
    ],
    reveal: '익숙한 딸기밭인데 색이 조금 이상하다.',
    reseedChance: 8,
  },
}

/**
 * 딸기를 거두다 아주 가끔 섞여 나오는 것.
 *
 * 확률로 굴리되 쉰 번을 거뒀는데도 못 봤으면 그다음엔 반드시 나온다.
 * 운이 나빠서 영영 못 보는 자리를 만들지 않는다.
 */
export const CROP_VARIANTS: CropVariant[] = [
  {
    id: 'golden_strawberry',
    baseCropId: 'strawberry',
    cropId: 'golden_strawberry',
    chance: 1,
    levelBonus: { level: 3, add: 0.5 },
    harvestBonus: { count: 30, add: 0.5 },
    pityAt: 50,
  },
]

/**
 * 어느 분야 퀘스트에서 어떤 씨앗이 조금 더 잘 나오는지.
 *
 * 아주 약한 기울기다. 여기 없는 씨앗도 어느 분야에서나 나온다 —
 * 특정 퀘스트를 해야 특정 작물이 나오는 구조로 만들지 않는다.
 * 그렇게 만드는 순간 정원이 현실의 숙제를 정하기 시작한다.
 */
const BIAS: Partial<Record<CropId, Category[]>> = {
  tomato: ['BODY'],
  carrot: ['BODY'],
  lavender: ['MIND'],
  basil: ['MIND', 'LIFE'],
  potato: ['LIFE'],
  strawberry: ['PLAY'],
  tiny_mushroom: ['PLAY'],
}

function toDef(row: Row, seedAvailable: boolean): CropDef {
  const [id, name, icon, rarity, hours, min, max, description, tags] = row
  return {
    id,
    name,
    icon,
    rarity,
    growthSeconds: hours * HOUR,
    seedItemId: `seed_${id}`,
    harvestItemId: `crop_${id}`,
    harvestMin: min,
    harvestMax: max,
    description,
    // 'ingredient' 를 전부에 붙인다. 나중에 작은 부엌이 생기면
    // 이 표를 다시 손대지 않고 그대로 재료로 쓸 수 있다.
    tags: ['crop', 'ingredient', ...tags.split(',')],
    seedAvailable,
    ...(BIAS[id] ? { seedBias: BIAS[id] } : {}),
    ...(DISCOVERY[id] ? { discovery: DISCOVERY[id] } : {}),
    ...(seedAvailable ? {} : { hiddenUntilDiscovered: true }),
  }
}

export const CROPS: CropDef[] = [
  ...ROWS.map((r) => toDef(r, true)),
  ...RARE.map((r) => toDef(r, false)),
]

const BY_ID = new Map(CROPS.map((c) => [c.id, c]))
const BY_SEED = new Map(CROPS.map((c) => [c.seedItemId, c]))
const BY_HARVEST = new Map(CROPS.map((c) => [c.harvestItemId, c]))

export function findCrop(id: string): CropDef | null {
  return BY_ID.get(id as CropId) ?? null
}

/** 이 씨앗이 무슨 작물인지 */
export function cropForSeed(seedItemId: string): CropDef | null {
  return BY_SEED.get(seedItemId) ?? null
}

/** 이 수확물이 무슨 작물인지 */
export function cropForHarvest(harvestItemId: string): CropDef | null {
  return BY_HARVEST.get(harvestItemId) ?? null
}

/** 처음부터 씨앗이 도는 것들. 찾아야 도는 것은 여기 없다. */
export const PLANTABLE_CROPS: CropDef[] = CROPS.filter((c) => c.seedAvailable)

/** 찾아야 만나는 것들 */
export const RARE_CROPS: CropDef[] = CROPS.filter((c) => c.discovery !== undefined)

export function findVariant(baseCropId: string): CropVariant | null {
  return CROP_VARIANTS.find((v) => v.baseCropId === baseCropId) ?? null
}

/**
 * 처음 들어갔을 때 주는 것.
 *
 * 빈 밭만 보여주고 "씨앗을 구해오세요" 하면, 그 자리에서 할 수 있는 게
 * 하나도 없다. 두 개를 주는 건 하나는 심어보고 하나는 남겨두라는 뜻이다.
 */
export const FIRST_SEEDS = { itemId: 'seed_strawberry', count: 2 }

/** 정원에서 얻을 수 있는 이슬 한 방울. 밭 하나를 30분 앞당긴다. */
export const GARDEN_DEW_ITEM_ID = 'garden_dew'
export const GARDEN_DEW_SECONDS = 30 * 60

export const CROP_ID_SET: ReadonlySet<string> = new Set<string>(CROP_IDS)
