import type { CollectionItemDef, TrophyDef } from '@/types'

/**
 * 트로피.
 *
 * 현실에서 쌓아온 것을 방에 놓을 수 있는 물건으로 바꾼다.
 * 능력치는 하나도 안 붙는다 — 붙이는 순간 "효율 때문에 놓는 것" 이 되고,
 * 그러면 예쁜 걸 놓을 자리가 없어진다.
 *
 * 팔 수 없다. 다시 얻을 방법도 없다.
 */

interface TrophyRow {
  id: string
  itemId: string
  name: string
  icon: string
  description: string
  condition: TrophyDef['condition']
  hint: string | null
}

const ROWS: TrophyRow[] = [
  {
    id: 'first_step',
    itemId: 't_wood_star',
    name: '작은 나무별',
    icon: '🌟',
    description: '제일 처음 끝낸 하나.',
    condition: { kind: 'TOTAL_QUESTS', count: 1 },
    hint: '퀘스트 1개',
  },
  {
    id: 'hundred',
    itemId: 't_hundred_stars',
    name: '백 개의 별 병',
    icon: '🫙',
    description: '세어보니 백 개였다.',
    condition: { kind: 'TOTAL_QUESTS', count: 100 },
    hint: '퀘스트 100개',
  },
  {
    id: 'five_hundred',
    itemId: 't_adventure_book',
    name: '모험 기록책',
    icon: '📕',
    description: '읽어보면 대부분 별일 아닌 날들.',
    condition: { kind: 'TOTAL_QUESTS', count: 500 },
    hint: '퀘스트 500개',
  },
  {
    id: 'thousand',
    itemId: 't_thousand_stars',
    name: '천 개의 별이 든 병',
    icon: '🌠',
    description: '한 번에 쌓인 게 아니다.',
    condition: { kind: 'TOTAL_QUESTS', count: 1000 },
    hint: '퀘스트 1000개',
  },
  {
    id: 'boss_slayer',
    itemId: 't_dragon',
    name: '작은 용 조각상',
    icon: '🐉',
    description: '미루던 것들의 얼굴.',
    condition: { kind: 'BOSS_CLEARS', count: 10 },
    hint: '보스 10번',
  },
  {
    id: 'work_master',
    itemId: 't_golden_pen',
    name: '황금 만년필',
    icon: '🖋️',
    description: '쓸 일은 없지만 놓아둔다.',
    condition: { kind: 'CATEGORY_QUESTS', category: 'WORK', count: 100 },
    hint: '일 퀘스트 100개',
  },
  {
    id: 'body_master',
    itemId: 't_shoe_trophy',
    name: '작은 운동화 트로피',
    icon: '🏆',
    description: '신을 수는 없는 크기.',
    condition: { kind: 'CATEGORY_QUESTS', category: 'BODY', count: 100 },
    hint: '몸 퀘스트 100개',
  },
  {
    id: 'life_master',
    itemId: 't_golden_broom',
    name: '황금 빗자루',
    icon: '🧹',
    description: '쓸어본 방의 수만큼.',
    condition: { kind: 'CATEGORY_QUESTS', category: 'LIFE', count: 100 },
    hint: '생활 퀘스트 100개',
  },
  {
    id: 'play_master',
    itemId: 't_shiny_palette',
    name: '반짝이는 팔레트',
    icon: '🎨',
    description: '논 시간도 쌓인다.',
    condition: { kind: 'CATEGORY_QUESTS', category: 'PLAY', count: 100 },
    hint: '놀이 퀘스트 100개',
  },
  {
    id: 'mind_master',
    itemId: 't_moon_shard',
    name: '고요한 달 조각',
    icon: '🌑',
    description: '아무 소리도 안 난다.',
    condition: { kind: 'CATEGORY_QUESTS', category: 'MIND', count: 100 },
    hint: '마음 퀘스트 100개',
  },
  {
    id: 'heart_master',
    itemId: 't_heart_bottle',
    name: '작은 하트 유리병',
    icon: '💗',
    description: '누군가에게 쓴 시간.',
    condition: { kind: 'CATEGORY_QUESTS', category: 'HEART', count: 100 },
    hint: '관계 퀘스트 100개',
  },
  {
    // 정원이 넓어지면 그만큼이 방에도 하나씩 남는다.
    // 정원에 다녀왔다는 걸 방에서도 볼 수 있게 하려는 것뿐이고,
    // 다른 트로피와 마찬가지로 능력치는 하나도 안 붙는다.
    id: 'garden_pot',
    itemId: 't_garden_pot',
    name: '정원에서 온 화분',
    icon: '🪴',
    description: '공원 너머에서 하나 옮겨 심었다.',
    condition: { kind: 'GARDEN_LEVEL', level: 2 },
    hint: '정원 Lv.2',
  },
  {
    id: 'garden_window',
    itemId: 't_garden_window',
    name: '정원이 보이는 창',
    icon: '🪟',
    description: '창밖에 초록이 조금 보인다.',
    condition: { kind: 'GARDEN_LEVEL', level: 3 },
    hint: '정원 Lv.3',
  },
  {
    // 이 트로피만 도감 240개 안에 있는 물건을 준다 (밤 시장 조명)
    id: 'moon_collector',
    itemId: 'moon_globe',
    name: 'Moon Globe',
    icon: '🌕',
    description: '밤 도시를 다 돌고 나서야 손에 들어온 것.',
    condition: { kind: 'SET_COMPLETE', setId: 'moon_collector' },
    hint: null,
  },
]

export const TROPHIES: TrophyDef[] = ROWS.map((r) => ({
  id: r.id,
  itemId: r.itemId,
  name: r.name,
  condition: r.condition,
  hint: r.hint,
}))

/**
 * 트로피가 주는 물건.
 * Moon Globe 는 도감(조명)에 이미 있어서 여기서 다시 만들지 않는다.
 */
export const TROPHY_ITEMS: CollectionItemDef[] = ROWS.filter((r) => r.itemId !== 'moon_globe').map(
  (r) => ({
    id: r.itemId,
    nameKo: r.name,
    category: 'TROPHY',
    subcategory: '트로피',
    rarity: 'LEGENDARY',
    description: r.description,
    icon: r.icon,
    hasPlaceableAsset: true,
    placeable: true,
    footprint: { width: 13, height: 15 },
    acquisitionSources: [{ kind: 'TROPHY' }],
    collectionSetIds: [],
    tags: ['트로피'],
    stackable: false,
    unique: true,
  }),
)

export function findTrophy(id: string): TrophyDef | null {
  return TROPHIES.find((t) => t.id === id) ?? null
}

/** 이 물건이 트로피로 오는 것인지 */
export function trophyForItem(itemId: string): TrophyDef | null {
  return TROPHIES.find((t) => t.itemId === itemId) ?? null
}
