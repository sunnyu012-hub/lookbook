import type { Checkin, CheckinInput, CheckinRow, Pain5, Scale5 } from '@/types'
import { calcEnergyScore, scoreToMode } from './energy'

export function rowToCheckin(row: CheckinRow): Checkin {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    sleepHours: Number(row.sleep_hours),
    sleepQuality: row.sleep_quality as Scale5,
    fatigue: row.fatigue as Scale5,
    bodyPain: row.body_pain as Pain5,
    mood: row.mood as Scale5,
    focus: row.focus as Scale5,
    appetite: row.appetite as Scale5,
    caffeineConsumed: row.caffeine_consumed,
    caffeineTime: row.caffeine_time,
    exercise: row.exercise,
    exerciseType: row.exercise_type,
    memo: row.memo,
    energyScore: row.energy_score,
    mode: row.mode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** insert/upsert 용 payload. 점수는 항상 저장 직전에 다시 계산한다. */
export function inputToRow(input: CheckinInput, userId: string) {
  const energyScore = calcEnergyScore(input)
  return {
    user_id: userId,
    date: input.date,
    sleep_hours: input.sleepHours,
    sleep_quality: input.sleepQuality,
    fatigue: input.fatigue,
    body_pain: input.bodyPain,
    mood: input.mood,
    focus: input.focus,
    appetite: input.appetite,
    caffeine_consumed: input.caffeineConsumed,
    caffeine_time: input.caffeineConsumed ? input.caffeineTime || null : null,
    exercise: input.exercise,
    exercise_type: input.exercise ? input.exerciseType || null : null,
    memo: input.memo?.trim() ? input.memo.trim() : null,
    energy_score: energyScore,
    mode: scoreToMode(energyScore),
    updated_at: new Date().toISOString(),
  }
}
