import type { DiscoveryNote } from '@/types'
import { cn } from '@/components/ui/cn'

interface DiscoveryCardsProps {
  notes: DiscoveryNote[]
  onDismiss: () => void
}

/**
 * 새로 발견한 것 알림.
 *
 * 화면을 덮는 팝업이 아니다. 홈 위쪽에 작은 카드로 얹히고,
 * 누르면 사라진다. 안 눌러도 다음에 열면 없다.
 *
 * 업데이트 직후에는 예전 기록 덕에 여러 개가 한꺼번에 열리는데,
 * 그걸 다 띄우면 축하가 아니라 사고다. 그래서 위에서 세 개까지만 넘어온다.
 * (나머지는 발견함에 쌓인다 — lib/discovery/derive.ts)
 */
export function DiscoveryCards({ notes, onDismiss }: DiscoveryCardsProps) {
  if (notes.length === 0) return null

  return (
    <section className="space-y-2">
      {notes.map((note) => (
        <button
          key={note.key}
          type="button"
          onClick={onDismiss}
          className={cn(
            'flex w-full animate-risein items-center gap-3 rounded-card border px-3.5 py-3 text-left',
            'border-lavender-deep/25 bg-lavender-soft/50',
            'transition-transform duration-150 ease-out active:scale-[0.98]',
          )}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-surface text-[20px]">
            {note.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-medium text-ink">{note.title}</span>
            <span className="mt-0.5 block truncate text-[11.5px] text-inkdim">{note.text}</span>
          </span>
          <span className="shrink-0 font-game text-[9px] text-lavender-deep">발견 ✦</span>
        </button>
      ))}
    </section>
  )
}
