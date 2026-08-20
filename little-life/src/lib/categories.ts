import type { Category } from '@/types'
import { CATEGORIES } from '@/types'

export interface CategoryStyle {
  /** 칩·배지 배경 */
  chip: string
  /** 글자색 */
  text: string
  /** 막대 그래프 채움 */
  bar: string
  /** 짧은 한국어 설명 — 퀘스트 만들 때 힌트로 쓴다 */
  hint: string
}

export const CATEGORY_STYLE: Record<Category, CategoryStyle> = {
  LIFE: { chip: 'bg-clay-soft', text: 'text-clay-deep', bar: 'bg-clay', hint: '집안일, 정리, 살림' },
  WORK: { chip: 'bg-dusty-soft', text: 'text-dusty-deep', bar: 'bg-dusty', hint: '일, 공부, 마감' },
  BODY: { chip: 'bg-sage-soft', text: 'text-sage-deep', bar: 'bg-sage', hint: '운동, 산책, 잠' },
  PLAY: { chip: 'bg-butter-soft', text: 'text-butter-deep', bar: 'bg-butter', hint: '취미, 놀이, 딴짓' },
  MIND: { chip: 'bg-lilac-soft', text: 'text-lilac-deep', bar: 'bg-lilac', hint: '독서, 기록, 명상' },
  HEART: { chip: 'bg-pink-soft', text: 'text-pink-deep', bar: 'bg-pink', hint: '사람, 마음, 다정함' },
}

export const CATEGORY_LIST = CATEGORIES

export function categoryStyle(category: Category): CategoryStyle {
  return CATEGORY_STYLE[category]
}
