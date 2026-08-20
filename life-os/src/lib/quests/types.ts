/** 퀘스트 시스템의 공용 타입. */
import type { EnergyMode } from '@/types'
import type { PixelAsset } from '../pixelAssets'

export type QuestCategory =
  | 'care'
  | 'food'
  | 'home'
  | 'mind'
  | 'work'
  | 'style'
  | 'love'
  | 'social'
  | 'fun'
  | 'growth'
  | 'move'
  | 'climbing'
  | 'recovery'
  | 'life'
  | 'memory'
  | 'cozy'

export type Difficulty = 'tiny' | 'easy' | 'normal' | 'big'

/** 난이도별 기본 XP — 사용자가 직접 XP 를 정하지 못하게 여기서만 계산한다 */
export const XP_BY_DIFFICULTY: Record<Difficulty, number> = {
  tiny: 3,
  easy: 5,
  normal: 8,
  big: 13,
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  tiny: '1~2분',
  easy: '5분',
  normal: '10~20분',
  big: '조금 큰 일',
}

export interface Quest {
  id: string
  title: string
  category: QuestCategory
  difficulty: Difficulty
  /** 하루에 여러 번 할 수 있는 퀘스트 */
  repeatable?: boolean
  /** 반복 퀘스트가 XP 를 받는 하루 최대 횟수 (넘어도 기록은 된다) */
  dailyXpLimit?: number
  /** 이 모드일 때 특히 잘 어울리는 퀘스트 */
  modes?: EnergyMode[]
  /** 이 이벤트 태그가 있는 날 잘 어울리는 퀘스트 */
  events?: string[]
}

export interface CategoryMeta {
  key: QuestCategory
  label: string
  ko: string
  icon: PixelAsset
  tint: string
  accent: string
}

/** 이름에 {partner} 가 있으면 설정에 적어 둔 이름으로 바꿔 준다 */
export const questTitle = (quest: Quest, partner?: string | null) =>
  quest.title.replace('{partner}', partner?.trim() || '그 사람')

export const questXp = (quest: Quest) => XP_BY_DIFFICULTY[quest.difficulty]
