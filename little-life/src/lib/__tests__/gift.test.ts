import { describe, expect, it } from 'vitest'
import { NPCS, findNpc } from '@/lib/city/npcs'
import { ITEMS, findItem } from '@/lib/rpg/content'
import { KITCHEN_RECIPES } from '@/lib/kitchen/recipes'
import { SKINS } from '@/lib/character/skins'
import { ALL_COLLECTION_ITEMS } from '@/lib/collection/catalog'
import { STORY_CHAPTERS } from '@/lib/discovery/stories'
import {
  GIFT_FRIENDSHIP,
  GIFT_LIKED_FRIENDSHIP,
  GIFT_LOVED_FRIENDSHIP,
  NPC_QUEST_FRIENDSHIP,
  TALK_FRIENDSHIP,
  emptyNpcState,
  giftOutcome,
  giftPreference,
  giftPreferenceFor,
  giftedToday,
  isGiftable,
} from '@/lib/city/friendship'
import { giftLines, pickGiftLine } from '@/lib/city/gift-lines'
import { emptyBonuses } from '@/lib/rpg/rewards'
import { GIFT_TAGS_IN_USE } from '@/lib/city/npcs'

/** 지금 실제로 건넬 수 있는 것 전부 — 가방 물건 + 부엌에서 만든 음식 */
const GIFTABLE_IDS = new Set<string>([
  ...ITEMS.filter(isGiftable).map((i) => i.id),
  ...KITCHEN_RECIPES.map((r) => r.outputItemId),
])

describe('선물 — 무엇을 건넬 수 있나', () => {
  it('결(giftTags)이 붙은 것만 건넬 수 있다', () => {
    for (const item of ITEMS) {
      expect(isGiftable(item)).toBe((item.giftTags ?? []).length > 0)
    }
  })

  /**
   * 낄 수 있는 물건이라고 못 주는 건 아니다 — 목도리도 키링도 선물이다.
   * 막는 건 "지금 끼고 있는 것" 뿐이고, 그건 화면이 거른다 (GiftTab).
   * 그래도 새어 들어오면 `unequipIfGone` 이 슬롯을 비워서 빈 칸을 낀
   * 상태로 남지 않는다.
   */
  it('낄 수 있는 물건도 선물이 된다 — 막는 건 지금 끼고 있는 것뿐이다', () => {
    const scarf = findItem('cozy_scarf')!
    expect(scarf.equipSlot).not.toBeNull()
    expect(isGiftable(scarf)).toBe(true)
  })

  /**
   * 오래된 열쇠를 줘버려서 던전이 막히는 일은 없어야 한다.
   * 실제로는 열쇠가 아이템이 아니라 이야기 장(HARU_5)이라 가방에 들어오지도
   * 않는데, 나중에 누가 아이템으로 바꿔 넣을 수 있어서 여기서 잡아둔다.
   */
  it('이야기 · 진행용은 애초에 가방 아이템이 아니다', () => {
    expect(STORY_CHAPTERS.some((c) => c.id === 'HARU_5')).toBe(true)
    for (const id of ['old_key', 'dungeon_key', 'story_key', 'HARU_5']) {
      expect(GIFTABLE_IDS.has(id)).toBe(false)
    }
  })

  it('옷은 선물이 아니다', () => {
    for (const skin of SKINS) expect(GIFTABLE_IDS.has(skin.id)).toBe(false)
  })

  it('도감 물건 중 건넬 수 있는 건 부엌에서 만든 음식뿐이다', () => {
    const foodIds = new Set(KITCHEN_RECIPES.map((r) => r.outputItemId))
    for (const item of ALL_COLLECTION_ITEMS) {
      if (foodIds.has(item.id)) continue
      expect(GIFTABLE_IDS.has(item.id)).toBe(false)
    }
  })
})

describe('선물 — 취향', () => {
  it('스물넷 전부 좋아하는 결과 콕 집은 것이 있다', () => {
    expect(NPCS).toHaveLength(24)
    for (const npc of NPCS) {
      expect(npc.likes.length, npc.id).toBeGreaterThan(0)
      expect(npc.loves.length, npc.id).toBeGreaterThan(0)
    }
  })

  it('콕 집은 것은 한 사람당 셋을 넘지 않는다 — 그 이상이면 공략표다', () => {
    for (const npc of NPCS) expect(npc.loves.length, npc.id).toBeLessThanOrEqual(3)
  })

  it('콕 집은 것이 전부 실제로 건넬 수 있는 물건이다', () => {
    for (const npc of NPCS) {
      for (const id of npc.loves) {
        expect(GIFTABLE_IDS.has(id), `${npc.id} / ${id}`).toBe(true)
      }
    }
  })

  it('좋아하는 결이 실제로 쓰이는 결이다', () => {
    for (const npc of NPCS) {
      for (const tag of npc.likes) {
        expect(GIFT_TAGS_IN_USE.has(tag), `${npc.id} / ${tag}`).toBe(true)
      }
    }
  })

  it('스물넷 다 결이 맞는 물건이 실제로 하나는 있다', () => {
    for (const npc of NPCS) {
      const hit = ITEMS.filter(isGiftable).some((i) => giftPreferenceFor(npc, i) !== 'NEUTRAL')
      const cooked = KITCHEN_RECIPES.some(
        (r) => giftPreference(npc, r.outputItemId, r.giftTags) !== 'NEUTRAL',
      )
      expect(hit || cooked, npc.id).toBe(true)
    }
  })

  it('콕 집은 것 → 결 → 나머지 순으로 갈린다', () => {
    const lulu = findNpc('LULU')!
    // 여분 단추는 미래가 콕 집은 것이면서 collectible 이기도 하다. LOVE 가 이긴다.
    expect(giftPreferenceFor(lulu, findItem('spare_button')!)).toBe('LOVE')
    expect(giftPreferenceFor(lulu, findItem('tiny_hair_clip')!)).toBe('LIKE')
    expect(giftPreferenceFor(lulu, findItem('training_band')!)).toBe('NEUTRAL')
  })

  it('부엌 음식도 같은 식으로 갈린다', () => {
    const rio = findNpc('RIO')!
    expect(giftPreference(rio, 'food_tomato_pasta', ['healthy', 'cozy'])).toBe('LOVE')
    expect(giftPreference(rio, 'food_carrot_soup', ['healthy'])).toBe('LIKE')
    expect(giftPreference(rio, 'food_strawberry_toast', ['sweet'])).toBe('NEUTRAL')
  })
})

describe('선물 — 친밀도', () => {
  it('셋의 크기 순서가 지켜진다', () => {
    expect(GIFT_FRIENDSHIP).toBeLessThan(GIFT_LIKED_FRIENDSHIP)
    expect(GIFT_LIKED_FRIENDSHIP).toBeLessThan(GIFT_LOVED_FRIENDSHIP)
  })

  /**
   * 선물이 인사보다 훨씬 크면 가게에서 사서 스물넷에게 돌리는 게 최적이 된다.
   * 예전 값(5 · 10)이 정확히 그랬다.
   */
  it('제일 잘 고른 선물도 의뢰 하나보다 작다', () => {
    expect(GIFT_LOVED_FRIENDSHIP).toBeLessThan(NPC_QUEST_FRIENDSHIP)
    expect(GIFT_LOVED_FRIENDSHIP).toBeLessThanOrEqual(TALK_FRIENDSHIP + 1)
  })

  it('싫어함이 없다 — 어떤 조합도 친밀도를 깎지 않는다', () => {
    const b = emptyBonuses()
    for (const npc of NPCS) {
      for (const item of ITEMS.filter(isGiftable)) {
        expect(giftOutcome(npc, item.id, item.giftTags ?? [], b).gained).toBeGreaterThan(0)
      }
    }
  })

  it('하루에 한 사람당 한 번이다', () => {
    const fresh = emptyNpcState()
    expect(giftedToday(fresh, '2026-09-02')).toBe(false)
    expect(giftedToday({ ...fresh, lastGiftedOn: '2026-09-02' }, '2026-09-02')).toBe(true)
    expect(giftedToday({ ...fresh, lastGiftedOn: '2026-09-01' }, '2026-09-02')).toBe(false)
  })
})

describe('선물 — 반응', () => {
  it('스물넷 전부 세 단계 말을 다 가지고 있다', () => {
    for (const npc of NPCS) {
      for (const pref of ['NEUTRAL', 'LIKE', 'LOVE'] as const) {
        expect(giftLines(npc.id, pref).length, `${npc.id} / ${pref}`).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('빈 줄이 없다', () => {
    for (const npc of NPCS) {
      for (const pref of ['NEUTRAL', 'LIKE', 'LOVE'] as const) {
        for (const line of giftLines(npc.id, pref)) expect(line.trim().length).toBeGreaterThan(1)
      }
    }
  })

  it('스물넷이 서로 다른 말을 한다 — LOVE 를 돌려쓰지 않았다', () => {
    const loves = NPCS.map((npc) => giftLines(npc.id, 'LOVE').join('|'))
    expect(new Set(loves).size).toBe(NPCS.length)
  })

  /** 선물 반응이 생활 대사를 덮거나 그 반대가 되면 안 된다 */
  it('생활 대사와 겹치지 않는다', async () => {
    const { LIVING_LINES } = await import('@/lib/city/living-lines')
    const living = new Set(LIVING_LINES.map((l) => l.text))
    for (const npc of NPCS) {
      for (const pref of ['NEUTRAL', 'LIKE', 'LOVE'] as const) {
        for (const line of giftLines(npc.id, pref)) expect(living.has(line)).toBe(false)
      }
    }
  })

  it('그 사람 그 음식에만 붙은 말이 있으면 그게 먼저다', () => {
    const only = () => 0
    expect(pickGiftLine('LULU', 'NEUTRAL', ['잠깐, 이거 네가 만든 거야?'], only)).toBe(
      '잠깐, 이거 네가 만든 거야?',
    )
    expect(pickGiftLine('LULU', 'LOVE', [], only)).toBe(giftLines('LULU', 'LOVE')[0])
  })

  it('총 반응 줄 수', () => {
    const total = NPCS.reduce(
      (n, npc) =>
        n +
        giftLines(npc.id, 'NEUTRAL').length +
        giftLines(npc.id, 'LIKE').length +
        giftLines(npc.id, 'LOVE').length,
      0,
    )
    expect(total).toBe(144)
  })
})
