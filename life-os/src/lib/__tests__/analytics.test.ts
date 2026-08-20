import { describe, expect, it } from 'vitest'
import type { Checkin, MounjaroLog, Preferences, WeightLog } from '@/types'
import { compareGroups, mean, movingAverage, stdev } from '../analytics/stats'
import { conditionTrend } from '../analytics/trend'
import { weightSummary, goalProgress, loggingCadence } from '../analytics/weight'
import { cycleDayMap, cyclePhases, mounjaroCycle } from '../analytics/mounjaro'
import { DEFAULT_PREFERENCES } from '../repositories/preferences'

const checkin = (date: string, energyScore: number, over: Partial<Checkin> = {}): Checkin => ({
  id: date,
  userId: 'u',
  date,
  energyScore,
  mode: null,
  createdAt: '',
  updatedAt: '',
  ...over,
})

const weight = (date: string, weightKg: number): WeightLog => ({
  id: date,
  userId: 'u',
  date,
  weightKg,
  createdAt: '',
  updatedAt: '',
})

const dose = (date: string, doseMg = 5): MounjaroLog => ({
  id: date,
  userId: 'u',
  date,
  doseMg,
  sideEffects: [],
  createdAt: '',
  updatedAt: '',
})

describe('기본 통계', () => {
  it('mean / stdev', () => {
    expect(mean([1, 2, 3])).toBe(2)
    expect(mean([])).toBe(0)
    expect(stdev([2, 2, 2])).toBe(0)
    expect(stdev([1])).toBe(0)
  })
})

describe('movingAverage', () => {
  it('7일 이동평균은 창 안의 값만 평균낸다', () => {
    const points = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-08-${String(i + 1).padStart(2, '0')}`,
      value: i + 1,
    }))
    const ma = movingAverage(points, 7)
    expect(ma).toHaveLength(10)
    // 첫 점은 자기 자신
    expect(ma[0].value).toBe(1)
    // 7번째부터는 앞 7개의 평균
    expect(ma[6].value).toBe(4) // (1..7)/7
    expect(ma[9].value).toBe(7) // (4..10)/7
  })

  it('기록이 띄엄띄엄해도 있는 값만 쓴다', () => {
    const ma = movingAverage(
      [
        { date: '2026-08-01', value: 70 },
        { date: '2026-08-09', value: 68 },
      ],
      7,
    )
    expect(ma[1].value).toBe(69)
  })

  it('날짜 순서가 뒤섞여 들어와도 정렬해서 계산한다', () => {
    const ma = movingAverage(
      [
        { date: '2026-08-03', value: 3 },
        { date: '2026-08-01', value: 1 },
        { date: '2026-08-02', value: 2 },
      ],
      3,
    )
    expect(ma.map((p) => p.date)).toEqual(['2026-08-01', '2026-08-02', '2026-08-03'])
    expect(ma[2].value).toBe(2)
  })
})

describe('compareGroups', () => {
  it('표본이 모자라면 enough=false', () => {
    const r = compareGroups([1, 2], [3, 4, 5, 6], 'A', 'B', 4)
    expect(r.enough).toBe(false)
  })

  it('평균 차이를 낸다', () => {
    const r = compareGroups([70, 72, 74, 76], [60, 62, 64, 66], 'A', 'B', 4)
    expect(r.meanA).toBe(73)
    expect(r.meanB).toBe(63)
    expect(r.diff).toBe(10)
    expect(r.enough).toBe(true)
  })
})

describe('conditionTrend', () => {
  it('기록이 적으면 enough=false', () => {
    const r = conditionTrend([checkin('2026-08-20', 70)], 7, '2026-08-20')
    expect(r.enough).toBe(false)
  })

  it('최근 구간이 높으면 up', () => {
    const checkins = [
      ...['08-08', '08-09', '08-10', '08-11'].map((d) => checkin(`2026-${d}`, 50)),
      ...['08-15', '08-16', '08-17', '08-18'].map((d) => checkin(`2026-${d}`, 70)),
    ]
    const r = conditionTrend(checkins, 7, '2026-08-20')
    expect(r.direction).toBe('up')
    expect(r.delta).toBe(20)
  })
})

describe('weightSummary', () => {
  const prefs: Pick<Preferences, 'goalWeightKg' | 'startingWeightKg'> = {
    goalWeightKg: 60,
    startingWeightKg: 70,
  }

  it('기록이 없으면 값이 비어 있다', () => {
    const s = weightSummary([], prefs, '2026-08-20')
    expect(s.smoothed).toBeNull()
    expect(s.count).toBe(0)
  })

  it('7일 평균으로 하루치 출렁임을 누른다', () => {
    const logs = [
      weight('2026-08-14', 65),
      weight('2026-08-15', 65),
      weight('2026-08-16', 65),
      weight('2026-08-17', 65),
      weight('2026-08-18', 65),
      weight('2026-08-19', 65),
      weight('2026-08-20', 68), // 하루 튀는 값
    ]
    const s = weightSummary(logs, prefs, '2026-08-20')
    expect(s.latest?.weightKg).toBe(68)
    // 평균은 68 보다 훨씬 낮게 눌린다
    expect(s.smoothed).toBeLessThan(66)
  })

  it('목표까지 남은 양을 낸다', () => {
    const s = weightSummary([weight('2026-08-20', 65)], prefs, '2026-08-20')
    expect(s.toGoal).toBe(5)
  })

  it('목표 진행률은 0~1 로 잘린다', () => {
    const s = weightSummary([weight('2026-08-20', 55)], prefs, '2026-08-20')
    expect(goalProgress(s, prefs)).toBe(1)
  })

  it('며칠에 한 번 재는지 센다', () => {
    expect(loggingCadence([weight('2026-08-10', 66), weight('2026-08-20', 65)])).toBe(10)
    expect(loggingCadence([weight('2026-08-20', 65)])).toBeNull()
  })
})

describe('mounjaroCycle', () => {
  const prefs = {
    ...DEFAULT_PREFERENCES,
    mounjaroEnabled: true,
    mounjaroStartDate: '2026-07-01',
    mounjaroIntervalDays: 7,
  }

  it('기록이 없으면 사이클도 없다', () => {
    const c = mounjaroCycle([], prefs, '2026-08-20')
    expect(c.cycleDay).toBeNull()
    expect(c.nextDate).toBeNull()
  })

  it('맞은 날이 1일차', () => {
    const c = mounjaroCycle([dose('2026-08-20')], prefs, '2026-08-20')
    expect(c.cycleDay).toBe(1)
  })

  it('다음 예정일은 주기만큼 뒤', () => {
    const c = mounjaroCycle([dose('2026-08-18')], prefs, '2026-08-20')
    expect(c.cycleDay).toBe(3)
    expect(c.nextDate).toBe('2026-08-25')
    expect(c.daysUntilNext).toBe(5)
  })

  it('예정일이 지나면 음수로 나온다 (재촉하지 않고 사실만)', () => {
    const c = mounjaroCycle([dose('2026-08-01')], prefs, '2026-08-20')
    expect(c.daysUntilNext).toBe(-12) // 08-01 + 7일 = 08-08, 오늘은 08-20
  })

  it('주기 설정이 10일이면 예정일도 10일 뒤', () => {
    const c = mounjaroCycle([dose('2026-08-10')], { ...prefs, mounjaroIntervalDays: 10 }, '2026-08-12')
    expect(c.nextDate).toBe('2026-08-20')
  })

  it('미래 날짜의 기록은 오늘 기준 사이클에 쓰지 않는다', () => {
    const c = mounjaroCycle([dose('2026-08-10'), dose('2026-08-25')], prefs, '2026-08-20')
    expect(c.lastDose?.date).toBe('2026-08-10')
  })
})

describe('cycleDayMap / cyclePhases', () => {
  it('날짜별 사이클 일차를 만든다', () => {
    const map = cycleDayMap([dose('2026-08-10'), dose('2026-08-17')], [
      '2026-08-10',
      '2026-08-13',
      '2026-08-17',
      '2026-08-19',
    ])
    expect(map.get('2026-08-10')).toBe(1)
    expect(map.get('2026-08-13')).toBe(4)
    expect(map.get('2026-08-17')).toBe(1)
    expect(map.get('2026-08-19')).toBe(3)
  })

  it('첫 투약 전 날짜는 빠진다', () => {
    const map = cycleDayMap([dose('2026-08-10')], ['2026-08-05'])
    expect(map.has('2026-08-05')).toBe(false)
  })

  it('주기를 셋으로 나눈다', () => {
    const p = cyclePhases(7)
    expect(p[0].from).toBe(1)
    expect(p[2].to).toBe(7)
    expect(p).toHaveLength(3)
  })
})
