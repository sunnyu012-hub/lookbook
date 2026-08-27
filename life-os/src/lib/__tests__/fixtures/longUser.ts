/**
 * 365일 가상 사용자들.
 *
 * 여기 있는 데이터는 무작위가 아니다. 답을 먼저 정해 놓고 그 답이 나오게 심었다.
 *
 * 그리고 심는 것만큼 중요한 게 "안 심는 것" 이다.
 * random / sparse / oneDayHeavy / confounded 사용자는
 * 아무것도 열리면 안 되는 사람들이다 (계획서 76~78).
 * 이 넷이 조용해야 이 엔진을 믿을 수 있다.
 */
import type { Checkin } from '@/types'
import type { AppliedLifeTag, DayOfWeek, DayPart, MyTag, QuickLog } from '@/lib/os2/types'

export const START = '2025-01-01'
export const DAYS = 365
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

/** 같은 씨앗이면 언제나 같은 값 — 테스트가 날마다 달라지면 안 된다 */
function pseudo(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

const clamp5 = (v: number) => Math.max(1, Math.min(5, Math.round(v)))

const isoAt = (date: string, hour: number): string => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d, hour).toISOString()
}

const partOf = (hour: number): DayPart => {
  if (hour < 6) return 'dawn'
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  if (hour < 22) return 'evening'
  return 'night'
}

const tag = (tagId: string): AppliedLifeTag => ({
  tagId,
  source: 'keyword',
  confidence: 0.85,
  appliedAt: isoAt(START, 12),
  temporalContext: 'present',
  taxonomyVersion: 1,
  ruleVersion: 1,
})

export interface UserData {
  logs: QuickLog[]
  checkins: Checkin[]
  myTags: MyTag[]
}

interface LogSpec {
  date: string
  hour: number
  mood: number
  energy: number
  focus: number
  fatigue: number
  tags?: string[]
  myTagIds?: string[]
  photo?: boolean
}

const makeLog = (spec: LogSpec, index: number): QuickLog => {
  const at = isoAt(spec.date, spec.hour)
  return {
    id: `log-${spec.date}-${spec.hour}-${index}`,
    userId: 'u1',
    mood: clamp5(spec.mood) as QuickLog['mood'],
    text: null,
    energy: clamp5(spec.energy),
    focus: clamp5(spec.focus),
    fatigue: clamp5(spec.fatigue),
    photoPath: spec.photo ? `u1/2025/01/${spec.date}.jpg` : null,
    myTagIds: spec.myTagIds ?? [],
    lifeTags: (spec.tags ?? []).map(tag),
    loggedAt: at,
    date: spec.date,
    dayOfWeek: dayOfWeek(spec.date),
    dayPart: partOf(spec.hour),
    taggedRuleVersion: 1,
    taggedTaxonomyVersion: 1,
    taggedAt: at,
    schemaVersion: 1,
    createdAt: at,
    updatedAt: at,
  }
}

const makeCheckin = (date: string, sleepHours: number, short: boolean): Checkin =>
  ({
    id: `ci-${date}`,
    userId: 'u1',
    date,
    sleepHours: Math.round(sleepHours * 10) / 10,
    sleepQuality: short ? 2 : 4,
    fatigue: short ? 4 : 2,
    mood: 3,
    focus: short ? 2 : 4,
    energyScore: null,
    mode: null,
    createdAt: isoAt(date, 9),
    updatedAt: isoAt(date, 9),
  }) as Checkin

const MY_TAGS: MyTag[] = [
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
]

// ─────────────────────────────────────────────
// 1. 패턴이 뚜렷한 사용자 — 열려야 하는 사람
// ─────────────────────────────────────────────

export function buildPatternedUser(): UserData {
  const logs: QuickLog[] = []
  const checkins: Checkin[] = []
  let index = 0

  for (let day = 0; day < DAYS; day += 1) {
    const date = addDays(START, day)
    const weekend = isWeekend(date)
    const noise = (seed: number) => (pseudo(day * 31 + seed) - 0.5) * 0.4

    const climbing = day % 7 === 2 || day % 7 === 5
    const meeting = !weekend && day % 3 === 0
    const shortSleep = day % 8 === 3
    const sleptShortYesterday = day > 0 && (day - 1) % 8 === 3

    checkins.push(makeCheckin(date, shortSleep ? 5.1 : 7.4, shortSleep))

    // 아침 — 못 잔 다음 날은 집중이 낮다
    logs.push(
      makeLog(
        {
          date,
          hour: 8,
          mood: 3.0 + noise(1),
          energy: 3.2 + noise(2),
          focus: (sleptShortYesterday ? 2.0 : 3.2) + noise(3),
          fatigue: 3.0 + noise(4),
        },
        index++,
      ),
    )

    // 낮 — 집중이 높다. 회의가 있으면 기운이 빠진다
    logs.push(
      makeLog(
        {
          date,
          hour: 14,
          mood: 3.3 + noise(5),
          energy: (meeting ? 2.2 : 3.3) + noise(6),
          focus: 4.2 + noise(7),
          fatigue: 3.0 + noise(8),
          tags: meeting ? ['work:meeting', 'activity:work'] : ['activity:work'],
        },
        index++,
      ),
    )

    // 회의가 있는 날은 그 앞뒤로도 적는다.
    // 앞뒤 비교 DNA 는 사건 ±3시간 안에 기록이 있어야 성립한다
    if (meeting) {
      logs.push(
        makeLog(
          {
            date,
            hour: 12,
            mood: 3.3 + noise(17),
            energy: 3.4 + noise(18),
            focus: 3.6 + noise(19),
            fatigue: 2.8 + noise(20),
            tags: ['activity:work'],
          },
          index++,
        ),
      )
      logs.push(
        makeLog(
          {
            date,
            hour: 16,
            mood: 3.0 + noise(21),
            energy: 2.1 + noise(22),
            focus: 2.8 + noise(23),
            fatigue: 3.6 + noise(24),
            tags: ['activity:work'],
          },
          index++,
        ),
      )
    }

    // 저녁 — 기분이 높다. 클라이밍한 날은 더 높다
    logs.push(
      makeLog(
        {
          date,
          hour: 19,
          mood: (climbing ? 4.7 : 4.0) + (weekend ? 0.3 : 0) + noise(9),
          energy: 3.1 + noise(10),
          focus: 3.0 + noise(11),
          fatigue: 2.6 + noise(12),
          tags: climbing
            ? ['sport:climbing', 'activity:exercise', 'place:climbing_gym']
            : weekend
              ? ['place:home', 'social:alone']
              : ['place:home'],
          myTagIds: weekend && day % 14 < 7 ? ['mt-partner'] : [],
          photo: climbing || day % 11 === 0,
        },
        index++,
      ),
    )

    // 혼자 있는 밤 — 기운이 돌아온다
    if (day % 2 === 0) {
      logs.push(
        makeLog(
          {
            date,
            hour: 22,
            mood: 3.6 + noise(13),
            energy: 3.8 + noise(14),
            focus: 2.6 + noise(15),
            fatigue: 2.4 + noise(16),
            tags: ['social:alone', 'place:home', 'activity:rest'],
          },
          index++,
        ),
      )
    }
  }

  return { logs, checkins, myTags: MY_TAGS }
}

// ─────────────────────────────────────────────
// 2. 아무 패턴 없는 사용자 — 아무것도 열리면 안 된다
// ─────────────────────────────────────────────

export function buildRandomUser(): UserData {
  const logs: QuickLog[] = []
  const checkins: Checkin[] = []
  let index = 0

  for (let day = 0; day < DAYS; day += 1) {
    const date = addDays(START, day)
    checkins.push(makeCheckin(date, 6 + pseudo(day) * 3, false))

    for (const hour of [8, 14, 19]) {
      const seed = day * 100 + hour
      logs.push(
        makeLog(
          {
            date,
            hour,
            mood: 1 + pseudo(seed) * 4,
            energy: 1 + pseudo(seed + 1) * 4,
            focus: 1 + pseudo(seed + 2) * 4,
            fatigue: 1 + pseudo(seed + 3) * 4,
            // 태그도 아무 데나 붙는다
            tags: pseudo(seed + 4) > 0.5 ? ['activity:work'] : ['place:home'],
          },
          index++,
        ),
      )
    }
  }

  return { logs, checkins, myTags: [] }
}

// ─────────────────────────────────────────────
// 3. 기록이 거의 없는 사용자
// ─────────────────────────────────────────────

export function buildSparseUser(): UserData {
  const logs: QuickLog[] = []
  let index = 0

  for (let i = 0; i < 30; i += 1) {
    const date = addDays(START, i * 3)
    logs.push(
      makeLog(
        {
          date,
          hour: 19,
          mood: 4,
          energy: 3,
          focus: 3,
          fatigue: 3,
          tags: ['place:home'],
        },
        index++,
      ),
    )
  }

  return { logs, checkins: [], myTags: [] }
}

// ─────────────────────────────────────────────
// 4. 하루에 몰아 쓴 사용자 — 하루가 분석을 지배하면 안 된다
// ─────────────────────────────────────────────

export function buildOneDayHeavyUser(): UserData {
  const logs: QuickLog[] = []
  let index = 0

  // 하루에 50개
  for (let i = 0; i < 50; i += 1) {
    logs.push(
      makeLog(
        {
          date: START,
          hour: 19,
          mood: 5,
          energy: 5,
          focus: 5,
          fatigue: 1,
          tags: ['sport:climbing', 'activity:exercise'],
        },
        index++,
      ),
    )
  }

  // 나머지는 드문드문
  for (let i = 1; i < 12; i += 1) {
    logs.push(
      makeLog(
        {
          date: addDays(START, i * 10),
          hour: 8,
          mood: 3,
          energy: 3,
          focus: 3,
          fatigue: 3,
        },
        index++,
      ),
    )
  }

  return { logs, checkins: [], myTags: [] }
}

// ─────────────────────────────────────────────
// 5. 교란된 사용자 — 사람 태그가 주말 저녁에만
// ─────────────────────────────────────────────

export function buildConfoundedUser(): UserData {
  const logs: QuickLog[] = []
  let index = 0

  for (let day = 0; day < DAYS; day += 1) {
    const date = addDays(START, day)
    const weekend = isWeekend(date)
    const noise = (pseudo(day) - 0.5) * 0.3

    // 저녁은 원래 기분이 높다
    logs.push(
      makeLog(
        {
          date,
          hour: 19,
          mood: 4.4 + noise,
          energy: 3.2,
          focus: 3.0,
          fatigue: 2.6,
          // 파트너는 주말 저녁에만 나온다. 차이는 사람이 아니라 저녁의 몫이다
          myTagIds: weekend ? ['mt-partner'] : [],
          tags: weekend ? ['social:with_people', 'relationship:partner'] : ['place:home'],
        },
        index++,
      ),
    )

    logs.push(
      makeLog(
        { date, hour: 8, mood: 3.0 + noise, energy: 3.0, focus: 3.0, fatigue: 3.0 },
        index++,
      ),
    )
  }

  return { logs, checkins: [], myTags: MY_TAGS }
}

// ─────────────────────────────────────────────
// 6. 극단값만 있는 사용자 — 이틀만 5점
// ─────────────────────────────────────────────

export function buildOutlierUser(): UserData {
  const logs: QuickLog[] = []
  let index = 0

  for (let day = 0; day < 120; day += 1) {
    const date = addDays(START, day)
    const special = day === 10 || day === 11

    logs.push(
      makeLog(
        {
          date,
          hour: 19,
          mood: special ? 5 : 3,
          energy: 3,
          focus: 3,
          fatigue: 3,
          tags: special ? ['activity:travel'] : ['place:home'],
        },
        index++,
      ),
    )
  }

  return { logs, checkins: [], myTags: [] }
}

// ─────────────────────────────────────────────
// 7. 바뀐 사용자 — 저녁형이었다가 낮형으로
// ─────────────────────────────────────────────

export function buildChangingUser(): UserData {
  const logs: QuickLog[] = []
  const checkins: Checkin[] = []
  let index = 0

  for (let day = 0; day < DAYS; day += 1) {
    const date = addDays(START, day)
    const noise = (pseudo(day) - 0.5) * 0.3
    // 앞 220일은 저녁이 높고, 뒤 145일은 낮이 높다
    const early = day < 220

    checkins.push(makeCheckin(date, 7.2, false))

    // 앞 220일은 아침이 낮고, 뒤에는 아침이 올라온다
    logs.push(
      makeLog(
        {
          date,
          hour: 8,
          mood: (early ? 3.0 : 4.4) + noise,
          energy: 3.0,
          focus: 3.0,
          fatigue: 3.0,
        },
        index++,
      ),
    )
    logs.push(
      makeLog(
        { date, hour: 14, mood: 3.3 + noise, energy: 3.2, focus: 3.5, fatigue: 2.8 },
        index++,
      ),
    )
    logs.push(
      makeLog(
        {
          date,
          hour: 19,
          mood: (early ? 4.4 : 3.3) + noise,
          energy: 3.1,
          focus: 3.0,
          fatigue: 2.7,
        },
        index++,
      ),
    )
  }

  return { logs, checkins, myTags: [] }
}

// ─────────────────────────────────────────────
// 미리 정해 둔 답
// ─────────────────────────────────────────────

export const GROUND_TRUTH = {
  patterned: {
    shouldOpen: [
      'evening_bloom',
      'afternoon_focus',
      'morning_fog',
      'meeting_drain',
      'joy_trigger',
      'solo_recharge',
      'sleep_sensitive',
    ],
    shouldStayLocked: ['morning_bloom'],
  },
  random: { maxOpen: 6 },
  sparse: { maxOpen: 1 },
  oneDayHeavy: { maxOpen: 1 },
  confounded: { blocked: 'my_person_effect' },
  outlier: { blocked: 'joy_trigger' },
  changing: { was: 'evening_bloom' },
} as const
