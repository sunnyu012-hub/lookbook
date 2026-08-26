import type { CollectionItemDef, MineralDef } from '@/types'

/**
 * 채석장에서 나오는 것들.
 *
 * ── "작은 돌" 을 새로 만들지 않았다 ────────────────────
 *
 * 이미 m_stone('작은 돌', 🪨) 이 있다. 퀘스트에서 가끔 나오던 재료다.
 * 같은 이름으로 하나 더 만들면 가방에 "작은 돌" 이 둘이 되고,
 * 어느 쪽이 레시피에 쓰이는지 아무도 모르게 된다.
 * 그래서 채석장에서도 그 돌이 나온다 — 얻는 길이 하나 늘었을 뿐이다.
 *
 * ── 그림이 아직 없다 ───────────────────────────────────
 *
 * 열한 개 전부 이모지가 자리를 지키고 있다. 이 앱의 다른 물건들과
 * 같은 상태다 (assets:audit 의 "이모지" 수에 그대로 잡힌다).
 * 돌 하나를 색만 바꿔 여러 광물처럼 쓰지 않았다.
 */

/**
 * 등급.
 *
 * 명세는 common · uncommon · rare · secret 넉 단계인데
 * 이 앱에는 이미 COMMON · RARE · EPIC · LEGENDARY · SECRET 이 있다.
 * 새 눈금을 만들지 않고 있는 것에 얹었다 — 도감 배지도 색도 그대로 쓴다.
 */
const RARITY = {
  C: 'COMMON',
  U: 'RARE',
  R: 'EPIC',
  S: 'SECRET',
} as const

type Row = [
  id: string,
  name: string,
  icon: string,
  rarity: keyof typeof RARITY,
  description: string,
  hint: string,
]

/** 이미 있던 재료. 채석장에서도 나온다. */
export const QUARRY_BASE_STONE_ID = 'm_stone'

const ROWS: readonly Row[] = [
  ['mineral_spark_stone', '반짝돌', '✨', 'C',
    '빛을 받으면 표면이 아주 조금 반짝인다.',
    '바위 틈 같은 데서 볼 수 있을 것 같다.'],
  ['mineral_red_shard', '붉은 조각', '🔻', 'C',
    '따뜻한 색이 남아 있는 작은 광물 조각.',
    '절벽 아래쪽에 있을 것 같다.'],
  ['mineral_blue_stone', '푸른 돌', '🔷', 'C',
    '차가워 보이지만 손에 쥐면 금방 따뜻해진다.',
    '절벽 아래쪽에 있을 것 같다.'],
  ['mineral_quartz', '석영 조각', '💎', 'U',
    '투명한 부분 사이로 빛이 얇게 지나간다.',
    '돌 틈을 몇 번 들여다보면 나올 것 같다.'],
  ['mineral_amethyst', '자수정 조각', '🟣', 'U',
    '채석장 안쪽에서 가끔 발견된다.',
    '낮은 절벽 쪽에 있을 것 같다.'],
  ['mineral_moss_stone', '이끼 낀 돌', '🟢', 'U',
    '오랫동안 같은 자리에 있었던 모양이다.',
    '돌무더기 아래에 있을 것 같다.'],
  ['mineral_moon_ore', '달조각 광석', '🌑', 'R',
    '밤빛을 조금 머금은 듯한 푸른 광석.',
    '안쪽 길에서, 그것도 밤에 볼 수 있을 것 같다.'],
  ['mineral_star_vein', '별맥석', '🌠', 'R',
    '돌 안쪽에 밝은 선 하나가 지나간다.',
    '작업장 근처나 안쪽 길에 있을 것 같다.'],
  ['mineral_rose_crystal', '장밋빛 수정', '🌸', 'R',
    '아주 옅은 분홍빛을 띠는 작은 결정.',
    '바위 틈 깊은 데 있을 것 같다.'],
  ['mineral_old_metal', '오래된 금속 조각', '🔩', 'R',
    '광물이라기보다 누군가 남기고 간 것에 가깝다.',
    '사람이 쓰던 자리 근처에 있을 것 같다.'],
  ['mineral_strange_fragment', '이상한 돌조각', '⬛', 'S',
    '돌처럼 보이지만 가장자리가 너무 반듯하다.',
    '안쪽 길 어딘가에 있을 것 같다.'],
]

/** 이미 있던 작은 돌까지 합친 열두 가지 */
export const MINERALS: MineralDef[] = [
  {
    id: QUARRY_BASE_STONE_ID,
    name: '작은 돌',
    icon: '🪨',
    rarity: 'COMMON',
    description: '어디에나 있지만 자세히 보면 모양이 다 다르다.',
    hint: '채석장이라면 어디에나 있을 것 같다.',
  },
  ...ROWS.map(([id, name, icon, rarity, description, hint]) => ({
    id,
    name,
    icon,
    rarity: RARITY[rarity],
    description,
    hint,
  })),
]

export function findMineral(id: string): MineralDef | null {
  return MINERALS.find((m) => m.id === id) ?? null
}

export function isMineral(id: string): boolean {
  return MINERALS.some((m) => m.id === id)
}

/**
 * 도감·가방에 들어가는 물건으로 옮긴다.
 *
 * 작은 돌은 빼고 만든다 — 그건 이미 재료 표(MATERIALS)에 있다.
 * 두 번 등록하면 가방에 같은 줄이 두 개 뜬다.
 */
export const MINERAL_ITEMS: CollectionItemDef[] = MINERALS.filter(
  (m) => m.id !== QUARRY_BASE_STONE_ID,
).map((m) => ({
  id: m.id,
  nameKo: m.name,
  icon: m.icon,
  category: 'MATERIAL',
  subcategory: '광물',
  rarity: m.rarity,
  description: m.description,
  hasPlaceableAsset: false,
  // 방에 놓는 물건이 아니다. 캐서 쟁여두고 작업실에서 쓴다.
  placeable: false,
  placement: 'MATERIAL_ONLY',
  acquisitionSources: [{ kind: 'QUARRY' }],
  collectionSetIds: [],
  tags: ['광물'],
  stackable: m.rarity !== 'SECRET',
  unique: m.rarity === 'SECRET',
  ...(m.rarity === 'SECRET' ? { hiddenUntilDiscovered: true } : {}),
}))
