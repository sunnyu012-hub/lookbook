/** 로컬 모드에서 화면을 검증하기 위한 샘플 데이터 생성기. 실제 기록과 섞이지 않게 명시적으로만 호출한다. */
import type {
  Checkin,
  CheckinInput,
  LifeEvent,
  MounjaroLog,
  Pain5,
  Scale5,
  WeightLog,
} from '@/types'
import { addDays, todayKey } from './date'
import { LOCAL_USER_ID } from './env'
import { localStore } from './localStore'
import { inputToCheckin } from './mappers'

/** 시드 기반 의사난수 — 새로고침해도 같은 데이터가 나오도록 */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const pick5 = (r: number): Scale5 => (Math.min(5, Math.max(1, Math.round(r * 4 + 1))) as Scale5)
const pain = (r: number): Pain5 => (Math.min(5, Math.max(0, Math.round(r * 5))) as Pain5)

const EXERCISES = ['걷기', '요가', '러닝', '헬스', '클라이밍']
const MEMOS = ['늦게 잤다', '회의가 많았던 날', '컨디션 괜찮음', '카페인 과다', '']
const TAGS = ['집', '회사', '데이트', '약속', '혼자']

export function generateMockCheckins(days = 34): Checkin[] {
  const rand = rng(20260819)
  const out: Checkin[] = []

  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(todayKey(), -i)
    if (i > 0 && rand() < 0.12) continue // 기록을 건너뛴 날 (오늘은 항상 채운다)

    const wave = Math.sin((days - i) / 3.2) * 0.22
    const base = Math.min(0.92, Math.max(0.08, rand() * 0.5 + 0.22 + wave))
    const exercise = rand() < 0.42
    const detailed = rand() < 0.6

    const input: CheckinInput = {
      date,
      entryMode: detailed ? 'detailed' : 'quick',
      sleepHours: Math.round((4.5 + base * 3.5 + rand() * 0.8) * 2) / 2,
      sleepQuality: pick5(base),
      fatigue: pick5(1 - base),
      bodyPain: pain(rand() * (1 - base)),
      mood: pick5(base * 0.8 + rand() * 0.2),
      focus: pick5(base * 0.85 + rand() * 0.15),
      appetite: pick5(rand()),
      caffeineConsumed: rand() < 0.7,
      caffeineTime: rand() < 0.5 ? '09:30' : '14:00',
      exercise,
      exerciseType: exercise ? EXERCISES[Math.floor(rand() * EXERCISES.length)] : null,
      memo: MEMOS[Math.floor(rand() * MEMOS.length)] || null,
      tags: rand() < 0.5 ? [TAGS[Math.floor(rand() * TAGS.length)]] : [],
    }

    if (detailed) {
      Object.assign(input, {
        stress: pick5(1 - base),
        anxiety: pick5(1 - base * 0.9),
        motivation: pick5(base),
        socialEnergy: pick5(rand()),
        headache: pain(rand() * (1 - base) * 0.7),
        nausea: pain(rand() * 0.4),
        bloating: pain(rand() * 0.5),
        digestion: pick5(base * 0.7 + rand() * 0.3),
        mealsCount: Math.round(1 + rand() * 2),
        mealQuality: pick5(base),
        outdoor: rand() < 0.5,
        alcohol: rand() < 0.15,
        highlight: rand() < 0.25 ? '기억에 남는 일이 있었다' : null,
      })
    }

    const stamp = new Date().toISOString()
    out.push(inputToCheckin(input, { id: `mock-${date}`, userId: LOCAL_USER_ID, createdAt: stamp }))
  }
  return out
}

export function generateMockWeights(days = 60): WeightLog[] {
  const rand = rng(77120)
  const out: WeightLog[] = []
  let w = 68
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(todayKey(), -i)
    w -= 0.035 + rand() * 0.03
    if (rand() < 0.35) continue
    const stamp = new Date().toISOString()
    out.push({
      id: `mock-w-${date}`,
      userId: LOCAL_USER_ID,
      date,
      weightKg: Math.round((w + (rand() - 0.5) * 0.7) * 10) / 10,
      bodyFatPct: null,
      muscleKg: null,
      note: null,
      createdAt: stamp,
      updatedAt: stamp,
    })
  }
  return out
}

export function generateMockMounjaro(weeks = 8): MounjaroLog[] {
  const out: MounjaroLog[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const date = addDays(todayKey(), -(i * 7 + 2))
    const stamp = new Date().toISOString()
    out.push({
      id: `mock-m-${date}`,
      userId: LOCAL_USER_ID,
      date,
      doseMg: i > 4 ? 2.5 : 5,
      injectionSite: '복부',
      takenAt: '21:00',
      sideEffects: i % 3 === 0 ? ['메스꺼움'] : [],
      note: null,
      createdAt: stamp,
      updatedAt: stamp,
    })
  }
  return out
}

export function generateMockLifeEvents(): LifeEvent[] {
  const rand = rng(4242)
  const seeds: { offset: number; title: string; category: LifeEvent['category'] }[] = [
    { offset: 2, title: '같이 저녁 먹은 날', category: 'love' },
    { offset: 6, title: '클라이밍 처음 성공', category: 'play' },
    { offset: 11, title: '마감 끝!', category: 'work' },
    { offset: 18, title: '주말 여행', category: 'travel' },
    { offset: 25, title: '병원 다녀옴', category: 'health' },
  ]
  return seeds.map((s) => {
    const date = addDays(todayKey(), -s.offset)
    const stamp = new Date().toISOString()
    return {
      id: `mock-e-${date}`,
      userId: LOCAL_USER_ID,
      date,
      title: s.title,
      category: s.category,
      detail: null,
      mood: pick5(rand()),
      createdAt: stamp,
      updatedAt: stamp,
    }
  })
}

/** 로컬 저장소에 샘플 데이터를 채운다 (기존 로컬 기록은 대체된다) */
export function seedMockData(days = 34) {
  localStore.replaceAll(generateMockCheckins(days))
  localStorage.setItem('life-os:weights:v1', JSON.stringify(generateMockWeights()))
  localStorage.setItem('life-os:mounjaro:v1', JSON.stringify(generateMockMounjaro()))
  localStorage.setItem('life-os:life-events:v1', JSON.stringify(generateMockLifeEvents()))
}
