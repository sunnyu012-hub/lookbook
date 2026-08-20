import type { Checkin, CheckinInput, CheckinRow, EntryMode, Pain5, Scale5 } from '@/types'
import { DEFAULT_SCORE_CONTEXT, scoreCheckin, type ScoreContext } from './scoring'

const n = (v: number | null | undefined): number | null =>
  v === null || v === undefined ? null : Number(v)

const s5 = (v: number | null) => (v === null ? null : (v as Scale5))
const p5 = (v: number | null) => (v === null ? null : (v as Pain5))

export function rowToCheckin(row: CheckinRow): Checkin {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    entryMode: (row.entry_mode ?? 'detailed') as EntryMode,

    sleepHours: n(row.sleep_hours),
    wakeFreshness: s5(n(row.wake_freshness)),
    sleepQuality: s5(n(row.sleep_quality)),
    fatigue: s5(n(row.fatigue)),

    bodyPain: p5(n(row.body_pain)),
    headache: p5(n(row.headache)),
    nausea: p5(n(row.nausea)),
    bloating: p5(n(row.bloating)),
    digestion: s5(n(row.digestion)),

    mood: s5(n(row.mood)),
    focus: s5(n(row.focus)),
    stress: s5(n(row.stress)),
    anxiety: s5(n(row.anxiety)),
    motivation: s5(n(row.motivation)),
    socialEnergy: s5(n(row.social_energy)),

    appetite: s5(n(row.appetite)),
    mealsCount: n(row.meals_count),
    mealQuality: s5(n(row.meal_quality)),
    caffeineConsumed: row.caffeine_consumed,
    caffeineTime: row.caffeine_time,
    caffeineMg: n(row.caffeine_mg),
    alcohol: row.alcohol,
    alcoholUnits: n(row.alcohol_units),

    exercise: row.exercise,
    exerciseType: row.exercise_type,
    exerciseMinutes: n(row.exercise_minutes),
    exerciseIntensity: s5(n(row.exercise_intensity)),
    workHours: n(row.work_hours),
    screenMinutes: n(row.screen_minutes),
    outdoor: row.outdoor,

    tags: row.tags ?? [],
    highlight: row.highlight,
    memo: row.memo,

    energyScore: n(row.energy_score),
    mode: row.mode,
    recoveryScore: n(row.recovery_score),
    bodyScore: n(row.body_score),
    mindScore: n(row.mind_score),
    fuelScore: n(row.fuel_score),
    confidence: n(row.confidence),

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** 빈 문자열은 null 로 (사용자가 지운 값을 0 으로 바꿔 버리지 않도록) */
const orNull = <T,>(v: T | null | undefined): T | null =>
  v === undefined || v === '' ? null : (v as T | null)

const text = (v: string | null | undefined) => {
  const t = v?.trim()
  return t ? t : null
}

/** insert/upsert 용 payload. 점수는 항상 저장 직전에 다시 계산한다. */
export function inputToRow(
  input: CheckinInput,
  userId: string,
  ctx: ScoreContext = DEFAULT_SCORE_CONTEXT,
) {
  const score = scoreCheckin(input, ctx)
  return {
    user_id: userId,
    date: input.date,
    entry_mode: input.entryMode ?? 'detailed',

    sleep_hours: orNull(input.sleepHours),
    wake_freshness: orNull(input.wakeFreshness),
    sleep_quality: orNull(input.sleepQuality),
    fatigue: orNull(input.fatigue),

    body_pain: orNull(input.bodyPain),
    headache: orNull(input.headache),
    nausea: orNull(input.nausea),
    bloating: orNull(input.bloating),
    digestion: orNull(input.digestion),

    mood: orNull(input.mood),
    focus: orNull(input.focus),
    stress: orNull(input.stress),
    anxiety: orNull(input.anxiety),
    motivation: orNull(input.motivation),
    social_energy: orNull(input.socialEnergy),

    appetite: orNull(input.appetite),
    meals_count: orNull(input.mealsCount),
    meal_quality: orNull(input.mealQuality),
    caffeine_consumed: orNull(input.caffeineConsumed),
    caffeine_time: input.caffeineConsumed ? text(input.caffeineTime) : null,
    caffeine_mg: input.caffeineConsumed ? orNull(input.caffeineMg) : null,
    alcohol: orNull(input.alcohol),
    alcohol_units: input.alcohol ? orNull(input.alcoholUnits) : null,

    exercise: orNull(input.exercise),
    exercise_type: input.exercise ? text(input.exerciseType) : null,
    exercise_minutes: input.exercise ? orNull(input.exerciseMinutes) : null,
    exercise_intensity: input.exercise ? orNull(input.exerciseIntensity) : null,
    work_hours: orNull(input.workHours),
    screen_minutes: orNull(input.screenMinutes),
    outdoor: orNull(input.outdoor),

    tags: input.tags ?? [],
    highlight: text(input.highlight),
    memo: text(input.memo),

    energy_score: score.overall,
    mode: score.mode,
    recovery_score: score.dimensions.recovery,
    body_score: score.dimensions.body,
    mind_score: score.dimensions.mind,
    fuel_score: score.dimensions.fuel,
    confidence: score.confidence,

    updated_at: new Date().toISOString(),
  }
}

/** 로컬 저장소용 — DB 를 거치지 않고 점수만 붙인다 */
export function inputToCheckin(
  input: CheckinInput,
  base: Pick<Checkin, 'id' | 'userId' | 'createdAt'>,
  ctx: ScoreContext = DEFAULT_SCORE_CONTEXT,
): Checkin {
  const score = scoreCheckin(input, ctx)
  return {
    ...input,
    entryMode: input.entryMode ?? 'detailed',
    tags: input.tags ?? [],
    highlight: text(input.highlight),
    memo: text(input.memo),
    ...base,
    energyScore: score.overall,
    mode: score.mode,
    recoveryScore: score.dimensions.recovery,
    bodyScore: score.dimensions.body,
    mindScore: score.dimensions.mind,
    fuelScore: score.dimensions.fuel,
    confidence: score.confidence,
    updatedAt: new Date().toISOString(),
  }
}
