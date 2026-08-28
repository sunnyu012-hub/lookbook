import type { AreaId, NpcDef, NpcId, NpcRoutineDef, RoutineSpot, TimeBand, WeightedSpot } from '@/types'
import { findArea } from '@/lib/rpg/content'
import { todayKey } from '@/lib/date'
import { timeBand } from '@/lib/rpg/time'
import { NPCS, findNpc } from './npcs'
import { seededRandom } from './seed'

/**
 * 사람들이 자기 하루를 보낸다.
 *
 * ── 저장하지 않는다 ─────────────────────────────────────
 *
 * 지금 누가 어디 있는지는 적어두지 않는다. 날짜와 시간대와 아래 표만
 * 있으면 언제 다시 물어도 같은 답이 나온다. 적어두면 그때부터
 * "적어둔 자리" 와 "지금 시간" 이 어긋날 수 있다.
 *
 * ── 순간이동하지 않는다 ─────────────────────────────────
 *
 * 씨앗이 `날짜 + 시간대 + 사람` 이라서, 같은 토요일 오전 동안에는
 * 지도를 몇 번 열고 닫아도 같은 자리에 있다. 시간대가 넘어가거나
 * 날이 바뀌어야 새로 뽑는다.
 *
 * ── 놓치는 게 없다 ──────────────────────────────────────
 *
 * 세라를 뺀 다섯은 어느 시간대에도 도시 어딘가에 반드시 있다.
 * 자리를 옮길 뿐 사라지지 않는다 — 지금 말을 못 걸어서 오늘 치를
 * 손해 보는 구조를 만들면, 그건 생활이 아니라 출석 체크다.
 * (세라는 원래부터 밤에만 보이던 사람이라 그대로 뒀다.)
 */

/** 우리 집에는 아무도 오지 않는다. 여기는 내 자리다. */
const NEVER: AreaId = 'HOME_BASE'

const ROUTINES: NpcRoutineDef[] = [
  {
    // 하루 — 카페 사장. 가게가 곧 하루라서 낮에는 거의 카페 거리에 있다.
    npcId: 'MINA',
    weekday: {
      MORNING: [{ spot: 'CAFE_STREET', weight: 100 }],
      DAY: [{ spot: 'CAFE_STREET', weight: 100 }],
      EVENING: [
        { spot: 'CAFE_STREET', weight: 55 },
        { spot: 'CREATIVE_DISTRICT', weight: 25 },
        { spot: 'GREEN_PARK', weight: 20 },
      ],
      NIGHT: [
        { spot: 'CAFE_STREET', weight: 45 },
        { spot: 'GREEN_PARK', weight: 30 },
        { spot: 'NIGHT_TOWN', weight: 25 },
      ],
    },
    weekend: {
      // 주말 저녁에는 가게에 덜 붙어 있는다.
      EVENING: [
        { spot: 'CAFE_STREET', weight: 40 },
        { spot: 'CREATIVE_DISTRICT', weight: 35 },
        { spot: 'GREEN_PARK', weight: 25 },
      ],
    },
  },
  {
    // 태오 — 아침에 뛴다. 아침 공원 비중이 제일 크다.
    npcId: 'HARU',
    weekday: {
      MORNING: [
        { spot: 'GREEN_PARK', weight: 80 },
        { spot: 'CAFE_STREET', weight: 20 },
      ],
      DAY: [
        { spot: 'GREEN_PARK', weight: 35 },
        { spot: 'CAFE_STREET', weight: 35 },
        { spot: 'TRAINING_ZONE', weight: 30 },
      ],
      EVENING: [
        { spot: 'GREEN_PARK', weight: 45 },
        { spot: 'TRAINING_ZONE', weight: 30 },
        { spot: 'CAFE_STREET', weight: 25 },
      ],
      NIGHT: [
        { spot: 'GREEN_PARK', weight: 40 },
        { spot: 'CAFE_STREET', weight: 30 },
        { spot: 'NIGHT_TOWN', weight: 30 },
      ],
    },
    weekend: {
      // 주말 아침은 거의 확실히 공원이다.
      MORNING: [{ spot: 'GREEN_PARK', weight: 100 }],
    },
  },
  {
    // 미래 — 공방 주인. 아침 커피만 마시고 골목으로 들어간다.
    npcId: 'LULU',
    weekday: {
      MORNING: [
        { spot: 'CREATIVE_DISTRICT', weight: 60 },
        { spot: 'CAFE_STREET', weight: 40 },
      ],
      DAY: [
        { spot: 'CREATIVE_DISTRICT', weight: 85 },
        { spot: 'CAFE_STREET', weight: 15 },
      ],
      EVENING: [
        { spot: 'CREATIVE_DISTRICT', weight: 70 },
        { spot: 'CAFE_STREET', weight: 30 },
      ],
      NIGHT: [
        { spot: 'CREATIVE_DISTRICT', weight: 55 },
        { spot: 'NIGHT_TOWN', weight: 45 },
      ],
    },
  },
  {
    // 이안 — 빈티지숍 사장. 가게를 낮에 열어서 아침에는 밖을 돈다.
    npcId: 'JUNE',
    weekday: {
      MORNING: [
        { spot: 'CAFE_STREET', weight: 45 },
        { spot: 'CREATIVE_DISTRICT', weight: 35 },
        { spot: 'GREEN_PARK', weight: 20 },
      ],
      DAY: [{ spot: 'CREATIVE_DISTRICT', weight: 100 }],
      EVENING: [{ spot: 'CREATIVE_DISTRICT', weight: 100 }],
      NIGHT: [
        { spot: 'NIGHT_TOWN', weight: 60 },
        { spot: 'CREATIVE_DISTRICT', weight: 40 },
      ],
    },
  },
  {
    // 도윤 — 클라이밍장이 일터이고, 주말에는 공원으로 나간다.
    npcId: 'RIO',
    weekday: {
      MORNING: [
        { spot: 'TRAINING_ZONE', weight: 70 },
        { spot: 'GREEN_PARK', weight: 30 },
      ],
      DAY: [
        { spot: 'TRAINING_ZONE', weight: 90 },
        { spot: 'CAFE_STREET', weight: 10 },
      ],
      EVENING: [
        { spot: 'TRAINING_ZONE', weight: 80 },
        { spot: 'GREEN_PARK', weight: 20 },
      ],
      NIGHT: [
        { spot: 'TRAINING_ZONE', weight: 40 },
        { spot: 'CAFE_STREET', weight: 30 },
        { spot: 'GREEN_PARK', weight: 30 },
      ],
    },
    weekend: {
      DAY: [
        { spot: 'TRAINING_ZONE', weight: 55 },
        { spot: 'GREEN_PARK', weight: 45 },
      ],
    },
  },
  {
    // 세라 — 밤에만 보인다. 낮에 어디 있는지는 예나 지금이나 아무도 모른다.
    npcId: 'NOA',
    weekday: {
      MORNING: [{ spot: 'OFFSCREEN', weight: 100 }],
      DAY: [{ spot: 'OFFSCREEN', weight: 100 }],
      EVENING: [{ spot: 'OFFSCREEN', weight: 100 }],
      NIGHT: [{ spot: 'NIGHT_TOWN', weight: 100 }],
    },
  },
]

const ROUTINE_BY_NPC = new Map<NpcId, NpcRoutineDef>(ROUTINES.map((r) => [r.npcId, r]))

export function findRoutine(npcId: string): NpcRoutineDef | null {
  return ROUTINE_BY_NPC.get(npcId as NpcId) ?? null
}

/** 토요일·일요일 (getDay: 0=일) */
export function isWeekendDay(now: Date = new Date()): boolean {
  const day = now.getDay()
  return day === 0 || day === 6
}

/**
 * 무게대로 하나 고른다.
 *
 * 씨앗 하나에서 수를 **한 번만** 뽑는다. 두 번 뽑으면 목록 순서를 바꿨을 때
 * 결과가 달라져서, 표를 다듬는 것만으로 어제 있던 자리가 바뀐다.
 */
function pickWeighted(spots: WeightedSpot[], seed: string): RoutineSpot {
  const total = spots.reduce((sum, s) => sum + Math.max(0, s.weight), 0)
  if (total <= 0) return 'OFFSCREEN'

  let roll = seededRandom(seed)() * total
  for (const s of spots) {
    roll -= Math.max(0, s.weight)
    if (roll < 0) return s.spot
  }
  return spots[spots.length - 1].spot
}

/**
 * 이 사람이 지금 있는 자리.
 *
 * 같은 `dayKey + band + npcId` 면 몇 번을 물어도 같은 답이다.
 */
export function npcSpot(npcId: string, dayKey: string, band: TimeBand, weekend: boolean): RoutineSpot {
  const routine = findRoutine(npcId)
  if (!routine) return 'OFFSCREEN'

  const spots = (weekend ? routine.weekend?.[band] : undefined) ?? routine.weekday[band]
  const spot = pickWeighted(spots, `${dayKey}:${band}:${npcId}`)
  // 우리 집에는 표를 어떻게 적든 아무도 들이지 않는다.
  return spot === NEVER ? 'OFFSCREEN' : spot
}

/** 지금 이 사람이 있는 자리. 날짜·시간대는 `now` 에서 읽는다. */
export function npcSpotNow(npcId: string, now: Date = new Date()): RoutineSpot {
  return npcSpot(npcId, todayKey(now), timeBand(now), isWeekendDay(now))
}

/** 지금 이 동네에 있는 사람들. NPC_IDS 순서를 지킨다. */
export function npcsHere(areaId: string, now: Date = new Date()): NpcDef[] {
  return NPCS.filter((npc) => npcSpotNow(npc.id, now) === areaId)
}

/**
 * 이 동네 사람인데 지금은 자리를 비운 사람들.
 *
 * 목록에서 아예 빼지 않는다 — 원래 카페에 있던 하루가 소리 없이 사라지면
 * 그건 "나갔구나" 가 아니라 "없어졌나?" 로 읽힌다. 자리는 두고 흐리게만.
 */
export function npcsAway(areaId: string, now: Date = new Date()): NpcDef[] {
  return NPCS.filter((npc) => npc.areaId === areaId && npcSpotNow(npc.id, now) !== areaId)
}

/**
 * 자리를 비운 사람 옆에 적는 한 줄.
 *
 * 어디 있는지까지 적는다. 첫 판에서 자리를 숨기면 사람들이 도시를
 * 뒤지느라 시간을 쓰고, 정작 "다들 자기 하루를 사는구나" 는 안 남는다.
 * 찾는 재미로 바꾸는 건 그 느낌이 먼저 자리를 잡은 뒤에 해도 늦지 않다.
 */
export function awayLine(npc: NpcDef, now: Date = new Date()): string {
  // 세라는 원래 밤에만 보이는 사람이다. 그건 오늘 사정이 아니라 그 사람 자체다.
  if (npc.nightOnly) return '밤에만 보여'
  const area = npcAreaNow(npc.id, now)
  return area ? `${findArea(area).name}에 있는 것 같다` : '지금은 여기 없는 것 같다'
}

/** 지금 이 사람이 있는 동네 이름을 찾을 때 쓴다. 도시에 없으면 null. */
export function npcAreaNow(npcId: string, now: Date = new Date()): AreaId | null {
  const spot = npcSpotNow(npcId, now)
  return spot === 'OFFSCREEN' ? null : spot
}

/** 개발용 — 지금 여섯 명이 각각 어디 있는지 한 번에 */
export function allNpcSpots(now: Date = new Date()): { npc: NpcDef; spot: RoutineSpot }[] {
  return NPCS.map((npc) => ({ npc, spot: npcSpotNow(npc.id, now) }))
}

export { findNpc }
