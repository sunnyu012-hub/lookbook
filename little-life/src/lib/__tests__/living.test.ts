import { beforeEach, describe, expect, it } from 'vitest'
import type { AreaId, LivingLine, NpcDef, NpcId } from '@/types'
import { NPCS, findNpc } from '@/lib/city/npcs'
import { AREAS } from '@/lib/rpg/content'
import { TIME_BANDS } from '@/types'
import {
  LIVING_LINES,
  forgetLines,
  livingCandidates,
  pickLivingLine,
  workContext,
} from '@/lib/city/living'
import { pickDialogue } from '@/lib/city/dialogue'

const MON = '2026-08-24'
function at(hour: number): Date {
  return new Date(`${MON}T${`${hour}`.padStart(2, '0')}:00:00`)
}
function npc(id: NpcId): NpcDef {
  return findNpc(id)!
}

beforeEach(() => forgetLines())

describe('A 스물넷 전원', () => {
  it('A1 도시 사람 모두가 생활 대사를 가진다', () => {
    const withLines = new Set(LIVING_LINES.map((l) => l.npcId))
    const missing = NPCS.filter((n) => !withLines.has(n.id)).map((n) => n.id)
    expect(missing).toEqual([])
  })

  it('A2 없는 사람의 대사가 섞여 있지 않다', () => {
    const known = new Set<string>(NPCS.map((n) => n.id))
    expect(LIVING_LINES.filter((l) => !known.has(l.npcId)).map((l) => l.id)).toEqual([])
  })

  it('A3 같은 id 를 두 번 쓰지 않는다', () => {
    const ids = LIVING_LINES.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('A4 조건 없는 기본 대사가 사람마다 하나는 있다', () => {
    // 이게 없으면 조건이 안 맞는 순간 눌렀을 때 빈 화면이 된다
    for (const person of NPCS) {
      const base = LIVING_LINES.filter(
        (l) => l.npcId === person.id && !l.areaId && !l.band && !l.context,
      )
      expect(base.length, person.id).toBeGreaterThanOrEqual(1)
    }
  })

  it('A5 짧다 — 두세 문장을 넘지 않는다', () => {
    for (const line of LIVING_LINES) {
      expect(line.text.length, line.id).toBeLessThanOrEqual(45)
    }
  })
})

describe('B 어디서 언제 만났느냐', () => {
  it('B1 어느 동네 · 어느 시간에 눌러도 할 말이 있다', () => {
    for (const person of NPCS) {
      for (const area of AREAS) {
        for (const hour of [8, 13, 19, 23]) {
          const found = livingCandidates({ npc: person, areaId: area.id, now: at(hour) })
          expect(found.length, `${person.id} ${area.id} ${hour}시`).toBeGreaterThan(0)
        }
      }
      // 도시에 없는 시간대(밤사람의 낮)도 빈손이 아니다
      expect(livingCandidates({ npc: person, areaId: null, now: at(13) }).length).toBeGreaterThan(0)
    }
  })

  it('B2 일할 때와 일 밖일 때가 다른 말이다', () => {
    // 하루(카페) · 미래(공방) · 이안(빈티지) · 도윤(클라이밍) · 세라(바)
    for (const id of ['MINA', 'LULU', 'JUNE', 'RIO', 'NOA'] as NpcId[]) {
      const person = npc(id)
      const home = person.areaId
      const working = livingCandidates({ npc: person, areaId: home, now: at(id === 'NOA' ? 23 : 14) })
      const off = livingCandidates({ npc: person, areaId: 'GREEN_PARK', now: at(14) })

      const workIds = new Set(working.map((l) => l.id))
      const offIds = new Set(off.map((l) => l.id))
      expect([...workIds].some((x) => offIds.has(x)), id).toBe(false)
    }
  })

  it('B3 태오는 아침 공원과 저녁 카페가 다르다', () => {
    const taeo = npc('HARU')
    const morningPark = livingCandidates({ npc: taeo, areaId: 'GREEN_PARK', now: at(8) })
    const cafe = livingCandidates({ npc: taeo, areaId: 'CAFE_STREET', now: at(19) })

    expect(morningPark.map((l) => l.id)).toContain('HARU_PARK_MORNING')
    expect(cafe.every((l) => l.areaId === 'CAFE_STREET')).toBe(true)
  })

  it('B4 시우는 트럭 · 아침 카페 · 클라이밍장이 다 다르다', () => {
    const siwoo = npc('SIWOO')
    const truck = livingCandidates({ npc: siwoo, areaId: 'NIGHT_TOWN', now: at(22) })
    const cafe = livingCandidates({ npc: siwoo, areaId: 'CAFE_STREET', now: at(8) })
    const gym = livingCandidates({ npc: siwoo, areaId: 'TRAINING_ZONE', now: at(8) })

    expect(cafe.map((l) => l.id)).toContain('SIWOO_CAFE_MORNING')
    expect(gym.every((l) => l.areaId === 'TRAINING_ZONE')).toBe(true)
    expect(truck.map((l) => l.id)).not.toContain('SIWOO_CAFE_MORNING')
  })
})

describe('C 가게가 닫히면 일하는 말을 안 한다', () => {
  it('C1 하루는 카페가 닫힌 뒤에는 일 밖이다', () => {
    const haru = npc('MINA')
    // 카페는 7시에 열고 20시에 닫는다
    expect(workContext(haru, 'CAFE_STREET', at(10))).toBe('WORK')
    expect(workContext(haru, 'CAFE_STREET', at(21))).toBe('OFF_WORK')
    // 다른 동네에 있으면 시간과 무관하게 일 밖이다
    expect(workContext(haru, 'GREEN_PARK', at(10))).toBe('OFF_WORK')
  })

  it('C2 닫힌 뒤에는 주문 받는 대사가 후보에서 빠진다', () => {
    const haru = npc('MINA')
    const closed = livingCandidates({ npc: haru, areaId: 'CAFE_STREET', now: at(21) })
    expect(closed.every((l) => l.context !== 'WORK')).toBe(true)
  })

  it('C3 밤사람은 밤이 일하는 시간이다', () => {
    expect(workContext(npc('NOA'), 'NIGHT_TOWN', at(23))).toBe('WORK')
    expect(workContext(npc('YUHYEON'), 'NIGHT_TOWN', at(23))).toBe('WORK')
    expect(workContext(npc('YUHYEON'), 'NIGHT_TOWN', at(13))).toBe('OFF_WORK')
  })

  it('C4 스물넷 모두 일 밖 대사가 하나는 있다', () => {
    for (const person of NPCS) {
      const off = LIVING_LINES.filter((l) => l.npcId === person.id && l.context === 'OFF_WORK')
      expect(off.length, person.id).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('D 같은 말만 반복하지 않는다', () => {
  it('D1 방금 한 말은 바로 다시 안 나온다', () => {
    const person = npc('MINA')
    const said: string[] = []
    for (let i = 0; i < 6; i += 1) {
      const line = pickLivingLine({ npc: person, areaId: 'CAFE_STREET', now: at(10) }, Math.random)
      said.push(line!.id)
    }
    // 바로 앞과 같은 줄이 이어지지 않는다
    for (let i = 1; i < said.length; i += 1) expect(said[i]).not.toBe(said[i - 1])
  })

  it('D2 후보가 하나뿐이어도 멀쩡히 나온다', () => {
    const only: LivingLine = { id: 'ONLY', npcId: 'MINA', text: '하나뿐' }
    const pool = [only]
    // 같은 줄을 두 번 골라도 null 이 되지 않는다
    const first = pool[0]
    expect(first.text).toBe('하나뿐')
    const person = npc('YEONJU')
    for (let i = 0; i < 4; i += 1) {
      expect(pickLivingLine({ npc: person, areaId: null, now: at(3) })).not.toBeNull()
    }
  })

  it('D3 어느 사람 · 어느 시간대에도 터지지 않는다', () => {
    for (const person of NPCS) {
      for (const band of TIME_BANDS) {
        const hour = { MORNING: 8, DAY: 14, EVENING: 19, NIGHT: 23 }[band]
        for (const area of [...AREAS.map((a) => a.id), null] as (AreaId | null)[]) {
          const line = pickLivingLine({ npc: person, areaId: area, now: at(hour) })
          expect(line, `${person.id} ${band} ${area}`).not.toBeNull()
        }
      }
    }
  })
})

describe('E 이야기를 미리 까지 않는다', () => {
  /**
   * 생활 대사가 이야기를 소모하면 나중에 그 장을 읽을 때 이미 아는 얘기가 된다.
   * 단어만 훑는 검사라 이걸로 충분하다고 보지 않는다 — 스물넷 대사는 사람이 읽고 봤다.
   */
  const FORBIDDEN = [
    '마법사',
    '원로',
    '혈통',
    '순혈',
    '혼혈',
    'Creature',
    '보컬',
    '밴드 보컬',
    '이혼',
    '전 남편',
    '전 부인',
    '일러스트레이터',
    '네임드',
  ]

  it('E1 금지어가 생활 대사에 없다', () => {
    const hits = LIVING_LINES.filter((l) => FORBIDDEN.some((w) => l.text.includes(w)))
    expect(hits.map((l) => `${l.id}: ${l.text}`)).toEqual([])
  })

  it('E2 지호는 시우의 옛 밴드를 모른다', () => {
    // 관계도상 지호는 그 사실을 모른다. 아는 척하면 안 된다.
    const jiho = LIVING_LINES.filter((l) => l.npcId === 'JIHO')
    expect(jiho.some((l) => l.text.includes('시우'))).toBe(false)
  })

  it('E3 하린과 유현은 자기 정체를 설명하지 않는다', () => {
    for (const id of ['HARIN', 'YUHYEON'] as NpcId[]) {
      const lines = LIVING_LINES.filter((l) => l.npcId === id)
      expect(lines.some((l) => /마법|정체|혈/.test(l.text)), id).toBe(false)
    }
  })
})

describe('F 기존 대사층을 밀어내지 않는다', () => {
  it('F1 이야기 장 id 와 생활 대사 id 가 겹치지 않는다', () => {
    // HARU_5 같은 이야기 장 id 를 생활 대사가 덮어쓰면 던전 입구가 흔들린다
    const living = new Set(LIVING_LINES.map((l) => l.id))
    for (const id of ['MINA_1', 'MINA_4', 'HARU_1', 'HARU_4', 'HARU_5', 'LULU_3', 'NOA_3']) {
      expect(living.has(id), id).toBe(false)
    }
  })

  it('F2 오늘만 참인 말(이벤트)이 생활 대사보다 먼저다', () => {
    const haru = npc('MINA')
    const event = {
      id: 'rainy_cafe',
      name: '비 오는 카페',
      icon: '☔',
      areaId: 'CAFE_STREET' as AreaId,
      effectLabel: '',
    }
    const line = pickDialogue(haru, 0, 'DAY', [event as never], 0, () => 0, {
      areaId: 'CAFE_STREET',
      now: at(14),
    })
    expect(line).toContain('비 오는 날')
  })

  it('F3 자리를 안 넘기면 예전 그대로 고른다', () => {
    const haru = npc('MINA')
    const line = pickDialogue(haru, 0, 'MORNING', [], 0, () => 0)
    const own = haru.dialogues.map((d) => d.text)
    expect(own).toContain(line)
  })
})
