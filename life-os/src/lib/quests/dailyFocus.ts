/**
 * TODAY'S FOCUS — 오늘 하루의 작은 목표 하나.
 *
 * 왜 만들었나: 퀘스트 목록만 있으면 매일이 똑같아 보인다.
 * 날마다 결이 다른 목표가 하나 있으면 "오늘은 이런 날" 이 생긴다.
 *
 * 규칙
 *   · 목표는 항상 작다 (2~4개). 못 해도 아무 일도 일어나지 않는다.
 *   · 실패 표현을 쓰지 않는다. 안 하면 그냥 내일 다른 게 온다.
 *   · 오늘의 결(Capacity)을 본다. REST DAY 에 큰 목표를 주지 않는다.
 *   · 보상은 "해낸 행동" 에만 붙는다. 건강 수치와는 무관하다.
 */
import type { CapacityType } from '../wellness/capacity'
import { DOMAIN_META, type LifeDomain } from '../domains'
import type { PixelAsset } from '../pixelAssets'
import { effects as fx, icons } from '../pixelAssets'
import { mappingOfQuest } from './domains'
import { questById, type Completions } from './master'
import type { Quest } from './types'

/** 오늘의 목표를 해내면 붙는 보너스 */
export const FOCUS_BONUS_XP = 6

export type FocusKind = 'domain' | 'tiny' | 'variety' | 'fresh' | 'record'

export interface FocusDef {
  kind: FocusKind
  /** 화면에 크게 나가는 이름 */
  title: string
  /** 무엇을 하면 되는지 한 줄 */
  detail: string
  icon: PixelAsset
  tint: string
  accent: string
  target: number
  domain?: LifeDomain
}

export interface DailyFocus extends FocusDef {
  id: string
  progress: number
  done: boolean
  bonusXp: number
  /** 다 했을 때 보여 줄 한 줄 */
  cheer: string
}

/** 날짜 시드 — 같은 날에는 같은 목표가 나온다 */
const seedOf = (date: string) => {
  let h = 2166136261
  for (let i = 0; i < date.length; i += 1) {
    h ^= date.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** 결마다 목표 크기를 다르게 — 쉬는 날에 숙제를 주지 않는다 */
const TARGET_BY_CAPACITY: Record<CapacityType, { small: number; normal: number }> = {
  REST: { small: 1, normal: 2 },
  GENTLE: { small: 2, normal: 3 },
  STEADY: { small: 2, normal: 3 },
  OPEN: { small: 3, normal: 4 },
}

/** 결마다 어울리는 영역 — 없으면 아무 영역이나 */
const DOMAINS_BY_CAPACITY: Record<CapacityType, LifeDomain[]> = {
  REST: ['recovery', 'nourish', 'mind'],
  GENTLE: ['recovery', 'nourish', 'mind', 'home', 'joy'],
  STEADY: ['home', 'body', 'create', 'connect', 'joy', 'nourish'],
  OPEN: ['create', 'home', 'body', 'connect', 'joy'],
}

const ALL_DOMAINS: LifeDomain[] = [
  'recovery',
  'body',
  'nourish',
  'mind',
  'home',
  'create',
  'connect',
  'joy',
]

export interface FocusInput {
  date: string
  capacity: CapacityType | null
  completions: Completions
  customQuests?: Quest[]
  /** 지금까지 한 번이라도 해본 퀘스트 id */
  everDone?: Set<string>
  /** 아침 기록을 남겼는지 */
  morningDone?: boolean
  /** 밤 마무리를 했는지 */
  nightDone?: boolean
  /** 오늘 태그를 적었는지 */
  taggedToday?: boolean
}

/** 오늘의 목표 하나를 고른다 */
export function todayFocus(input: FocusInput): DailyFocus {
  const capacity = input.capacity ?? 'GENTLE'
  const size = TARGET_BY_CAPACITY[capacity]
  const rand = seedOf(input.date)

  const pool = buildPool(capacity, size, rand)
  const def = pool[rand % pool.length]

  const progress = progressOf(def, input)
  const done = progress >= def.target

  return {
    ...def,
    id: `${input.date}:${def.kind}${def.domain ? `:${def.domain}` : ''}`,
    progress: Math.min(progress, def.target),
    done,
    bonusXp: FOCUS_BONUS_XP,
    cheer: CHEERS[rand % CHEERS.length],
  }
}

const CHEERS = [
  '오늘 목표 하나 해냈어요.',
  '이걸로 오늘 하루는 충분해요.',
  '작은 거 하나, 잘 챙겼어요.',
  '오늘의 결에 맞게 잘 갔어요.',
]

function buildPool(
  capacity: CapacityType,
  size: { small: number; normal: number },
  rand: number,
): FocusDef[] {
  const domains = DOMAINS_BY_CAPACITY[capacity]
  const domain = domains[rand % domains.length]
  const meta = DOMAIN_META[domain]

  const pool: FocusDef[] = [
    {
      kind: 'domain',
      title: `${meta.ko} 쪽으로`,
      detail: `${meta.label} 퀘스트 ${size.normal}개`,
      icon: meta.icon,
      tint: meta.tint,
      accent: meta.accent,
      target: size.normal,
      domain,
    },
    {
      kind: 'tiny',
      title: '작은 것부터',
      detail: `1~2분짜리 퀘스트 ${size.normal}개`,
      icon: fx.sparkle02,
      tint: '#FDF4D6',
      accent: '#DFB63F',
      target: size.normal,
    },
    {
      kind: 'variety',
      title: '여기저기 조금씩',
      detail: `서로 다른 영역 ${size.small + 1}곳`,
      icon: fx.rainbow,
      tint: '#E6F4EA',
      accent: '#7DB994',
      target: size.small + 1,
    },
    {
      kind: 'record',
      title: '적어 두는 날',
      detail: '아침 기록 · 오늘 있었던 일 · 밤 마무리',
      icon: icons.save,
      tint: '#EFF1FB',
      accent: '#7B7FC0',
      target: 3,
    },
  ]

  // 쉬는 날에는 "안 해본 것 해보기" 를 넣지 않는다 — 새로 시작하는 건 부담이다
  if (capacity !== 'REST') {
    pool.push({
      kind: 'fresh',
      title: '안 해본 것 하나',
      detail: `처음 해보는 퀘스트 ${size.small}개`,
      icon: fx.flower,
      tint: '#FDEFF3',
      accent: '#DE7E92',
      target: size.small,
    })
  }

  return pool
}

function progressOf(def: FocusDef, input: FocusInput): number {
  const custom = input.customQuests ?? []
  const entries = Object.entries(input.completions).filter(([, n]) => n > 0)

  switch (def.kind) {
    case 'domain': {
      let n = 0
      for (const [id, count] of entries) {
        const quest = questById(id, custom)
        if (!quest) continue
        const m = mappingOfQuest(quest)
        if (m.primary === def.domain || m.secondary === def.domain) n += count
      }
      return n
    }
    case 'tiny':
      return entries.reduce((sum, [id, count]) => {
        const quest = questById(id, custom)
        return quest?.difficulty === 'tiny' ? sum + count : sum
      }, 0)
    case 'variety': {
      const seen = new Set<LifeDomain>()
      for (const [id] of entries) {
        const quest = questById(id, custom)
        if (quest) seen.add(mappingOfQuest(quest).primary)
      }
      return seen.size
    }
    case 'fresh': {
      const ever = input.everDone ?? new Set<string>()
      return entries.filter(([id]) => !ever.has(id)).length
    }
    case 'record':
      return (
        (input.morningDone ? 1 : 0) + (input.taggedToday ? 1 : 0) + (input.nightDone ? 1 : 0)
      )
  }
}

/** 이 퀘스트가 오늘의 목표에 도움이 되는가 — 목록에서 살짝 표시해 준다 */
export function helpsFocus(quest: Quest, focus: DailyFocus | null): boolean {
  if (!focus || focus.done) return false
  switch (focus.kind) {
    case 'domain': {
      const m = mappingOfQuest(quest)
      return m.primary === focus.domain || m.secondary === focus.domain
    }
    case 'tiny':
      return quest.difficulty === 'tiny'
    case 'variety':
    case 'fresh':
      return true
    case 'record':
      return false
  }
}

/** 오늘 목표를 해낸 날들의 보너스 합 (되짚어 계산해도 같은 값) */
export function focusBonusXp(doneDays: number): number {
  return doneDays * FOCUS_BONUS_XP
}

export { ALL_DOMAINS }
