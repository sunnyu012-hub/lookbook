/**
 * 지금 기분은? — Home 최상단의 이모지 한 줄.
 *
 * 누르면 바로 저장하지 않는다. composer 를 편다.
 * 잘못 누른 걸 되돌릴 수 없으면 다음부터 누르기가 무서워진다.
 */
import type { Mood } from '@/lib/os2/types'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

export interface MoodOption {
  value: Mood
  emoji: string
  /** 이모지만으로 뜻을 전하지 않는다 */
  label: string
  tint: string
  accent: string
}

export const MOODS: MoodOption[] = [
  { value: 1, emoji: '😫', label: '매우 안 좋음', tint: '#EFE9FB', accent: '#8B76C9' },
  { value: 2, emoji: '😕', label: '조금 안 좋음', tint: '#EFF1FB', accent: '#7B7FC0' },
  { value: 3, emoji: '😐', label: '보통', tint: '#F3EAE0', accent: '#9C7767' },
  { value: 4, emoji: '🙂', label: '좋음', tint: '#FDF4D6', accent: '#DFB63F' },
  { value: 5, emoji: '🥰', label: '매우 좋음', tint: '#FDEFF3', accent: '#DE7E92' },
]

export const MOOD_BY_VALUE: Record<Mood, MoodOption> = Object.fromEntries(
  MOODS.map((m) => [m.value, m]),
) as Record<Mood, MoodOption>

export function MoodPicker({
  selected,
  onPick,
  size = 'lg',
}: {
  selected?: Mood | null
  onPick: (mood: Mood) => void
  size?: 'lg' | 'sm'
}) {
  return (
    <div
      role="radiogroup"
      aria-label="지금 기분"
      className={cn('flex items-center', size === 'lg' ? 'gap-1.5' : 'gap-1')}
    >
      {MOODS.map((mood) => {
        const on = selected === mood.value
        return (
          <button
            key={mood.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={mood.label}
            onClick={() => {
              haptic()
              onPick(mood.value)
            }}
            className={cn(
              'press flex flex-1 items-center justify-center rounded-px3 border-[1.5px]',
              // 손가락으로 누르는 곳이라 44px 아래로 내려가지 않게 둔다
              size === 'lg' ? 'min-h-[52px] text-[26px]' : 'min-h-[44px] text-[21px]',
              on ? 'shadow-hard' : 'border-transparent bg-cream',
            )}
            style={on ? { borderColor: mood.accent, backgroundColor: mood.tint } : undefined}
          >
            <span aria-hidden>{mood.emoji}</span>
          </button>
        )
      })}
    </div>
  )
}
