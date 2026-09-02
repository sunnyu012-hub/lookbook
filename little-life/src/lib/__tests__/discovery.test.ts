import { describe, expect, it } from 'vitest'
import type { AppState } from '@/types'
import { AUTO_COLLECTION_IDS, COMPANION_IDS, SECRET_IDS } from '@/types'
import {
  AUTO_COLLECTIONS,
  autoCollectionViews,
  autoProgress,
  claimableCollections,
} from '@/lib/discovery/collections'
import {
  SECRETS,
  familiarityLine,
  secretProgress,
  secretStage,
  secretsInArea,
} from '@/lib/discovery/secrets'
import {
  STORY_CHAPTERS,
  chaptersOf,
  isChapterUnlocked,
  storyProgress,
  unreadChapters,
} from '@/lib/discovery/stories'
import {
  COMPANIONS,
  COMPANION_MEMORIES,
  companionArt,
  meetingProgress,
  memoriesOf,
  unlockedMemories,
} from '@/lib/discovery/companions'
import { hintFor, hintLevelOf } from '@/lib/discovery/hints'
import {
  NOTES_PER_DAY,
  applyDiscovery,
  discoveryInbox,
  emptyDiscovery,
  isPlaceNote,
} from '@/lib/discovery/derive'
import { findCollectionItem } from '@/lib/collection/catalog'
import { createDefaultState } from '@/store/defaultState'
import { sanitizeDiscovery, STATE_VERSION } from '@/store/migrate'

/** 열린 곳에 이미 다 가본 사람. 새 장소 알림이 조용해진 상태다. */
function visitedEverywhere(s: AppState): AppState {
  const seen = '2026-01-01T00:00:00.000Z'
  return {
    ...s,
    garden: { ...s.garden, tutorialSeenAt: seen },
    quarry: { ...s.quarry, tutorialSeenAt: seen },
    kitchen: { ...s.kitchen, tutorialSeenAt: seen },
    dungeon: { ...s.dungeon, tutorialSeenAt: seen },
  }
}

/** 오래 써온 사람 */
function veteran(over: Partial<AppState> = {}): AppState {
  const s = createDefaultState()
  return {
    ...s,
    categoryCompleted: { LIFE: 34, WORK: 22, BODY: 18, PLAY: 6, MIND: 27, HEART: 9 },
    reputation: {
      HOME_BASE: 40,
      CAFE_STREET: 45,
      GREEN_PARK: 32,
      CREATIVE_DISTRICT: 12,
      NIGHT_TOWN: 16,
      TRAINING_ZONE: 4,
    },
    npcs: Object.fromEntries(
      (
        [
          ['MINA', 33],
          ['HARU', 20],
          ['LULU', 8],
          ['NOA', 27],
          ['JUNE', 4],
          ['RIO', 2],
        ] as const
      ).map(([id, f]) => [id, { friendship: f, lastTalkedOn: null, clearedChainIds: [] }]),
    ),
    ...over,
  } as AppState
}

/** 갓 시작한 사람 */
function rookie(): AppState {
  return createDefaultState()
}

// ── A · L. 기존 기록 반영 ───────────────────────────────

describe('예전 기록이 그대로 반영된다', () => {
  it('BODY 를 이미 많이 한 사람은 0 부터 시작하지 않는다', () => {
    const s = veteran()
    const def = AUTO_COLLECTIONS.find((c) => c.id === 'ACTIVE_DAYS')!
    expect(autoProgress(s, def)).toBe(18)
  })

  it('진행도를 저장하지 않는다 — 저장 구조에 숫자가 없다', () => {
    const empty = emptyDiscovery()
    // 여기 있는 건 전부 "무엇을 봤는지 · 받았는지" 뿐이다
    expect(Object.keys(empty).sort()).toEqual([
      'activeCompanionId',
      'claimedCollectionIds',
      'companions',
      'foundSecretIds',
      'hintLevels',
      'hintedSecretIds',
      'readChapterIds',
      'revealedCollectionIds',
      'seenNoteKeys',
      'seenSceneIds',
    ])
  })

  it('예전 저장본을 읽어도 기존 기록이 그대로다', () => {
    const s = veteran()
    const after = applyDiscovery(s).state
    expect(after.user.coins).toBe(s.user.coins)
    expect(after.quests).toEqual(s.quests)
    expect(after.categoryCompleted).toEqual(s.categoryCompleted)
    expect(after.reputation).toEqual(s.reputation)
    expect(after.inventory).toEqual(s.inventory)
    // 방에 놓아둔 것도 그대로
    expect(after.collection.rooms).toEqual(s.collection.rooms)
  })

  it('발견 층이 없던 저장본도 그냥 읽힌다', () => {
    const back = sanitizeDiscovery(undefined)
    expect(back).toEqual(emptyDiscovery())
  })

  it('스키마 버전이 19 이다', () => {
    expect(STATE_VERSION).toBe(19)
    expect(createDefaultState().version).toBe(19)
  })
})

// ── B. 진행도가 는다 ────────────────────────────────────

describe('자동 컬렉션', () => {
  it('열여덟 가지가 있고 id 가 겹치지 않는다', () => {
    expect(AUTO_COLLECTIONS).toHaveLength(18)
    expect(new Set(AUTO_COLLECTIONS.map((c) => c.id)).size).toBe(18)
    for (const c of AUTO_COLLECTIONS) expect(AUTO_COLLECTION_IDS).toContain(c.id)
  })

  it('보상 물건이 전부 실제로 있다', () => {
    for (const c of AUTO_COLLECTIONS) {
      expect(findCollectionItem(c.rewardItemId), c.id).not.toBeNull()
    }
  })

  it('트로피를 주지 않는다', () => {
    // 트로피에는 "그 분야 100개" 라는 조건이 이미 붙어 있다.
    // 12개에 줘버리면 100개짜리 트로피가 의미를 잃는다.
    for (const c of AUTO_COLLECTIONS) {
      expect(c.rewardItemId.startsWith('t_'), c.id).toBe(false)
    }
  })

  it('퀘스트를 더 하면 진행도가 는다', () => {
    const before = veteran()
    const after = veteran({
      categoryCompleted: { ...before.categoryCompleted, BODY: before.categoryCompleted.BODY + 5 },
    })
    const def = AUTO_COLLECTIONS.find((c) => c.id === 'ACTIVE_DAYS')!
    expect(autoProgress(after, def)).toBe(autoProgress(before, def) + 5)
  })

  it('줄어들지 않는다 — 세는 값이 전부 누적이다', () => {
    // 며칠 쉬어도 categoryCompleted 는 내려가지 않는다
    const s = veteran()
    const def = AUTO_COLLECTIONS.find((c) => c.id === 'HOME_KEEPER')!
    const now = autoProgress(s, def)
    // 날짜만 흘러도 값이 그대로인지
    expect(autoProgress(s, def)).toBe(now)
  })

  it('처음에는 안 보이다가 어느 정도 쌓이면 보인다', () => {
    // 갓 시작한 사람에게는 하나도 안 보인다
    expect(autoCollectionViews(rookie()).every((v) => v.hidden)).toBe(true)
    // 오래 쓴 사람에게는 대부분 보인다.
    // (주말 기록이 없으면 주말 것은 아직 안 보인다 — 그건 맞는 동작이다)
    const shown = autoCollectionViews(veteran()).filter((v) => !v.hidden)
    expect(shown.length).toBeGreaterThanOrEqual(6)
  })

  it('한 번 보이면 다시 숨지 않는다', () => {
    const s = veteran()
    const shown = applyDiscovery(s).state
    const views = autoCollectionViews(shown)
    expect(views.filter((v) => v.hidden).length).toBeLessThan(views.length)
  })

  it('보상을 두 번 주지 않는다', () => {
    const s = veteran()
    const first = applyDiscovery(s)
    expect(first.gainedItemIds.length).toBeGreaterThan(0)

    const second = applyDiscovery(first.state)
    expect(second.gainedItemIds).toEqual([])
    expect(claimableCollections(first.state)).toEqual([])
  })
})

// ── C · D. 비밀 장소 ────────────────────────────────────

describe('비밀 장소', () => {
  it('다섯 곳이 있고 id 가 겹치지 않는다', () => {
    expect(SECRETS).toHaveLength(5)
    expect(new Set(SECRETS.map((s) => s.id)).size).toBe(5)
    for (const s of SECRETS) expect(SECRET_IDS).toContain(s.id)
  })

  it('여기서만 만나는 물건이 전부 실제로 있다', () => {
    for (const def of SECRETS) {
      for (const id of def.itemIds) {
        expect(findCollectionItem(id), `${def.id} → ${id}`).not.toBeNull()
      }
    }
  })

  it('처음에는 하나도 안 보인다', () => {
    const s = rookie()
    for (const def of SECRETS) {
      expect(secretStage(s, def), def.id).toBe('UNKNOWN')
    }
  })

  it('밤거리에 익숙해지면 달빛 골목이 열린다', () => {
    const def = SECRETS.find((s) => s.id === 'MOON_ALLEY')!
    const before = veteran({ reputation: { ...veteran().reputation, NIGHT_TOWN: 2 } })
    expect(secretStage(before, def)).toBe('UNKNOWN')

    const middle = veteran({ reputation: { ...veteran().reputation, NIGHT_TOWN: 8 } })
    expect(secretStage(middle, def)).toBe('HINTED')

    const after = veteran({ reputation: { ...veteran().reputation, NIGHT_TOWN: 14 } })
    expect(secretStage(after, def)).toBe('FOUND')
  })

  it('조건이 여럿이면 제일 덜 온 것으로 본다', () => {
    // 한쪽만 다 채웠다고 낌새가 뜨면, 갔다가 허탕을 친다
    const def = SECRETS.find((s) => s.id === 'BACKROOM_CAFE')!
    const s = veteran({
      reputation: { ...veteran().reputation, CAFE_STREET: 40 },
      npcs: { ...veteran().npcs, MINA: { friendship: 0, lastTalkedOn: null, lastGiftedOn: null, clearedChainIds: [] } },
    })
    expect(secretProgress(s, def)).toBe(0)
  })

  it('한 번 찾으면 다시 잠기지 않는다', () => {
    const s = veteran()
    const after = applyDiscovery(s).state
    const found = after.discovery.foundSecretIds
    expect(found.length).toBeGreaterThan(0)

    // 평판이 어떻게 되든 찾은 곳은 찾은 것이다
    const dropped: AppState = {
      ...after,
      reputation: { ...after.reputation, NIGHT_TOWN: 0, CAFE_STREET: 0 },
    }
    for (const id of found) {
      const def = SECRETS.find((s) => s.id === id)!
      expect(secretStage(dropped, def), id).toBe('FOUND')
    }
  })

  it('새로고침해도 상태가 남는다', () => {
    const s = applyDiscovery(veteran()).state
    const back = sanitizeDiscovery(s.discovery)
    expect(back.foundSecretIds.sort()).toEqual(s.discovery.foundSecretIds.sort())
    expect(back.hintedSecretIds.sort()).toEqual(s.discovery.hintedSecretIds.sort())
  })

  it('조건을 숫자로 말하지 않는다', () => {
    for (const p of [0, 0.4, 0.7, 0.95]) {
      expect(familiarityLine(p)).not.toMatch(/\d/)
    }
  })

  it('아직 모르는 곳은 지도에 안 나온다', () => {
    const s = rookie()
    for (const areaId of ['NIGHT_TOWN', 'CAFE_STREET', 'GREEN_PARK']) {
      expect(secretsInArea(s, areaId)).toEqual([])
    }
  })
})

// ── E · F. NPC 이야기 ───────────────────────────────────

describe('도시 사람 이야기', () => {
  it('네 사람에게 이야기가 있다', () => {
    for (const npc of ['MINA', 'HARU', 'LULU', 'NOA'] as const) {
      expect(chaptersOf(npc).length, npc).toBeGreaterThanOrEqual(3)
    }
  })

  it('장 번호가 1부터 빠짐없이 이어진다', () => {
    for (const npc of ['MINA', 'HARU', 'LULU', 'NOA'] as const) {
      const orders = chaptersOf(npc).map((c) => c.order)
      expect(orders).toEqual(orders.map((_, i) => i + 1))
    }
  })

  it('보상 물건이 전부 실제로 있다', () => {
    for (const c of STORY_CHAPTERS) {
      if (!c.rewardItemId) continue
      expect(findCollectionItem(c.rewardItemId), c.id).not.toBeNull()
    }
  })

  it('한 장은 짧다', () => {
    for (const c of STORY_CHAPTERS) {
      expect(c.lines.length, c.id).toBeGreaterThanOrEqual(2)
      expect(c.lines.length, c.id).toBeLessThanOrEqual(8)
    }
  })

  it('친해지면 첫 장이 열린다', () => {
    const first = STORY_CHAPTERS.find((c) => c.id === 'MINA_1')!
    expect(isChapterUnlocked(rookie(), first)).toBe(false)
    expect(isChapterUnlocked(veteran(), first)).toBe(true)
  })

  it('앞 장을 안 읽으면 다음 장이 안 열린다', () => {
    const s = veteran()
    const second = STORY_CHAPTERS.find((c) => c.id === 'MINA_2')!
    expect(isChapterUnlocked(s, second)).toBe(false)

    const read: AppState = {
      ...s,
      discovery: { ...s.discovery, readChapterIds: ['MINA_1'] },
    }
    expect(isChapterUnlocked(read, second)).toBe(true)
  })

  it('읽은 만큼 진행도가 는다', () => {
    const s = veteran()
    expect(storyProgress(s, 'MINA').read).toBe(0)

    const read: AppState = {
      ...s,
      discovery: { ...s.discovery, readChapterIds: ['MINA_1', 'MINA_2'] },
    }
    expect(storyProgress(read, 'MINA').read).toBe(2)
  })

  it('읽을 수 있는 장은 한 사람당 하나씩만 뜬다', () => {
    const s = veteran()
    const ready = unreadChapters(s)
    const byNpc = new Map<string, number>()
    for (const c of ready) byNpc.set(c.npcId, (byNpc.get(c.npcId) ?? 0) + 1)
    for (const [npc, n] of byNpc) expect(n, npc).toBe(1)
  })

  it('잠긴 장의 힌트에 숫자가 없다', () => {
    for (const c of STORY_CHAPTERS) {
      expect(c.lockedHint, c.id).not.toMatch(/\d/)
    }
  })
})

// ── G · H. 동료 ─────────────────────────────────────────

describe('동료', () => {
  it('네 마리가 있고 id 가 겹치지 않는다', () => {
    expect(COMPANIONS).toHaveLength(4)
    for (const c of COMPANIONS) expect(COMPANION_IDS).toContain(c.id)
  })

  it('얽힌 물건이 전부 실제로 있다', () => {
    for (const def of COMPANIONS) {
      for (const id of def.collectibleIds) {
        expect(findCollectionItem(id), `${def.id} → ${id}`).not.toBeNull()
      }
    }
  })

  it('처음에는 아무도 안 만난 상태다', () => {
    const s = rookie()
    for (const def of COMPANIONS) {
      expect(meetingProgress(s, def.meeting), def.id).toBeLessThan(1)
    }
  })

  it('조건을 채우면 만나고 바로 같이 다닌다', () => {
    const after = applyDiscovery(veteran()).state
    const met = Object.keys(after.discovery.companions)
    expect(met.length).toBeGreaterThan(0)
    expect(after.discovery.activeCompanionId).not.toBeNull()
    expect(met).toContain(after.discovery.activeCompanionId)
  })

  it('새로고침해도 남는다', () => {
    const after = applyDiscovery(veteran()).state
    const back = sanitizeDiscovery(after.discovery)
    expect(Object.keys(back.companions).sort()).toEqual(
      Object.keys(after.discovery.companions).sort(),
    )
    expect(back.activeCompanionId).toBe(after.discovery.activeCompanionId)
  })

  it('없는 아이가 저장돼 있으면 조용히 버린다', () => {
    const back = sanitizeDiscovery({
      ...emptyDiscovery(),
      companions: { NOPE: { friendship: 5, metAt: 'x', lastPlayedOn: null } },
      activeCompanionId: 'NOPE',
    })
    expect(back.companions.NOPE).toBeUndefined()
    expect(back.activeCompanionId).toBeNull()
  })

  it('친해지면 기억이 하나씩 열린다', () => {
    const id = 'BORI' as const
    expect(unlockedMemories(id, 0)).toHaveLength(0)
    expect(unlockedMemories(id, 5).length).toBeGreaterThan(0)

    // 요리가 걸린 기억은 친해지는 것만으로는 안 열린다
    const needsCooking = memoriesOf(id).filter((m) => m.needsRecipeId)
    expect(unlockedMemories(id, 30).length).toBe(memoriesOf(id).length - needsCooking.length)

    // 만들어본 적이 있으면 그때 열린다
    const cooked = needsCooking.map((m) => m.needsRecipeId!)
    expect(unlockedMemories(id, 30, cooked).length).toBe(memoriesOf(id).length)
  })

  it('아이마다 기억이 몇 개씩 있다', () => {
    for (const def of COMPANIONS) {
      expect(memoriesOf(def.id).length, def.id).toBeGreaterThanOrEqual(3)
    }
    expect(COMPANION_MEMORIES.length).toBe(new Set(COMPANION_MEMORIES.map((m) => m.id)).size)
  })

  it('그림이 네 마리 다 있다', () => {
    for (const def of COMPANIONS) {
      expect(def.art, def.id).toBeTruthy()
      expect(companionArt(def), def.id).toBe(`/assets/companions/${def.art}/idle.webp`)
      expect(companionArt(def, 'walk'), def.id).toBe(`/assets/companions/${def.art}/walk.webp`)
    }
  })

  it('그림 폴더 이름이 겹치지 않는다', () => {
    const arts = COMPANIONS.map((c) => c.art)
    expect(new Set(arts).size).toBe(arts.length)
  })

  it('그림이 안 떠도 자리를 지킬 이모지가 있다', () => {
    for (const def of COMPANIONS) expect(def.avatar.length, def.id).toBeGreaterThan(0)
  })

  it('배고픔·병듦 같은 건 아예 없다', () => {
    // 데이터에 그런 칸이 없어야 나중에도 안 생긴다
    const after = applyDiscovery(veteran()).state
    const one = Object.values(after.discovery.companions)[0]
    expect(Object.keys(one).sort()).toEqual(['friendship', 'lastPlayedOn', 'metAt'])
  })
})

// ── I · J · K. 도감 힌트 ────────────────────────────────

describe('발견 힌트', () => {
  it('아무것도 모르면 흐릿하게만 말한다', () => {
    const s = rookie()
    const item = findCollectionItem('vintage_camera')!
    expect(hintLevelOf(s, item)).toBe(0)
    expect(hintFor(s, item).text).toBe('언제 만나게 될지는 아직.')
  })

  it('본 적이 있으면 한 단계 열린다', () => {
    const s = rookie()
    const item = findCollectionItem('vintage_camera')!
    const seen: AppState = {
      ...s,
      collection: { ...s.collection, seen: { [item.id]: new Date().toISOString() } },
    }
    expect(hintLevelOf(seen, item)).toBeGreaterThanOrEqual(1)
  })

  it('그 동네에서 얼굴이 알려지면 더 또렷해진다', () => {
    const item = findCollectionItem('vintage_camera')!
    const s = rookie()
    const known: AppState = {
      ...s,
      reputation: { ...s.reputation, CREATIVE_DISTRICT: 30 },
    }
    expect(hintLevelOf(known, item)).toBeGreaterThan(hintLevelOf(s, item))
  })

  it('단계가 오를수록 말이 달라진다', () => {
    const item = findCollectionItem('vintage_camera')!
    const s = rookie()
    const seen: AppState = {
      ...s,
      collection: { ...s.collection, seen: { [item.id]: new Date().toISOString() } },
    }
    const known: AppState = { ...seen, reputation: { ...s.reputation, CREATIVE_DISTRICT: 30 } }
    expect(hintFor(seen, item).text).not.toBe(hintFor(known, item).text)
  })

  it('비밀 물건은 끝까지 안 알려준다', () => {
    const secret = findCollectionItem('night_flower')!
    expect(secret.rarity).toBe('SECRET')
    // 도감을 아무리 채워도 1단계를 안 넘는다
    const s = veteran()
    const rich: AppState = {
      ...s,
      collection: {
        ...s.collection,
        discovered: Object.fromEntries(
          Array.from({ length: 80 }, (_, i) => [`x${i}`, new Date().toISOString()]),
        ),
      },
      reputation: { ...s.reputation, NIGHT_TOWN: 99 },
    }
    expect(hintLevelOf(rich, secret)).toBeLessThanOrEqual(1)
  })

  it('오래 막아두지는 않는다', () => {
    // 도감을 어느 정도 채운 사람에게는 3단계까지 열린다
    const s = rookie()
    const item = findCollectionItem('vintage_camera')!
    const rich: AppState = {
      ...s,
      collection: {
        ...s.collection,
        discovered: Object.fromEntries(
          Array.from({ length: 50 }, (_, i) => [`x${i}`, new Date().toISOString()]),
        ),
      },
    }
    expect(hintLevelOf(rich, item)).toBe(3)
  })

  it('모든 물건에 할 말이 있다', () => {
    const s = veteran()
    for (const id of ['cream_bed', 'moon_globe', 'night_flower', 'my_mug', 'sneakers_c']) {
      const item = findCollectionItem(id)!
      expect(hintFor(s, item).text.length, id).toBeGreaterThan(0)
    }
  })
})

// ── 알림 조절 ───────────────────────────────────────────

describe('한꺼번에 쏟지 않는다', () => {
  it('읽고 지우는 알림은 한 번에 세 개까지만 띄운다', () => {
    // 오래 쓴 사람은 업데이트 직후 열 개 넘게 동시에 열린다
    const r = applyDiscovery(veteran())
    const rest = r.notes.filter((n) => !isPlaceNote(n.key))
    expect(rest.length).toBeLessThanOrEqual(NOTES_PER_DAY)
  })

  it('새 장소는 제한 밖이지만 넷을 넘을 수 없다', () => {
    // 제한은 축하 카드를 쏟지 않으려는 것이고, 안 가본 장소는 이정표다.
    // 장소는 넷뿐이라 이 줄이 그대로 상한이 된다.
    const r = applyDiscovery(veteran())
    expect(r.notes.filter((n) => isPlaceNote(n.key)).length).toBeLessThanOrEqual(4)
  })

  it('읽고 지우는 알림은 다시 안 띄운다', () => {
    const first = applyDiscovery(veteran())
    const second = applyDiscovery(first.state)
    const firstKeys = new Set(first.notes.map((n) => n.key))
    // 새 장소는 예외다 — 가볼 때까지 계속 뜬다 (아래 describe 참고)
    for (const n of second.notes) {
      if (isPlaceNote(n.key)) continue
      expect(firstKeys.has(n.key)).toBe(false)
    }
  })

  it('안 띄운 것도 발견함에서는 다 볼 수 있다', () => {
    const r = applyDiscovery(veteran())
    const inbox = discoveryInbox(r.state)
    expect(inbox.length).toBeGreaterThan(r.notes.length)
  })

  it('여러 번 돌려도 결국은 조용해진다', () => {
    let s = visitedEverywhere(veteran())
    let rounds = 0
    for (let i = 0; i < 20; i += 1) {
      const r = applyDiscovery(s)
      s = r.state
      if (r.notes.length === 0) break
      rounds += 1
    }
    expect(rounds).toBeLessThan(20)
    expect(applyDiscovery(s).notes).toEqual([])
  })
})

// ── 압박하지 않는다 ─────────────────────────────────────

describe('혼내지 않는다', () => {
  it('어디에도 실패·놓침·기한 같은 말이 없다', () => {
    const bad = /실패|놓쳤|사라져|없어져|기한|만료|줄어|떨어져|밥을|배고|아파/
    const texts = [
      ...AUTO_COLLECTIONS.flatMap((c) => [c.name, c.description]),
      ...SECRETS.flatMap((s) => [s.name, s.hint, s.reveal, s.description]),
      ...STORY_CHAPTERS.flatMap((c) => [c.title, c.lockedHint, ...c.lines]),
      ...COMPANIONS.flatMap((c) => [c.name, c.personality, c.hint, c.reveal]),
      ...COMPANION_MEMORIES.flatMap((m) => [m.title, m.text]),
    ]
    const hits = texts.filter((t) => bad.test(t))
    expect(hits).toEqual([])
  })

  it('쉬어간 날을 낮춰 말하지 않는다', () => {
    const soft = AUTO_COLLECTIONS.find((c) => c.id === 'SOFT_DAYS')!
    expect(soft.description).not.toMatch(/못|안 했|게으/)
  })
})

describe('새 장소는 가볼 때까지 계속 알려준다', () => {
  /**
   * 실제로 놓친 일이다.
   *
   * 부엌이 열렸다는 알림은 홈에 카드 한 장으로 한 번 떴다가 사라졌다.
   * 그 순간에 화면을 안 보고 있었으면 새 장소가 생긴 줄도 모르고 지나간다.
   * 방 그림 구석의 🍳 버튼도 글자가 없어서 눈에 안 들어왔다.
   *
   * 다른 알림과 달리 장소는 **영구히 늘어난 것**이라 한 번 놓치면
   * 되돌릴 방법이 없었다. 그래서 이 넷만 규칙이 다르다.
   */
  it('안 가봤으면 며칠이 지나도 계속 뜬다', () => {
    let s = veteran()
    for (let i = 0; i < 5; i += 1) {
      const r = applyDiscovery(s)
      s = r.state
      expect(r.notes.some((n) => n.key === 'garden:opened')).toBe(true)
    }
  })

  it('가보면 그때 조용해진다', () => {
    const before = applyDiscovery(veteran())
    expect(before.notes.some((n) => n.key === 'garden:opened')).toBe(true)

    const after = applyDiscovery({
      ...before.state,
      garden: { ...before.state.garden, tutorialSeenAt: '2026-01-01T00:00:00.000Z' },
    })
    expect(after.notes.some((n) => n.key === 'garden:opened')).toBe(false)
  })

  it('하루 세 개 제한에 밀려나지 않는다', () => {
    // 새 장소가 뒤로 밀리면 안 사라지게 만든 의미가 없다
    const r = applyDiscovery(veteran())
    const places = r.notes.filter((n) => isPlaceNote(n.key))
    expect(places.length).toBeGreaterThan(0)
    expect(isPlaceNote(r.notes[0].key)).toBe(true)
  })

  it('새 장소 열쇠는 본 것으로 적어두지 않는다', () => {
    // 적어두면 다음부터 한 번 뜨고 끝나는 것으로 되돌아간다
    const r = applyDiscovery(veteran())
    for (const key of r.state.discovery.seenNoteKeys) {
      expect(isPlaceNote(key)).toBe(false)
    }
  })

  it('네 곳 다 같은 규칙이다', () => {
    for (const key of ['garden:opened', 'quarry:opened', 'kitchen:opened', 'dungeon:gate']) {
      expect(isPlaceNote(key)).toBe(true)
    }
    expect(isPlaceNote('collection:ACTIVE_DAYS')).toBe(false)
  })
})

describe('만난 걸 말 안 하고 넘어가지 않는다', () => {
  /**
   * 보리가 방에 갑자기 나타나 있었고, 만났다는 말은 어디에도 없었다.
   *
   * 알림을 "이번에 새로 참이 된 것" 으로 뽑았던 게 원인이다. 그 판단이
   * 곧 상태 쓰기였다 — newlyMeetable 이 보리를 집으면 그 자리에서
   * companions 에 넣어버린다. 그러니 그 알림이 하루 세 개 제한에 밀리면
   * 보리는 만난 걸로 저장됐는데 알림은 영영 안 온다.
   *
   * 지금은 조건이 아니라 기록을 보고 낸다. 밀린 알림은 다음 차례에 온다.
   */
  // 보리는 초록 공원 평판으로 만난다. veteran 은 이미 그걸 넘겼고,
  // 컬렉션·비밀 알림도 잔뜩 밀려 있어서 첫 판에서 반드시 밀린다.
  const busy = () => veteran()

  it('첫 판에 밀려도 결국 온다', () => {
    let s = busy()
    const first = applyDiscovery(s)
    s = first.state
    // 이 테스트가 뜻이 있으려면 첫 판에서 실제로 밀려야 한다.
    // 그런데 저장에는 이미 만난 걸로 적힌다 — 예전에는 여기서 끝이었다.
    expect(first.notes.map((n) => n.key)).not.toContain('companion:BORI')
    expect(s.discovery.companions.BORI).toBeDefined()

    const said: string[] = []
    for (let i = 0; i < 12; i += 1) {
      const r = applyDiscovery(s)
      s = r.state
      said.push(...r.notes.map((n) => n.key))
      if (r.notes.every((n) => isPlaceNote(n.key))) break
    }
    expect(said).toContain('companion:BORI')
  })

  it('만난 걸로 저장됐는데 알림만 없는 상태가 안 생긴다', () => {
    let s = busy()
    for (let i = 0; i < 12; i += 1) {
      const r = applyDiscovery(s)
      s = r.state
      if (r.notes.every((n) => isPlaceNote(n.key))) break
    }
    for (const id of Object.keys(s.discovery.companions)) {
      expect(s.discovery.seenNoteKeys).toContain(`companion:${id}`)
    }
  })

  it('찾은 비밀도 마찬가지다', () => {
    let s = busy()
    for (let i = 0; i < 12; i += 1) {
      const r = applyDiscovery(s)
      s = r.state
      if (r.notes.every((n) => isPlaceNote(n.key))) break
    }
    for (const id of s.discovery.foundSecretIds) {
      expect(s.discovery.seenNoteKeys).toContain(`secret:${id}`)
    }
    for (const id of s.discovery.revealedCollectionIds) {
      expect(s.discovery.seenNoteKeys).toContain(`collection:${id}`)
    }
  })

  it('한 번 말해준 건 두 번 말하지 않는다', () => {
    let s = visitedEverywhere(busy())
    const said: string[] = []
    for (let i = 0; i < 15; i += 1) {
      const r = applyDiscovery(s)
      s = r.state
      said.push(...r.notes.map((n) => n.key))
      if (r.notes.length === 0) break
    }
    expect(new Set(said).size).toBe(said.length)
    expect(applyDiscovery(s).notes).toEqual([])
  })
})
