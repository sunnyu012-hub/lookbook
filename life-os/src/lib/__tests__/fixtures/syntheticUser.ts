/**
 * 120일치 가상 사용자.
 *
 * 무작위가 아니다. 답을 미리 정해 놓고 그 답이 나오도록 심어 둔 데이터다.
 * 그래야 "엔진이 맞게 계산했나" 를 물을 수 있다.
 *
 * 심어 둔 것 (아래 GROUND_TRUTH 와 짝을 이룬다):
 *   · 저녁 기분이 아침보다 높다
 *   · 낮 집중이 다른 때보다 높다
 *   · 클라이밍한 날 기분이 평균보다 높다
 *   · 회의가 있던 기록에서 기운이 평균보다 낮다
 *   · 6시간 못 잔 다음 날 집중이 낮다
 *   · 주말 기분이 평일보다 조금 높다
 *   · #성현 태그는 주말 저녁에만 나온다 (교란 변수 — 겉보기 차이가 부풀려진다)
 *   · 기운이 바닥난 구간이 몇 번 있고 돌아오는 데 시간이 걸린다
 */
import type { Checkin } from '@/types'
import type { AppliedLifeTag, DayOfWeek, DayPart, MyTag, QuickLog } from '@/lib/os2/types'

/** 시작일 — 고정한다. 오늘 날짜에 기대면 테스트가 날마다 달라진다 */
export const START = '2026-01-01'
export const DAYS = 120
export const END = addDays(START, DAYS - 1)

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const at = new Date(y, m - 1, d + n)
  return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`
}

const dayOfWeek = (key: string): DayOfWeek => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).getDay() as DayOfWeek
}

const isWeekend = (key: string) => [0, 6].includes(dayOfWeek(key))

/** 무작위 대신 쓰는 것 — 같은 씨앗이면 언제나 같은 값 */
function pseudo(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

const clamp5 = (v: number) => Math.max(1, Math.min(5, Math.round(v)))

const isoAt = (date: string, hour: number, minute = 0): string => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d, hour, minute).toISOString()
}

const DAY_PART_OF = (hour: number): DayPart => {
  if (hour < 6) return 'dawn'
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  if (hour < 22) return 'evening'
  return 'night'
}

// ─────────────────────────────────────────────
// 심어 놓은 규칙
// ─────────────────────────────────────────────

/** 시간대가 기분에 더하는 몫 */
const MOOD_BY_HOUR: Record<DayPart, number> = {
  dawn: -0.4,
  morning: -0.5,
  afternoon: 0.1,
  evening: 0.7,
  night: 0.3,
}

/** 시간대가 집중에 더하는 몫 */
const FOCUS_BY_HOUR: Record<DayPart, number> = {
  dawn: -0.3,
  morning: 0.1,
  afternoon: 0.9,
  evening: 0.2,
  night: -0.6,
}

const tag = (tagId: string, verified = false): AppliedLifeTag => ({
  tagId,
  source: 'keyword',
  confidence: 0.85,
  appliedAt: isoAt(START, 12),
  temporalContext: 'present',
  userVerified: verified || undefined,
  taxonomyVersion: 1,
  ruleVersion: 1,
})

export const MY_TAGS: MyTag[] = [
  {
    id: 'mt-partner',
    userId: 'u1',
    name: '성현',
    color: null,
    emoji: null,
    isFavorite: true,
    useCount: 0,
    lastUsedAt: null,
    schemaVersion: 1,
    createdAt: isoAt(START, 9),
    updatedAt: isoAt(START, 9),
  },
  {
    id: 'mt-project',
    userId: 'u1',
    name: 'LifeOS',
    color: null,
    emoji: null,
    isFavorite: false,
    useCount: 0,
    lastUsedAt: null,
    schemaVersion: 1,
    createdAt: isoAt(START, 9),
    updatedAt: isoAt(START, 9),
  },
]

interface Slot {
  hour: number
  /** 이 시각에 기록을 남길 확률 대신 쓰는 문턱 */
  gate: number
}

const SLOTS: Slot[] = [
  { hour: 8, gate: 0.25 },
  { hour: 13, gate: 0.15 },
  { hour: 19, gate: 0.1 },
  { hour: 22, gate: 0.55 },
]

export interface SyntheticData {
  logs: QuickLog[]
  checkins: Checkin[]
  myTags: MyTag[]
}

export function buildSyntheticUser(): SyntheticData {
  const logs: QuickLog[] = []
  const checkins: Checkin[] = []

  for (let dayIndex = 0; dayIndex < DAYS; dayIndex += 1) {
    const date = addDays(START, dayIndex)
    const weekend = isWeekend(date)
    const dow = dayOfWeek(date)

    // ── 그날의 형편
    const climbing = dayIndex % 7 === 2 || dayIndex % 7 === 5
    const meeting = !weekend && dayIndex % 3 === 0
    const shortSleep = dayIndex % 9 === 4

    // ── Daily Check-in (수면)
    const sleepHours = shortSleep ? 5.2 : 7.3 + pseudo(dayIndex) * 0.8
    checkins.push(makeCheckin(date, dayIndex, sleepHours, shortSleep))

    // ── Quick Log
    for (const [slotIndex, slot] of SLOTS.entries()) {
      const seed = dayIndex * 10 + slotIndex
      if (pseudo(seed) < slot.gate) continue

      const dayPart = DAY_PART_OF(slot.hour)
      const noise = (pseudo(seed + 500) - 0.5) * 0.5

      let mood = 3.2 + MOOD_BY_HOUR[dayPart] + noise
      let energy = 3.3 + noise
      let focus = 3.0 + FOCUS_BY_HOUR[dayPart] + noise
      const fatigue = 2.8 - MOOD_BY_HOUR[dayPart] * 0.3 + noise

      const tags: AppliedLifeTag[] = []
      const myTagIds: string[] = []

      if (weekend) mood += 0.45

      // 클라이밍한 날 저녁 — 기분이 올라간다
      if (climbing && dayPart === 'evening') {
        mood += 0.9
        tags.push(tag('sport:climbing'), tag('place:climbing_gym'))
      }

      // 회의가 있던 낮 — 기운이 내려간다
      if (meeting && dayPart === 'afternoon') {
        energy -= 1.0
        tags.push(tag('work:meeting'))
      }

      // 못 잔 다음 날 아침 — 집중이 내려간다
      const sleptShortYesterday = dayIndex > 0 && (dayIndex - 1) % 9 === 4
      if (sleptShortYesterday && (dayPart === 'morning' || dayPart === 'dawn')) {
        focus -= 1.1
      }

      // #성현 — 주말 저녁에만 (교란 변수)
      if (weekend && dayPart === 'evening') {
        myTagIds.push('mt-partner')
        tags.push(tag('social:with_people'), tag('relationship:partner'))
      }

      // 프로젝트 작업 — 평일 낮
      if (!weekend && dayPart === 'afternoon' && dayIndex % 2 === 0) {
        myTagIds.push('mt-project')
        tags.push(tag('creative:coding'))
        focus += 0.5
      }

      // 기운이 바닥나는 구간 — 회복 분석용
      if (dayIndex % 17 === 3 && (dayPart === 'evening' || dayPart === 'night')) {
        energy = 1
      }
      if (dayIndex % 17 === 4 && dayPart === 'morning') {
        energy = 2
      }

      logs.push(
        makeLog({
          date,
          dayOfWeek: dow,
          dayPart,
          hour: slot.hour,
          index: seed,
          mood: clamp5(mood),
          energy: clamp5(energy),
          focus: clamp5(focus),
          fatigue: clamp5(fatigue),
          lifeTags: tags,
          myTagIds,
        }),
      )
    }
  }

  return { logs, checkins, myTags: MY_TAGS }
}

function makeLog(spec: {
  date: string
  dayOfWeek: DayOfWeek
  dayPart: DayPart
  hour: number
  index: number
  mood: number
  energy: number
  focus: number
  fatigue: number
  lifeTags: AppliedLifeTag[]
  myTagIds: string[]
}): QuickLog {
  const at = isoAt(spec.date, spec.hour)
  return {
    id: `log-${spec.date}-${spec.hour}`,
    userId: 'u1',
    mood: spec.mood as QuickLog['mood'],
    text: null,
    energy: spec.energy,
    focus: spec.focus,
    fatigue: spec.fatigue,
    photoPath: null,
    myTagIds: spec.myTagIds,
    lifeTags: spec.lifeTags,
    loggedAt: at,
    date: spec.date,
    dayOfWeek: spec.dayOfWeek,
    dayPart: spec.dayPart,
    taggedRuleVersion: 1,
    taggedTaxonomyVersion: 1,
    taggedAt: at,
    schemaVersion: 1,
    createdAt: at,
    updatedAt: at,
  }
}

function makeCheckin(date: string, index: number, sleepHours: number, short: boolean): Checkin {
  const at = isoAt(date, 9)
  return {
    id: `ci-${date}`,
    userId: 'u1',
    date,
    sleepHours: Math.round(sleepHours * 10) / 10,
    sleepQuality: short ? 2 : 4,
    fatigue: short ? 4 : 2,
    mood: clamp5(3.4 + (pseudo(index + 77) - 0.5) * 0.6),
    focus: clamp5(short ? 2.2 : 3.6),
    energyScore: null,
    mode: null,
    createdAt: at,
    updatedAt: at,
  } as Checkin
}

// ─────────────────────────────────────────────
// 미리 정해 둔 답
// ─────────────────────────────────────────────

export const GROUND_TRUTH = {
  /** 저녁 기분이 아침보다 높다 */
  eveningMoodAboveMorning: true,
  /** 낮 집중이 가장 높다 */
  afternoonFocusHighest: true,
  /** 클라이밍 기록에서 기분이 평균보다 높다 */
  climbingMoodAboveBaseline: true,
  /** 회의 기록에서 기운이 평균보다 낮다 */
  meetingEnergyBelowBaseline: true,
  /** 주말 기분이 평일보다 높다 */
  weekendMoodAboveWeekday: true,
  /** 6시간 미만 잔 다음 날 집중이 낮다 */
  shortSleepFocusLower: true,
  /**
   * #성현 은 주말 저녁에만 나온다.
   * 그냥 비교하면 차이가 크게 보이고, 같은 주말 저녁끼리 견주면 줄어든다.
   */
  partnerConfounded: true,
  /** 기운이 바닥난 구간이 세 번 이상 */
  hasRecoveryEpisodes: true,
} as const
