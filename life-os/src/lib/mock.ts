/** 로컬 모드에서 화면을 검증하기 위한 샘플 데이터 생성기. 실제 기록과 섞이지 않게 명시적으로만 호출한다. */
import type { Checkin, CheckinInput, Pain5, Scale5 } from '@/types'
import { addDays, todayKey } from './date'
import { calcEnergyScore, scoreToMode } from './energy'
import { LOCAL_USER_ID } from './env'
import { localStore } from './localStore'

/** 시드 기반 의사난수 — 새로고침해도 같은 데이터가 나오도록 */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const pick5 = (r: number): Scale5 => (Math.min(5, Math.max(1, Math.round(r * 4 + 1))) as Scale5)

const EXERCISES = ['걷기', '요가', '러닝', '헬스', '클라이밍']
const MEMOS = ['늦게 잤다', '회의가 많았던 날', '컨디션 괜찮음', '카페인 과다', '']

export function generateMockCheckins(days = 34): Checkin[] {
  const rand = rng(20260819)
  const out: Checkin[] = []

  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(todayKey(), -i)
    if (i > 0 && rand() < 0.12) continue // 기록을 건너뛴 날 (오늘은 항상 채운다)

    const wave = Math.sin((days - i) / 3.2) * 0.22
    const base = Math.min(0.92, Math.max(0.08, rand() * 0.5 + 0.22 + wave))
    const exercise = rand() < 0.42

    const input: CheckinInput = {
      date,
      sleepHours: Math.round((4.5 + base * 3.5 + rand() * 0.8) * 2) / 2,
      sleepQuality: pick5(base),
      fatigue: pick5(1 - base),
      bodyPain: Math.round(rand() * (1 - base) * 4) as Pain5,
      mood: pick5(base * 0.8 + rand() * 0.2),
      focus: pick5(base * 0.85 + rand() * 0.15),
      appetite: pick5(rand()),
      caffeineConsumed: rand() < 0.7,
      caffeineTime: rand() < 0.5 ? '09:30' : '14:00',
      exercise,
      exerciseType: exercise ? EXERCISES[Math.floor(rand() * EXERCISES.length)] : null,
      memo: MEMOS[Math.floor(rand() * MEMOS.length)] || null,
    }

    const energyScore = calcEnergyScore(input)
    const stamp = new Date().toISOString()
    out.push({
      ...input,
      id: `mock-${date}`,
      userId: LOCAL_USER_ID,
      energyScore,
      mode: scoreToMode(energyScore),
      createdAt: stamp,
      updatedAt: stamp,
    })
  }
  return out
}

/** 로컬 저장소에 샘플 데이터를 채운다 (기존 로컬 기록은 대체된다) */
export function seedMockData(days = 34) {
  localStore.replaceAll(generateMockCheckins(days))
}
