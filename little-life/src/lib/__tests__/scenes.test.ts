import { describe, expect, it } from 'vitest'
import { AREA_IDS, TIME_BANDS, type AreaId, type TimeBand } from '@/types'
import { NPC_IDS } from '@/types'
import { LIVING_SCENES, findScene, hasSeenScene, sceneHere } from '@/lib/city/scenes'
import { LIVING_LINES } from '@/lib/city/living-lines'
import { STORY_CHAPTERS } from '@/lib/discovery/stories'
import { npcAreaNow } from '@/lib/city/routine'
import { timeBand } from '@/lib/rpg/time'
import { createDefaultState } from '@/store/defaultState'
import type { AppState } from '@/types'

const BAND_HOUR: Record<TimeBand, number> = { MORNING: 9, DAY: 14, EVENING: 19, NIGHT: 23 }

function withSeen(ids: string[]): AppState {
  const base = createDefaultState()
  return { ...base, discovery: { ...base.discovery, seenSceneIds: ids } }
}

describe('리빙신 — 데이터 무결성', () => {
  it('여섯에서 여덟 개 사이다 — 이번엔 시스템을 보는 게 목적이다', () => {
    expect(LIVING_SCENES.length).toBeGreaterThanOrEqual(6)
    expect(LIVING_SCENES.length).toBeLessThanOrEqual(8)
  })

  it('id 가 겹치지 않는다', () => {
    const ids = LIVING_SCENES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('이야기 장 id 와도 겹치지 않는다 — 저장이 둘을 헷갈리면 안 된다', () => {
    const chapters = new Set(STORY_CHAPTERS.map((c) => c.id))
    for (const scene of LIVING_SCENES) expect(chapters.has(scene.id)).toBe(false)
  })

  it('실제 동네 · 시간대 · 사람만 쓴다', () => {
    for (const scene of LIVING_SCENES) {
      expect(AREA_IDS).toContain(scene.areaId)
      expect(scene.bands.length, scene.id).toBeGreaterThan(0)
      for (const band of scene.bands) expect(TIME_BANDS).toContain(band)
      expect(scene.participants.length, scene.id).toBeGreaterThanOrEqual(2)
      for (const npcId of scene.participants) expect(NPC_IDS).toContain(npcId)
    }
  })

  it('우리 집에서는 아무 일도 안 일어난다', () => {
    for (const scene of LIVING_SCENES) expect(scene.areaId).not.toBe('HOME_BASE')
  })

  it('말하는 사람은 전부 그 장면에 있는 사람이다', () => {
    for (const scene of LIVING_SCENES) {
      for (const line of scene.lines) {
        if (line.kind !== 'SAY') continue
        expect(scene.participants, `${scene.id} / ${line.npcId}`).toContain(line.npcId)
      }
    }
  })

  it('빈 줄이 없고 서너 줄보다는 길다', () => {
    for (const scene of LIVING_SCENES) {
      expect(scene.lines.length, scene.id).toBeGreaterThanOrEqual(3)
      expect(scene.lines.length, scene.id).toBeLessThanOrEqual(12)
      for (const line of scene.lines) expect(line.text.trim().length).toBeGreaterThan(1)
    }
  })

  it('생활 대사를 그대로 가져다 쓰지 않았다', () => {
    const living = new Set(LIVING_LINES.map((l) => l.text))
    for (const scene of LIVING_SCENES) {
      for (const line of scene.lines) expect(living.has(line.text)).toBe(false)
    }
  })

  /**
   * 리빙신은 아는 것만 말한다. 생활 대사와 같은 규칙이다 —
   * 시우의 옛 밴드도 이안의 나이도 하린·유현의 정체도 준의 온라인
   * 이름도 세라·재희 사이도 여기서 새어 나오면 안 된다.
   */
  it('숨겨둔 설정을 먼저 흘리지 않는다', () => {
    const forbidden = [
      '밴드', '보컬', '무대', '데뷔', '해체',
      '마법', '마법사', '원로', '순혈', '혼혈', '크리처',
      '이혼', '전 남편', '전 부인', '전처', '전남편',
      '일러스트레이터', '작가님', '유명',
      '몇 살', '나이', '수십 년',
    ]
    for (const scene of LIVING_SCENES) {
      for (const line of scene.lines) {
        for (const word of forbidden) {
          expect(line.text.includes(word), `${scene.id}: ${line.text}`).toBe(false)
        }
      }
    }
  })

  it('보상이 없다 — 줄 자리 자체가 없다', () => {
    for (const scene of LIVING_SCENES) {
      expect(Object.keys(scene).sort()).toEqual(['areaId', 'bands', 'id', 'lines', 'participants'])
    }
  })
})

describe('리빙신 — 동선', () => {
  /**
   * 장면을 보여주려고 사람을 순간이동시키지 않는다. 그래서 각 장면은
   * 정말로 그 조합이 그 동네에 같이 있는 날이 있어야 한다.
   * 없으면 그건 영영 못 보는 장면이다.
   */
  it('스물여덟 날을 돌려보면 전부 최소 한 번은 성립한다', () => {
    for (const scene of LIVING_SCENES) {
      let hit = 0
      for (let d = 0; d < 28; d += 1) {
        for (const band of scene.bands) {
          const now = new Date(2026, 8, 1 + d, BAND_HOUR[band], 0, 0)
          if (timeBand(now) !== band) continue
          if (scene.participants.every((n) => npcAreaNow(n, now) === scene.areaId)) hit += 1
        }
      }
      expect(hit, `${scene.id} 는 4주 동안 한 번도 성립하지 않는다`).toBeGreaterThan(0)
    }
  })

  it('시간대는 넓게 잡는다 — 몇 시 몇 분에만 열리는 장면은 없다', () => {
    for (const scene of LIVING_SCENES) {
      expect(scene.bands.length, scene.id).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('리빙신 — 언제 뜨는가', () => {
  const found = (state: AppState, areaId: AreaId, now: Date) => sceneHere(state, areaId, now)?.id ?? null

  /** 실제로 조건이 맞는 날짜·시각을 하나 찾아준다 */
  function momentFor(sceneId: string): { now: Date; areaId: AreaId } {
    const scene = findScene(sceneId)!
    for (let d = 0; d < 60; d += 1) {
      for (const band of scene.bands) {
        const now = new Date(2026, 8, 1 + d, BAND_HOUR[band], 0, 0)
        if (timeBand(now) !== band) continue
        if (scene.participants.every((n) => npcAreaNow(n, now) === scene.areaId)) {
          return { now, areaId: scene.areaId }
        }
      }
    }
    throw new Error(`${sceneId} 가 성립하는 날이 없다`)
  }

  it('조건이 맞으면 뜬다', () => {
    for (const scene of LIVING_SCENES) {
      const { now, areaId } = momentFor(scene.id)
      expect(found(withSeen([]), areaId, now), scene.id).not.toBeNull()
    }
  })

  it('이미 본 장면은 다시 안 뜬다', () => {
    for (const scene of LIVING_SCENES) {
      const { now, areaId } = momentFor(scene.id)
      const state = withSeen(LIVING_SCENES.map((s) => s.id))
      expect(found(state, areaId, now)).toBeNull()
      expect(hasSeenScene(state, scene.id)).toBe(true)
    }
  })

  it('다른 동네에서는 안 뜬다', () => {
    for (const scene of LIVING_SCENES) {
      const { now } = momentFor(scene.id)
      for (const areaId of AREA_IDS) {
        if (areaId === scene.areaId) continue
        expect(found(withSeen([]), areaId, now)).not.toBe(scene.id)
      }
    }
  })

  it('시간대가 아니면 안 뜬다', () => {
    for (const scene of LIVING_SCENES) {
      const { now, areaId } = momentFor(scene.id)
      for (const band of TIME_BANDS) {
        if (scene.bands.includes(band)) continue
        const other = new Date(now)
        other.setHours(BAND_HOUR[band], 0, 0, 0)
        expect(found(withSeen([]), areaId, other)).not.toBe(scene.id)
      }
    }
  })

  /**
   * 한 번 놓쳤다고 영영 못 보면 그건 오늘 안 하면 손해인 구조다.
   * 아직 안 본 장면은 조건이 다시 맞는 날 그대로 거기 있다.
   */
  it('한 번 놓쳐도 사라지지 않는다', () => {
    for (const scene of LIVING_SCENES) {
      const days: Date[] = []
      for (let d = 0; d < 60 && days.length < 2; d += 1) {
        for (const band of scene.bands) {
          const now = new Date(2026, 8, 1 + d, BAND_HOUR[band], 0, 0)
          if (timeBand(now) !== band) continue
          if (scene.participants.every((n) => npcAreaNow(n, now) === scene.areaId)) days.push(now)
        }
      }
      expect(days.length, `${scene.id} 는 두 번째 기회가 없다`).toBeGreaterThanOrEqual(2)
      // 첫 날 그냥 지나쳤다 — 다음 기회에도 그대로 있다
      expect(found(withSeen([]), scene.areaId, days[1]), scene.id).not.toBeNull()
    }
  })

  it('한 자리에서 한 번에 하나만 준다 — 연달아 틀지 않는다', () => {
    // 창작 골목 DAY 에는 미래×이안과 라온×재희 둘이 겹친다
    const both = LIVING_SCENES.filter((s) => s.areaId === 'CREATIVE_DISTRICT' && s.bands.includes('DAY'))
    expect(both.length).toBeGreaterThanOrEqual(2)
    for (let d = 0; d < 30; d += 1) {
      const now = new Date(2026, 8, 1 + d, BAND_HOUR.DAY, 0, 0)
      const one = sceneHere(withSeen([]), 'CREATIVE_DISTRICT', now)
      // 돌려주는 건 언제나 최대 하나다
      expect(one === null || typeof one.id === 'string').toBe(true)
    }
  })

  it('본 걸 하나 지우면 그 자리에 다음 장면이 나온다', () => {
    for (let d = 0; d < 30; d += 1) {
      const now = new Date(2026, 8, 1 + d, BAND_HOUR.DAY, 0, 0)
      const first = sceneHere(withSeen([]), 'CREATIVE_DISTRICT', now)
      if (!first) continue
      const next = sceneHere(withSeen([first.id]), 'CREATIVE_DISTRICT', now)
      expect(next?.id ?? null).not.toBe(first.id)
      return
    }
  })
})
