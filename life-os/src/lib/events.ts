/**
 * 오늘 있었던 일 태그.
 *
 * 하루를 한 번에 설명하는 가장 빠른 방법. 점수를 매기지 않고, 있었던 일만 고른다.
 * 나중에 패턴 발견과 My Manual 이 이 태그를 재료로 쓴다 —
 * 다만 "관련이 있었다" 수준으로만 말한다. 원인이라고 말하지 않는다.
 */
import type { PixelAsset } from './pixelAssets'
import { effects as fx, gear, icons, items, pets } from './pixelAssets'

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
