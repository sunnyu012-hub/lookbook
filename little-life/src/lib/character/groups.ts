import type { CollectionItemDef, SkinItemGroup } from '@/types'
import { CATALOG } from '@/lib/collection/catalog'

/**
 * 갈래를 가로지르는 물건 묶음.
 *
 * ── 왜 따로 두는가 ─────────────────────────────────────
 *
 * 도감 분류는 "가구 · 조명 · 식물 …" 이라 "달콤한 것" 이나 "음악과 관련된 것" 을
 * 셀 수가 없다. 그런데 모습을 얻는 조건에는 그런 묶음이 어울린다 —
 * "달콤한 걸 몇 개 모으면" 이 "먹을 것 분류에서 몇 개" 보다 훨씬 사람 말이다.
 *
 * ── id 를 손으로 적지 않는다 ───────────────────────────
 *
 * 물건 목록을 여기 베껴두면 도감에 새 물건이 늘 때마다 여기도 고쳐야 하고,
 * 언젠가 반드시 잊는다. 그래서 이름과 분류를 보고 그때그때 고른다.
 * 딸기 케이크를 도감에 새로 넣으면 여기 손대지 않아도 달콤한 것에 들어온다.
 */

type Match = (item: CollectionItemDef) => boolean

const has = (item: CollectionItemDef, words: string[]) => {
  const text = `${item.id} ${item.nameKo} ${item.subcategory} ${item.description}`
  return words.some((w) => text.includes(w))
}

const MATCH: Record<SkinItemGroup, Match> = {
  /** 달콤한 것 — 디저트와 단것 */
  SWEET: (i) =>
    (i.category === 'FOOD' || i.category === 'KITCHEN') &&
    has(i, ['케이크', '쿠키', '사탕', '딸기', '초콜릿', '마카롱', '푸딩', '아이스', '도넛', '잼', '꿀', '캔디', '젤리', '파이', '와플', '크림', '설탕', '디저트', '빵', '초코']),

  /** 말랑한 것 — 천 · 쿠션 · 리본 */
  SOFT: (i) =>
    i.category === 'RUG' ||
    has(i, ['쿠션', '담요', '리본', '인형', '베개', '포근', '말랑', '보들', '털']),

  /** 꽃과 풀 */
  FLOWER: (i) =>
    i.category === 'PLANT' ||
    has(i, ['꽃', '데이지', '튤립', '장미', '해바라기', '꽃잎', '클로버', '허브']),

  /** 별과 달 */
  STAR: (i) => has(i, ['별', '달', '별빛', '밤하늘', '오로라', '반짝']),

  /** 음악과 관련된 것 */
  MUSIC: (i) =>
    has(i, ['오르골', '레코드', '라디오', '기타', '턴테이블', '스피커', '헤드폰', '음악', '노래', '피아노', '우쿨렐레', '이어폰']),

  /** 보물 — 도감의 MAGIC 갈래 */
  TREASURE: (i) => i.category === 'MAGIC',
}

/**
 * 묶음마다 어떤 물건이 들어가는지.
 *
 * 한 번만 계산하고 들고 있는다. 도감이 240개라 매번 훑으면 아깝다.
 */
const GROUPS: Record<SkinItemGroup, Set<string>> = Object.fromEntries(
  (Object.keys(MATCH) as SkinItemGroup[]).map((group) => [
    group,
    new Set(CATALOG.filter(MATCH[group]).map((item) => item.id)),
  ]),
) as Record<SkinItemGroup, Set<string>>

export function itemIdsInGroup(group: SkinItemGroup): Set<string> {
  return GROUPS[group]
}

/** 이 묶음에서 몇 가지나 알아봤는지 */
export function discoveredInGroup(
  discovered: Record<string, string | undefined>,
  group: SkinItemGroup,
): number {
  let found = 0
  for (const id of GROUPS[group]) {
    if (discovered[id] !== undefined) found += 1
  }
  return found
}

/** 묶음이 비어 있으면 조건이 영원히 안 채워진다. 테스트가 이걸 붙잡는다. */
export function groupSize(group: SkinItemGroup): number {
  return GROUPS[group].size
}
