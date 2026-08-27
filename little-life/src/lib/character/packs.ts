import type {
  SkinAcquisition,
  SkinGachaPoolId,
  SkinPackId,
  SkinWorld,
  WardrobeTag,
} from '@/types'

/**
 * 옷 묶음 여덟 개.
 *
 * ── 왜 표를 따로 두는가 ────────────────────────────────
 *
 * 묶음 이름 · 어느 세계 · 어디서 만나는지는 열두 벌이 다 똑같다.
 * 그걸 정의마다 적으면 같은 문자열을 아흔여섯 번 쓰게 되고, 이름을
 * 한 번 고칠 때 열두 군데를 고쳐야 한다. 여기서 한 번만 적는다.
 *
 * ── 저장하지 않는다 ────────────────────────────────────
 *
 * 이건 정적인 표다. 몇 벌을 모았는지는 ownedSkinIds 에서 그때그때 센다.
 * 묶음 진행도를 저장해두면 나중에 옷이 늘 때 반드시 어긋난다.
 */

export interface SkinPackDef {
  id: SkinPackId
  name: string
  world: SkinWorld
  /** 이 묶음 열두 벌이 다 같은 길로 온다 */
  acquisition: Extract<SkinAcquisition, 'SHOP' | 'GACHA'>
  tag: WardrobeTag
  /** 작은 옷장 묶음일 때만 */
  poolId?: SkinGachaPoolId
  /** 목록에 흘리는 한 줄 */
  note: string
}

export const SKIN_PACKS: SkinPackDef[] = [
  {
    id: 3,
    name: '비밀스러운 도시의 사람들',
    world: 'FANTASY',
    acquisition: 'SHOP',
    tag: 'JOB',
    note: '이 도시 어딘가에서 매일 일하고 있는 사람들.',
  },
  {
    id: 4,
    name: '사계절의 축제',
    world: 'FANTASY',
    acquisition: 'GACHA',
    poolId: 'PACK_4',
    tag: 'FESTIVAL',
    note: '한 해에 한 번씩만 돌아오는 날들.',
  },
  {
    id: 5,
    name: '생활 길드의 모험가들',
    world: 'FANTASY',
    acquisition: 'SHOP',
    tag: 'JOB',
    note: '싸우러 가는 게 아니라 뭔가를 만들고 캐고 기르는 사람들.',
  },
  {
    id: 6,
    name: '또 다른 세계의 나',
    world: 'FANTASY',
    acquisition: 'GACHA',
    poolId: 'PACK_6',
    tag: 'MAGIC',
    note: '어딘가에서 다르게 살고 있을 나.',
  },
  {
    id: 7,
    name: '오늘 진짜 입고 나간 옷',
    world: 'DAILY',
    acquisition: 'SHOP',
    tag: 'DAILY',
    note: '특별할 것 없이, 그냥 오늘 입은 옷.',
  },
  {
    id: 8,
    name: '한국의 사계절 옷장',
    world: 'DAILY',
    acquisition: 'GACHA',
    poolId: 'PACK_8',
    tag: 'WEATHER',
    note: '날씨가 그날 옷을 거의 다 정한다.',
  },
  {
    id: 9,
    name: '나의 추구미',
    world: 'DAILY',
    acquisition: 'SHOP',
    tag: 'TASTE',
    note: '어디 가느냐보다, 어떤 사람으로 보이고 싶은가.',
  },
  {
    id: 10,
    name: '오늘은 어디 가는 날?',
    world: 'DAILY',
    acquisition: 'GACHA',
    poolId: 'PACK_10',
    tag: 'OUTING',
    note: '옷보다 오늘의 일정이 먼저 보이는 날.',
  },
]

export function findPack(id: SkinPackId | undefined): SkinPackDef | null {
  if (id === undefined) return null
  return SKIN_PACKS.find((p) => p.id === id) ?? null
}

export function packByPool(poolId: SkinGachaPoolId): SkinPackDef | null {
  return SKIN_PACKS.find((p) => p.poolId === poolId) ?? null
}

/** 화면에 부르는 말 */
export const WARDROBE_TAG_LABEL: Record<WardrobeTag, string> = {
  DAILY: '데일리',
  WEATHER: '날씨',
  TASTE: '취향',
  OUTING: '외출',
  JOB: '직업',
  FESTIVAL: '계절·축제',
  MAGIC: '마법·변신',
}

export const SKIN_WORLD_LABEL: Record<SkinWorld, string> = {
  DAILY: '일상',
  FANTASY: '판타지',
}

/**
 * 어디서 만나는지 한 줄.
 *
 * 게임 문구를 쓰지 않는다. 옷장 앞에서 할 만한 말로 적는다.
 */
export const ACQUISITION_NOTE: Record<SkinAcquisition, string> = {
  LEGACY_UNLOCK: '',
  SHOP: '의상실에서 살 수 있다.',
  GACHA: '작은 옷장에서 만날 수 있다.',
  REWARD: '이야기 속에서 만날 수 있을 것 같다.',
}
