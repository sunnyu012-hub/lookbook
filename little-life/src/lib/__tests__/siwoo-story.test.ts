import { describe, expect, it } from 'vitest'
import type { AppState, StoryChapterDef } from '@/types'
import {
  STORY_CHAPTERS,
  chaptersOf,
  isChapterUnlocked,
  knowsSiwooBandPast,
  storyProgress,
  unreadChapters,
} from '@/lib/discovery/stories'
import { LIVING_SCENES } from '@/lib/city/scenes'
import { NPC_IDS } from '@/types'
import { FRIENDSHIP_MAX, findNpc } from '@/lib/city/npcs'
import { eligibleDialogues } from '@/lib/city/dialogue'
import { createDefaultState } from '@/store/defaultState'
import { emptyNpcState } from '@/lib/city/friendship'

const SIWOO = chaptersOf('SIWOO')

/** 시우와 얼마나 친하고 어느 동네를 얼마나 다녔는지만 바꾼 저장 */
function withSiwoo(friendship: number, reputation: Partial<AppState['reputation']> = {}): AppState {
  const base = createDefaultState()
  return {
    ...base,
    npcs: { ...base.npcs, SIWOO: { ...emptyNpcState(), friendship } },
    reputation: { ...base.reputation, ...reputation },
  }
}

function read(state: AppState, ids: string[]): AppState {
  return { ...state, discovery: { ...state.discovery, readChapterIds: ids } }
}

describe('시우 이야기 — 짜임새', () => {
  it('여섯 장이다', () => {
    expect(SIWOO).toHaveLength(6)
    expect(SIWOO.map((c) => c.id)).toEqual([
      'SIWOO_1',
      'SIWOO_2',
      'SIWOO_3',
      'SIWOO_4',
      'SIWOO_5',
      'SIWOO_6',
    ])
  })

  it('순서가 1부터 빠짐없이 이어진다', () => {
    expect(SIWOO.map((c) => c.order)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('id 가 저장소 어디와도 안 겹친다', () => {
    const all = STORY_CHAPTERS.map((c) => c.id)
    expect(new Set(all).size).toBe(all.length)
    const scenes = new Set(LIVING_SCENES.map((s) => s.id))
    for (const c of SIWOO) expect(scenes.has(c.id)).toBe(false)
  })

  it('말하는 사람이 전부 실제 도시 사람이다', () => {
    for (const c of SIWOO) {
      for (const line of c.scene ?? []) {
        if (line.kind !== 'SAY') continue
        expect(NPC_IDS, `${c.id} / ${line.npcId}`).toContain(line.npcId)
        expect(findNpc(line.npcId)).not.toBeNull()
      }
    }
  })

  it('세 축만 쓴다 — 도윤 · 은채 · 이안 (하루는 한 줄 거들 뿐)', () => {
    const others = new Set<string>()
    for (const c of SIWOO) {
      for (const line of c.scene ?? []) {
        if (line.kind === 'SAY' && line.npcId !== 'SIWOO') others.add(line.npcId)
      }
    }
    expect([...others].sort()).toEqual(['EUNCHAE', 'JUNE', 'MINA', 'RIO'])
  })

  it('여섯 장 다 시우가 나온다', () => {
    for (const c of SIWOO) {
      const mine = (c.scene ?? []).some((l) => l.kind === 'SAY' && l.npcId === 'SIWOO')
      expect(mine, c.id).toBe(true)
    }
  })

  /**
   * 장별로는 안 본다. 은채 장은 일부러 은채가 더 말한다 — 시우가 말을
   * 못 하는 게 그 장면의 요점이라 거기서 균형을 맞추면 장면이 죽는다.
   * 이야기 전체에서 시우가 주인이면 된다.
   */
  it('이야기 전체로 보면 시우가 제일 많이 말한다', () => {
    const says = SIWOO.flatMap((c) => (c.scene ?? []).filter((l) => l.kind === 'SAY'))
    const mine = says.filter((l) => l.kind === 'SAY' && l.npcId === 'SIWOO')
    expect(mine.length * 2).toBeGreaterThan(says.length)
  })
})

describe('시우 이야기 — 보상이 없다', () => {
  it('물건도 친밀도도 주지 않는다', () => {
    for (const c of SIWOO) {
      expect(c.rewardItemId, c.id).toBeNull()
      expect(c.rewardFriendship, c.id).toBe(0)
    }
  })

  it('비밀도 동료도 열지 않는다 — 읽는 것 자체가 전부다', () => {
    for (const c of SIWOO) {
      expect(c.unlocksSecret, c.id).toBeUndefined()
      expect(c.unlocksCompanion, c.id).toBeUndefined()
    }
  })
})

describe('시우 이야기 — 어떻게 열리나', () => {
  it('처음에는 한 장도 안 열려 있다', () => {
    const fresh = createDefaultState()
    for (const c of SIWOO) expect(isChapterUnlocked(fresh, c), c.id).toBe(false)
  })

  it('앞 장을 읽어야 다음 장이 열린다', () => {
    const rich = withSiwoo(FRIENDSHIP_MAX, {
      TRAINING_ZONE: 100,
      CREATIVE_DISTRICT: 100,
    })
    // 친밀도가 꽉 차 있어도 순서는 지켜진다
    expect(isChapterUnlocked(rich, SIWOO[0])).toBe(true)
    expect(isChapterUnlocked(rich, SIWOO[1])).toBe(false)
    const afterFirst = read(rich, ['SIWOO_1'])
    expect(isChapterUnlocked(afterFirst, SIWOO[1])).toBe(true)
  })

  /**
   * 선물이나 리빙신을 조건으로 걸면 그 순간 둘이 이야기를 여는 티켓이 된다.
   * 친밀도와 그 동네에 얼마나 있었나 둘뿐이어야 한다.
   */
  it('조건이 친밀도와 동네 평판뿐이다 — 선물도 장면도 열쇠가 아니다', () => {
    for (const c of SIWOO) {
      for (const cond of c.conditions) {
        expect(['FRIENDSHIP', 'AREA_REPUTATION'], `${c.id}: ${cond.kind}`).toContain(cond.kind)
      }
      const fs = c.conditions.find((x) => x.kind === 'FRIENDSHIP')
      expect(fs, c.id).toBeDefined()
      if (fs?.kind === 'FRIENDSHIP') expect(fs.npcId).toBe('SIWOO')
    }
  })

  it('친밀도 문턱이 올라가기만 한다', () => {
    const values = SIWOO.map(
      (c) => c.conditions.find((x) => x.kind === 'FRIENDSHIP')! as { value: number },
    ).map((c) => c.value)
    expect(values).toEqual([...values].sort((a, b) => a - b))
    expect(new Set(values).size).toBe(values.length)
  })

  it('마지막 장도 특별한 사이(75)까지 안 가도 열린다', () => {
    const last = SIWOO[5].conditions.find((c) => c.kind === 'FRIENDSHIP')!
    if (last.kind === 'FRIENDSHIP') expect(last.value).toBeLessThan(45)
  })

  /**
   * 개발 도구 없이 평범한 플레이로 여섯 장이 다 열리는지.
   * 시우와 친해지고, 운동 구역과 창작 골목을 다니면 그게 전부다.
   */
  it('평범하게 놀면 끝까지 읽을 수 있다', () => {
    let state = withSiwoo(40, { TRAINING_ZONE: 14, CREATIVE_DISTRICT: 20 })
    const readSoFar: string[] = []
    for (const c of SIWOO) {
      state = read(state, readSoFar)
      expect(isChapterUnlocked(state, c), `${c.id} 가 안 열린다`).toBe(true)
      readSoFar.push(c.id)
    }
    state = read(state, readSoFar)
    expect(storyProgress(state, 'SIWOO')).toEqual({ read: 6, total: 6 })
    expect(unreadChapters(state).some((c) => c.npcId === 'SIWOO')).toBe(false)
  })

  it('다른 사람 이야기 진행도는 그대로다', () => {
    const state = createDefaultState()
    expect(storyProgress(state, 'MINA').total).toBe(4)
    expect(storyProgress(state, 'HARU').total).toBe(5)
    expect(storyProgress(state, 'LULU').total).toBe(3)
    expect(storyProgress(state, 'NOA').total).toBe(3)
  })
})

describe('시우 이야기 — 언제 알게 되나', () => {
  const REVEAL = /밴드|보컬|무대|공연|가수|노래했|음반|앨범|팬|해체|데뷔/

  it('마지막 장 전에는 과거를 말하지 않는다', () => {
    for (const c of SIWOO.slice(0, 5)) {
      for (const line of c.scene ?? []) {
        expect(REVEAL.test(line.text), `${c.id}: ${line.text}`).toBe(false)
      }
      expect(REVEAL.test(c.title + c.lockedHint), c.id).toBe(false)
    }
  })

  it('마지막 장에서 담담하게 말한다', () => {
    const last = SIWOO[5]
    const said = (last.scene ?? []).map((l) => l.text).join(' ')
    expect(REVEAL.test(said)).toBe(true)
    // 대단한 사람이었다는 얘기는 하지 않는다
    expect(/유명|전설|스타|성공|화려/.test(said)).toBe(false)
  })

  /** 다른 사람 비밀은 시우 이야기에서 건드리지 않는다 */
  it('남의 비밀을 대신 풀지 않는다', () => {
    const all = SIWOO.flatMap((c) => (c.scene ?? []).map((l) => l.text)).join(' ')
    for (const word of ['마법', '원로', '순혈', '혼혈', '이혼', '전 남편', '일러스트', '몇 살']) {
      expect(all.includes(word), word).toBe(false)
    }
  })

  it('리빙신 대사를 그대로 다시 쓰지 않는다', () => {
    // 지문("잠깐 뒤,")은 어디서나 쓰는 무대 지시라 빼고, 사람이 한 말만 본다.
    const said = new Set(
      LIVING_SCENES.flatMap((s) => s.lines.filter((l) => l.kind === 'SAY').map((l) => l.text)),
    )
    for (const c of SIWOO) {
      for (const line of c.scene ?? []) {
        if (line.kind !== 'SAY') continue
        expect(said.has(line.text), line.text).toBe(false)
      }
    }
  })

  it('리빙신을 안 봐도 이야기가 열린다 — 장면 사냥이 안 되게', () => {
    const state = withSiwoo(40, { TRAINING_ZONE: 14, CREATIVE_DISTRICT: 20 })
    expect(state.discovery.seenSceneIds).toEqual([])
    expect(isChapterUnlocked(state, SIWOO[0])).toBe(true)
  })
})

describe('시우 이야기 — 읽고 나면', () => {
  const siwoo = findNpc('SIWOO')!
  const after = (ids: string[]) =>
    eligibleDialogues(siwoo, 40, 'NIGHT', [], 0, ids).filter((d) => d.afterChapterId)

  it('마지막 장을 읽기 전에는 그 말이 후보에도 없다', () => {
    expect(after([])).toHaveLength(0)
    expect(after(['SIWOO_5'])).toHaveLength(0)
  })

  it('읽고 나면 두 줄이 열린다', () => {
    expect(after(['SIWOO_6'])).toHaveLength(2)
  })

  it('안다는 걸 저장하지 않는다 — 읽은 장에서 계산한다', () => {
    const base = createDefaultState()
    expect(knowsSiwooBandPast(base)).toBe(false)
    expect(knowsSiwooBandPast(read(base, ['SIWOO_6']))).toBe(true)
    expect(JSON.stringify(base)).not.toContain('siwooPast')
  })

  it('시우 말고 다른 스물셋은 손대지 않았다', () => {
    for (const id of NPC_IDS) {
      if (id === 'SIWOO') continue
      const npc = findNpc(id)!
      expect(npc.dialogues.some((d) => d.afterChapterId), id).toBe(false)
    }
  })
})

/** 앞의 열다섯 장은 그대로다 */
describe('시우 이야기 — 예전 것을 안 건드린다', () => {
  it('오래된 열쇠 장이 그대로다', () => {
    const key = STORY_CHAPTERS.find((c) => c.id === 'HARU_5')!
    expect(key.npcId).toBe('HARU')
    expect(key.order).toBe(5)
    expect(key.conditions.some((c) => c.kind === 'QUARRY_FIND')).toBe(true)
  })

  it('앞의 열다섯 장은 보상을 그대로 준다', () => {
    const legacy = STORY_CHAPTERS.filter((c) => c.npcId !== 'SIWOO')
    expect(legacy).toHaveLength(15)
    for (const c of legacy) {
      expect(c.scene, c.id).toBeUndefined()
      expect(c.lines.length, c.id).toBeGreaterThan(0)
    }
    expect(legacy.filter((c) => c.rewardFriendship > 0).length).toBe(15)
  })

  it('스물넷 중 이야기가 있는 사람은 다섯이다', () => {
    const withStory = new Set(STORY_CHAPTERS.map((c) => c.npcId))
    expect([...withStory].sort()).toEqual(['HARU', 'LULU', 'MINA', 'NOA', 'SIWOO'])
  })
})

/** 타입만 쓰고 안 쓰면 lint 가 운다 */
export type _ = StoryChapterDef
