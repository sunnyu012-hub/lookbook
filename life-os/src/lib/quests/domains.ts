/**
 * QUEST → LIFE DOMAIN 매핑.
 *
 * 왜 퀘스트마다 손으로 적지 않고 카테고리 기본값 + 예외로 두는가:
 *   · 퀘스트가 207개다. 하나씩 적으면 새 퀘스트를 추가할 때마다 빠뜨린다.
 *   · 카테고리는 이미 "무슨 결의 행동인가" 를 담고 있어서 기본값으로 딱 맞는다.
 *   · 결이 다른 몇 개만 아래 QUEST_DOMAIN_OVERRIDES 에 적는다.
 * 사용자가 만든 퀘스트도 카테고리만 고르면 자동으로 매핑된다.
 *
 * 한 행동은 최대 2개 영역까지만 연결한다. 값은 주 영역 1, 보조 영역 0.5 를 기본으로 둔다.
 */
import type { DomainWeights, LifeDomain } from '../domains'
import type { Quest, QuestCategory } from './types'

/** 주 영역 1.0 / 보조 영역 0.5 */
export const PRIMARY_VALUE = 1
export const SECONDARY_VALUE = 0.5

export interface DomainMapping {
  primary: LifeDomain
  secondary?: LifeDomain
}

/** 카테고리별 기본 매핑 — 새 퀘스트는 카테고리만 정하면 여기서 따라온다 */
export const CATEGORY_DOMAINS: Record<QuestCategory, DomainMapping> = {
  care: { primary: 'nourish', secondary: 'recovery' },
  food: { primary: 'nourish' },
  home: { primary: 'home' },
  mind: { primary: 'mind' },
  work: { primary: 'create' },
  style: { primary: 'create', secondary: 'joy' },
  love: { primary: 'connect' },
  social: { primary: 'connect' },
  fun: { primary: 'joy' },
  growth: { primary: 'create', secondary: 'mind' },
  move: { primary: 'body' },
  climbing: { primary: 'body', secondary: 'joy' },
  recovery: { primary: 'recovery' },
  life: { primary: 'home', secondary: 'create' },
  memory: { primary: 'connect', secondary: 'mind' },
  cozy: { primary: 'recovery', secondary: 'joy' },
}

/**
 * 카테고리 기본값과 결이 다른 퀘스트들.
 * 대부분 "몸을 쓰지만 즐거움이 큰 것", "집안일이지만 채우는 쪽인 것" 같은 경우다.
 */
export const QUEST_DOMAIN_OVERRIDES: Record<string, DomainMapping> = {
  // 물·수분은 회복이 아니라 채우기 쪽이 맞다
  water: { primary: 'nourish' },
  'fill-bottle': { primary: 'nourish' },
  'water-with-meal': { primary: 'nourish' },

  // 몸을 씻고 정리하는 건 회복에 가깝다
  shower: { primary: 'recovery', secondary: 'nourish' },
  'wash-hair': { primary: 'recovery', secondary: 'nourish' },
  'eye-rest': { primary: 'recovery' },
  'air-out': { primary: 'home', secondary: 'recovery' },
  'open-window': { primary: 'home', secondary: 'recovery' },
  sunlight: { primary: 'recovery', secondary: 'joy' },
  'make-bed': { primary: 'home' },
  'tidy-bed': { primary: 'home' },
  skincare: { primary: 'nourish', secondary: 'joy' },
  lipbalm: { primary: 'nourish', secondary: 'joy' },
  nails: { primary: 'nourish', secondary: 'joy' },

  // 먹는 것을 "적는" 행동은 기록이므로 CREATE 가 붙는다
  'log-food': { primary: 'nourish', secondary: 'create' },
  grocery: { primary: 'nourish', secondary: 'home' },
  'prep-tomorrow': { primary: 'nourish', secondary: 'home' },
  'try-new-food': { primary: 'nourish', secondary: 'joy' },

  // 몸을 쓰는 것 중에 즐거움이 큰 것
  'walk-errand': { primary: 'body', secondary: 'home' },
  'dance-one': { primary: 'body', secondary: 'joy' },
  'climb-log': { primary: 'body', secondary: 'create' },
  'log-move': { primary: 'body', secondary: 'create' },

  // 기록·정리하는 마음 퀘스트는 MIND 안에서 CREATE 가 얹힌다
  'idea-note': { primary: 'create', secondary: 'mind' },
  'brain-dump': { primary: 'mind', secondary: 'create' },
  'photo-scroll': { primary: 'mind', secondary: 'joy' },
  'look-outside': { primary: 'mind', secondary: 'recovery' },

  // 사진·룩을 남기는 건 즐거움 + 기록
  'take-photo': { primary: 'joy', secondary: 'create' },
  'save-photo': { primary: 'joy', secondary: 'create' },
  'sky-photo': { primary: 'joy', secondary: 'create' },
  'week-photo': { primary: 'joy', secondary: 'create' },
  'pet-photo': { primary: 'joy', secondary: 'create' },
  'food-photo': { primary: 'nourish', secondary: 'create' },
  'look-photo': { primary: 'create', secondary: 'joy' },
  'save-look': { primary: 'create', secondary: 'joy' },
  'closet-photo': { primary: 'create', secondary: 'home' },
  'plan-outfit': { primary: 'create' },

  // 함께한 기억을 꺼내 보는 건 연결 쪽이다
  'look-memory': { primary: 'connect', secondary: 'joy' },
  'cute-photo': { primary: 'connect', secondary: 'joy' },
  'backup-photos': { primary: 'home', secondary: 'create' },
}

/** 이 퀘스트가 어느 영역에 쌓이는가 */
export function mappingOfQuest(quest: Pick<Quest, 'id' | 'category'>): DomainMapping {
  return QUEST_DOMAIN_OVERRIDES[quest.id] ?? CATEGORY_DOMAINS[quest.category]
}

/** 한 번 완료했을 때 쌓이는 분포 */
export function domainsOfQuest(quest: Pick<Quest, 'id' | 'category'>): DomainWeights {
  const m = mappingOfQuest(quest)
  const out: DomainWeights = { [m.primary]: PRIMARY_VALUE }
  if (m.secondary) out[m.secondary] = SECONDARY_VALUE
  return out
}
