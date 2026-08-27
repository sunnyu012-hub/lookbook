import { describe, expect, it } from 'vitest'
import type { AppState, CreatureId } from '@/types'
import { createDefaultState } from '@/store/defaultState'
import { sanitizeState } from '@/store/localStorage'
import { sanitizeDungeon, STATE_VERSION } from '@/store/migrate'
import {
  findCollectionItem,
  CATALOG,
  catalogTotal,
  CREATURE_CATALOG,
  EXPLORED_CATALOG,
  MATERIAL_CATALOG,
  MINERAL_CATALOG,
  PLACEABLE_CATALOG,
} from '@/lib/collection/catalog'
import { isDiscovered, ownedCount } from '@/lib/collection/progress'
import { applyDiscovery } from '@/lib/discovery/derive'
import { STORY_CHAPTERS } from '@/lib/discovery/stories'
import { conditionProgress } from '@/lib/discovery/secrets'
import { STRANGE_FRAGMENT_ID } from '@/lib/quarry/derive'
import { DUNGEON_FINDS, OLD_KEY_ID, STORY_ITEMS } from '@/lib/dungeon/items'
import {
  DUNGEON_ROOMS,
  ENERGY_PER_ROOM,
  ENERGY_PER_SEARCH,
  FIRST_ROOM_ID,
  SIDE_DROPS,
} from '@/lib/dungeon/rooms'
import {
  OLD_KEY_CHAPTER_ID,
  OLD_METAL_ID,
  PATTERN_PIECES,
  TRACE_ID,
  applyOldKey,
  clueViews,
  deepestRoomId,
  dungeonView,
  emptyDungeon,
  enterDungeon,
  foundClueCount,
  goDeeper,
  hasOldKey,
  isGateFound,
  isRoomDiscovered,
  nextRoomId,
  search,
  traceFound,
} from '@/lib/dungeon/derive'
import { applyDevDungeon } from '@/lib/dungeon/dev'
import {
  CREATURES,
  CREATURE_STEPS,
  DOOR_CREATURE_IDS,
  STEPS_BY_CREATURE,
} from '@/lib/dungeon/creatures'
import {
  ambientInRoom,
  creatureDescription,
  creatureNotes,
  creatureStage,
  isCreatureFriendly,
  isDungeonStoryDone,
  isInnerDoorOpen,
  isSleeperFreed,
  nextStep,
  takeCreatureStep,
} from '@/lib/dungeon/creatureDerive'

/** 채석장까지는 이미 다녀온 사람 */
function base(over: Partial<AppState> = {}): AppState {
  const s = createDefaultState()
  return {
    ...s,
    quarry: { ...s.quarry, unlockedAt: '2026-01-01T00:00:00.000Z' },
    user: { ...s.user, adventureEnergy: 10 },
    ...over,
  }
}

/** 단서 셋을 다 채운 사람 */
function withClues(over: Partial<AppState> = {}): AppState {
  const s = base(over)
  return {
    ...s,
    quarry: {
      ...s.quarry,
      foundMineralCounts: { [STRANGE_FRAGMENT_ID]: 1, [OLD_METAL_ID]: 1 },
      blockedPathSeen: true,
    },
    discovery: { ...s.discovery, readChapterIds: [OLD_KEY_CHAPTER_ID] },
  }
}

/** 문을 열고 다섯 구역을 다 걸어본 사람 */
function inside(over: Partial<AppState> = {}): AppState {
  const s = withClues(over)
  return { ...s, dungeon: { ...s.dungeon, discoveredRoomIds: DUNGEON_ROOMS.map((r) => r.id) } }
}

describe('A. 예전 저장이 그대로 열린다', () => {
  it('A1 던전 자리가 통째로 없어도 열린다', () => {
    const s = createDefaultState()
    const { dungeon: _dropped, ...withoutDungeon } = s
    const loaded = sanitizeState({ ...withoutDungeon, version: 15 })!
    expect(loaded.dungeon).toEqual(emptyDungeon())
    expect(loaded.user.name).toBe(s.user.name)
  })

  it('A2 스키마 버전이 17 이다', () => {
    expect(STATE_VERSION).toBe(17)
    expect(createDefaultState().version).toBe(17)
  })

  it('A3 모르는 구역·자리가 적혀 있으면 조용히 버린다', () => {
    const d = sanitizeDungeon({
      tutorialSeenAt: 'x',
      discoveredRoomIds: ['GATE', 'NOPE', 'GATE'],
      searchedSpotIds: ['gate_carving', 'ghost_spot'],
    })
    expect(d.discoveredRoomIds).toEqual(['GATE'])
    expect(d.searchedSpotIds).toEqual(['gate_carving'])
    expect(d.tutorialSeenAt).toBe('x')
  })

  it('A4 던전 발견물은 240칸에도 재료 목록에도 안 들어간다', () => {
    const ids = new Set([...DUNGEON_FINDS, ...STORY_ITEMS].map((i) => i.id))
    expect(CATALOG.some((i) => ids.has(i.id))).toBe(false)
    expect(MATERIAL_CATALOG.some((i) => ids.has(i.id))).toBe(false)
    expect(catalogTotal({})).toBe(240)
  })
})

describe('B. 이상한 돌조각에서 이야기가 시작된다', () => {
  it('B1 하루의 다섯 번째 장이 있다', () => {
    const chapter = STORY_CHAPTERS.find((c) => c.id === OLD_KEY_CHAPTER_ID)
    expect(chapter).toBeDefined()
    expect(chapter!.npcId).toBe('HARU')
    expect(chapter!.order).toBe(5)
  })

  it('B2 돌조각을 못 주웠으면 그 장은 안 열린다', () => {
    const chapter = STORY_CHAPTERS.find((c) => c.id === OLD_KEY_CHAPTER_ID)!
    const c = chapter.conditions.find((x) => x.kind === 'QUARRY_FIND')!
    expect(conditionProgress(base(), c)).toBe(0)
  })

  it('B3 돌조각을 주우면 그 조건이 채워진다', () => {
    const chapter = STORY_CHAPTERS.find((c) => c.id === OLD_KEY_CHAPTER_ID)!
    const c = chapter.conditions.find((x) => x.kind === 'QUARRY_FIND')!
    const s = base()
    const found = {
      ...s,
      quarry: { ...s.quarry, foundMineralCounts: { [STRANGE_FRAGMENT_ID]: 1 } },
    }
    expect(conditionProgress(found, c)).toBe(1)
  })
})

describe('C. 열쇠 단서 셋', () => {
  it('C1 아무것도 안 했으면 0개', () => {
    expect(foundClueCount(base())).toBe(0)
    expect(hasOldKey(base())).toBe(false)
  })

  it('C2 단서 셋이 전부 이미 있던 기록에서 나온다', () => {
    const s = base()
    const one = {
      ...s,
      quarry: { ...s.quarry, foundMineralCounts: { [STRANGE_FRAGMENT_ID]: 1 } },
    }
    expect(foundClueCount(one)).toBe(1)

    const two = {
      ...one,
      quarry: {
        ...one.quarry,
        foundMineralCounts: { [STRANGE_FRAGMENT_ID]: 1, [OLD_METAL_ID]: 1 },
      },
    }
    expect(foundClueCount(two)).toBe(2)

    const three = {
      ...two,
      discovery: { ...two.discovery, readChapterIds: [OLD_KEY_CHAPTER_ID] },
    }
    expect(foundClueCount(three)).toBe(3)
    expect(hasOldKey(three)).toBe(true)
  })

  it('C3 단서 문구가 조건을 숫자로 말하지 않는다', () => {
    for (const c of clueViews(base())) {
      expect(c.hint).not.toMatch(/\d/)
    }
  })
})

describe('D. 오래된 열쇠', () => {
  it('D1 단서가 다 모이면 손에 들어온다', () => {
    const { state, gained } = applyOldKey(withClues())
    expect(gained).toBe(true)
    expect(isDiscovered(state.collection, OLD_KEY_ID)).toBe(true)
  })

  it('D2 두 번 주지 않는다', () => {
    const first = applyOldKey(withClues())
    const second = applyOldKey(first.state)
    expect(second.gained).toBe(false)
  })

  it('D3 아직 단서가 모자라면 안 준다', () => {
    const s = base()
    const partial = {
      ...s,
      quarry: { ...s.quarry, foundMineralCounts: { [STRANGE_FRAGMENT_ID]: 1 } },
    }
    expect(applyOldKey(partial).gained).toBe(false)
  })

  it('D4 쓰고 없어지는 물건이 아니다 — 방에도 안 놓고 재료도 아니다', () => {
    const key = findCollectionItem(OLD_KEY_ID)!
    expect(key.placeable).toBe(false)
    expect(key.stackable).toBe(false)
    expect(key.unique).toBe(true)
    // 어디서 사거나 만들 수 있는 물건이 아니다
    expect(key.acquisitionSources).toEqual([])
  })

  it('D5 하루 한 번 도는 발견 검사가 알아서 준다', () => {
    const { state, notes } = applyDiscovery(withClues())
    expect(isDiscovered(state.collection, OLD_KEY_ID)).toBe(true)
    expect(notes.some((n) => n.key === 'story:old-key')).toBe(true)
  })
})

describe('E. 잠든 돌문 해금', () => {
  it('E1 막힌 길을 안 봤으면 열쇠가 있어도 문이 안 보인다', () => {
    const s = withClues()
    const notSeen = { ...s, quarry: { ...s.quarry, blockedPathSeen: false } }
    expect(hasOldKey(notSeen)).toBe(true)
    expect(isGateFound(notSeen)).toBe(false)
  })

  it('E2 열쇠가 없으면 막힌 길을 봐도 문이 안 보인다', () => {
    const s = base()
    const seen = { ...s, quarry: { ...s.quarry, blockedPathSeen: true } }
    expect(isGateFound(seen)).toBe(false)
  })

  it('E3 둘 다 되면 문이 보인다', () => {
    expect(isGateFound(withClues())).toBe(true)
  })

  it('E4 문을 못 찾았으면 들어가지지 않는다', () => {
    const s = base()
    expect(enterDungeon(s)).toBe(s)
  })
})

describe('F. 들어가는 데는 아무것도 안 든다', () => {
  it('F1 에너지가 0 이어도 들어간다', () => {
    const s = withClues({ user: { ...createDefaultState().user, adventureEnergy: 0 } })
    const entered = enterDungeon(s)
    expect(isRoomDiscovered(entered, FIRST_ROOM_ID)).toBe(true)
    expect(entered.user.adventureEnergy).toBe(0)
  })

  it('F2 이미 들어와 있으면 아무것도 안 바꾼다', () => {
    const once = enterDungeon(withClues())
    expect(enterDungeon(once)).toBe(once)
  })

  it('F3 에너지가 0 이어도 이미 가본 데는 다시 간다', () => {
    const s = inside()
    const broke = { ...s, user: { ...s.user, adventureEnergy: 0 } }
    const result = goDeeper(broke, 'GATE')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.roomId).toBe('ENTRANCE')
      expect(result.state.user.adventureEnergy).toBe(0)
    }
  })
})

describe('G. 안쪽으로 들어갈 때만 에너지를 쓴다', () => {
  it('G1 처음 가는 구역은 정확히 1 든다', () => {
    const s = enterDungeon(withClues())
    const before = s.user.adventureEnergy
    const result = goDeeper(s, 'GATE')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.user.adventureEnergy).toBe(before - ENERGY_PER_ROOM)
      expect(isRoomDiscovered(result.state, 'ENTRANCE')).toBe(true)
    }
  })

  it('G2 에너지가 없으면 처음 가는 구역은 못 간다 — 상태도 안 바뀐다', () => {
    const s = enterDungeon(withClues())
    const empty = { ...s, user: { ...s.user, adventureEnergy: 0 } }
    const result = goDeeper(empty, 'GATE')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('NO_ENERGY')
    expect(isRoomDiscovered(empty, 'ENTRANCE')).toBe(false)
  })

  it('G3 마지막 구역에서는 더 갈 데가 없다', () => {
    // 구역이 늘어나도 이 테스트가 같이 틀리지 않게 마지막을 목록에서 가져온다
    const last = DUNGEON_ROOMS[DUNGEON_ROOMS.length - 1].id
    const result = goDeeper(inside(), last)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('NO_MORE')
    expect(nextRoomId(last)).toBeNull()
  })

  it('G4 안 가본 데서는 출발할 수 없다', () => {
    const s = enterDungeon(withClues())
    const result = goDeeper(s, 'SMALL_ROOM')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('LOCKED')
  })
})

describe('H. 들여다보기', () => {
  it('H1 한 번에 에너지 1 이 줄고 도감에 들어간다', () => {
    const s = inside()
    const before = s.user.adventureEnergy
    const result = search(s, 'gate_carving')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.user.adventureEnergy).toBe(before - ENERGY_PER_SEARCH)
      expect(result.find.itemId).toBe('dungeon_wall_fragment')
      expect(isDiscovered(result.state.collection, 'dungeon_wall_fragment')).toBe(true)
    }
  })

  it('H2 같은 자리를 두 번 팔 수 없다', () => {
    const first = search(inside(), 'gate_carving')
    expect(first.ok).toBe(true)
    if (!first.ok) return
    const second = search(first.state, 'gate_carving')
    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.reason).toBe('DONE')
  })

  it('H3 에너지가 없으면 조사만 막힌다 — 상태는 그대로다', () => {
    const s = inside()
    const empty = { ...s, user: { ...s.user, adventureEnergy: 0 } }
    const result = search(empty, 'gate_carving')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('NO_ENERGY')
    expect(empty.dungeon.searchedSpotIds).toEqual([])
  })

  it('H4 안 가본 구역의 자리는 못 판다', () => {
    const s = enterDungeon(withClues())
    const result = search(s, 'door_gap')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('LOCKED')
  })
})

describe('I. 이야기는 운에 안 맡긴다', () => {
  it('I1 이야기가 걸린 자리는 언제 파도 같은 것이 나온다', () => {
    const days = ['2026-03-01', '2026-07-14', '2027-01-01'].map((d) => new Date(`${d}T09:00:00Z`))
    for (const room of DUNGEON_ROOMS) {
      for (const spot of room.spots) {
        if (!spot.itemId) continue
        for (const day of days) {
          const result = search(inside(), spot.id, day)
          expect(result.ok).toBe(true)
          if (result.ok) expect(result.find.itemId).toBe(spot.itemId)
        }
      }
    }
  })

  it('I2 곁가지 자리는 새로고침해도 그날 결과가 안 바뀐다', () => {
    const day = new Date('2026-05-05T09:00:00Z')
    const a = search(inside(), 'corridor_wall', day)
    const b = search(inside(), 'corridor_wall', day)
    expect(a.ok && b.ok).toBe(true)
    if (a.ok && b.ok) expect(a.find.itemId).toBe(b.find.itemId)
  })

  it('I3 곁가지 자리에서 나오는 건 전부 이미 있는 물건이다', () => {
    for (const id of SIDE_DROPS) {
      expect(findCollectionItem(id)).not.toBeNull()
    }
  })

  it('I4 빈손으로 끝나는 자리가 없다', () => {
    const day = new Date('2026-05-05T09:00:00Z')
    for (const room of DUNGEON_ROOMS) {
      for (const spot of room.spots) {
        const result = search(inside(), spot.id, day)
        expect(result.ok, spot.id).toBe(true)
        if (result.ok) expect(result.find.itemId).toBeTruthy()
      }
    }
  })
})

describe('J. 어디까지 갔는지 남는다', () => {
  it('J1 걸어간 자취가 저장을 한 바퀴 돌아도 살아 있다', () => {
    const s = inside()
    const searched = search(s, 'gate_carving')
    expect(searched.ok).toBe(true)
    if (!searched.ok) return
    const loaded = sanitizeState(searched.state)!
    expect(loaded.dungeon.discoveredRoomIds).toHaveLength(DUNGEON_ROOMS.length)
    expect(loaded.dungeon.searchedSpotIds).toEqual(['gate_carving'])
  })

  it('J2 가장 안쪽이 어디인지 센다', () => {
    expect(deepestRoomId(base())).toBeNull()
    expect(deepestRoomId(enterDungeon(withClues()))).toBe('GATE')
    expect(deepestRoomId(inside())).toBe(DUNGEON_ROOMS[DUNGEON_ROOMS.length - 1].id)
  })

  it('J3 진행률을 숫자로 만들지 않는다', () => {
    const view = dungeonView(inside())
    expect(view).not.toHaveProperty('progress')
    expect(view).not.toHaveProperty('percent')
  })
})

describe('K. 다음 이야기 떡밥', () => {
  it('K1 안쪽 문 앞에서 작은 흔적이 나온다', () => {
    const result = search(inside(), 'door_gap')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.find.itemId).toBe(TRACE_ID)
      expect(traceFound(result.state)).toBe(true)
    }
  })

  it('K2 흔적을 찾기 전에는 아직이다', () => {
    expect(traceFound(inside())).toBe(false)
  })

  it('K3 정체를 밝히는 말이 어디에도 없다', () => {
    const words = /몬스터|괴물|보스|적|전투|공격|싸/
    for (const room of DUNGEON_ROOMS) {
      expect(room.description).not.toMatch(words)
      for (const spot of room.spots) {
        expect(spot.teaser).not.toMatch(words)
        expect(spot.found).not.toMatch(words)
      }
    }
  })
})

describe('L. 기존 것이 안 흔들린다', () => {
  it('L1 도감 240칸은 그대로다', () => {
    expect(catalogTotal({})).toBe(240)
  })

  it('L2 채석장 기록은 그대로 살아 있다', () => {
    const s = inside()
    const loaded = sanitizeState(s)!
    expect(loaded.quarry.foundMineralCounts[STRANGE_FRAGMENT_ID]).toBe(1)
    expect(loaded.quarry.blockedPathSeen).toBe(true)
  })

  it('L3 모험 에너지는 한도 아래로 안 내려간다', () => {
    const s = inside()
    let next: AppState = { ...s, user: { ...s.user, adventureEnergy: 1 } }
    const result = search(next, 'gate_carving')
    expect(result.ok).toBe(true)
    if (result.ok) next = result.state
    expect(next.user.adventureEnergy).toBe(0)
    expect(search(next, 'entrance_dust').ok).toBe(false)
  })
})

describe('M. 개발용 도구', () => {
  it('M1 단서 셋 채우기는 열쇠를 직접 주지 않는다', () => {
    const s = applyDevDungeon(base(), { kind: 'CLUES' })
    expect(hasOldKey(s)).toBe(true)
    // 실제 길과 같아야 한다 — 도감에 넣는 건 발견 검사가 한다
    expect(isDiscovered(s.collection, OLD_KEY_ID)).toBe(false)
    expect(isDiscovered(applyDiscovery(s).state.collection, OLD_KEY_ID)).toBe(true)
  })

  it('M2 초기화는 걸어간 자취만 지운다', () => {
    const s = applyDevDungeon(inside(), { kind: 'FIND_ALL' })
    const reset = applyDevDungeon(s, { kind: 'RESET' })
    expect(reset.dungeon).toEqual(emptyDungeon())
    expect(isDiscovered(reset.collection, TRACE_ID)).toBe(true)
  })
})

describe('N. 도감의 탐험 칸', () => {
  it('N1 광물 열하나와 던전 발견물 다섯이 들어간다', () => {
    expect(EXPLORED_CATALOG).toHaveLength(MINERAL_CATALOG.length + DUNGEON_FINDS.length)
  })

  it('N2 오래된 열쇠는 개수에 안 섞인다', () => {
    expect(EXPLORED_CATALOG.some((i) => i.id === OLD_KEY_ID)).toBe(false)
  })

  it('N3 240칸 분모는 그대로다', () => {
    expect(catalogTotal({})).toBe(240)
  })
})

describe('O. 세 번째 단서는 길이 둘이다', () => {
  /**
   * 하루 이야기 하나만 두면 던전이 "매일 사람한테 말 걸기" 뒤에 잠긴다.
   * 친밀도는 대화 하루 +2 가 주력이고 이야기는 순서대로만 열려서,
   * 아무리 많이 놀아도 안 빨라진다.
   */
  it('O1 하루한테 안 들어도 금속 조각을 모으면 열린다', () => {
    const s = base()
    const self: AppState = {
      ...s,
      quarry: {
        ...s.quarry,
        foundMineralCounts: { [STRANGE_FRAGMENT_ID]: 1, [OLD_METAL_ID]: PATTERN_PIECES },
        blockedPathSeen: true,
      },
      // 하루와 한 마디도 안 했다
      discovery: { ...s.discovery, readChapterIds: [] },
    }
    expect(hasOldKey(self)).toBe(true)
    expect(isGateFound(self)).toBe(true)
  })

  it('O2 조각이 모자라면 아직 아니다', () => {
    const s = base()
    const few: AppState = {
      ...s,
      quarry: {
        ...s.quarry,
        foundMineralCounts: { [STRANGE_FRAGMENT_ID]: 1, [OLD_METAL_ID]: PATTERN_PIECES - 1 },
        blockedPathSeen: true,
      },
    }
    expect(foundClueCount(few)).toBe(2)
    expect(hasOldKey(few)).toBe(false)
  })

  it('O3 하루한테 들으면 조각 하나로도 열린다 — 듣고 가는 쪽이 더 빠르다', () => {
    expect(hasOldKey(withClues())).toBe(true)
    expect(withClues().quarry.foundMineralCounts[OLD_METAL_ID]).toBe(1)
  })
})

// ══════════════════════════════════════════════════════════
// UPDATE F — 생명체와 돌잠이
// ══════════════════════════════════════════════════════════

/** 문 앞까지 와 있고 에너지가 넉넉한 사람 */
function atDoor(over: Partial<AppState> = {}): AppState {
  return inside(over)
}

/** 그 생명체의 걸음이 모두 n 개가 될 때까지 밟는다 */
function walk(state: AppState, creatureId: CreatureId, n = Infinity): AppState {
  let next = state
  for (;;) {
    const done = STEPS_BY_CREATURE[creatureId].filter((s) =>
      next.dungeon.creatureLog.includes(s.id),
    ).length
    if (done >= n) break
    const step = nextStep(next, creatureId)
    if (!step) break
    const r = takeCreatureStep(next, step.id, 0)
    if (r.step === null) break
    next = r.state
  }
  return next
}

/** 문을 여는 셋과 다 친해진 사람 */
function friendlyThree(over: Partial<AppState> = {}): AppState {
  let s = atDoor(over)
  for (const id of DOOR_CREATURE_IDS) s = walk(s, id)
  return s
}

describe('P. 생명체 — 저장은 배열 하나뿐', () => {
  it('P1 새 저장 자리는 creatureLog 하나만 늘었다', () => {
    expect(Object.keys(emptyDungeon()).sort()).toEqual([
      'creatureLog',
      'discoveredRoomIds',
      'searchedSpotIds',
      'tutorialSeenAt',
    ])
  })

  it('P2 파생 boolean 을 저장하지 않는다', () => {
    const s = friendlyThree()
    const saved = JSON.stringify(s.dungeon)
    for (const banned of ['Friendly', 'innerDoorOpen', 'hasRockBean', 'stoneSleeperSolved']) {
      expect(saved).not.toContain(banned)
    }
  })

  it('P3 모르는 걸음이 적혀 있으면 조용히 버린다', () => {
    const d = sanitizeDungeon({
      discoveredRoomIds: ['GATE'],
      searchedSpotIds: [],
      creatureLog: ['stone_bean:discover', 'ghost:step', 'stone_bean:discover'],
    })
    expect(d.creatureLog).toEqual(['stone_bean:discover'])
  })

  it('P4 예전 저장에 creatureLog 가 없어도 빈 배열로 열린다', () => {
    const s = createDefaultState()
    const old = { ...s, version: 16, dungeon: { ...s.dungeon, creatureLog: undefined } }
    const loaded = sanitizeState(old)!
    expect(loaded.dungeon.creatureLog).toEqual([])
    // UPDATE E 진행도는 그대로다
    expect(loaded.dungeon.discoveredRoomIds).toEqual(s.dungeon.discoveredRoomIds)
  })
})

describe('Q. 단계는 걸음에서 계산한다', () => {
  it('Q1 아무것도 안 했으면 모르는 사이다', () => {
    expect(creatureStage(atDoor(), 'stone_bean')).toBe('UNKNOWN')
    expect(isCreatureFriendly(atDoor(), 'stone_bean')).toBe(false)
  })

  it('Q2 돌콩이 다섯 걸음이 순서대로 단계를 올린다', () => {
    const want = ['DISCOVERED', 'OBSERVED', 'UNDERSTOOD', 'HELPED', 'FRIENDLY']
    let s = atDoor()
    for (let i = 0; i < want.length; i += 1) {
      s = walk(s, 'stone_bean', i + 1)
      expect(creatureStage(s, 'stone_bean'), String(i)).toBe(want[i])
    }
  })

  it('Q3 순서를 건너뛸 수 없다', () => {
    const r = takeCreatureStep(atDoor(), 'stone_bean:friendly', 0)
    expect(r.step).toBeNull()
  })

  it('Q4 같은 걸음을 두 번 밟아도 한 번만 남는다', () => {
    const once = takeCreatureStep(atDoor(), 'stone_bean:discover', 0)
    expect(once.step).not.toBeNull()
    if (once.step === null) return
    const twice = takeCreatureStep(once.state, 'stone_bean:discover', 0)
    expect(twice.step).toBeNull()
    expect(once.state.dungeon.creatureLog).toEqual(['stone_bean:discover'])
  })

  it('Q5 안 가본 방의 걸음은 못 밟는다', () => {
    const s = enterDungeon(withClues())
    // 무너진 복도까지 안 갔다
    expect(takeCreatureStep(s, 'stone_bean:discover', 0).step).toBeNull()
  })

  it('Q6 어느 갈래를 골라도 진행은 같다', () => {
    const a = takeCreatureStep(walk(atDoor(), 'stone_bean', 1), 'stone_bean:observe', 0)
    const b = takeCreatureStep(walk(atDoor(), 'stone_bean', 1), 'stone_bean:observe', 1)
    expect(a.step).not.toBeNull()
    expect(b.step).not.toBeNull()
    if (a.step === null || b.step === null) return
    expect(creatureStage(a.state, 'stone_bean')).toBe(creatureStage(b.state, 'stone_bean'))
    // 읽는 줄만 다르다
    expect(a.lines).not.toEqual(b.lines)
  })
})

describe('R. 도감 기록이 같이 지낸 만큼 길어진다', () => {
  it('R1 만나기 전에는 아무 기록도 없다', () => {
    expect(creatureNotes(atDoor(), 'stone_bean')).toEqual([])
  })

  it('R2 걸음마다 한 줄씩 붙는다', () => {
    let s = walk(atDoor(), 'stone_bean', 1)
    expect(creatureNotes(s, 'stone_bean')).toHaveLength(1)
    s = walk(s, 'stone_bean', 2)
    expect(creatureNotes(s, 'stone_bean')).toHaveLength(2)
    s = walk(s, 'stone_bean')
    const notes = creatureNotes(s, 'stone_bean')
    expect(notes[0]).toBe('돌처럼 웅크리고 있는 작은 생명체.')
    expect(notes.at(-1)).toBe('이제 가까이 가도 숨지 않는다.')
  })

  it('R3 도감 카드가 그 기록을 쓴다', () => {
    const s = walk(atDoor(), 'stone_bean')
    expect(creatureDescription(s, 'stone_bean')).toContain('이제 가까이 가도 숨지 않는다')
  })
})

describe('S. 안쪽 문', () => {
  it('S1 셋과 친해지기 전에는 안 열린다', () => {
    let s = atDoor()
    expect(isInnerDoorOpen(s)).toBe(false)
    s = walk(s, 'stone_bean')
    expect(isInnerDoorOpen(s)).toBe(false)
    s = walk(s, 'moss_dream')
    expect(isInnerDoorOpen(s)).toBe(false)
  })

  it('S2 셋이 다 되면 열린다 — 저장하지 않는다', () => {
    const s = friendlyThree()
    expect(isInnerDoorOpen(s)).toBe(true)
    expect(JSON.stringify(s.dungeon)).not.toContain('Door')
  })

  it('S3 문이 안 열렸으면 안쪽 방에 못 들어간다', () => {
    const s = { ...atDoor(), dungeon: { ...atDoor().dungeon, discoveredRoomIds: ['GATE', 'ENTRANCE', 'CORRIDOR', 'SMALL_ROOM', 'INNER_DOOR'] } }
    const r = goDeeper(s, 'INNER_DOOR')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe('DOOR_SHUT')
  })

  it('S4 열리면 들어갈 수 있다 — 새 방이라 에너지 1', () => {
    const base = friendlyThree()
    const s = { ...base, dungeon: { ...base.dungeon, discoveredRoomIds: ['GATE', 'ENTRANCE', 'CORRIDOR', 'SMALL_ROOM', 'INNER_DOOR'] } }
    const before = s.user.adventureEnergy
    const r = goDeeper(s, 'INNER_DOOR')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.roomId).toBe('INNER_HALL')
      expect(r.state.user.adventureEnergy).toBe(before - 1)
    }
  })
})

describe('T. 돌잠이 — 전투 없이 이야기로 푼다', () => {
  it('T1 금속을 빼기 전에는 이름이 안 나온다', () => {
    for (const step of STEPS_BY_CREATURE.stone_sleeper) {
      if (step.id === 'stone_sleeper:free') break
      expect(step.title, step.id).not.toContain('돌잠이')
    }
  })

  it('T2 오해가 풀리는 문장이 있다', () => {
    const metal = STEPS_BY_CREATURE.stone_sleeper.find((s) => s.id === 'stone_sleeper:metal')!
    expect(metal.after?.join(' ')).toContain('공격하려는 게 아니라, 움직이지 못하고 있었던 것 같다')
  })

  it('T3 금속을 빼내면 그때 발견된다', () => {
    let s = friendlyThree()
    s = walk(s, 'stone_sleeper', 3)
    expect(isDiscovered(s.collection, 'stone_sleeper')).toBe(false)
    s = walk(s, 'stone_sleeper', 4)
    expect(isSleeperFreed(s)).toBe(true)
    expect(isDiscovered(s.collection, 'stone_sleeper')).toBe(true)
  })

  it('T4 마지막 걸음까지 가면 이야기가 끝난다', () => {
    const s = walk(friendlyThree(), 'stone_sleeper')
    expect(isDungeonStoryDone(s)).toBe(true)
  })

  it('T5 전투 값이 하나도 없다', () => {
    const text = JSON.stringify(STEPS_BY_CREATURE.stone_sleeper)
    for (const banned of ['hp', 'HP', 'damage', '공격력', '전투', '패배']) {
      expect(text).not.toContain(banned)
    }
  })

  it('T6 이야기 끝 알림이 뜬다', () => {
    const { notes } = applyDiscovery(walk(friendlyThree(), 'stone_sleeper'))
    expect(notes.some((n) => n.key === 'dungeon:story-done')).toBe(true)
  })
})

describe('U. 관계 진행에 에너지를 쓰지 않는다', () => {
  it('U1 에너지 0 이어도 다섯 걸음을 다 밟는다', () => {
    const zero = { ...atDoor(), user: { ...atDoor().user, adventureEnergy: 0 } }
    const s = walk(zero, 'stone_bean')
    expect(isCreatureFriendly(s, 'stone_bean')).toBe(true)
    expect(s.user.adventureEnergy).toBe(0)
  })

  it('U2 걸음을 밟아도 코인이 안 움직인다', () => {
    const before = atDoor().user.coins
    const s = walk(atDoor(), 'stone_bean')
    expect(s.user.coins).toBe(before)
  })
})

describe('V. 생명체는 물건이 아니다', () => {
  const ids = CREATURE_CATALOG.map((c) => c.id)

  it('V1 240칸에 안 들어간다', () => {
    expect(CATALOG.some((i) => ids.includes(i.id))).toBe(false)
    expect(catalogTotal({})).toBe(240)
  })

  it('V2 재료 목록에 안 들어간다 — 퀘스트 드롭 풀이 안 흔들린다', () => {
    expect(MATERIAL_CATALOG.some((i) => ids.includes(i.id))).toBe(false)
  })

  it('V3 방에 못 놓는다', () => {
    expect(PLACEABLE_CATALOG.some((i) => ids.includes(i.id))).toBe(false)
    for (const c of CREATURE_CATALOG) expect(c.placeable, c.id).toBe(false)
  })

  it('V4 어디서도 살 수 없고 만들 수 없다', () => {
    for (const c of CREATURE_CATALOG) {
      expect(c.acquisitionSources, c.id).toEqual([])
      expect(c.price, c.id).toBeUndefined()
      expect(c.sellPrice, c.id).toBeUndefined()
    }
  })

  it('V5 개수가 쌓이지 않는다 — 소유물이 아니다', () => {
    for (const c of CREATURE_CATALOG) {
      expect(c.stackable, c.id).toBe(false)
      expect(c.unique, c.id).toBe(true)
    }
    const s = walk(atDoor(), 'stone_bean', 1)
    expect(ownedCount(s.collection, 'stone_bean')).toBeLessThanOrEqual(1)
  })

  it('V6 탐험 칸과 섞이지 않는다', () => {
    expect(EXPLORED_CATALOG.some((i) => ids.includes(i.id))).toBe(false)
    expect(CREATURE_CATALOG).toHaveLength(4)
  })

  it('V7 세트에도 안 들어간다', () => {
    for (const c of CREATURE_CATALOG) expect(c.collectionSetIds, c.id).toEqual([])
  })
})

describe('W. 오늘 보이는 모습', () => {
  it('W1 친해지기 전에는 안 뜬다', () => {
    expect(ambientInRoom(atDoor(), 'CORRIDOR')).toEqual([])
  })

  it('W2 친해진 뒤에는 날마다 다를 수 있고, 같은 날은 같다', () => {
    const s = walk(atDoor(), 'stone_bean')
    const day = new Date('2026-05-05T09:00:00Z')
    expect(ambientInRoom(s, 'CORRIDOR', day)).toEqual(ambientInRoom(s, 'CORRIDOR', day))
  })

  it('W3 매일 뜨지는 않는다', () => {
    const s = walk(atDoor(), 'stone_bean')
    const days = Array.from({ length: 30 }, (_, i) =>
      ambientInRoom(s, 'CORRIDOR', new Date(`2026-06-${String(i + 1).padStart(2, '0')}T09:00:00Z`)),
    )
    expect(days.some((d) => d.length === 0)).toBe(true)
    expect(days.some((d) => d.length > 0)).toBe(true)
  })
})

describe('X. 금지한 것이 실제로 없다', () => {
  it('X1 호감도 숫자도 단계 이름도 화면 문구에 안 쓴다', () => {
    const text = JSON.stringify(CREATURE_STEPS) + JSON.stringify(CREATURES)
    for (const banned of ['친밀도', 'Bond', '★', '레벨', 'Lv.', '포획', '먹이', '가챠']) {
      expect(text).not.toContain(banned)
    }
  })

  it('X2 사람처럼 말하는 대사가 없다', () => {
    const text = JSON.stringify(CREATURE_STEPS)
    for (const banned of ['고마워', '친구가 되었어', '클리어', '해방']) {
      expect(text).not.toContain(banned)
    }
  })

  it('X3 실패 분기가 없다 — 모든 갈래가 그냥 진행된다', () => {
    for (const step of CREATURE_STEPS) {
      if (!step.choices) continue
      expect(step.choices.length, step.id).toBe(2)
      for (const c of step.choices) expect(c.lines.length, step.id).toBeGreaterThan(0)
    }
  })
})
