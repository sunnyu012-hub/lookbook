import { describe, expect, it } from 'vitest'
import type { Checkin, NightCheckout, WeightLog } from '@/types'
import {
  EXPORT_VERSION,
  buildExport,
  countsOf,
  exportCsv,
  exportFileName,
  exportJson,
  totalRecords,
  type ExportInput,
} from '../export'
import { DEFAULT_PREFERENCES } from '../repositories/preferences'

const c = (date: string, over: Partial<Checkin> = {}): Checkin => ({
  id: date,
  userId: 'u',
  date,
  energyScore: 61,
  mode: 'NORMAL',
  createdAt: '',
  updatedAt: '',
  ...over,
})

const base: ExportInput = {
  checkins: [],
  nights: [],
  weights: [],
  mounjaro: [],
  lifeEvents: [],
  ddays: [],
  eventLog: {},
  questLog: {},
  customQuests: [],
  weeklyResets: [],
  prefs: DEFAULT_PREFERENCES,
}

const filled: ExportInput = {
  ...base,
  checkins: [
    c('2026-08-20', {
      sleepHours: 6.5,
      mood: 4,
      highlight: '점심에 산책',
      contextNote: '어제 클라이밍해서 뻐근했다',
    }),
    c('2026-08-19', { energyScore: 40 }),
  ],
  nights: [
    {
      userId: 'u',
      date: '2026-08-20',
      daySatisfaction: 4,
      bestThing: '산책',
      hardestThing: '회의가 길었다',
      createdAt: '',
      updatedAt: '',
    } as NightCheckout,
  ],
  weights: [
    { id: 'w1', userId: 'u', date: '2026-08-20', weightKg: 62.4, createdAt: '', updatedAt: '' } as WeightLog,
  ],
  eventLog: { '2026-08-20': ['클라이밍', '야근'] },
  questLog: { '2026-08-20': { picks: [], completions: { water: 3, 'tidy-5': 1 } } },
}

describe('내보내기 — 담기는 것', () => {
  it('모든 종류를 하나로 담는다', () => {
    const out = buildExport(filled, new Date('2026-08-21T00:00:00Z'))
    expect(out.app).toBe('life-os')
    expect(out.version).toBe(EXPORT_VERSION)
    expect(out.exportedAt).toBe('2026-08-21T00:00:00.000Z')
    expect(out.checkins).toHaveLength(2)
    expect(out.nights).toHaveLength(1)
    expect(out.eventLog['2026-08-20']).toEqual(['클라이밍', '야근'])
  })

  it('개수를 세어 같이 넣는다', () => {
    const counts = countsOf(filled)
    expect(counts.checkins).toBe(2)
    expect(counts.weights).toBe(1)
    expect(counts.eventDays).toBe(1)
    expect(counts.questDays).toBe(1)
    expect(totalRecords(counts)).toBeGreaterThan(0)
  })

  it('빈 기록도 터지지 않는다', () => {
    expect(totalRecords(countsOf(base))).toBe(0)
    expect(() => exportJson(buildExport(base))).not.toThrow()
    expect(() => exportCsv(base)).not.toThrow()
  })

  it('JSON 은 다시 읽을 수 있다', () => {
    const parsed = JSON.parse(exportJson(buildExport(filled)))
    expect(parsed.checkins[0].date).toBe('2026-08-20')
    expect(parsed.prefs).toBeDefined()
  })
})

describe('내보내기 — CSV', () => {
  it('머리줄과 하루 한 줄로 만든다', () => {
    const lines = exportCsv(filled).trim().split('\n')
    expect(lines[0]).toContain('date')
    // 기록이 있는 날 2개
    expect(lines).toHaveLength(3)
  })

  it('최신 날짜가 위로 온다', () => {
    const lines = exportCsv(filled).trim().split('\n')
    expect(lines[1].startsWith('﻿') ? lines[1].slice(1) : lines[1]).toContain('2026-08-20')
    expect(lines[2]).toContain('2026-08-19')
  })

  it('쉼표가 들어간 글이 칸을 깨뜨리지 않는다', () => {
    const tricky: ExportInput = {
      ...base,
      checkins: [c('2026-08-20', { memo: '점심, 산책, 그리고 커피' })],
    }
    const line = exportCsv(tricky).trim().split('\n')[1]
    expect(line).toContain('"점심, 산책, 그리고 커피"')
  })

  it('따옴표가 들어간 글도 살린다', () => {
    const tricky: ExportInput = {
      ...base,
      checkins: [c('2026-08-20', { memo: '"괜찮은" 하루' })],
    }
    expect(exportCsv(tricky)).toContain('"""괜찮은"" 하루"')
  })

  it('줄바꿈이 들어간 글이 줄을 늘리지 않는다', () => {
    const tricky: ExportInput = {
      ...base,
      checkins: [c('2026-08-20', { memo: '첫 줄\n둘째 줄' })],
    }
    // 머리줄 + 값 안의 줄바꿈 1개 = 3줄이지만, 따옴표로 묶여 있어야 한다
    expect(exportCsv(tricky)).toContain('"첫 줄\n둘째 줄"')
  })

  it('퀘스트를 이름으로 풀어서 적는다', () => {
    const csv = exportCsv(filled)
    expect(csv).toContain('물 한 잔 마시기 x3')
    expect(csv).toContain('5분만 치우기')
  })

  it('밤 기록과 태그도 같은 줄에 붙는다', () => {
    const line = exportCsv(filled).trim().split('\n')[1]
    expect(line).toContain('클라이밍 · 야근')
    expect(line).toContain('회의가 길었다')
  })

  it('없는 값은 0 이 아니라 빈칸으로 둔다', () => {
    const line = exportCsv(filled).trim().split('\n')[2]
    const cells = line.split(',')
    // 2026-08-19 는 잠을 안 적었다
    expect(cells[7]).toBe('')
  })

  it('한글이 깨지지 않게 BOM 을 붙인다', () => {
    expect(exportCsv(filled).startsWith('﻿')).toBe(true)
  })

  it('기록이 하나만 있는 종류의 날도 줄을 만든다', () => {
    const onlyWeight: ExportInput = {
      ...base,
      weights: [
        { id: 'w', userId: 'u', date: '2026-07-01', weightKg: 60, createdAt: '', updatedAt: '' } as WeightLog,
      ],
    }
    expect(exportCsv(onlyWeight).trim().split('\n')).toHaveLength(2)
  })
})

describe('내보내기 — 파일 이름', () => {
  it('날짜가 들어간 이름을 만든다', () => {
    expect(exportFileName('json', '2026-08-21')).toBe('life-os-2026-08-21.json')
    expect(exportFileName('csv', '2026-08-21')).toBe('life-os-2026-08-21.csv')
  })
})
