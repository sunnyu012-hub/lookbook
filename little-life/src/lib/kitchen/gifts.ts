import type { NpcId } from '@/types'
import { findKitchenRecipe } from './recipes'

/**
 * 만든 것을 건넸을 때 하는 말.
 *
 * 아무 음식에나 붙이지 않는다. 그 사람다운 조합에만 한 줄이 나온다 —
 * 전부에 붙이면 그건 대사가 아니라 확인 메시지가 된다.
 *
 * 대사가 없다고 손해는 없다. 친밀도는 결(giftTags)만 보고 오른다.
 */
const LINES: Partial<Record<NpcId, Record<string, string[]>>> = {
  // 하루 (카페 사장)
  MINA: {
    strawberry_milk: ['이 색 너무 귀엽다.', '마시기 전에 사진부터 찍고 싶은데?'],
    strawberry_toast: ['가게에 내놔도 되겠는데. 진심이야.'],
  },
  // 태오 (아침에 뛴다)
  HARU: {
    herb_potato_soup: ['정원에서 키운 걸로 만든 거야?', '생각보다 꽤 제대로인데.'],
    carrot_soup: ['달리고 나서 이런 거 먹으면 딱이지.'],
    picnic_lunchbox: ['이건 밖에서 먹어야 맛있어. 같이 나갈래?'],
  },
  // 세라 (밤거리 · BAR)
  NOA: {
    lavender_tea: ['향이 조용하네.', '가게 닫고 이걸로 마셔야겠다.'],
    moon_tea: ['이건... 어디서 났어?'],
  },
  // 미래 (공방 주인)
  LULU: {
    pumpkin_tart: ['잠깐, 이거 네가 만든 거야?', '손이 야무지네. 다음에도 하나 남겨줘.'],
    star_berry_cake: ['이걸 어떻게 만든 건지 나중에 꼭 알려줘.'],
  },
  // 이안 (빈티지숍)
  JUNE: {
    mushroom_cream_soup: ['따뜻한 걸 받는 건 오랜만이네.'],
  },
  // 도윤 (클라이밍장)
  RIO: {
    tomato_pasta: ['잘 먹을게요. 이런 거 챙겨 먹어야 하는데.'],
  },
}

/** 이 사람에게 이 음식을 줬을 때 할 말. 없으면 빈 배열. */
export function foodGiftLines(npcId: NpcId, itemId: string): string[] {
  const recipe = findKitchenRecipe(itemId) ?? null
  const key = recipe?.id ?? itemId
  return LINES[npcId]?.[key] ?? []
}

/** 이 음식 아이템에 붙은 대사 (음식 아이템 id 로 찾을 때) */
export function foodGiftLinesForItem(npcId: NpcId, outputItemId: string): string[] {
  const found = Object.entries(LINES[npcId] ?? {}).find(([recipeId]) => {
    const recipe = findKitchenRecipe(recipeId)
    return recipe?.outputItemId === outputItemId
  })
  return found ? found[1] : []
}
