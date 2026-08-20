import { cn } from '@/components/ui/cn'

interface QuestCheckButtonProps {
  completed: boolean
  onClick?: () => void
  label: string
}

/** 동그란 완료 버튼. 체크 표시는 선을 그리듯 나타난다. */
export function QuestCheckButton({ completed, onClick, label }: QuestCheckButtonProps) {
  return (
    <button
      type="button"
      onClick={completed ? undefined : onClick}
      disabled={completed}
      aria-label={label}
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-out',
        completed
          ? 'bg-sage text-milk'
          : 'bg-milk text-transparent ring-[1.5px] ring-inset ring-line hover:ring-sage active:scale-90',
      )}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
        <path
          d="M5 12.5 L10 17 L19 7.5"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={completed ? 'animate-checkdraw' : undefined}
          strokeDasharray="24"
        />
      </svg>
    </button>
  )
}
