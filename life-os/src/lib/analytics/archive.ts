/**
 * MY ARCHIVE — 내가 어떻게 살아왔는지 검색되는 개인 기록.
 *
 * 여러 종류의 기록을 하나의 줄(ArchiveEntry)로 펴서 검색·필터한다.
 * 다만 Timeline 이 퀘스트로 도배되면 아무것도 안 보이므로,
 * 잔 퀘스트는 하루 요약 한 줄로 묶고 즐겨찾기·큰 퀘스트만 따로 세운다.
 */
import type {
  Checkin,
  LifeEvent,
  MounjaroLog,
  NightCheckout,
  Preferences,
  WeeklyReset,
  WeightLog,
} from '@/types'
import type { PixelAsset } from '../pixelAssets'
import { effects as fx, gear, icons, items, pets } from '../pixelAssets'
import { DOMAIN_META, type LifeDomain } from '../domains'
import { iconOfTag } from '../events'
import { questById, type DayQuests } from '../quests/master'
import { domainsOfQuest } from '../quests/domains'
import { questTitle, type Quest } from '../quests/types'
import { CATEGORY_META as LIFE_CATEGORY_META } from '../lifeCategories'
import { resetLine, weekNumber } from './weeklyReset'
import type { Insight } from './insightEntity'

export type ArchiveKind =
  | 'day'
  | 'mood'
  | 'body'
  | 'sleep'
  | 'weight'
  | 'mounjaro'
  | 'climbing'
  | 'exercise'
  | 'love'
  | 'event'
  | 'quest'
  | 'memory'
  | 'journal'
  | 'context'
  | 'discovery'
  | 'milestone'
  | 'weekly'

export interface ArchiveKindMeta {
  key: ArchiveKind
  label: string
  ko: string
  icon: PixelAsset
}

export const ARCHIVE_KINDS: ArchiveKindMeta[] = [
  { key: 'day', label: 'DAYS', ko: '하루', icon: icons.home },
  { key: 'mood', label: 'MOOD', ko: '기분', icon: icons.mood },
  { key: 'body', label: 'BODY', ko: '몸', icon: icons.body },
  { key: 'sleep', label: 'SLEEP', ko: '잠', icon: icons.sleep },
  { key: 'weight', label: 'WEIGHT', ko: '체중', icon: items.milk },
  { key: 'mounjaro', label: 'MOUNJARO', ko: '투약', icon: icons.log },
  { key: 'climbing', label: 'CLIMBING', ko: '클라이밍', icon: icons.climbing },
  { key: 'exercise', label: 'EXERCISE', ko: '운동', icon: gear.sneakers },
  { key: 'love', label: 'LOVE', ko: '사랑', icon: fx.heart },
  { key: 'event', label: 'EVENTS', ko: '있었던 일', icon: icons.camera },
  { key: 'quest', label: 'QUESTS', ko: '퀘스트', icon: icons.xp },
  { key: 'memory', label: 'MEMORIES', ko: '순간', icon: fx.sparkle01 },
  { key: 'journal', label: 'JOURNAL', ko: '일기', icon: icons.save },
  { key: 'context', label: 'CONTEXT', ko: '그날의 메모', icon: icons.focus },
  { key: 'discovery', label: 'DISCOVERIES', ko: '발견', icon: fx.sparkle02 },
  { key: 'milestone', label: 'MILESTONES', ko: '이정표', icon: fx.rainbow },
  { key: 'weekly', label: 'WEEKLY RESET', ko: '주간 돌아보기', icon: pets.catSit },
]

export const ARCHIVE_KIND_META: Record<ArchiveKind, ArchiveKindMeta> = Object.fromEntries(
  ARCHIVE_KINDS.map((k) => [k.key, k]),
) as Record<ArchiveKind, ArchiveKindMeta>

export interface ArchiveEntry {
  id: string
  date: string
  kind: ArchiveKind
  /** 픽셀 폰트 라벨 */
  title: string
  /** 한 줄 본문 */
  detail: string | null
  icon: PixelAsset
  /** 검색에 쓰는 소문자 문자열 (제목 + 본문 + 태그) */
  haystack: string
  domain?: LifeDomain
  /** 타임라인에서 눈에 띄게 세울 만한 줄인가 */
  notable?: boolean
  /** 숫자 하나 (체중, 점수 등) */
  value?: string
}

export interface ArchiveInput {
  checkins: Checkin[]
  nights: NightCheckout[]
  weights: WeightLog[]
  mounjaro: MounjaroLog[]
  lifeEvents: LifeEvent[]
  eventLog: Record<string, string[]>
  questLog: Record<string, DayQuests>
  customQuests?: Quest[]
  weeklyResets?: WeeklyReset[]
  insights?: Insight[]
  prefs?: Preferences
  /** 즐겨찾는 퀘스트는 하루 요약에 묻지 않고 따로 세운다 */
  favoriteQuests?: string[]
}

const norm = (s: string) => s.toLowerCase()

/** 모든 기록을 한 줄씩 편다 */
export function buildArchive(input: ArchiveInput): ArchiveEntry[] {
  const out: ArchiveEntry[] = []
  const partner = input.prefs?.partnerName
  const favorites = new Set(input.favoriteQuests ?? [])
  const custom = input.customQuests ?? []

  const push = (e: Omit<ArchiveEntry, 'haystack'> & { extra?: string }) => {
    const { extra, ...rest } = e
    out.push({
      ...rest,
      haystack: norm([rest.title, rest.detail ?? '', extra ?? '', rest.value ?? ''].join(' ')),
    })
  }

  // ── 하루 (체크인)
  for (const c of input.checkins) {
    push({
      id: `day:${c.date}`,
      date: c.date,
      kind: 'day',
      title: c.mode ?? 'DAY',
      detail: c.highlight || c.memo || null,
      icon: icons.home,
      value: c.energyScore != null ? `Energy ${c.energyScore}` : undefined,
      extra: (c.tags ?? []).join(' '),
    })

    if (c.mood != null) {
      push({
        id: `mood:${c.date}`,
        date: c.date,
        kind: 'mood',
        title: 'MOOD',
        detail: null,
        icon: icons.mood,
        domain: 'mind',
        value: `${c.mood} / 5`,
      })
    }
    if (c.bodyScore != null) {
      push({
        id: `body:${c.date}`,
        date: c.date,
        kind: 'body',
        title: 'BODY',
        detail: null,
        icon: icons.body,
        domain: 'body',
        value: `Body ${c.bodyScore}`,
      })
    }
    if (c.sleepHours != null) {
      push({
        id: `sleep:${c.date}`,
        date: c.date,
        kind: 'sleep',
        title: 'SLEEP',
        detail: null,
        icon: icons.sleep,
        domain: 'recovery',
        value: `${c.sleepHours}시간`,
      })
    }
    if (c.exercise) {
      push({
        id: `exercise:${c.date}`,
        date: c.date,
        kind: 'exercise',
        title: 'EXERCISE',
        detail: c.exerciseType || null,
        icon: gear.sneakers,
        domain: 'body',
        value: c.exerciseMinutes != null ? `${c.exerciseMinutes}분` : undefined,
        extra: c.exerciseType ?? '',
      })
    }
    if (c.contextNote?.trim()) {
      push({
        id: `context:${c.date}`,
        date: c.date,
        kind: 'context',
        title: 'CONTEXT',
        detail: c.contextNote.trim(),
        icon: icons.focus,
        domain: 'mind',
        notable: true,
      })
    }
  }

  // ── 밤 기록
  for (const n of input.nights) {
    const line = n.diary?.trim() || n.bestThing?.trim() || n.hardestThing?.trim() || null
    if (!line && n.daySatisfaction == null) continue
    push({
      id: `journal:${n.date}`,
      date: n.date,
      kind: 'journal',
      title: 'NIGHT',
      detail: line,
      icon: icons.save,
      domain: 'mind',
      value: n.daySatisfaction != null ? `만족 ${n.daySatisfaction} / 5` : undefined,
      extra: [n.bestThing, n.hardestThing, n.diary].filter(Boolean).join(' '),
      notable: Boolean(line),
    })
  }

  // ── 체중 · 투약
  for (const w of input.weights) {
    push({
      id: `weight:${w.date}`,
      date: w.date,
      kind: 'weight',
      title: 'WEIGHT',
      detail: w.note || null,
      icon: items.milk,
      value: `${w.weightKg}kg`,
    })
  }
  for (const m of input.mounjaro) {
    push({
      id: `mounjaro:${m.date}`,
      date: m.date,
      kind: 'mounjaro',
      title: 'MOUNJARO',
      detail: m.note || null,
      icon: icons.log,
      value: `${m.doseMg}mg`,
      extra: (m.sideEffects ?? []).join(' '),
    })
  }

  // ── 직접 적어 둔 순간
  for (const e of input.lifeEvents) {
    const meta = LIFE_CATEGORY_META[e.category]
    push({
      id: `life:${e.id}`,
      date: e.date,
      kind: e.category === 'milestone' ? 'milestone' : e.category === 'love' ? 'love' : 'memory',
      title: meta?.label?.toUpperCase() ?? 'MEMORY',
      detail: e.title,
      icon: meta?.icon ?? fx.sparkle01,
      notable: true,
      extra: [e.detail, partner].filter(Boolean).join(' '),
    })
  }

  // ── 이벤트 태그
  for (const [date, tags] of Object.entries(input.eventLog)) {
    for (const tag of tags) {
      push({
        id: `tag:${date}:${tag}`,
        date,
        kind: tag === '클라이밍' ? 'climbing' : 'event',
        title: tag,
        detail: null,
        icon: iconOfTag(tag),
        notable: tag === '클라이밍',
      })
    }
  }

  // ── 퀘스트
  // 잔 퀘스트는 하루 한 줄 요약으로 묶는다. 검색은 개별로도 걸린다.
  for (const [date, day] of Object.entries(input.questLog)) {
    const done = Object.entries(day.completions).filter(([, n]) => n > 0)
    if (done.length === 0) continue

    const totalCount = done.reduce((s, [, n]) => s + n, 0)
    push({
      id: `quests:${date}`,
      date,
      kind: 'quest',
      title: 'QUESTS',
      detail: `${totalCount}개 완료`,
      icon: icons.xp,
      value: `${totalCount}`,
    })

    for (const [id, count] of done) {
      const quest = questById(id, custom)
      if (!quest) continue
      const standout = favorites.has(id) || quest.difficulty === 'big'
      const first = Object.keys(domainsOfQuest(quest))[0] as LifeDomain | undefined
      push({
        id: `quest:${date}:${id}`,
        date,
        kind: 'quest',
        title: questTitle(quest, partner),
        detail: count > 1 ? `${count}번` : null,
        icon: icons.xp,
        domain: first,
        notable: standout,
      })
    }
  }

  // ── 주간 돌아보기
  for (const r of input.weeklyResets ?? []) {
    push({
      id: `weekly:${r.weekStart}`,
      date: r.weekEnd,
      kind: 'weekly',
      title: `WEEK ${weekNumber(r.weekStart)}`,
      detail: resetLine(r),
      icon: pets.catSit,
      notable: true,
      extra: [r.goodText, r.hardText, r.moreText].filter(Boolean).join(' '),
    })
  }

  // ── 발견 — 오늘 날짜에 얹는다 (언제 발견됐는지는 기록하지 않는다)
  for (const i of input.insights ?? []) {
    if (i.category === 'STILL_LEARNING') continue
    push({
      id: `insight:${i.id}`,
      date: input.checkins[0]?.date ?? '',
      kind: 'discovery',
      title: i.title,
      detail: i.body,
      icon: i.icon,
      domain: i.domain,
      notable: true,
    })
  }

  return out.filter((e) => e.date).sort((a, b) => (a.date < b.date ? 1 : -1))
}

// ─────────────────────────────────────────────
// 검색 · 필터
// ─────────────────────────────────────────────

export type ArchivePeriod = 7 | 30 | 90 | 'all'

export const PERIOD_LABEL: Record<string, string> = {
  '7': '7일',
  '30': '30일',
  '90': '3개월',
  all: '전체',
}

export interface ArchiveQuery {
  text?: string
  kinds?: ArchiveKind[]
  domains?: LifeDomain[]
  period?: ArchivePeriod
  /** 오늘 (테스트에서 고정) */
  today?: string
}

function withinPeriod(date: string, period: ArchivePeriod, today: string): boolean {
  if (period === 'all') return true
  const from = new Date(`${today}T00:00:00`)
  from.setDate(from.getDate() - (period - 1))
  return new Date(`${date}T00:00:00`) >= from
}

export function searchArchive(
  entries: ArchiveEntry[],
  query: ArchiveQuery,
): ArchiveEntry[] {
  const today = query.today ?? entries[0]?.date ?? ''
  const text = query.text?.trim() ? norm(query.text.trim()) : null
  const kinds = query.kinds?.length ? new Set(query.kinds) : null
  const domains = query.domains?.length ? new Set(query.domains) : null
  const period = query.period ?? 'all'

  return entries.filter((e) => {
    if (text && !e.haystack.includes(text)) return false
    if (kinds && !kinds.has(e.kind)) return false
    if (domains && (!e.domain || !domains.has(e.domain))) return false
    if (today && !withinPeriod(e.date, period, today)) return false
    return true
  })
}

/** 검색 결과를 날짜별로 묶는다 */
export function groupByDate(entries: ArchiveEntry[]): { date: string; items: ArchiveEntry[] }[] {
  const map = new Map<string, ArchiveEntry[]>()
  for (const e of entries) {
    const list = map.get(e.date)
    if (list) list.push(e)
    else map.set(e.date, [e])
  }
  return [...map.entries()]
    .map(([date, items]) => ({ date, items }))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

/**
 * TIMELINE 용 — 개별 퀘스트는 빼고 눈에 띄는 것만.
 * 하루 요약(QUESTS 12개 완료)은 남긴다.
 */
export function timelineEntries(entries: ArchiveEntry[]): ArchiveEntry[] {
  return entries.filter((e) => {
    if (e.id.startsWith('quest:')) return e.notable === true
    if (e.kind === 'mood' || e.kind === 'body' || e.kind === 'sleep') return false
    return true
  })
}

export const domainOptions = () =>
  (Object.keys(DOMAIN_META) as LifeDomain[]).map((k) => DOMAIN_META[k])
