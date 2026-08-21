/**
 * LIFE BALANCE — 최근 내 기록이 어느 영역에 쌓였는가.
 *
 * 이건 평가가 아니다.
 *   · 낮은 영역을 "부족하다" 고 하지 않는다. 조용했던 영역이라고 한다.
 *   · 만점도 목표치도 없다. 서로의 비율만 본다.
 *   · 삶은 늘 균형적일 필요가 없다. 바쁜 주에 CREATE 가 큰 건 자연스러운 일이다.
 *
 * 값은 사용자가 입력하지 않는다. 이미 적어 둔 기록에서만 모은다.
 */
import type { Checkin, LifeEvent, NightCheckout } from '@/types'
import {
  DOMAIN_KEYS,
  DOMAIN_META,
  addWeights,
  rankDomains,
  totalWeight,
  type DomainWeights,
  type LifeDomain,
} from '../domains'
import { domainsOfTag } from '../events'
import { domainsOfQuest } from '../quests/domains'
import { questById } from '../quests/master'
import type { DayQuests } from '../quests/master'
import type { Quest } from '../quests/types'
import { recentKeys } from '../date'

/** 기록 행동 하나가 얹는 값 — 퀘스트 완료(1.0)보다 작게 둬서 퀘스트만으로 쏠리지 않게 한다 */
const RECORD_VALUE = 0.5

export interface LifeBalanceInput {
  checkins: Checkin[]
  nights: NightCheckout[]
  lifeEvents: LifeEvent[]
  /** date → 이벤트 태그 */
  eventLog: Record<string, string[]>
  /** date → 그날의 퀘스트 기록 */
  questLog: Record<string, DayQuests>
  customQuests?: Quest[]
  /** 주간 돌아보기에서 고른 영역 (date → domains) */
  weeklyFocus?: Record<string, LifeDomain[]>
  /** 며칠치를 볼 것인가 */
  days?: number
  /** 오늘 (테스트에서 고정하기 위해) */
  today?: string
}

export interface DomainSlice {
  key: LifeDomain
  value: number
  /** 전체 대비 비율 0~1 */
  share: number
  /** 가장 큰 영역 대비 0~1 — 막대 길이에 쓴다 */
  relative: number
}

export interface LifeBalance {
  days: number
  slices: DomainSlice[]
  total: number
  /** 기록이 있는 영역 수 */
  activeCount: number
  /** 가장 기록이 많았던 영역 */
  loudest: LifeDomain | null
  /** 기록이 가장 조용했던 영역 (기록이 아예 없는 영역이 있으면 그쪽) */
  quietest: LifeDomain | null
  /** 화면에 그대로 쓰는 한 줄 */
  headline: string
  /** 표본이 너무 적어 아직 말할 게 없을 때 */
  learning: boolean
}

/** 하루치 기록에서 그날의 분포를 뽑는다 */
export function dayDomains(
  date: string,
  input: Pick<LifeBalanceInput, 'checkins' | 'nights' | 'lifeEvents' | 'eventLog' | 'questLog' | 'customQuests'>,
): DomainWeights {
  let out: DomainWeights = {}
  const custom = input.customQuests ?? []

  // 퀘스트 — 완료 횟수만큼 쌓인다 (XP 상한과 무관하다. 한 일은 한 일이다)
  const day = input.questLog[date]
  if (day) {
    for (const [id, count] of Object.entries(day.completions)) {
      const quest = questById(id, custom)
      if (!quest || count <= 0) continue
      const w = domainsOfQuest(quest)
      for (const [k, v] of Object.entries(w) as [LifeDomain, number][]) {
        out = addWeights(out, { [k]: v * count })
      }
    }
  }

  // 이벤트 태그
  for (const tag of input.eventLog[date] ?? []) {
    out = addWeights(out, domainsOfTag(tag))
  }

  // 아침 기록 — 적었다는 사실 자체가 MIND 에 쌓인다
  const checkin = input.checkins.find((c) => c.date === date)
  if (checkin) {
    out = addWeights(out, { mind: RECORD_VALUE })
    // 몸을 움직였다고 적은 날
    if (checkin.exercise) out = addWeights(out, { body: RECORD_VALUE })
    // 밖에 나갔다고 적은 날
    if (checkin.outdoor) out = addWeights(out, { joy: RECORD_VALUE })
    // 끼니를 적은 날
    if (checkin.mealsCount != null || checkin.appetite != null) {
      out = addWeights(out, { nourish: RECORD_VALUE })
    }
    // 잠을 적은 날
    if (checkin.sleepHours != null) out = addWeights(out, { recovery: RECORD_VALUE })
    // 오늘 컨디션에 영향을 준 것을 적은 날 — 돌아본 기록이다
    if (checkin.contextNote?.trim()) out = addWeights(out, { mind: RECORD_VALUE })
  }

  // 밤 기록 — 하루를 돌아본 것
  if (input.nights.some((n) => n.date === date)) {
    out = addWeights(out, { mind: RECORD_VALUE, recovery: RECORD_VALUE })
  }

  // 직접 적어 둔 순간
  for (const e of input.lifeEvents.filter((e) => e.date === date)) {
    out = addWeights(out, LIFE_CATEGORY_DOMAINS[e.category] ?? { mind: RECORD_VALUE })
  }

  return out
}

/** 라이프 이벤트 카테고리 → 영역 */
const LIFE_CATEGORY_DOMAINS: Record<string, DomainWeights> = {
  note: { mind: RECORD_VALUE },
  love: { connect: 1, joy: RECORD_VALUE },
  health: { body: 1 },
  work: { create: 1 },
  play: { joy: 1 },
  travel: { joy: 1, connect: RECORD_VALUE },
  milestone: { mind: 1, joy: RECORD_VALUE },
}

/** 이 정도 기록은 있어야 분포를 말한다 */
export const MIN_BALANCE_TOTAL = 3

export function computeLifeBalance(input: LifeBalanceInput): LifeBalance {
  const days = input.days ?? 7
  const dates = recentKeys(days, input.today)

  let sum: DomainWeights = {}
  for (const date of dates) sum = addWeights(sum, dayDomains(date, input))

  // 주간 돌아보기에서 "다음 주에 조금 더 챙기고 싶은 것" 으로 고른 영역
  for (const [date, domains] of Object.entries(input.weeklyFocus ?? {})) {
    if (!dates.includes(date)) continue
    for (const d of domains) sum = addWeights(sum, { [d]: RECORD_VALUE })
  }

  const total = totalWeight(sum)
  const ranked = rankDomains(sum)
  const max = ranked[0]?.value ?? 0

  const slices: DomainSlice[] = DOMAIN_KEYS.map((key) => {
    const value = sum[key] ?? 0
    return {
      key,
      value: Math.round(value * 10) / 10,
      share: total > 0 ? value / total : 0,
      relative: max > 0 ? value / max : 0,
    }
  }).sort((a, b) => b.value - a.value)

  const learning = total < MIN_BALANCE_TOTAL
  const loudest = ranked[0]?.key ?? null
  // 조용한 쪽 — 기록이 아예 없는 영역이 있으면 그중 첫 번째
  const silent = DOMAIN_KEYS.filter((k) => (sum[k] ?? 0) === 0)
  const quietest = silent[0] ?? ranked[ranked.length - 1]?.key ?? null

  return {
    days,
    slices,
    total: Math.round(total * 10) / 10,
    activeCount: ranked.length,
    loudest,
    quietest,
    headline: headlineOf(loudest, quietest, days, learning),
    learning,
  }
}

/**
 * 화면에 그대로 나가는 문장.
 * "부족해요" 대신 "조용했어요" 로만 쓴다 — 낮은 영역은 실패가 아니다.
 */
function headlineOf(
  loudest: LifeDomain | null,
  quietest: LifeDomain | null,
  days: number,
  learning: boolean,
): string {
  const period = days <= 7 ? '이번 주' : `최근 ${days}일`
  if (learning || !loudest) {
    return `${period}는 아직 기록이 적어요. 조금만 더 쌓이면 어디에 시간을 썼는지 보여요.`
  }
  const loud = DOMAIN_META[loudest]
  if (!quietest || quietest === loudest) {
    return `${period}에는 ${loud.label} 쪽에 기록이 많이 쌓였어요.`
  }
  const quiet = DOMAIN_META[quietest]
  return `${period}에는 ${loud.label} 쪽에 기록이 많이 쌓였고, ${quiet.label}는 비교적 조용했어요.`
}

/** 오늘 하루의 분포 — Daily Archive 페이지에 쓴다 */
export function todayDomains(
  date: string,
  input: Pick<LifeBalanceInput, 'checkins' | 'nights' | 'lifeEvents' | 'eventLog' | 'questLog' | 'customQuests'>,
): { key: LifeDomain; value: number }[] {
  return rankDomains(dayDomains(date, input))
}
