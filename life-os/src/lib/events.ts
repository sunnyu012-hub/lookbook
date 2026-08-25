/**
 * 오늘 있었던 일 태그.
 *
 * 하루를 한 번에 설명하는 가장 빠른 방법. 점수를 매기지 않고, 있었던 일만 고른다.
 * 나중에 패턴 발견과 My Manual 이 이 태그를 재료로 쓴다 —
 * 다만 "관련이 있었다" 수준으로만 말한다. 원인이라고 말하지 않는다.
 */
import type { PixelAsset } from './pixelAssets'
import { effects as fx, gear, icons, items, pets } from './pixelAssets'
import type { DomainWeights } from './domains'
import { weightsOf, type DomainMapping } from './domains'

export type EventGroupKey = 'work' | 'activity' | 'social' | 'food' | 'body' | 'life'

export interface EventGroup {
  key: EventGroupKey
  label: string
  ko: string
  icon: PixelAsset
  tint: string
  tags: string[]
}

export const EVENT_GROUPS: EventGroup[] = [
  {
    key: 'work',
    label: 'Work',
    ko: '일',
    icon: icons.work,
    tint: '#EFF1FB',
    tags: ['야근', '바쁜 날', '집중 업무', '회의 많음', '업무 여유', '재택', '출근', '휴일'],
  },
  {
    key: 'activity',
    label: 'Activity',
    ko: '움직임',
    icon: gear.sneakers,
    tint: '#E6F4EA',
    tags: ['클라이밍', '걷기', '러닝', '스트레칭', '운동', '많이 걸음', '집콕', '외출'],
  },
  {
    key: 'social',
    label: 'Social',
    ko: '사람',
    icon: fx.heart,
    tint: '#FDEFF3',
    tags: ['데이트', '친구 만남', '가족', '혼자 시간', '모임', '약속', '전화 많이 함'],
  },
  {
    key: 'food',
    label: 'Food',
    ko: '먹은 것',
    icon: icons.food,
    tint: '#FDEBDC',
    tags: ['외식', '배달', '집밥', '제대로 먹음', '끼니 부족', '간식 많음', '카페인', '늦은 카페인'],
  },
  {
    key: 'body',
    label: 'Body',
    ko: '몸',
    icon: icons.body,
    tint: '#FDE7EC',
    tags: ['근육통', '피곤함', '두통', '어지럼', '몸이 가벼움', '몸이 무거움', '회복 중'],
  },
  {
    key: 'life',
    label: 'Life',
    ko: '생활',
    icon: icons.home,
    tint: '#FDF6EA',
    tags: [
      '쇼핑', '청소', '집안일', '취미', '게임', '콘텐츠 제작', '사진 찍음',
      '옷 꾸밈', '새로운 장소', '좋은 일', '스트레스 이벤트',
    ],
  },
]

/** 기본 태그 전체 */
export const ALL_EVENT_TAGS = EVENT_GROUPS.flatMap((g) => g.tags)

const TAG_GROUP = new Map<string, EventGroup>()
EVENT_GROUPS.forEach((g) => g.tags.forEach((t) => TAG_GROUP.set(t, g)))

/** 태그가 속한 묶음 (사용자가 만든 태그는 '생활' 로 본다) */
export const groupOfTag = (tag: string): EventGroup =>
  TAG_GROUP.get(tag) ?? EVENT_GROUPS[EVENT_GROUPS.length - 1]

export const tintOfTag = (tag: string) => groupOfTag(tag).tint

/** 태그를 대표하는 작은 그림 */
export function iconOfTag(tag: string): PixelAsset {
  if (tag === '클라이밍') return icons.climbing
  if (tag === '데이트') return fx.heart
  if (tag === '카페인' || tag === '늦은 카페인') return icons.caffeine
  if (tag === '집콕' || tag === '재택') return pets.catCurl
  if (tag === '외식' || tag === '배달') return items.onigiri
  return groupOfTag(tag).icon
}

// ─────────────────────────────────────────────
// 태그 → LIFE DOMAIN
//
// 태그는 "오늘 이런 일이 있었다" 라는 사실이다. 잘했다 못했다가 아니라
// 그날의 기록이 어느 영역에 있었는지를 나타낸다.
// 그래서 '끼니 부족' 도 NOURISH 에 쌓인다 — 먹는 일에 관한 기록이기 때문이다.
// ─────────────────────────────────────────────

const TAG_DOMAINS: Record<string, DomainMapping> = {
  // work
  야근: { primary: 'create' },
  '바쁜 날': { primary: 'create' },
  '집중 업무': { primary: 'create' },
  '회의 많음': { primary: 'create', secondary: 'connect' },
  '업무 여유': { primary: 'create', secondary: 'recovery' },
  재택: { primary: 'create', secondary: 'home' },
  출근: { primary: 'create' },
  휴일: { primary: 'recovery' },

  // activity
  클라이밍: { primary: 'body', secondary: 'joy' },
  걷기: { primary: 'body' },
  러닝: { primary: 'body' },
  스트레칭: { primary: 'body', secondary: 'recovery' },
  운동: { primary: 'body' },
  '많이 걸음': { primary: 'body' },
  집콕: { primary: 'home', secondary: 'recovery' },
  외출: { primary: 'joy', secondary: 'body' },

  // social
  데이트: { primary: 'connect', secondary: 'joy' },
  '친구 만남': { primary: 'connect', secondary: 'joy' },
  가족: { primary: 'connect' },
  '혼자 시간': { primary: 'recovery', secondary: 'mind' },
  모임: { primary: 'connect' },
  약속: { primary: 'connect' },
  '전화 많이 함': { primary: 'connect' },

  // food
  외식: { primary: 'nourish', secondary: 'joy' },
  배달: { primary: 'nourish' },
  집밥: { primary: 'nourish', secondary: 'home' },
  '제대로 먹음': { primary: 'nourish' },
  '끼니 부족': { primary: 'nourish' },
  '간식 많음': { primary: 'nourish' },
  카페인: { primary: 'nourish' },
  '늦은 카페인': { primary: 'nourish' },

  // body
  근육통: { primary: 'body' },
  피곤함: { primary: 'recovery' },
  두통: { primary: 'body' },
  어지럼: { primary: 'body' },
  '몸이 가벼움': { primary: 'body' },
  '몸이 무거움': { primary: 'body' },
  '회복 중': { primary: 'recovery' },

  // life
  쇼핑: { primary: 'joy', secondary: 'create' },
  청소: { primary: 'home' },
  집안일: { primary: 'home' },
  취미: { primary: 'joy' },
  게임: { primary: 'joy' },
  '콘텐츠 제작': { primary: 'create', secondary: 'joy' },
  '사진 찍음': { primary: 'joy', secondary: 'create' },
  '옷 꾸밈': { primary: 'create', secondary: 'joy' },
  '새로운 장소': { primary: 'joy' },
  '좋은 일': { primary: 'joy', secondary: 'mind' },
  '스트레스 이벤트': { primary: 'mind' },
}

/** 그룹별 기본값 — 사용자가 직접 만든 태그도 그룹을 보고 매핑한다 */
const GROUP_DOMAINS: Record<string, DomainMapping> = {
  work: { primary: 'create' },
  activity: { primary: 'body' },
  social: { primary: 'connect' },
  food: { primary: 'nourish' },
  body: { primary: 'body' },
  life: { primary: 'home' },
}

export function domainsOfTag(tag: string): DomainWeights {
  return weightsOf(TAG_DOMAINS[tag] ?? GROUP_DOMAINS[groupOfTag(tag).key])
}
