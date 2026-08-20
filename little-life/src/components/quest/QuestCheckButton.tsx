import { cn } from '@/components/ui/cn'

interface QuestCheckButtonProps {
  completed: boolean
  onClick?: () => void
  label: string
  size?: 'sm' | 'md'
}

const SIZE = {
  sm: { box: 'h-11 w-11', ring: 'h-9 w-9', icon: 'h-4 w-4' },
  md: { box: 'h-12 w-12', ring: 'h-10 w-10', icon: 'h-[18px] w-[18px]' },
}

/**
 * 동그란 완료 버튼.
 *
 * 보이는 원은 작게 두고 터치 영역은 44px 이상으로 잡았다.
 */
export function QuestCheckButton({ completed, onClick, label, size = 'sm' }: QuestCheckButtonProps) {
  const s = SIZE[size]

  return (
    <button
      type="button"
      onClick={completed ? undefined : onClick}
      disabled={completed}
      aria-label={label}
      className={cn('flex shrink-0 items-center justify-center', s.box)}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-full transition-all duration-200 ease-out',
          s.ring,
          completed
            ? 'bg-sage-deep text-surface'
            : 'bg-surface text-transparent ring-[1.5px] ring-inset ring-line',
        )}
      >
        <svg viewBox="0 0 24 24" className={s.icon} fill="none" aria-hidden>
          <path
            d="M5 12.5 L10 17 L19 7.5"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={completed ? 'animate-checkdraw' : undefined}
            strokeDasharray="26"
          />
        </svg>
      </span>
    </button>
  )
}
