import type { QuarrySpotDef } from '@/types'
import { QUARRY_BASE_STONE_ID } from './minerals'

/**
 * 살펴볼 수 있는 자리 다섯.
 *
 * 어디를 골라도 무언가는 나온다. 헛걸음이 없는 게 이 표의 규칙이다 —
 * 하루 세 번뿐인데 그중 하나가 "빈 곳이었다" 로 끝나면,
 * 그건 놀러 온 게 아니라 헛수고를 한 것이 된다.
 *
 * 무게는 확률이 아니라 비(比)다. 합이 얼마든 상관없다.
 * 화면 코드는 이 표를 읽기만 한다 — 확률을 화면에 적어두면
 * 나중에 균형을 손볼 때 데이터와 화면이 서로 다른 말을 하게 된다.
 */

const S = QUARRY_BASE_STONE_ID

export const QUARRY_SPOTS: QuarrySpotDef[] = [
  {
    id: 'ROCK_CREVICE',
    name: '바위 틈',
    icon: '🪨',
    teaser: '조금 반짝이는 게 보인다.',
    drops: [
      { itemId: S, weight: 40 },
      { itemId: 'mineral_spark_stone', weight: 30 },
      { itemId: 'mineral_quartz', weight: 22 },
      { itemId: 'mineral_rose_crystal', weight: 8 },
    ],
  },
  {
    id: 'LOW_CLIFF',
    name: '낮은 절벽',
    icon: '⛰️',
    teaser: '아래쪽에 부서진 돌이 쌓여 있다.',
    drops: [
      { itemId: 'mineral_blue_stone', weight: 34 },
      { itemId: 'mineral_red_shard', weight: 34 },
      { itemId: 'mineral_quartz', weight: 20 },
      { itemId: 'mineral_amethyst', weight: 12 },
    ],
  },
  {
    id: 'STONE_PILE',
    name: '돌무더기',
    icon: '🧱',
    teaser: '누가 한쪽으로 밀어둔 것 같다.',
    drops: [
      { itemId: S, weight: 45 },
      { itemId: 'mineral_moss_stone', weight: 35 },
      { itemId: 'mineral_old_metal', weight: 20 },
    ],
  },
  {
    id: 'OLD_WORKSHOP',
    name: '오래된 작업장 근처',
    icon: '🏚️',
    teaser: '사람이 쓰던 자리가 남아 있다.',
    drops: [
      { itemId: 'mineral_old_metal', weight: 40 },
      { itemId: 'mineral_spark_stone', weight: 38 },
      { itemId: 'mineral_star_vein', weight: 22 },
    ],
  },
  {
    id: 'INNER_PATH',
    name: '안쪽 길',
    icon: '🌘',
    teaser: '빛이 잘 안 드는 쪽이다.',
    drops: [
      { itemId: 'mineral_moon_ore', weight: 38 },
      { itemId: 'mineral_star_vein', weight: 38 },
      // 가장 귀한 것. 여기서만, 그것도 드물게.
      { itemId: 'mineral_strange_fragment', weight: 6 },
      { itemId: S, weight: 18 },
    ],
    // 밤에 조금 더 잘 보인다. 낮에 못 얻는 건 하나도 없다 —
    // 시간 때문에 영영 못 만나는 것이 있으면 그건 알람이 된다.
    nightFavored: ['mineral_moon_ore', 'mineral_star_vein'],
  },
]

export function findSpot(id: string): QuarrySpotDef | null {
  return QUARRY_SPOTS.find((s) => s.id === id) ?? null
}

/** 밤에 붙는 몫. 아주 조금이다. */
export const NIGHT_BONUS = 1.4

/**
 * 곁들여 나오는 한 줄.
 *
 * 결과를 바꾸지 않는다 — 물건은 늘 나오고 이 문장만 가끔 붙는다.
 * 조용하고 오래된 자리라는 느낌을 주려고 둔 것이지
 * 무슨 일이 일어날 것 같은 예고가 아니다.
 */
export const AMBIENT = [
  '바람이 돌 사이를 지나간다.',
  '여긴 생각보다 조용하다.',
  '발밑에서 작은 돌 하나가 굴러갔다.',
  '누군가 오래전에 쓰던 길이 남아 있다.',
  '돌 틈이 아주 조금 반짝였다.',
  '이미 누가 한 번 뒤져본 자리 같다.',
  '해가 드는 쪽만 조금 따뜻하다.',
]
