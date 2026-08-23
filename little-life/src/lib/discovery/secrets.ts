import type { AppState, SecretCondition, SecretDef, SecretStage, SecretView } from '@/types'
import { findCollectionItem } from '@/lib/collection/catalog'
import { CATALOG } from '@/lib/collection/catalog'

/**
 * 도시 안쪽에 있는 것들.
 *
 * 지도에 처음부터 다 그려두면 그건 지도가 아니라 목록이다.
 * 여기 다섯 곳은 그 동네에서 실제로 시간을 보낸 사람에게만 열린다.
 *
 * ── 세 단계 ─────────────────────────────────────────
 *
 * 모름   지도에 아무것도 없다. 있는 줄도 모른다.
 * 낌새   "여기 뭐가 더 있는 것 같다" 정도. 어떻게 여는지는 말하지 않는다.
 * 발견   찾았다. 들어갈 수 있다.
 *
 * 전부 숨기면 답답하고 전부 알려주면 찾을 이유가 없다.
 * 가운데 한 칸을 두는 게 이 시스템의 전부다.
 *
 * ── 조건은 숫자로 보여주지 않는다 ────────────────────
 *
 * "밤거리 5/7" 이라고 쓰면 그건 숙제 진행바다.
 * "이 골목이 조금 익숙해진 것 같다" 라고 쓴다. 세는 건 안에서만 한다.
 */

export const SECRETS: SecretDef[] = [
  {
    id: 'MOON_ALLEY',
    name: '달빛 골목',
    areaId: 'NIGHT_TOWN',
    icon: '🌙',
    hint: '밤거리 안쪽에서 처음 보는 불빛이 보인다.',
    reveal: '평소에는 보이지 않던 골목이 열려 있다.',
    description: '밤에만 서는 가판 너머. 여기서만 파는 것들이 있다.',
    conditions: [{ kind: 'AREA_REPUTATION', areaId: 'NIGHT_TOWN', value: 14 }],
    hintAt: 0.5,
    itemIds: ['moondust_jar', 'little_moon', 'sleeping_star'],
    npcId: 'NOA',
  },
  {
    id: 'BACKROOM_CAFE',
    name: '뒷방',
    areaId: 'CAFE_STREET',
    icon: '🚪',
    hint: '미나가 뭔가 말하려다 만 것 같다.',
    reveal: '"사실 뒤쪽에 작은 방이 하나 있어."',
    description: '문을 닫으면 소리가 거의 안 들어온다. 오래 앉아 있어도 아무도 안 본다.',
    conditions: [
      { kind: 'AREA_REPUTATION', areaId: 'CAFE_STREET', value: 40 },
      { kind: 'FRIENDSHIP', npcId: 'MINA', value: 30 },
    ],
    hintAt: 0.55,
    itemIds: ['thick_essay', 'secret_diary', 'cafe_table'],
    npcId: 'MINA',
  },
  {
    id: 'ROOFTOP_GARDEN',
    name: '옥상 정원',
    areaId: 'GREEN_PARK',
    icon: '🌿',
    hint: '공원 옆 건물 옥상에 뭔가 자라고 있는 것 같다.',
    reveal: '계단 끝에 문이 하나 더 있었다.',
    description: '누가 돌보는지는 모르겠는데 잘 자라고 있다.',
    conditions: [
      { kind: 'AREA_REPUTATION', areaId: 'GREEN_PARK', value: 30 },
      { kind: 'COLLECTION_CATEGORY', category: 'PLANT', count: 6 },
    ],
    hintAt: 0.55,
    itemIds: ['olive_tree', 'window_ivy', 'wildflowers'],
    npcId: 'HARU',
  },
  {
    id: 'OLD_ARCADE',
    name: '오래된 오락실',
    areaId: 'CREATIVE_DISTRICT',
    icon: '🕹️',
    hint: '골목 끝에서 익숙한 소리가 난다.',
    reveal: '아직 문을 닫지 않은 곳이 있었다.',
    description: '동전을 넣는 기계가 아직 몇 대 돌아간다.',
    conditions: [{ kind: 'AREA_REPUTATION', areaId: 'CREATIVE_DISTRICT', value: 30 }],
    hintAt: 0.5,
    itemIds: ['board_game', 'small_radio', 'movie_poster'],
    npcId: 'LULU',
  },
  {
    id: 'QUIET_CORNER',
    name: '조용한 구석',
    areaId: 'HOME_BASE',
    icon: '🤍',
    hint: '어딘가 앉아 있기 좋은 자리가 있었던 것 같다.',
    reveal: '아무도 안 오는 자리를 하나 찾았다.',
    description: '여기서는 아무것도 안 해도 된다.',
    conditions: [{ kind: 'CATEGORY_QUESTS', category: 'MIND', count: 25 }],
    hintAt: 0.5,
    itemIds: ['cloud_piece', 'small_candle', 'window_bench'],
  },
]

export function findSecret(id: string): SecretDef | null {
  return SECRETS.find((s) => s.id === id) ?? null
}

/** 이 조건에 지금 얼마나 왔는지 (0~1) */
export function conditionProgress(state: AppState, c: SecretCondition): number {
  switch (c.kind) {
    case 'AREA_REPUTATION':
      return Math.min(1, (state.reputation[c.areaId] ?? 0) / c.value)
    case 'FRIENDSHIP':
      return Math.min(1, (state.npcs[c.npcId]?.friendship ?? 0) / c.value)
    case 'CATEGORY_QUESTS':
      return Math.min(1, (state.categoryCompleted[c.category] ?? 0) / c.count)
    case 'COLLECTION_CATEGORY': {
      const found = CATALOG.filter(
        (i) => i.category === c.category && state.collection.discovered[i.id] !== undefined,
      ).length
      return Math.min(1, found / c.count)
    }
  }
}

/**
 * 조건을 여럿 걸면 제일 덜 온 것으로 본다.
 *
 * 평균으로 하면 한쪽만 다 채워도 절반이 넘어서 낌새가 뜬다.
 * 그런데 실제로는 아직 한참 남았으니, 낌새만 보고 갔다가 허탕을 친다.
 */
export function secretProgress(state: AppState, def: SecretDef): number {
  if (def.conditions.length === 0) return 1
  return Math.min(...def.conditions.map((c) => conditionProgress(state, c)))
}

export function secretStage(state: AppState, def: SecretDef): SecretStage {
  if (state.discovery.foundSecretIds.includes(def.id)) return 'FOUND'
  if (secretProgress(state, def) >= 1) return 'FOUND'
  // 한 번 낌새를 챈 곳은 계속 보인다. 다시 사라지면 그건 놀리는 것이다.
  if (state.discovery.hintedSecretIds.includes(def.id)) return 'HINTED'
  return secretProgress(state, def) >= def.hintAt ? 'HINTED' : 'UNKNOWN'
}

export function secretViews(state: AppState): SecretView[] {
  return SECRETS.map((def) => ({
    def,
    stage: secretStage(state, def),
    progress: secretProgress(state, def),
  }))
}

/** 그 동네에서 지금 보이는 것 (지도에 표시할 때 쓴다) */
export function secretsInArea(state: AppState, areaId: string): SecretView[] {
  return secretViews(state).filter((v) => v.def.areaId === areaId && v.stage !== 'UNKNOWN')
}

/** 방금 찾아낸 곳 (아직 알려주지 않은 것) */
export function newlyFound(state: AppState): SecretDef[] {
  return SECRETS.filter(
    (def) =>
      !state.discovery.foundSecretIds.includes(def.id) && secretProgress(state, def) >= 1,
  )
}

/** 방금 낌새를 챈 곳 */
export function newlyHinted(state: AppState): SecretDef[] {
  return SECRETS.filter((def) => {
    if (state.discovery.hintedSecretIds.includes(def.id)) return false
    if (state.discovery.foundSecretIds.includes(def.id)) return false
    const p = secretProgress(state, def)
    return p >= def.hintAt && p < 1
  })
}

/**
 * 얼마나 익숙해졌는지 한 줄.
 *
 * 숫자를 쓰지 않는다. 5/7 은 알려주는 게 아니라 시키는 것이다.
 */
export function familiarityLine(progress: number): string {
  if (progress >= 0.85) return '거의 다 온 것 같다.'
  if (progress >= 0.6) return '이 근처가 조금 익숙해졌다.'
  return '아직 잘 모르는 동네다.'
}

/** 이 비밀 장소에서만 만날 수 있는 것들 */
export function secretItems(def: SecretDef) {
  return def.itemIds.map((id) => findCollectionItem(id)).filter((i) => i !== null)
}
