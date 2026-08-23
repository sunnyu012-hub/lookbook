import type { AppState, AreaId, CollectionItemDef, HintLevel, ItemHint } from '@/types'
import { findCollectionShop } from '@/lib/collection/shops'
import { findArea } from '@/lib/rpg/content'
import { findNpc } from '@/lib/city/npcs'
import { isSeen } from '@/lib/collection/progress'
import { CATEGORY_LABEL } from '@/lib/labels'

/**
 * 도감의 ??? 에 찾아갈 이유를 준다.
 *
 * 다 알려주면 그건 목록이지 도감이 아니고,
 * 아무것도 안 알려주면 그냥 답답한 빈칸이다.
 *
 * ── 세 단계 ─────────────────────────────────────────
 *
 * 1 분위기만    "도시가 잠든 뒤에 볼 수 있을지도."
 * 2 어디쯤인지  "밤거리의 늦은 시간."
 * 3 꽤 구체적   "달빛 가판에 가끔 들어와."
 *
 * 처음부터 3 을 보여주지 않는다. 대신 오래 막아두지도 않는다 —
 * 못 찾아서 답답한 것과 못 찾게 막는 것은 다르다.
 */

/** 이 물건의 힌트가 지금 몇 단계까지 열렸는지 */
export function hintLevelOf(state: AppState, item: CollectionItemDef): HintLevel {
  // 비밀 물건은 끝까지 안 알려준다. 알려주는 순간 비밀이 아니다.
  if (item.rarity === 'SECRET') {
    return isSeen(state.collection, item.id) ? 1 : 0
  }

  const stored = state.discovery.hintLevels[item.id] ?? 0
  let level = stored

  // 가게 진열대에서 본 적이 있으면 최소 1단계
  if (isSeen(state.collection, item.id)) level = Math.max(level, 1)

  // 그 물건이 있는 동네에서 얼굴이 알려졌으면 2단계
  const areaId = relatedArea(item)
  if (areaId && (state.reputation[areaId] ?? 0) >= 15) level = Math.max(level, 2)

  // 도감을 어느 정도 채운 사람에게는 3단계까지. 오래 막아두지 않는다.
  if (Object.keys(state.collection.discovered).length >= 40) level = Math.max(level, 3)

  return Math.min(3, level) as HintLevel
}

/** 이 물건과 얽힌 동네 */
function relatedArea(item: CollectionItemDef): AreaId | null {
  for (const source of item.acquisitionSources) {
    if (source.kind === 'SHOP') {
      const shop = findCollectionShop(source.shopId)
      if (shop) return shop.areaId
    }
    if (source.kind === 'REPUTATION') return source.areaId
    if (source.kind === 'NPC') {
      const npc = findNpc(source.npcId)
      if (npc) return npc.areaId
    }
  }
  return null
}

/**
 * 지금 보여줄 힌트 한 줄.
 *
 * 단계가 낮으면 흐릿하게, 높으면 또렷하게. 같은 물건인데 말만 달라진다.
 */
export function hintFor(state: AppState, item: CollectionItemDef): ItemHint {
  const level = hintLevelOf(state, item)
  if (level === 0) return { level, text: '언제 만나게 될지는 아직.' }

  const source = item.acquisitionSources[0]
  if (!source) return { level, text: '어디서 만날 수 있을까.' }

  switch (source.kind) {
    case 'SHOP': {
      const shop = findCollectionShop(source.shopId)
      if (level === 1) return { level, text: '어느 가게 진열대에서 본 적이 있는 것 같다.' }
      if (level === 2) {
        const area = shop ? findArea(shop.areaId).name : '도시 어딘가'
        return { level, text: `${area}의 어느 가게에 들어온다.` }
      }
      return { level, text: `${shop?.name ?? '어느 가게'}에 가끔 들어와.` }
    }

    case 'CRAFT':
      if (level === 1) return { level, text: '사는 게 아니라 만드는 것 같다.' }
      return { level, text: '작은 작업실에서 만들 수 있어.' }

    case 'QUEST':
      if (level === 1) return { level, text: '뭔가 하다 보면 나온다는데.' }
      if (level === 2 && source.category) {
        return { level, text: `${CATEGORY_LABEL[source.category]} 쪽 일을 하다 보면.` }
      }
      return {
        level,
        text: source.category
          ? `${CATEGORY_LABEL[source.category]} 퀘스트를 하다 보면 나와.`
          : '퀘스트를 하다 보면 나와.',
      }

    case 'NPC': {
      const npc = findNpc(source.npcId)
      if (level === 1) return { level, text: '누군가와 조금 더 가까워지면.' }
      if (level === 2) {
        const area = npc ? findArea(npc.areaId).name : '도시'
        return { level, text: `${area}의 어떤 사람과 관련이 있다.` }
      }
      return { level, text: `${npc?.name ?? '누군가'}와 친해지면 준대.` }
    }

    case 'REPUTATION': {
      const area = findArea(source.areaId).name
      if (level === 1) return { level, text: '어느 동네에서 얼굴이 알려지면.' }
      return { level, text: `${area}에서 얼굴이 알려지면.` }
    }

    case 'BOSS':
      if (level === 1) return { level, text: '큰 걸 하나 넘고 나면.' }
      return { level, text: '큰 도전을 하나 끝내면 나와.' }

    case 'EVENT':
      if (level === 1) return { level, text: '평소와 다른 날에.' }
      return { level, text: '도시에 무슨 일이 있는 날 살펴봐.' }

    case 'SET':
      if (level === 1) return { level, text: '뭔가를 다 모으면 생기는 것 같다.' }
      return { level, text: '어떤 세트를 완성하면 받아.' }

    case 'MILESTONE':
      if (level === 1) return { level, text: '도감이 더 차면.' }
      return { level, text: `도감을 ${source.count}개 채우면.` }

    case 'TROPHY':
      if (level === 1) return { level, text: '오래 쌓이면 생기는 것.' }
      return { level, text: '현실에서 충분히 쌓이면 받아.' }

    case 'SECRET':
      return { level: 1, text: source.hint ?? '언제 만나게 될지는 아직.' }

    default:
      return { level, text: '어디서 만날 수 있을까.' }
  }
}

/**
 * 힌트 단계를 한 칸 올려 저장한다.
 *
 * 계산으로 나오는 단계가 이미 더 높으면 아무것도 안 한다.
 */
export function raiseHint(state: AppState, itemId: string, to: HintLevel): AppState {
  const now = state.discovery.hintLevels[itemId] ?? 0
  if (now >= to) return state
  return {
    ...state,
    discovery: {
      ...state.discovery,
      hintLevels: { ...state.discovery.hintLevels, [itemId]: to },
    },
  }
}
