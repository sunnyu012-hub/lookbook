import { describe, expect, it } from 'vitest'
import { NPCS } from '@/lib/city/npcs'
import {
  allNpcSpots,
  awayLine,
  findRoutine,
  isWeekendDay,
  npcAreaNow,
  npcSpot,
  npcSpotNow,
  npcsAway,
  npcsHere,
} from '@/lib/city/routine'
import { AREAS, findArea } from '@/lib/rpg/content'
import { SHOPS, findShop, isShopOpen, shopClosedLine, shopOpeningLabel, shopStatus } from '@/lib/city/shops'
import { areaActions, areaHighlights } from '@/lib/city/hub'
import { createDefaultState } from '@/store/defaultState'
import { TIME_BANDS } from '@/types'
import type { TimeBand } from '@/types'

const BANDS: TimeBand[] = [...TIME_BANDS]

/** 2026-08-24 는 월요일, 2026-08-22 는 토요일 */
const MON = '2026-08-24'
const SAT = '2026-08-22'

function at(day: string, hour: number): Date {
  return new Date(`${day}T${`${hour}`.padStart(2, '0')}:00:00`)
}

describe('하루 동선 — 정해진 자리', () => {
  it('같은 날 · 같은 시간대 · 같은 사람이면 몇 번을 물어도 같은 자리다', () => {
    for (const npc of NPCS) {
      for (const band of BANDS) {
        const first = npcSpot(npc.id, MON, band, false)
        for (let i = 0; i < 20; i += 1) {
          expect(npcSpot(npc.id, MON, band, false)).toBe(first)
        }
      }
    }
  })

  it('같은 시간대 안에서 시각이 달라져도 자리가 흔들리지 않는다', () => {
    // 낮은 12시부터 18시 전까지. 그 사이에는 몇 시에 물어도 같아야 한다.
    for (const npc of NPCS) {
      const noon = npcSpotNow(npc.id, at(MON, 12))
      for (const hour of [13, 14, 15, 16, 17]) {
        expect(npcSpotNow(npc.id, at(MON, hour))).toBe(noon)
      }
    }
  })

  it('시간대가 넘어가면 다시 뽑는다 — 여섯 중 최소 한 명은 움직인다', () => {
    const morning = allNpcSpots(at(MON, 9)).map((s) => s.spot)
    const evening = allNpcSpots(at(MON, 19)).map((s) => s.spot)
    expect(morning).not.toEqual(evening)
  })

  it('날이 바뀌면 씨앗도 바뀐다 — 한 주 동안 같은 자리에만 있지 않는다', () => {
    const seen = new Set<string>()
    for (let d = 22; d <= 28; d += 1) {
      seen.add(npcSpot('HARU', `2026-08-${d}`, 'NIGHT', false))
    }
    expect(seen.size).toBeGreaterThan(1)
  })
})

describe('하루 동선 — 놓치는 게 없다', () => {
  it('노아를 뺀 다섯은 어느 시간대에도 도시 어딘가에 있다', () => {
    for (const npc of NPCS) {
      if (npc.nightOnly) continue
      for (const band of BANDS) {
        for (const weekend of [false, true]) {
          expect(npcSpot(npc.id, MON, band, weekend)).not.toBe('OFFSCREEN')
          expect(npcSpot(npc.id, SAT, band, weekend)).not.toBe('OFFSCREEN')
        }
      }
    }
  })

  it('노아는 예전처럼 밤에만 보인다', () => {
    expect(npcSpotNow('NOA', at(MON, 22))).toBe('NIGHT_TOWN')
    for (const hour of [7, 13, 19]) {
      expect(npcSpotNow('NOA', at(MON, hour))).toBe('OFFSCREEN')
    }
    expect(awayLine(NPCS.find((n) => n.id === 'NOA')!, at(MON, 13))).toBe('밤에만 보여')
  })

  it('우리 집에는 아무도 오지 않는다', () => {
    for (let d = 1; d <= 28; d += 1) {
      const day = `2026-08-${`${d}`.padStart(2, '0')}`
      for (const band of BANDS) {
        for (const npc of NPCS) {
          expect(npcSpot(npc.id, day, band, false)).not.toBe('HOME_BASE')
          expect(npcSpot(npc.id, day, band, true)).not.toBe('HOME_BASE')
        }
      }
    }
    expect(npcsHere('HOME_BASE', at(MON, 13))).toEqual([])
  })

  it('한 달 동안 훑어도 아무도 도시 밖으로 사라지지 않는다', () => {
    for (let d = 1; d <= 28; d += 1) {
      const day = `2026-08-${`${d}`.padStart(2, '0')}`
      for (const band of BANDS) {
        for (const npc of NPCS) {
          if (npc.nightOnly) continue
          const spot = npcSpot(npc.id, day, band, false)
          expect(AREAS.some((a) => a.id === spot)).toBe(true)
        }
      }
    }
  })
})

describe('하루 동선 — 주말', () => {
  it('주말 판정은 토·일이다', () => {
    expect(isWeekendDay(at(SAT, 10))).toBe(true)
    expect(isWeekendDay(at('2026-08-23', 10))).toBe(true)
    expect(isWeekendDay(at(MON, 10))).toBe(false)
  })

  it('주말 아침의 하루는 반드시 공원에 있다', () => {
    expect(npcSpot('HARU', SAT, 'MORNING', true)).toBe('GREEN_PARK')
    expect(npcSpot('HARU', '2026-08-23', 'MORNING', true)).toBe('GREEN_PARK')
  })

  it('주말 표가 없는 시간대는 평일 표를 그대로 쓴다', () => {
    // 루루는 주말 표가 아예 없다.
    expect(findRoutine('LULU')?.weekend).toBeUndefined()
    expect(npcSpot('LULU', SAT, 'DAY', true)).toBe(npcSpot('LULU', SAT, 'DAY', false))
  })
})

describe('한 동네에 여럿', () => {
  it('같은 동네에 둘 이상 있을 수 있다', () => {
    let maxHere = 0
    for (let d = 1; d <= 28; d += 1) {
      const day = `2026-08-${`${d}`.padStart(2, '0')}`
      for (const hour of [9, 13, 19, 22]) {
        for (const area of AREAS) {
          maxHere = Math.max(maxHere, npcsHere(area.id, at(day, hour)).length)
        }
      }
    }
    expect(maxHere).toBeGreaterThanOrEqual(2)
  })

  it('자리를 비운 사람은 원래 동네에서만 흐리게 남는다', () => {
    const now = at(MON, 9)
    // 준은 아침에 창작 골목을 비울 때가 있다.
    for (const area of AREAS) {
      for (const npc of npcsAway(area.id, now)) {
        expect(npc.areaId).toBe(area.id)
        expect(npcSpotNow(npc.id, now)).not.toBe(area.id)
      }
    }
  })

  it('한 사람이 있는 곳과 비운 곳에 동시에 잡히지 않는다', () => {
    const now = at(MON, 19)
    for (const area of AREAS) {
      const here = npcsHere(area.id, now).map((n) => n.id)
      const away = npcsAway(area.id, now).map((n) => n.id)
      expect(here.filter((id) => away.includes(id))).toEqual([])
    }
  })

  it('도시에 있는 사람은 어느 한 동네에서 정확히 한 번만 잡힌다', () => {
    const now = at(MON, 13)
    for (const npc of NPCS) {
      const count = AREAS.filter((a) => npcsHere(a.id, now).some((n) => n.id === npc.id)).length
      expect(count).toBe(npcSpotNow(npc.id, now) === 'OFFSCREEN' ? 0 : 1)
    }
  })

  it('npcAreaNow 는 보이지 않을 때 null 이다', () => {
    expect(npcAreaNow('NOA', at(MON, 13))).toBeNull()
    expect(npcAreaNow('NOA', at(MON, 22))).toBe('NIGHT_TOWN')
  })
})

describe('영업시간', () => {
  it('미나의 카페는 아침 7시에 열고 저녁 8시에 닫는다', () => {
    const cafe = findShop('MINA_CAFE')!
    expect(isShopOpen(cafe, at(MON, 6))).toBe(false)
    expect(isShopOpen(cafe, at(MON, 7))).toBe(true)
    expect(isShopOpen(cafe, at(MON, 19))).toBe(true)
    expect(isShopOpen(cafe, at(MON, 20))).toBe(false)
    expect(isShopOpen(cafe, at(MON, 23))).toBe(false)
  })

  it('영업 전과 영업 종료를 나눠 말한다', () => {
    const cafe = findShop('MINA_CAFE')!
    expect(shopStatus(cafe, at(MON, 6))).toBe('BEFORE')
    expect(shopStatus(cafe, at(MON, 13))).toBe('OPEN')
    expect(shopStatus(cafe, at(MON, 22))).toBe('AFTER')
    expect(shopClosedLine(cafe, at(MON, 6))).toBe('아직 문을 열지 않은 것 같다')
    expect(shopClosedLine(cafe, at(MON, 22))).toBe('오늘 영업은 끝난 것 같다')
  })

  it('밤 가게는 예전 그대로 밤에만 연다', () => {
    const market = findShop('NIGHT_MARKET')!
    expect(isShopOpen(market, at(MON, 22))).toBe(true)
    expect(isShopOpen(market, at(MON, 13))).toBe(false)
    // 낮의 밤 가게는 "끝난" 게 아니라 "아직" 이다.
    expect(shopStatus(market, at(MON, 13))).toBe('BEFORE')
  })

  it('언제 여는지 한 줄로 말할 수 있다', () => {
    expect(shopOpeningLabel(findShop('MINA_CAFE')!)).toBe('아침 7시부터 저녁 8시까지')
    expect(shopOpeningLabel(findShop('JUNE_CLOSET')!)).toBe('낮 12시부터 밤 9시까지')
    expect(shopOpeningLabel(findShop('NIGHT_MARKET')!)).toBe('밤 9시부터 새벽 5시까지')
  })

  it('가게가 닫혀도 주인은 자기 생활을 한다', () => {
    // 저녁 8시 — 카페는 닫혔지만 미나는 도시 어딘가에 있다.
    const now = at(MON, 20)
    expect(isShopOpen(findShop('MINA_CAFE')!, now)).toBe(false)
    expect(npcSpotNow('MINA', now)).not.toBe('OFFSCREEN')
  })

  it('네 가게 전부 하루 중 언젠가는 열려 있다', () => {
    for (const shop of SHOPS) {
      const open = [...Array(24).keys()].some((h) => isShopOpen(shop, at(MON, h)))
      expect(open).toBe(true)
    }
  })
})

describe('지도와 동네 화면', () => {
  const state = createDefaultState()
  const npcs = {}

  it('동네 카드에는 지금 여기 있는 사람만 적힌다', () => {
    const now = at(MON, 13)
    for (const area of AREAS) {
      const names = areaHighlights(area, 3, now)
      const here = npcsHere(area.id, now).map((n) => n.name)
      for (const name of here) expect(names).toContain(name)
      // 자리를 비운 사람 이름은 카드에 안 뜬다
      for (const npc of npcsAway(area.id, now)) expect(names).not.toContain(npc.name)
    }
  })

  it('동네 안에서는 있는 사람은 누를 수 있고 비운 사람은 흐리다', () => {
    const now = at(MON, 9)
    for (const area of AREAS) {
      const actions = areaActions({ area, state, npcs, now }).filter((a) => a.kind === 'NPC')
      for (const action of actions) {
        const spot = npcSpotNow(action.npc!.id, now)
        expect(action.disabled).toBe(spot !== area.id)
      }
    }
  })

  it('자리를 비운 사람 옆에는 나무라지 않는 한 줄이 붙는다', () => {
    const now = at(MON, 9)
    for (const area of AREAS) {
      for (const action of areaActions({ area, state, npcs, now })) {
        if (action.kind !== 'NPC' || !action.disabled) continue
        const spot = npcSpotNow(action.npc!.id, now)
        // 어디 있는지까지 적힌다. 노아만 예외 — 낮에는 도시에 없다.
        expect(action.subtitle).toBe(
          spot === 'OFFSCREEN' ? '밤에만 보여' : `${findArea(spot).name}에 있는 것 같다`,
        )
      }
    }
  })

  it('닫힌 가게 칸은 사라지지 않고 언제 오면 되는지만 바뀐다', () => {
    const area = AREAS.find((a) => a.id === 'CAFE_STREET')!
    const closed = areaActions({ area, state, npcs, now: at(MON, 23) }).find(
      (a) => a.kind === 'SHOP',
    )
    expect(closed).toBeDefined()
    expect(closed!.disabled).toBe(true)
    expect(closed!.subtitle).toBe('오늘 영업은 끝난 것 같다')

    const open = areaActions({ area, state, npcs, now: at(MON, 13) }).find((a) => a.kind === 'SHOP')
    expect(open!.disabled).toBe(false)
    expect(open!.subtitle).toBe('구경하기')
  })

  it('저장에는 아무것도 안 늘었다', () => {
    // 동선도 영업시간도 전부 계산이다. 도시 상태를 적어두는 자리가 없다.
    const saved = JSON.stringify(state)
    for (const key of ['npcLocation', 'currentNpcLocation', 'isShopOpen', 'isWeekend', 'timeBand']) {
      expect(saved).not.toContain(key)
    }
    expect(state.version).toBe(17)
  })
})
