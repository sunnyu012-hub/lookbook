import type { PromptKey } from './types'

export type PromptMeta = {
  label: string
  /** 빈 칸에 뜨는 말. 숙제처럼 읽히지 않게 아주 작은 예를 든다. */
  hint: string
  emoji: string
  /** 칸 색 — 다섯 칸을 손가락으로 구분하게 */
  tint: string
  dot: string
}

export const PROMPT_META: Record<PromptKey, PromptMeta> = {
  good: {
    label: '오늘 잘한 거',
    hint: '작아도 돼요. 미룬 걸 하나 한 거, 제때 잔 거.',
    emoji: '👏',
    tint: 'bg-butter-soft',
    dot: 'bg-butter',
  },
  thanks: {
    label: '감사한 거',
    hint: '누가, 뭐가 고마웠나요.',
    emoji: '🌿',
    tint: 'bg-mint-soft',
    dot: 'bg-mint',
  },
  expect: {
    label: '내일 기대되는 거',
    hint: '아침 커피 한 잔도 기대되는 거예요.',
    emoji: '🌤',
    tint: 'bg-sky-soft',
    dot: 'bg-sky',
  },
  toTomorrow: {
    label: '내일의 나에게',
    hint: '내일 이 앱을 열면 맨 위에 떠 있어요.',
    emoji: '✉️',
    tint: 'bg-plum-soft',
    dot: 'bg-plum',
  },
  note: {
    label: '짧은 일기',
    hint: '한 줄이어도 충분해요.',
    emoji: '🖊',
    tint: 'bg-sunken',
    dot: 'bg-inkfaint',
  },
}

export const MOODS: { value: number; emoji: string; label: string }[] = [
  { value: 1, emoji: '😔', label: '힘들었어' },
  { value: 2, emoji: '😐', label: '그냥 그래' },
  { value: 3, emoji: '🙂', label: '괜찮아' },
  { value: 4, emoji: '😄', label: '좋았어' },
  { value: 5, emoji: '🤩', label: '최고야' },
]

export function moodOf(value: number | null): { emoji: string; label: string } | null {
  return MOODS.find((mood) => mood.value === value) ?? null
}
