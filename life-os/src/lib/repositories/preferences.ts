/**
 * 개인 설정.
 *
 * 목표 체중, Mounjaro 시작일 / 용량 / 주기, 연애 시작일 같은 개인적인 값은
 * 전부 여기(=DB)에만 있다. 코드 어디에도 하드코딩하지 않는다.
 * 아래 DEFAULTS 에는 "누구에게나 같은" 일반 기본값만 들어간다.
 */
import type { Preferences } from '@/types'
import { supabase } from '../supabase'
import { currentUserId, localObject } from './base'

export const PREFERENCES_TABLE = 'user_preferences'

export const DEFAULT_PREFERENCES: Preferences = {
  displayName: null,
  lifeOsStartDate: null,
  heightCm: null,
  startingWeightKg: null,
  goalWeightKg: null,
  mounjaroEnabled: false,
  mounjaroStartDate: null,
  mounjaroDoseMg: null,
  mounjaroIntervalDays: 7,
  relationshipEnabled: false,
  relationshipStartDate: null,
  partnerName: null,
  sleepGoalHours: 8,
  favoriteQuests: [],
}

interface PreferencesRow {
  user_id: string
  display_name: string | null
  life_os_start_date: string | null
  height_cm: number | null
  starting_weight_kg: number | null
  goal_weight_kg: number | null
  mounjaro_enabled: boolean
  mounjaro_start_date: string | null
  mounjaro_dose_mg: number | null
  mounjaro_interval_days: number
  relationship_enabled: boolean
  relationship_start_date: string | null
  partner_name: string | null
  sleep_goal_hours: number
  favorite_quests: string[] | null
}

const n = (v: unknown): number | null =>
  v === null || v === undefined || v === '' ? null : Number(v)

function rowToPreferences(row: PreferencesRow): Preferences {
  return {
    displayName: row.display_name,
    lifeOsStartDate: row.life_os_start_date,
    heightCm: n(row.height_cm),
    startingWeightKg: n(row.starting_weight_kg),
    goalWeightKg: n(row.goal_weight_kg),
    mounjaroEnabled: Boolean(row.mounjaro_enabled),
    mounjaroStartDate: row.mounjaro_start_date,
    mounjaroDoseMg: n(row.mounjaro_dose_mg),
    mounjaroIntervalDays: Number(row.mounjaro_interval_days ?? DEFAULT_PREFERENCES.mounjaroIntervalDays),
    relationshipEnabled: Boolean(row.relationship_enabled),
    relationshipStartDate: row.relationship_start_date,
    partnerName: row.partner_name,
    sleepGoalHours: Number(row.sleep_goal_hours ?? DEFAULT_PREFERENCES.sleepGoalHours),
    favoriteQuests: row.favorite_quests ?? [],
  }
}

function toRow(p: Preferences, userId: string) {
  return {
    user_id: userId,
    display_name: p.displayName?.trim() || null,
    life_os_start_date: p.lifeOsStartDate || null,
    height_cm: p.heightCm,
    starting_weight_kg: p.startingWeightKg,
    goal_weight_kg: p.goalWeightKg,
    mounjaro_enabled: p.mounjaroEnabled,
    mounjaro_start_date: p.mounjaroStartDate || null,
    mounjaro_dose_mg: p.mounjaroDoseMg,
    mounjaro_interval_days: p.mounjaroIntervalDays,
    relationship_enabled: p.relationshipEnabled,
    relationship_start_date: p.relationshipStartDate || null,
    partner_name: p.partnerName?.trim() || null,
    sleep_goal_hours: p.sleepGoalHours,
    favorite_quests: p.favoriteQuests ?? [],
    updated_at: new Date().toISOString(),
  }
}

const local = localObject<Preferences>('life-os:preferences:v1')

export const preferencesRepository = {
  async get(): Promise<Preferences> {
    if (!supabase) return { ...DEFAULT_PREFERENCES, ...(local.read() ?? {}) }

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(PREFERENCES_TABLE)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data ? rowToPreferences(data as PreferencesRow) : { ...DEFAULT_PREFERENCES }
  },

  async save(next: Preferences): Promise<Preferences> {
    if (!supabase) {
      local.write(next)
      return next
    }

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(PREFERENCES_TABLE)
      .upsert(toRow(next, userId), { onConflict: 'user_id' })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return rowToPreferences(data as PreferencesRow)
  },
}
