import type { CollectionItemDef } from '@/types'

/**
 * 잠든 돌문에서 나오는 것들.
 *
 * 다섯 개뿐이다. 새 재화를 만들지 않았다 — 여기 있는 건 전부
 * "여기 누가 있었다" 를 말하는 물건이지, 모아서 뭘 만드는 재료가 아니다.
 * 만드는 데 쓰는 것은 채석장 광물로 충분하다.
 *
 * 재료 목록(MATERIAL_CATALOG)에 섞지 않는다 — 그 목록은 퀘스트에서
 * 무엇이 떨어질지 고르는 풀이기도 해서, 여기 다섯을 섞으면
 * 기존 재료가 나올 확률이 조용히 낮아진다. 광물을 따로 둔 이유와 같다.
 */

function find(id: string, name: string, icon: string, description: string): CollectionItemDef {
  return {
    id,
    nameKo: name,
    icon,
    category: 'MATERIAL',
    subcategory: '잠든 돌문',
    rarity: 'RARE',
    description,
    hasPlaceableAsset: true,
    placeable: false,
    footprint: { width: 9, height: 9 },
    acquisitionSources: [],
    collectionSetIds: [],
    tags: ['잠든 돌문'],
    stackable: true,
    unique: false,
  }
}

export const DUNGEON_FINDS: CollectionItemDef[] = [
  find('dungeon_wall_fragment', '벽화 조각', '🧱', '무늬가 반쯤 남았다. 무슨 그림이었는지는 모르겠다.'),
  find('dungeon_old_coin', '낡은 동전', '🪙', '어디서도 못 쓸 것 같은데, 버리기도 아깝다.'),
  find('dungeon_small_crystal', '희미한 수정', '💧', '빛에 대면 아주 조금 밝아진다.'),
  find('dungeon_soft_moss', '부드러운 동굴 이끼', '🌫️', '눌러보면 생각보다 폭신하다.'),
  find(
    'dungeon_unknown_trace',
    '작은 흔적',
    '🐾',
    '누가 여기서 잠깐 쉬어간 것 같다. 그게 누군지는 아직 모른다.',
  ),
]

/**
 * 오래된 열쇠.
 *
 * 쓰고 없어지는 물건이 아니다. 문을 연 뒤에도 계속 남는다 —
 * 이야기가 지나간 자리를 지워버리면 그건 안 일어난 일이 된다.
 *
 * 재료 칸에 두지 않는다. 다른 재료들 사이에 끼어 있으면
 * 언젠가 무심코 쓰게 되는 물건처럼 보인다.
 */
export const OLD_KEY_ID = 'old_key'

export const STORY_ITEMS: CollectionItemDef[] = [
  {
    id: OLD_KEY_ID,
    nameKo: '오래된 열쇠',
    icon: '🗝️',
    category: 'MAGIC',
    subcategory: '이야기',
    rarity: 'EPIC',
    description: '어디에 쓰는 건지는 이제 알 것 같다.',
    hasPlaceableAsset: true,
    // 방에 놓는 물건이 아니다. 도감과 기록에만 남는다.
    placeable: false,
    footprint: { width: 9, height: 9 },
    acquisitionSources: [],
    collectionSetIds: [],
    tags: ['이야기'],
    stackable: false,
    unique: true,
  },
]

const BY_ID = new Map([...DUNGEON_FINDS, ...STORY_ITEMS].map((i) => [i.id, i]))

export function findDungeonItem(id: string): CollectionItemDef | null {
  return BY_ID.get(id) ?? null
}
