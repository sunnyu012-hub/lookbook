/**
 * My Tag 저장소 — 사용자가 직접 만들고 보는 자유 태그.
 *
 * 합치기(merge)는 과거 기록의 태그 id 를 고쳐 쓰지 않는다.
 * "이건 저기로 합쳐졌다" 만 남기고 읽을 때 따라간다 — 기록을 나중에 뜯어고치지 않기 위해서다.
 */
import type { MyTag, MyTagInput } from '../os2/types'
import { SCHEMA_VERSION } from '../os2/versions'
import { supabase } from '../supabase'
import { LOCAL_USER_ID } from '../env'
import { currentUserId, localCollection, newId, nowIso } from './base'

export const MY_TAGS_TABLE = 'my_tags'

interface MyTagRow {
  id: string
  user_id: string
  name: string
  color: string | null
  emoji: string | null
  is_favorite: boolean
  use_count: number
  last_used_at: string | null
  merged_into_id: string | null
  archived_at: string | null
  schema_version: number
  created_at: string
  updated_at: string
}

const rowTo = (r: MyTagRow): MyTag => ({
  id: r.id,
  userId: r.user_id,
  name: r.name,
  color: r.color,
  emoji: r.emoji,
  isFavorite: r.is_favorite,
  useCount: r.use_count,
  lastUsedAt: r.last_used_at,
  mergedIntoId: r.merged_into_id,
  archivedAt: r.archived_at,
  schemaVersion: r.schema_version ?? SCHEMA_VERSION,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const local = localCollection<MyTag>('life-os:my-tags:v1')

/** 이름이 같은지 — 앞뒤 공백과 대소문자는 무시한다 */
export const sameName = (a: string, b: string) =>
  a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase()

/** 살아 있는 태그만 (합쳐진 것·보관한 것 제외) */
export const isActive = (t: MyTag) => !t.mergedIntoId && !t.archivedAt

/** 자주 쓰는 것 → 최근 쓴 것 → 이름 순 */
export function sortTags(tags: MyTag[]): MyTag[] {
  return [...tags].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
    if (a.useCount !== b.useCount) return b.useCount - a.useCount
    const at = a.lastUsedAt ?? ''
    const bt = b.lastUsedAt ?? ''
    if (at !== bt) return at < bt ? 1 : -1
    return a.name.localeCompare(b.name)
  })
}

export const myTagRepository = {
  async list(): Promise<MyTag[]> {
    if (!supabase) return local.all()

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(MY_TAGS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('use_count', { ascending: false })

    if (error) throw new Error(error.message)
    return (data as MyTagRow[]).map(rowTo)
  },

  /**
   * 같은 이름이 이미 있으면 그걸 돌려준다.
   * "클라이밍" 과 "클라이밍 " 이 따로 생기면 통계가 갈라진다.
   */
  async create(input: MyTagInput): Promise<MyTag> {
    const name = input.name.trim()
    if (!name) throw new Error('태그 이름을 적어 주세요.')

    if (!supabase) {
      const items = local.all()
      const existing = items.find((t) => isActive(t) && sameName(t.name, name))
      if (existing) return existing

      const next: MyTag = {
        id: newId(),
        userId: LOCAL_USER_ID,
        name,
        color: input.color ?? null,
        emoji: input.emoji ?? null,
        isFavorite: input.isFavorite ?? false,
        useCount: 0,
        lastUsedAt: null,
        mergedIntoId: null,
        archivedAt: null,
        schemaVersion: SCHEMA_VERSION,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      local.write([...items, next])
      return next
    }

    const userId = await currentUserId()

    // 서버에도 부분 유니크 인덱스가 있지만, 먼저 찾아보는 게 사용자에게 자연스럽다
    const { data: found } = await supabase
      .from(MY_TAGS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .is('merged_into_id', null)
      .is('archived_at', null)
      .ilike('name', name)
      .maybeSingle()
    if (found) return rowTo(found as MyTagRow)

    const { data, error } = await supabase
      .from(MY_TAGS_TABLE)
      .insert({
        user_id: userId,
        name,
        color: input.color ?? null,
        emoji: input.emoji ?? null,
        is_favorite: input.isFavorite ?? false,
        schema_version: SCHEMA_VERSION,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return rowTo(data as MyTagRow)
  },

  async update(id: string, patch: Partial<MyTagInput>): Promise<MyTag> {
    if (!supabase) {
      const items = local.all()
      const existing = items.find((t) => t.id === id)
      if (!existing) throw new Error('태그를 찾지 못했어요.')
      const next: MyTag = {
        ...existing,
        ...patch,
        name: patch.name?.trim() || existing.name,
        updatedAt: nowIso(),
      }
      local.write(items.map((t) => (t.id === id ? next : t)))
      return next
    }

    const userId = await currentUserId()
    const { data, error } = await supabase
      .from(MY_TAGS_TABLE)
      .update({
        ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
        ...(patch.color !== undefined ? { color: patch.color } : {}),
        ...(patch.emoji !== undefined ? { emoji: patch.emoji } : {}),
        ...(patch.isFavorite !== undefined ? { is_favorite: patch.isFavorite } : {}),
        updated_at: nowIso(),
      })
      .eq('user_id', userId)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return rowTo(data as MyTagRow)
  },

  /**
   * 쓴 횟수를 올린다.
   * 실패해도 조용히 넘어간다 — 통계용 숫자 하나 때문에 기록 저장이 막히면 안 된다.
   */
  async touch(ids: string[]): Promise<void> {
    if (ids.length === 0) return

    if (!supabase) {
      const items = local.all()
      const at = nowIso()
      local.write(
        items.map((t) =>
          ids.includes(t.id) ? { ...t, useCount: t.useCount + 1, lastUsedAt: at } : t,
        ),
      )
      return
    }

    const db = supabase
    const userId = await currentUserId()
    const at = nowIso()
    await Promise.all(
      ids.map(async (id) => {
        const { data } = await db
          .from(MY_TAGS_TABLE)
          .select('use_count')
          .eq('user_id', userId)
          .eq('id', id)
          .maybeSingle()
        const next = ((data as { use_count: number } | null)?.use_count ?? 0) + 1
        await db
          .from(MY_TAGS_TABLE)
          .update({ use_count: next, last_used_at: at })
          .eq('user_id', userId)
          .eq('id', id)
      }),
    ).catch(() => undefined)
  },

  /** 지우지 않고 보관한다 — 과거 기록에 붙어 있는 태그가 사라지면 안 된다 */
  async archive(id: string): Promise<void> {
    if (!supabase) {
      const items = local.all()
      local.write(
        items.map((t) => (t.id === id ? { ...t, archivedAt: nowIso(), updatedAt: nowIso() } : t)),
      )
      return
    }

    const userId = await currentUserId()
    const { error } = await supabase
      .from(MY_TAGS_TABLE)
      .update({ archived_at: nowIso(), updated_at: nowIso() })
      .eq('user_id', userId)
      .eq('id', id)

    if (error) throw new Error(error.message)
  },
}
