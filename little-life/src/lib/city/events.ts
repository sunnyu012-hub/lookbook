import type { CityEvent, CityEventDef } from '@/types'
import { todayKey } from '@/lib/date'
import { timeBand } from '@/lib/rpg/time'
import { pickCount, pickSome } from './seed'

/**
 * 도시에서 오늘 벌어지는 일.
 *
 * 전부 보너스뿐이고 벌점은 하나도 없다.
 * "오늘 안 왔으니 손해" 를 만들지 않기 위해서다 — 왔을 때 조금 더 좋을 뿐이다.
 */
export const CITY_EVENTS: CityEventDef[] = [
  {
    id: 'rainy_cafe',
    name: '비 오는 카페',
    description: '창문을 두드리는 빗소리가 집중하기 좋은 날.',
    icon: '🌧️',
    areaId: 'CAFE_STREET',
    bonuses: { expPctByCategory: { MIND: 10 } },
    effectLabel: '마음 EXP +10%',
    rarity: 'COMMON',
  },
  {
    id: 'tiny_flea_market',
    name: '작은 벼룩시장',
    description: '골목마다 좌판이 깔렸다. 뭐가 나올지 모른다.',
    icon: '🧺',
    areaId: 'CREATIVE_DISTRICT',
    bonuses: { rareDropChancePct: 4 },
    effectLabel: '귀함 이상 드롭 +4%',
    rarity: 'RARE',
  },
  {
    id: 'lucky_cat',
    name: '행운의 고양이',
    description: '공원 벤치에 고양이가 앉아 있다. 오늘은 운이 좋을지도.',
    icon: '🐱',
    areaId: 'GREEN_PARK',
    bonuses: { luck: 2, dropChancePct: 2 },
    effectLabel: '행운 +2 · 드롭 확률 +2%',
    rarity: 'COMMON',
  },
  {
    id: 'golden_hour',
    name: '해 질 무렵',
    description: '해 질 무렵 공원 전체가 금빛으로 물든다.',
    icon: '🌇',
    areaId: 'GREEN_PARK',
    bonuses: { expPctByCategory: { BODY: 10, HEART: 10 } },
    effectLabel: '몸 · 관계 EXP +10%',
    rarity: 'COMMON',
  },
  {
    id: 'late_night_star',
    name: '늦은 밤의 별',
    description: '오늘 밤엔 뭔가 떨어질 것 같다.',
    icon: '💫',
    areaId: 'NIGHT_TOWN',
    bonuses: { rareDropChancePct: 5, luck: 1 },
    effectLabel: '귀함 이상 드롭 +5%',
    rarity: 'EPIC',
    band: 'NIGHT',
  },
  {
    id: 'quiet_city',
    name: '조용한 도시',
    description: '도시 전체가 이상하게 조용한 날.',
    icon: '🤫',
    areaId: null,
    bonuses: { rewardPctByCategory: { MIND: 20 } },
    effectLabel: '마음 보상 +20%',
    rarity: 'RARE',
  },
  {
    id: 'coffee_delivery',
    name: '갓 볶은 원두',
    description: '카페 거리에 새 원두가 들어왔다.',
    icon: '☕',
    areaId: 'CAFE_STREET',
    bonuses: { expPctByCategory: { WORK: 8 } },
    effectLabel: '일 EXP +8%',
    rarity: 'COMMON',
  },
  {
    id: 'open_gym',
    name: '개방의 날',
    description: '오늘은 아무나 들어와서 써도 되는 날.',
    icon: '🏋️',
    areaId: 'TRAINING_ZONE',
    bonuses: { rewardPctByCategory: { BODY: 15 } },
    effectLabel: '몸 보상 +15%',
    rarity: 'COMMON',
  },
  {
    id: 'city_festival',
    name: '작은 축제',
    description: '어디선가 음악이 들린다. 사람들이 나와 있다.',
    icon: '🎪',
    areaId: null,
    bonuses: { coinPct: 15, friendshipPct: 20 },
    effectLabel: '모든 코인 +15% · 친밀도 +20%',
    rarity: 'RARE',
  },
]

export function findEventDef(id: string): CityEventDef | null {
  return CITY_EVENTS.find((e) => e.id === id) ?? null
}

/**
 * 오늘 열린 이벤트.
 *
 * 하루 1~3개. 너무 많으면 특별할 게 없어진다.
 * 시간대가 정해진 이벤트는 그 시간대가 되어야 실제로 걸린다 —
 * 목록에는 미리 보이고, 효과만 그때부터 붙는다.
 */
export function eventsForDay(dayKey: string = todayKey()): CityEvent[] {
  const count = pickCount(1, 3, `${dayKey}:count`)
  return pickSome(CITY_EVENTS, count, `${dayKey}:events`).map((def) => ({
    ...def,
    dayKey,
  }))
}

/** 지금 이 순간 실제로 효과가 붙어 있는 이벤트만 */
export function activeEvents(dayKey: string = todayKey(), now: Date = new Date()): CityEvent[] {
  const band = timeBand(now)
  return eventsForDay(dayKey).filter((e) => !e.band || e.band === band)
}

/** 이 지역에 걸린 이벤트 (도시 전체 이벤트 포함) */
export function eventsForArea(areaId: string, events: CityEvent[]): CityEvent[] {
  return events.filter((e) => e.areaId === null || e.areaId === areaId)
}
