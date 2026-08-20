import type { Category } from '@/types'
import { CATEGORIES } from '@/types'

export interface CategoryStyle {
  /** 칩·배지 배경 (연한 파스텔) */
  chip: string
  /** 그 위에 올라가는 글자색 */
  text: string
  /** 막대 그래프 채움 */
  bar: string
  /** 선택된 필터 칩의 테두리 */
  ring: string
  /** 퀘스트를 만들 때 보여주는 짧은 힌트 */
  hint: string
}

/**
 * 카테고리 색.
 * 여섯 개가 한 화면에 같이 보여도 산만하지 않도록 채도를 낮게 잡았다.
 */
export const CATEGORY_STYLE: Record<Category, CategoryStyle> = {
  LIFE: {
    chip: 'bg-sage-soft',
    text: 'text-sage-deep',
    bar: 'bg-sage',
    ring: 'ring-sage-deep/30',
    hint: '집안일, 정리, 살림',
  },
  WORK: {
    chip: 'bg-dusty-soft',
    text: 'text-dusty-deep',
    bar: 'bg-dusty',
    ring: 'ring-dusty-deep/30',
    hint: '일, 공부, 마감',
  },
  BODY: {
    chip: 'bg-pink-soft',
    text: 'text-pink-deep',
    bar: 'bg-pink',
    ring: 'ring-pink-deep/30',
    hint: '운동, 산책, 잠',
  },
  PLAY: {
    chip: 'bg-butter-soft',
    text: 'text-butter-deep',
    bar: 'bg-butter',
    ring: 'ring-butter-deep/30',
    hint: '취미, 놀이, 딴짓',
  },
  MIND: {
    chip: 'bg-lavender-soft',
    text: 'text-lavender-deep',
    bar: 'bg-lavender',
    ring: 'ring-lavender-deep/30',
    hint: '독서, 기록, 명상',
  },
  HEART: {
    chip: 'bg-rose-soft',
    text: 'text-rose-deep',
    bar: 'bg-rose',
    ring: 'ring-rose-deep/30',
    hint: '사람, 마음, 다정함',
  },
}

export const CATEGORY_LIST = CATEGORIES

export function categoryStyle(category: Category): CategoryStyle {
  return CATEGORY_STYLE[category]
}
