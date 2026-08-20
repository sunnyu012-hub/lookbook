import { UI } from '@/lib/assets'
import { cn } from '@/components/ui/cn'

interface QuestCheckButtonProps {
  completed: boolean
  onClick?: () => void
  label: string
}

/**
 * 동그란 완료 버튼.
 * 보이는 원은 작게 두고 터치 영역은 44px 이상으로 잡았다.
 */
export function QuestCheckButton({ completed, onClick, label }: QuestCheckButtonProps) {
  return (
    <button
      type="button"
      onClick={completed ? undefined : onClick}
      disabled={completed}
      aria-label={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center"
    >
      {completed ? (
        <img src={UI.check} alt="" aria-hidden className="h-8 w-8 animate-pop object-contain" />
      ) : (
        <span
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full',
            'bg-surface ring-[1.5px] ring-inset ring-line transition-transform duration-150',
            'active:scale-90',
          )}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-line" fill="none" aria-hidden>
            <path
              d="M5 12.5 L10 17 L19 7.5"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </button>
  )
}
