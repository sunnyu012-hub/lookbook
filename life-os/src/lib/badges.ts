/**
 * 배지 도감.
 *
 * 배지는 저장하지 않고 기록에서 매번 계산한다 — 어긋날 일이 없고,
 * 나중에 조건을 고쳐도 예전 기록에 바로 반영된다.
 * "새로 열렸다" 연출만 브라우저에 본 목록을 남겨서 판단한다.
 */
import type { Checkin, LifeEvent, MounjaroLog, NightCheckout, WeightLog } from '@/types'
import type { PixelAsset } from './pixelAssets'
import { effects as fx, gear, icons, items, pets } from './pixelAssets'
import { loggingStreak } from './xp'
import { todayKey } from './date'

export type BadgeGroup = 'start' | 'quest' | 'log' | 'life' | 'secret'

export interface Badge {
  id: string
  name: string
  /** 조건 설명. 비밀 배지는 열리기 전까지 감춘다 */
  hint: string
  group: BadgeGroup
  icon: PixelAsset
  secret?: boolean
  /** 진행도가 있는 배지 */
  goal?: number
}

export interface BadgeState extends Badge {
  earned: boolean
  progress: number
}

export interface BadgeInput {
  checkins: Checkin[]
  nights: NightCheckout[]
  weights: WeightLog[]
  mounjaro: MounjaroLog[]
  lifeEvents: LifeEvent[]
  /** date → 이벤트 태그 */
  eventLog: Record<string, string[]>
  /** 퀘스트 완료 총 횟수 */
  questsDone: number
  /** 발견한 패턴 수 */
  discoveries: number
  level: number
  /** 오늘의 목표를 해낸 날 수 */
  focusDays?: number
  /** 저장된 주간 돌아보기 수 */
  weeklyResets?: number
  /** 열린 Life Tree Node 수 */
  treeNodes?: number
}

interface Rule extends Badge {
  progressOf: (input: BadgeInput) => number
}

const RULES: Rule[] = [
  // ── 시작
  { id: 'first-day', name: 'FIRST DAY', hint: '첫 기록을 남기면', group: 'start', icon: fx.sparkle01,
    goal: 1, progressOf: (i) => i.checkins.length },
  { id: 'first-quest', name: 'FIRST STEP', hint: '퀘스트 하나 완료', group: 'start', icon: icons.xp,
    goal: 1, progressOf: (i) => i.questsDone },
  { id: 'first-tag', name: 'WHAT HAPPENED', hint: '오늘 있었던 일 한 번 적기', group: 'start', icon: icons.camera,
    goal: 1, progressOf: (i) => Object.values(i.eventLog).filter((t) => t.length > 0).length },
  { id: 'first-night', name: 'FIRST NIGHT', hint: '밤 마무리 한 번', group: 'start', icon: pets.catCurl,
    goal: 1, progressOf: (i) => i.nights.length },
  { id: 'first-tree', name: 'FIRST BRANCH', hint: 'Life Tree 한 칸 열기', group: 'start', icon: fx.rainbow,
    goal: 1, progressOf: (i) => i.treeNodes ?? 0 },
  { id: 'early-bird', name: 'EARLY BIRD', hint: '아침 기록 10번', group: 'start', icon: icons.sleep,
    goal: 10, progressOf: (i) => i.checkins.length },
  { id: 'good-night', name: 'GOOD NIGHT', hint: '밤 마무리 10번', group: 'start', icon: pets.catCurl,
    goal: 10, progressOf: (i) => i.nights.length },
  { id: 'full-day', name: 'FULL DAY', hint: '아침과 밤을 같은 날 다 적기 5번', group: 'start', icon: icons.energy,
    goal: 5, progressOf: (i) => {
      const nights = new Set(i.nights.map((n) => n.date))
      return i.checkins.filter((c) => nights.has(c.date)).length
    } },

  // ── 오늘의 목표
  { id: 'focus-1', name: 'ON TARGET', hint: '오늘의 목표 한 번 해내기', group: 'quest', icon: fx.sparkle02,
    goal: 1, progressOf: (i) => i.focusDays ?? 0 },
  { id: 'focus-7', name: 'SEVEN FOCUS', hint: '오늘의 목표 7번', group: 'quest', icon: fx.flower,
    goal: 7, progressOf: (i) => i.focusDays ?? 0 },
  { id: 'weekly-1', name: 'LOOKING BACK', hint: '주간 돌아보기 한 번', group: 'log', icon: pets.catSit,
    goal: 1, progressOf: (i) => i.weeklyResets ?? 0 },
  { id: 'weekly-4', name: 'A MONTH BACK', hint: '주간 돌아보기 4번', group: 'log', icon: icons.log,
    goal: 4, progressOf: (i) => i.weeklyResets ?? 0 },

  // ── 퀘스트
  { id: 'quest-beginner', name: 'QUEST BEGINNER', hint: '퀘스트 10개 완료', group: 'quest', icon: icons.xp,
    goal: 10, progressOf: (i) => i.questsDone },
  { id: 'quest-hunter', name: 'QUEST HUNTER', hint: '퀘스트 50개 완료', group: 'quest', icon: icons.xp,
    goal: 50, progressOf: (i) => i.questsDone },
  { id: 'quest-master', name: 'QUEST MASTER', hint: '퀘스트 100개 완료', group: 'quest', icon: fx.sparkle02,
    goal: 100, progressOf: (i) => i.questsDone },
  { id: 'quest-maniac', name: 'QUEST MANIAC', hint: '퀘스트 500개 완료', group: 'quest', icon: fx.rainbow,
    goal: 500, progressOf: (i) => i.questsDone },

  // ── 기록
  { id: 'life-logger', name: 'LIFE LOGGER', hint: '30일 기록', group: 'log', icon: icons.log,
    goal: 30, progressOf: (i) => i.checkins.length },
  { id: 'deep-logger', name: 'DEEP LOGGER', hint: '자세한 기록 30번', group: 'log', icon: icons.focus,
    goal: 30, progressOf: (i) => i.checkins.filter((c) => c.entryMode === 'detailed').length },
  { id: 'streak-7', name: 'ONE WEEK', hint: '7일 연속 기록', group: 'log', icon: icons.home,
    goal: 7, progressOf: (i) => loggingStreak(i.checkins.map((c) => c.date), todayKey()) },
  { id: 'streak-30', name: 'ONE MONTH', hint: '30일 연속 기록', group: 'log', icon: fx.heart,
    goal: 30, progressOf: (i) => loggingStreak(i.checkins.map((c) => c.date), todayKey()) },
  { id: 'explorer', name: 'EXPLORER', hint: '이벤트 태그 10종 사용', group: 'log', icon: icons.camera,
    goal: 10, progressOf: (i) => new Set(Object.values(i.eventLog).flat()).size },
  { id: 'pattern-hunter', name: 'PATTERN HUNTER', hint: '첫 패턴 발견', group: 'log', icon: fx.sparkle01,
    goal: 1, progressOf: (i) => i.discoveries },

  // ── 생활
  { id: 'weigh-in', name: 'ON THE SCALE', hint: '체중 20번 기록', group: 'life', icon: items.milk,
    goal: 20, progressOf: (i) => i.weights.length },
  { id: 'memory-keeper', name: 'MEMORY KEEPER', hint: '있었던 일 20개 기록', group: 'life', icon: icons.music,
    goal: 20, progressOf: (i) => i.lifeEvents.length },
  { id: 'level-10', name: 'LV.10', hint: '레벨 10 도달', group: 'life', icon: icons.energy,
    goal: 10, progressOf: (i) => i.level },
  { id: 'level-25', name: 'LV.25', hint: '레벨 25 도달', group: 'life', icon: fx.rainbow,
    goal: 25, progressOf: (i) => i.level },

  // ── 비밀
  { id: 'night-owl', name: 'STILL UP', hint: '???', group: 'secret', secret: true, icon: pets.catBox,
    goal: 5, progressOf: (i) => i.checkins.filter((c) => (c.sleepHours ?? 9) < 5).length },
  { id: 'climber', name: 'CLIMB MORE', hint: '???', group: 'secret', secret: true, icon: icons.climbing,
    goal: 10, progressOf: (i) => Object.values(i.eventLog).filter((t) => t.includes('클라이밍')).length },
  { id: 'together', name: 'TOGETHER', hint: '???', group: 'secret', secret: true, icon: fx.heartBubble,
    goal: 10, progressOf: (i) => Object.values(i.eventLog).filter((t) => t.includes('데이트')).length },
  { id: 'walker', name: 'WALKED FAR', hint: '???', group: 'secret', secret: true, icon: gear.sneakers,
    goal: 15, progressOf: (i) => i.checkins.filter((c) => c.exercise).length },
  { id: 'perfect-day', name: 'PERFECT DAY', hint: '???', group: 'secret', secret: true, icon: fx.sparkle02,
    goal: 1, progressOf: (i) => i.nights.filter((n) => n.daySatisfaction === 5).length },
]

export const ALL_BADGES: Badge[] = RULES.map(({ progressOf: _p, ...b }) => b)

export function evaluateBadges(input: BadgeInput): BadgeState[] {
  return RULES.map(({ progressOf, ...badge }) => {
    const progress = progressOf(input)
    return { ...badge, progress, earned: progress >= (badge.goal ?? 1) }
  })
}

export const earnedCount = (states: BadgeState[]) => states.filter((b) => b.earned).length

const SEEN_KEY = 'life-os:seen-badges:v1'

/** 새로 열린 배지 (연출용). 확인하면 본 목록에 넣는다. */
export function newlyEarned(states: BadgeState[]): BadgeState[] {
  try {
    const seen = new Set<string>(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]'))
    return states.filter((b) => b.earned && !seen.has(b.id))
  } catch {
    return []
  }
}

export function markSeen(states: BadgeState[]): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(states.filter((b) => b.earned).map((b) => b.id)))
  } catch {
    /* 저장 못 해도 앱 동작에는 영향 없음 */
  }
}

export const BADGE_GROUP_LABEL: Record<BadgeGroup, string> = {
  start: '시작',
  quest: '퀘스트',
  log: '기록',
  life: '생활',
  secret: '비밀',
}
