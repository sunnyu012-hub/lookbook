import { describe, expect, it } from 'vitest'
import {
  CITY_MAP_REGIONS,
  MAP_SAFE_AREA_PCT,
  NPC_CHIPS_VISIBLE,
  areasWithoutRegion,
  cityMapViews,
  clampAnchor,
  isRegionVisible,
  type CityMapRegionDef,
  type PctPoint,
} from '@/lib/city/map'
import type { AreaId } from '@/types'
import { npcsHere } from '@/lib/city/routine'
import { AREAS } from '@/lib/rpg/content'
import { createDefaultState } from '@/store/defaultState'

/** 2026-08-24 는 월요일 */
const MON = '2026-08-24'

function at(hour: number): Date {
  return new Date(`${MON}T${`${hour}`.padStart(2, '0')}:00:00`)
}

function base() {
  return createDefaultState()
}

function withQuarry() {
  const state = base()
  return { ...state, quarry: { ...state.quarry, unlockedAt: `${MON}T09:00:00.000Z` } }
}

function views(state = base(), now = at(10), currentAreaId: AreaId = 'HOME_BASE') {
  return cityMapViews({ state, events: [], currentAreaId, now })
}

/**
 * 그림 위에서 실제로 어디가 눌리는지.
 *
 * 화면에서는 나중에 그린 것이 위에 깔린다. 목록 순서가 곧 우선순위라
 * 여기서도 **마지막에 맞는 것**을 고른다 — 화면과 다른 규칙으로 재면
 * 이 테스트는 통과하는데 손가락은 다른 데를 누르게 된다.
 */
function regionAt(point: PctPoint): CityMapRegionDef | null {
  let found: CityMapRegionDef | null = null
  for (const def of CITY_MAP_REGIONS) {
    const { x, y, w, h } = def.hitBoxPct
    if (point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h) found = def
  }
  return found
}

function center(def: CityMapRegionDef): PctPoint {
  return { x: def.hitBoxPct.x + def.hitBoxPct.w / 2, y: def.hitBoxPct.y + def.hitBoxPct.h / 2 }
}

describe('A 자리표', () => {
  it('A1 동네가 하나도 빠지지 않았다', () => {
    expect(areasWithoutRegion()).toEqual([])
  })

  it('A2 같은 자리를 두 번 적지 않았다', () => {
    const ids = CITY_MAP_REGIONS.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('A3 모든 상자와 자리가 그림 안에 있다', () => {
    for (const def of CITY_MAP_REGIONS) {
      const { x, y, w, h } = def.hitBoxPct
      expect(x, def.id).toBeGreaterThanOrEqual(0)
      expect(y, def.id).toBeGreaterThanOrEqual(0)
      expect(x + w, def.id).toBeLessThanOrEqual(1)
      expect(y + h, def.id).toBeLessThanOrEqual(1)

      for (const anchor of [def.labelAnchorPct, def.statusAnchorPct, def.npcAnchorPct]) {
        if (!anchor) continue
        expect(anchor.x, def.id).toBeGreaterThanOrEqual(0)
        expect(anchor.x, def.id).toBeLessThanOrEqual(1)
        expect(anchor.y, def.id).toBeGreaterThanOrEqual(0)
        expect(anchor.y, def.id).toBeLessThanOrEqual(1)
      }
    }
  })

  it('A4 상자 한가운데를 누르면 자기 동네가 열린다', () => {
    for (const def of CITY_MAP_REGIONS) {
      expect(regionAt(center(def))?.id, def.id).toBe(def.id)
    }
  })

  it('A5 이름·상태·얼굴 자리도 자기 상자가 받는다', () => {
    for (const def of CITY_MAP_REGIONS) {
      const anchors = [def.labelAnchorPct, def.statusAnchorPct, def.npcAnchorPct].filter(
        (a): a is PctPoint => a !== null,
      )
      for (const anchor of anchors) {
        expect(regionAt(anchor)?.id, `${def.id} ${anchor.x},${anchor.y}`).toBe(def.id)
      }
    }
  })

  it('A6 가장자리 밖으로 나간 자리는 안으로 당겨진다', () => {
    const pulled = clampAnchor({ x: -0.5, y: 1.4 })
    expect(pulled.x).toBeCloseTo(MAP_SAFE_AREA_PCT.left)
    expect(pulled.y).toBeCloseTo(1 - MAP_SAFE_AREA_PCT.bottom)
    // 안에 있는 자리는 건드리지 않는다
    expect(clampAnchor({ x: 0.5, y: 0.5 })).toEqual({ x: 0.5, y: 0.5 })
  })
})

describe('B 사람', () => {
  it('B1 지도에 뜨는 사람은 동선 계산과 같다', () => {
    const now = at(10)
    for (const view of views(base(), now)) {
      if (!view.area) continue
      const here = npcsHere(view.area.id, now)
      expect(view.npcs.length + view.overflow, view.area.id).toBe(here.length)
      expect(view.npcs.map((n) => n.id)).toEqual(
        here.slice(0, NPC_CHIPS_VISIBLE).map((n) => n.id),
      )
    }
  })

  it('B2 한 자리에 얼굴은 셋까지, 나머지는 +N 으로 접힌다', () => {
    for (const hour of [7, 10, 14, 19, 22, 2]) {
      for (const view of views(base(), at(hour))) {
        expect(view.npcs.length, `${view.label} ${hour}시`).toBeLessThanOrEqual(NPC_CHIPS_VISIBLE)
        expect(view.overflow).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('B3 낮에 안 보이는 사람은 지도에도 없다', () => {
    const day = views(base(), at(14))
    const seenByDay = day.flatMap((v) => v.npcs.map((n) => n.id))
    expect(seenByDay).not.toContain('NOA')

    // 밤이 되면 밤거리에 나온다
    const night = views(base(), at(23)).find((v) => v.area?.id === 'NIGHT_TOWN')
    expect(night?.npcs.map((n) => n.id)).toContain('NOA')
  })

  it('B4 사람이 안 오는 자리에는 얼굴 자리가 없다', () => {
    const quarry = CITY_MAP_REGIONS.find((r) => r.id === 'OLD_QUARRY')
    expect(quarry?.npcAnchorPct).toBeNull()
  })
})

describe('C 상태 한 줄', () => {
  it('C1 지금 있는 동네는 "지금 여기"', () => {
    const home = views(base(), at(10), 'HOME_BASE').find((v) => v.area?.id === 'HOME_BASE')
    expect(home?.statusLine).toBe('지금 여기')
    expect(home?.tone).toBe('CURRENT')
  })

  it('C1-2 "지금 여기" 는 딱 한 곳에만 뜬다 — 내가 있는 동네', () => {
    for (const area of AREAS) {
      const all = views(base(), at(10), area.id)
      const marked = all.filter((v) => v.current)
      expect(marked.map((v) => v.def.id), area.id).toEqual([area.id])
      expect(marked[0].statusLine).toBe('지금 여기')
      expect(marked[0].tone).toBe('CURRENT')

      // 나머지는 자기 상태를 그대로 말한다 — 우리 집에도 안 뜬다
      for (const other of all.filter((v) => !v.current)) {
        expect(other.statusLine, `${area.id} → ${other.label}`).not.toBe('지금 여기')
        expect(other.tone).not.toBe('CURRENT')
      }
    }
  })

  it('C2 밤에만 여는 동네는 낮에 "밤에 열려"', () => {
    const night = views(base(), at(14)).find((v) => v.area?.id === 'NIGHT_TOWN')
    expect(night?.statusLine).toBe('밤에 열려')
    expect(night?.tone).toBe('CLOSED')

    const open = views(base(), at(23)).find((v) => v.area?.id === 'NIGHT_TOWN')
    expect(open?.tone).not.toBe('CLOSED')
  })

  it('C3 가게가 있는 동네는 영업 상태를 적는다', () => {
    // 하루의 카페는 7시에 열고 20시에 닫는다
    const openNow = views(base(), at(10)).find((v) => v.area?.id === 'CAFE_STREET')
    expect(openNow?.statusLine).toBe('영업 중')
    expect(openNow?.tone).toBe('OPEN')

    const early = views(base(), at(5)).find((v) => v.area?.id === 'CAFE_STREET')
    expect(early?.statusLine).toBe('아직 안 열었어')

    const late = views(base(), at(21)).find((v) => v.area?.id === 'CAFE_STREET')
    expect(late?.statusLine).toBe('영업 종료')
  })

  it('C3-2 우리 집은 떠나 있으면 "비어 있어"', () => {
    const away = views(base(), at(10), 'CAFE_STREET').find((v) => v.area?.id === 'HOME_BASE')
    expect(away?.statusLine).toBe('비어 있어')

    // 돌아와 있으면 그 자리 얘기가 먼저다
    const home = views(base(), at(10), 'HOME_BASE').find((v) => v.area?.id === 'HOME_BASE')
    expect(home?.statusLine).toBe('지금 여기')
  })

  it('C4 한 줄은 짧게 — 지도에서 두 줄이 되지 않는다', () => {
    for (const hour of [7, 10, 14, 19, 22, 2]) {
      for (const view of views(base(), at(hour))) {
        expect(view.statusLine.length, view.label).toBeLessThanOrEqual(12)
      }
    }
  })
})

describe('D 채석장', () => {
  it('D1 찾기 전에는 지도에 없다', () => {
    const quarry = CITY_MAP_REGIONS.find((r) => r.id === 'OLD_QUARRY')!
    expect(isRegionVisible(quarry, base())).toBe(false)
    expect(views(base()).some((v) => v.def.id === 'OLD_QUARRY')).toBe(false)
  })

  it('D2 길이 열리면 공원 옆에 뜬다', () => {
    const found = views(withQuarry()).find((v) => v.def.id === 'OLD_QUARRY')
    expect(found).toBeDefined()
    // 눌러도 채석장이 바로 열리지 않는다 — 공원 시트를 거쳐 간다
    expect(found?.def.targetAreaId).toBe('GREEN_PARK')
    expect(found?.def.directTap).toBe(false)
  })
})

describe('E 지도는 아무것도 저장하지 않는다', () => {
  it('E1 같은 저장·같은 시각이면 몇 번을 물어도 같다', () => {
    const state = withQuarry()
    const now = at(19)
    const first = JSON.stringify(
      cityMapViews({ state, events: [], currentAreaId: 'CAFE_STREET', now }).map((v) => ({
        id: v.def.id,
        status: v.statusLine,
        npcs: v.npcs.map((n) => n.id),
      })),
    )
    for (let i = 0; i < 5; i += 1) {
      const again = JSON.stringify(
        cityMapViews({ state, events: [], currentAreaId: 'CAFE_STREET', now }).map((v) => ({
          id: v.def.id,
          status: v.statusLine,
          npcs: v.npcs.map((n) => n.id),
        })),
      )
      expect(again).toBe(first)
    }
  })

  it('E2 지도를 그려도 저장이 그대로다', () => {
    const state = base()
    const before = JSON.stringify(state)
    views(state, at(11))
    expect(JSON.stringify(state)).toBe(before)
  })

  it('E3 동네 수만큼은 늘 그린다', () => {
    expect(views().filter((v) => v.area !== null)).toHaveLength(AREAS.length)
  })
})
