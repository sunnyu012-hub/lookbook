import type {
  AppState,
  AreaId,
  Category,
  CategoryStats,
  DailyLog,
  DayStat,
  Difficulty,
  NpcId,
  Quest,
  RepeatRule,
  Routine,
} from '@/types'
import { AREA_IDS, CATEGORIES, DIFFICULTIES, NPC_IDS } from '@/types'
import { emptyCategoryStats } from '@/lib/stats'
import type { StateRepository } from './repository'
import { createDefaultState } from './defaultState'
import {
  STATE_VERSION,
  sanitizeAreaId,
  sanitizeBattles,
  sanitizeBuffs,
  sanitizeClassId,
  sanitizeEquipped,
  sanitizeInventory,
  sanitizeNpcs,
  sanitizeReputation,
  sanitizeSkills,
  sanitizeStats,
  withSkillPoints,
} from './migrate'

const STORAGE_KEY = 'little-life-v1'

/**
 * 저장된 JSON 은 예전 버전일 수도 있고 손으로 고쳐졌을 수도 있다.
 * 값 하나가 깨졌다고 앱이 흰 화면이 되면 안 되니까 읽을 때 한 번 걸러낸다.
 * 사용자에게는 오류를 보여주지 않고 조용히 기본값으로 메운다.
 */

function numberOr(value: unknown, fallback: number, min = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.max(min, Math.floor(value))
}

function sanitizeQuest(raw: unknown): Quest | null {
  if (!raw || typeof raw !== 'object') return null
  const q = raw as Record<string, unknown>

  const id = typeof q.id === 'string' ? q.id : null
  const title = typeof q.title === 'string' ? q.title.trim() : ''
  if (!id || !title) return null

  const category = CATEGORIES.includes(q.category as Category) ? (q.category as Category) : 'LIFE'
  const difficulty = DIFFICULTIES.includes(q.difficulty as Difficulty)
    ? (q.difficulty as Difficulty)
    : 'NORMAL'
  const completed = q.completed === true
  const createdAt = typeof q.createdAt === 'string' ? q.createdAt : new Date().toISOString()
  const completedAt = typeof q.completedAt === 'string' ? q.completedAt : null

  return {
    id,
    title,
    category,
    difficulty,
    exp: numberOr(q.exp, 0),
    completed,
    createdAt,
    // 완료 표시는 있는데 시각이 없으면 생성 시각으로 메운다.
    completedAt: completed ? (completedAt ?? createdAt) : null,
    ...(typeof q.routineId === 'string' ? { routineId: q.routineId } : {}),
    ...(typeof q.snoozedUntil === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.snoozedUntil)
      ? { snoozedUntil: q.snoozedUntil }
      : {}),
    // 예전 퀘스트에는 없던 항목. 없으면 내가 만든 것으로 본다.
    questType: q.questType === 'NPC' ? 'NPC' : 'DAILY',
    // NPC 의뢰라면 누가 부탁했고 몇 번째 단계인지
    ...(typeof q.npcId === 'string' && NPC_IDS.includes(q.npcId as NpcId)
      ? { npcId: q.npcId as NpcId }
      : {}),
    ...(typeof q.chainId === 'string' ? { chainId: q.chainId } : {}),
    ...(typeof q.step === 'number' ? { step: numberOr(q.step, 1, 1) } : {}),
    ...(typeof q.totalSteps === 'number' ? { totalSteps: numberOr(q.totalSteps, 1, 1) } : {}),
    ...(q.reward && typeof q.reward === 'object' ? { reward: sanitizeReward(q.reward) } : {}),
  }
}

function sanitizeRule(raw: unknown): RepeatRule | null {
  if (!raw || typeof raw !== 'object') return null
  const rule = raw as Record<string, unknown>

  if (rule.kind === 'daily') return { kind: 'daily' }
  if (rule.kind === 'weekdays') return { kind: 'weekdays' }
  if (rule.kind === 'days') {
    const days = Array.isArray(rule.days)
      ? [...new Set(rule.days.filter((d): d is number => typeof d === 'number' && d >= 0 && d <= 6))]
      : []
    return { kind: 'days', days }
  }
  return null
}

function sanitizeRoutine(raw: unknown): Routine | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const id = typeof r.id === 'string' ? r.id : null
  const title = typeof r.title === 'string' ? r.title.trim() : ''
  const rule = sanitizeRule(r.rule)
  if (!id || !title || !rule) return null

  return {
    id,
    title,
    category: CATEGORIES.includes(r.category as Category) ? (r.category as Category) : 'LIFE',
    difficulty: DIFFICULTIES.includes(r.difficulty as Difficulty)
      ? (r.difficulty as Difficulty)
      : 'NORMAL',
    rule,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
    lastSpawnedOn:
      typeof r.lastSpawnedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.lastSpawnedOn)
        ? r.lastSpawnedOn
        : null,
    paused: r.paused === true,
  }
}

function sanitizeReward(raw: unknown): Quest['reward'] {
  const r = (raw ?? {}) as Record<string, unknown>
  const buffs = sanitizeBuffs(r.usedBuff ? [r.usedBuff] : [])

  return {
    exp: numberOr(r.exp, 0),
    coins: numberOr(r.coins, 0),
    statKey: typeof r.statKey === 'string' ? (r.statKey as never) : null,
    ...(typeof r.droppedItemId === 'string' ? { droppedItemId: r.droppedItemId } : {}),
    // 되돌리기가 정확히 반대로 돌리려면 그때 뭘 올렸는지도 알아야 한다
    ...(typeof r.areaId === 'string' && AREA_IDS.includes(r.areaId as AreaId)
      ? { areaId: r.areaId as AreaId }
      : {}),
    ...(typeof r.reputation === 'number' ? { reputation: numberOr(r.reputation, 0) } : {}),
    ...(typeof r.npcId === 'string' && NPC_IDS.includes(r.npcId as NpcId)
      ? { npcId: r.npcId as NpcId }
      : {}),
    ...(typeof r.friendship === 'number' ? { friendship: numberOr(r.friendship, 0) } : {}),
    ...(buffs.length > 0 ? { usedBuff: buffs[0] } : {}),
  }
}

function sanitizeCategoryStats(raw: unknown): CategoryStats {
  const stats = emptyCategoryStats()
  if (!raw || typeof raw !== 'object') return stats
  const source = raw as Record<string, unknown>
  for (const c of CATEGORIES) {
    stats[c] = numberOr(source[c], 0)
  }
  return stats
}

function sanitizeDailyLog(raw: unknown): DailyLog {
  if (!raw || typeof raw !== 'object') return {}
  const source = raw as Record<string, unknown>
  const log: DailyLog = {}

  for (const [key, value] of Object.entries(source)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue
    if (!value || typeof value !== 'object') continue
    const entry = value as Record<string, unknown>

    const byCategorySource = (entry.byCategory ?? {}) as Record<string, unknown>
    const byCategory: DayStat['byCategory'] = {}
    for (const c of CATEGORIES) {
      const exp = numberOr(byCategorySource[c], 0)
      if (exp > 0) byCategory[c] = exp
    }

    log[key] = {
      completed: numberOr(entry.completed, 0),
      exp: numberOr(entry.exp, 0),
      byCategory,
    }
  }

  return log
}

function sanitizeState(raw: unknown): AppState | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Record<string, unknown>
  const user = (s.user ?? {}) as Record<string, unknown>

  // 스킬 포인트는 저장된 값을 믿지 않고 레벨에서 다시 계산한다 (migrate.withSkillPoints)
  return withSkillPoints({
    version: STATE_VERSION,
    user: {
      name: typeof user.name === 'string' && user.name.trim() ? user.name.trim() : 'Yuli',
      level: numberOr(user.level, 1, 1),
      currentExp: numberOr(user.currentExp, 0),
      totalExp: numberOr(user.totalExp, 0),
      totalCompletedQuests: numberOr(user.totalCompletedQuests, 0),
      // v2 에는 없던 항목들. 없으면 기본값으로 채우고 있으면 그대로 둔다.
      coins: numberOr(user.coins, 0),
      classId: sanitizeClassId(user.classId),
      stats: sanitizeStats(user.stats),
      equippedItems: sanitizeEquipped(user.equippedItems),
      currentAreaId: sanitizeAreaId(user.currentAreaId),
      // v3 에는 없던 항목들
      skillPoints: 0,
      unlockedSkills: sanitizeSkills(user.unlockedSkills),
      activeBuffs: sanitizeBuffs(user.activeBuffs),
    },
    quests: Array.isArray(s.quests)
      ? s.quests.map(sanitizeQuest).filter((q): q is Quest => q !== null)
      : [],
    // v1 에는 없던 항목이라 기본값으로 채운다
    routines: Array.isArray(s.routines)
      ? s.routines.map(sanitizeRoutine).filter((r): r is Routine => r !== null)
      : [],
    inventory: sanitizeInventory(s.inventory),
    battles: sanitizeBattles(s.battles, CATEGORIES),
    categoryStats: sanitizeCategoryStats(s.categoryStats),
    dailyLog: sanitizeDailyLog(s.dailyLog),
    welcomeGiftGiven: s.welcomeGiftGiven === true,
    npcs: sanitizeNpcs(s.npcs),
    reputation: sanitizeReputation(s.reputation),
  })
}

export class LocalStorageRepository implements StateRepository {
  async load(): Promise<AppState | null> {
    let raw: string | null = null
    try {
      raw = window.localStorage.getItem(STORAGE_KEY)
    } catch (error) {
      // 시크릿 모드 등 localStorage 를 못 쓰는 경우에도 앱은 그냥 돌아가야 한다.
      console.error('[little-life] 저장소를 읽지 못했습니다.', error)
      return null
    }

    if (!raw) return null

    try {
      return sanitizeState(JSON.parse(raw))
    } catch (error) {
      console.error('[little-life] 저장된 데이터가 손상되어 기본값으로 시작합니다.', error)
      return null
    }
  }

  async save(state: AppState): Promise<void> {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.error('[little-life] 저장하지 못했습니다.', error)
    }
  }

  async clear(): Promise<void> {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('[little-life] 저장소를 비우지 못했습니다.', error)
    }
  }
}

/** 앱 전체가 쓰는 단일 저장소. Supabase 로 바꿀 때 이 한 줄만 교체한다. */
export const repository: StateRepository = new LocalStorageRepository()

export { STORAGE_KEY, createDefaultState }
