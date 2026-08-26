import type { CollectionItemDef, CropDef } from '@/types'
import { CROPS, GARDEN_DEW_ITEM_ID } from './crops'

/**
 * 정원의 물건들 — 씨앗 · 거둔 것 · 이슬.
 *
 * 작물 표(crops.ts)에서 만들어낸다. 같은 사실을 두 군데 적지 않는다 —
 * 손으로 또 적어두면 작물을 하나 더할 때마다 반드시 어긋난다.
 *
 * 도감의 240칸에는 들어가지 않는다. 이미 도감을 채워둔 사람의
 * "184 / 240" 이 어느 날 갑자기 "184 / 264" 가 되면,
 * 그건 새 콘텐츠가 아니라 뒷걸음질처럼 보인다.
 * 작물은 도감 안에 자기 칸(CROPS)을 따로 가진다.
 */

/** 씨앗과 거둔 것에 공통으로 들어가는 자리 */
function base(id: string, nameKo: string, icon: string): CollectionItemDef {
  return {
    id,
    nameKo,
    icon,
    category: 'MATERIAL',
    subcategory: '정원',
    rarity: 'COMMON',
    description: '',
    hasPlaceableAsset: false,
    // 방에 놓는 물건이 아니다. 씨앗은 심는 것이고 거둔 건 재료다.
    placeable: false,
    placement: 'MATERIAL_ONLY',
    acquisitionSources: [],
    collectionSetIds: [],
    tags: [],
    stackable: true,
    unique: false,
  }
}

/**
 * 이 / 가.
 *
 * 이름을 넣어 문장을 만들 때 받침을 봐야 한다 — "바질가 자란다" 는
 * 사람이 쓰는 말이 아니다. 한글 음절은 코드가 규칙적이라 나눗셈으로 나온다.
 */
function subjectParticle(word: string): string {
  const last = word.trim().charCodeAt(word.trim().length - 1)
  if (Number.isNaN(last) || last < 0xac00 || last > 0xd7a3) return '가'
  return (last - 0xac00) % 28 > 0 ? '이' : '가'
}

function seedItem(crop: CropDef): CollectionItemDef {
  return {
    ...base(crop.seedItemId, `${crop.name} 씨앗`, '🌱'),
    description: `심으면 ${crop.name}${subjectParticle(crop.name)} 자란다.`,
    tags: ['seed', 'garden'],
    acquisitionSources: crop.seedAvailable
      ? [{ kind: 'QUEST', category: null }]
      : [{ kind: 'SECRET', hint: '아직 이 씨앗은 돌지 않는다.' }],
  }
}

function harvestItem(crop: CropDef): CollectionItemDef {
  return {
    ...base(crop.harvestItemId, crop.name, crop.icon),
    description: crop.description,
    rarity: crop.rarity,
    // 'ingredient' 가 붙어 있다. 나중에 작은 부엌이 생기면 그대로 재료가 된다.
    tags: crop.tags,
    acquisitionSources: [{ kind: 'GARDEN' }],
    ...(crop.hiddenUntilDiscovered ? { hiddenUntilDiscovered: true } : {}),
  }
}

/** 씨앗 12종 */
export const SEED_ITEMS: CollectionItemDef[] = CROPS.map(seedItem)

/** 거둔 것 12종 — 도감의 CROPS 칸에 들어간다 */
export const CROP_ITEMS: CollectionItemDef[] = CROPS.map(harvestItem)

/**
 * 아침 이슬 한 방울.
 *
 * 밭 하나를 30분 앞당긴다. 쓰라고 재촉하지 않는다 —
 * 안 쓰고 모아둬도 아무 손해가 없어야 "아껴둔 것" 이 된다.
 */
export const GARDEN_DEW: CollectionItemDef = {
  ...base(GARDEN_DEW_ITEM_ID, '아침 이슬', '💧'),
  description: '풀잎 끝에 맺혀 있던 것.',
  rarity: 'RARE',
  tags: ['garden'],
  acquisitionSources: [{ kind: 'QUEST', category: null }],
}

/**
 * 정원 세트를 모으면 방에 남는 것들.
 *
 * 능력치는 하나도 안 붙는다 — 트로피 · 부엌 물건과 같은 규칙이다.
 */
function decor(
  id: string,
  nameKo: string,
  icon: string,
  description: string,
  footprint: { width: number; height: number } = { width: 12, height: 12 },
): CollectionItemDef {
  return {
    id,
    nameKo,
    icon,
    category: 'OUTDOOR',
    subcategory: '정원',
    rarity: 'EPIC',
    description,
    hasPlaceableAsset: true,
    placeable: true,
    // 아직 그림이 없어서 이모지가 그 자리를 채운다 — 자리 크기가 곧
    // 보이는 크기다. 화분 하나가 아치만 하면 방이 이상해진다.
    footprint,
    acquisitionSources: [{ kind: 'SET', setId: 'garden' }],
    collectionSetIds: [],
    tags: ['정원'],
    stackable: false,
    unique: true,
  }
}

export const GARDEN_DECOR: CollectionItemDef[] = [
  decor('g_strawberry_planter', '딸기 화분', '🍓', '창가에 두면 아침에 제일 먼저 눈에 띈다.', { width: 9, height: 11 }),
  decor('g_strawberry_sign', '딸기밭 표지판', '🪧', '누가 봐도 여기가 딸기밭이라는 뜻.', { width: 8, height: 10 }),
  decor('g_herb_rack', '허브 건조대', '🌿', '지나갈 때마다 향이 한 번씩 난다.', { width: 11, height: 12 }),
  decor('g_harvest_basket', '수확 바구니', '🧺', '가을에 한 번 가득 찼던 적이 있다.', { width: 9, height: 9 }),
  decor('g_autumn_table', '가을 정원 테이블', '🍂', '해가 짧아지면 여기 앉는 시간이 는다.', { width: 13, height: 12 }),
  decor('g_moon_arch', '달빛 정원 아치', '🌙', '밤에만 아치 아래가 조금 밝다.', { width: 15, height: 16 }),
]

export const GARDEN_ITEMS: CollectionItemDef[] = [
  ...SEED_ITEMS,
  ...CROP_ITEMS,
  GARDEN_DEW,
  ...GARDEN_DECOR,
]
