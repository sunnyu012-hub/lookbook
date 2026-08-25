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

function seedItem(crop: CropDef): CollectionItemDef {
  return {
    ...base(crop.seedItemId, `${crop.name} 씨앗`, '🌱'),
    description: `심으면 ${crop.name}가 자란다.`,
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

export const GARDEN_ITEMS: CollectionItemDef[] = [...SEED_ITEMS, ...CROP_ITEMS, GARDEN_DEW]
