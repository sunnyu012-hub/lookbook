/**
 * Quick Log 저장소.
 *
 * 시각 처리가 이 파일의 핵심이다.
 *   logged_at  UTC 로 저장한다 (timestamptz)
 *   date       사용자 로컬 기준 YYYY-MM-DD 로 저장한다
 * 둘을 따로 두는 이유: "밤 11시 반 기록" 은 그 사람의 그날 기록이어야 한다.
 * UTC 로 날짜를 자르면 한국에서 자정 근처 기록이 하루씩 밀린다.
 * 그래서 날짜 묶기는 항상 저장해 둔 date 로 하고, 시각 계산만 logged_at 으로 한다.
 */
import type { AppliedLifeTag, DayOfWeek, DayPart, QuickLog, QuickLogInput } from '../os2/types'
import { deriveFields } from '../os2/quickLog'
import { SCHEMA_VERSION } from '../os2/versions'
import { supabase } from '../supabase'
import { LOCAL_USER_ID } from '../env'
import { currentUserId, localCollection, newId, nowIso, num } from './base'

export const QUICK_LOGS_TABLE = 'quick_logs'

interface QuickLogRow {
  id: string
  user_id: string
  mood: number
  text: string | null
  energy: number | null
  focus: number | null
  fatigue: number | null
  photo_path: string | null
  my_tag_ids: string[] | null
  life_tags: AppliedLifeTag[] | null
  logged_at: string
  date: string
  day_of_week: number
  day_part: string
  schema_version: number
  created_at: string
  updated_at: string
}

const rowTo = (r: QuickLogRow): QuickLog => ({
  id: r.id,
  userId: r.user_id,
  mood: r.mood as QuickLog['mood'],
  text: r.text,
  energy: num(r.energy),
  focus: num(r.focus),
  fatigue: num(r.fatigue),
  photoPath: r.photo_path,
  myTagIds: r.my_tag_ids ?? [],
  lifeTags: r.life_tags ?? [],
  loggedAt: r.logged_at,
  date: r.date,
  dayOfWeek: r.day_of_week as DayOfWeek,
  dayPart: r.day_part as DayPart,
  schemaVersion: r.schema_version ?? SCHEMA_VERSION,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const text = (v: string | null | undefined) => {
  const t = v?.trim()
  return t ? t : null
}

/** 입력 하나를 저장할 행으로. 파생값은 항상 여기서 다시 계산한다 */
function toRow(input: QuickLogInput, userId: string, id: string, loggedAt: string) {
  const derived = deriveFields(loggedAt)
  return {
    id,
    user_id: userId,
    mood: input.mood,
    text: text(input.text),
    energy: input.energy ?? null,
    focus: input.focus ?? null,
    fatigue: input.fatigue ?? null,
    photo_path: input.photoPath ?? null,
    my_tag_ids: input.myTagIds ?? [],
    life_tags: input.lifeTags ?? [],
    logged_at: loggedAt,
    date: derived.date,
    day_of_week: derived.dayOfWeek,
    day_part: derived.dayPart,
    schema_version: SCHEMA_VERSION,
    updated_at: nowIso(),
  }
}

const local = localCollection<QuickLog>('life-os:quick-logs:v1')
const byTimeDesc = (a: QuickLog, b: QuickLog) => (a.loggedAt < b.loggedAt ? 1 : -1)
/** 하루 안에서는 시간순 — Supabase 쪽 listByDate 와 방향을 맞춘다 */
const byTimeAsc = (a: QuickLog, b: QuickLog) => (a.loggedAt < b.loggedAt ? -1 : 1)

export const quickLogRepository = {
  /** 최근 것부터. 분석은 나중에 범위로 따로 가져간다 */
  async list(limit = 500): Promise<QuickLog[]> {
    if (!supabase) return local.all().sort(byTimeDesc).slice(0, limit)

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(QUICK_LOGS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    return (data as QuickLogRow[]).map(rowTo)
  },

  async listByDate(date: string): Promise<QuickLog[]> {
    if (!supabase) {
      return local.all().filter((l) => l.date === date).sort(byTimeAsc)
    }

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(QUICK_LOGS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .order('logged_at', { ascending: true })

    if (error) throw new Error(error.message)
    return (data as QuickLogRow[]).map(rowTo)
  },

  /** from·to 는 둘 다 포함한다 (로컬 날짜 기준) */
  async listByRange(from: string, to: string): Promise<QuickLog[]> {
    if (!supabase) {
      return local.all().filter((l) => l.date >= from && l.date <= to).sort(byTimeDesc)
    }

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(QUICK_LOGS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .gte('date', from)
      .lte('date', to)
      .order('logged_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data as QuickLogRow[]).map(rowTo)
  },

  async getById(id: string): Promise<QuickLog | null> {
    if (!supabase) return local.all().find((l) => l.id === id) ?? null

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(QUICK_LOGS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data ? rowTo(data as QuickLogRow) : null
  },

  /**
   * id 를 밖에서 받는다 — 사진 경로에 로그 id 가 들어가기 때문에
   * 저장하기 전에 id 가 정해져 있어야 한다.
   */
  async create(input: QuickLogInput, id: string = newId()): Promise<QuickLog> {
    const loggedAt = input.loggedAt ?? nowIso()

    if (!supabase) {
      const derived = deriveFields(loggedAt)
      const next: QuickLog = {
        ...input,
        ...derived,
        id,
        userId: LOCAL_USER_ID,
        loggedAt,
        text: text(input.text),
        myTagIds: input.myTagIds ?? [],
        lifeTags: input.lifeTags ?? [],
        schemaVersion: SCHEMA_VERSION,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      local.write([...local.all(), next])
      return next
    }

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(QUICK_LOGS_TABLE)
      .insert(toRow(input, userId, id, loggedAt))
      .select()
      .single()

    if (error) throw new Error(error.message)
    return rowTo(data as QuickLogRow)
  },

  async update(id: string, input: QuickLogInput): Promise<QuickLog> {
    const loggedAt = input.loggedAt ?? nowIso()

    if (!supabase) {
      const items = local.all()
      const existing = items.find((l) => l.id === id)
      if (!existing) throw new Error('기록을 찾지 못했어요.')
      const next: QuickLog = {
        ...existing,
        ...input,
        ...deriveFields(loggedAt),
        loggedAt,
        text: text(input.text),
        myTagIds: input.myTagIds ?? [],
        lifeTags: input.lifeTags ?? existing.lifeTags,
        updatedAt: nowIso(),
      }
      local.write(items.map((l) => (l.id === id ? next : l)))
      return next
    }

    const userId = await currentUserId()
    const { id: _omit, user_id: _omitUser, ...patch } = toRow(input, userId, id, loggedAt)
    const { data, error } = await supabase
      .from(QUICK_LOGS_TABLE)
      .update(patch)
      .eq('user_id', userId)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return rowTo(data as QuickLogRow)
  },

  async remove(id: string): Promise<void> {
    if (!supabase) {
      local.write(local.all().filter((l) => l.id !== id))
      return
    }

    const userId = await currentUserId()
    const { error } = await supabase
      .from(QUICK_LOGS_TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('id', id)

    if (error) throw new Error(error.message)
  },

  /** 사진만 따로 붙인다 — 사진 업로드가 늦게 끝나도 기록은 이미 저장돼 있다 */
  async attachPhoto(id: string, photoPath: string): Promise<void> {
    if (!supabase) {
      const items = local.all()
      local.write(
        items.map((l) => (l.id === id ? { ...l, photoPath, updatedAt: nowIso() } : l)),
      )
      return
    }

    const userId = await currentUserId()
    const { error } = await supabase
      .from(QUICK_LOGS_TABLE)
      .update({ photo_path: photoPath, updated_at: nowIso() })
      .eq('user_id', userId)
      .eq('id', id)

    if (error) throw new Error(error.message)
  },
}
