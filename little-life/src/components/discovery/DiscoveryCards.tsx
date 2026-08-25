import type { DiscoveryNote } from '@/types'
import { cn } from '@/components/ui/cn'

interface DiscoveryCardsProps {
  notes: DiscoveryNote[]
  onDismiss: () => void
  /** 정원을 찾았다는 알림은 누르면 바로 그리로 간다 */
  onOpenGarden?: () => void
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
export function DiscoveryCards({ notes, onDismiss, onOpenGarden }: DiscoveryCardsProps) {
  if (notes.length === 0) return null

  return (
    <section className="space-y-2">
      {notes.map((note) => {
        // 새 장소는 눌렀을 때 갈 데가 있다. 다른 알림은 읽고 지우는 게 전부다.
        const place = note.kind === 'GARDEN' && onOpenGarden !== undefined

        return (
          <button
            key={note.key}
            type="button"
            onClick={() => {
              onDismiss()
              if (place) onOpenGarden()
            }}
            className={cn(
              'flex w-full animate-risein items-center gap-3 rounded-card border px-3.5 py-3 text-left',
              place
                ? 'border-sage-deep/25 bg-sage-soft/60'
                : 'border-lavender-deep/25 bg-lavender-soft/50',
              'transition-transform duration-150 ease-out active:scale-[0.98]',
            )}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-surface text-[20px]">
              {note.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium text-ink">{note.title}</span>
              {/* 새 장소는 한 줄로 자르지 않는다 — 여기 적힌 두 문장이
                  그 장소를 처음 만나는 순간의 전부다. */}
              <span
                className={cn(
                  'mt-0.5 block text-[11.5px] text-inkdim',
                  place ? 'leading-snug' : 'truncate',
                )}
              >
                {note.text}
              </span>
              {place && (
                <span className="mt-1 block text-[11.5px] font-medium text-sage-deep">
                  정원에 들어가기 ›
                </span>
              )}
            </span>
            <span
              className={cn(
                'shrink-0 self-start font-game text-[9px]',
                place ? 'text-sage-deep' : 'text-lavender-deep',
              )}
            >
              {place ? '새 장소 ✦' : '발견 ✦'}
            </span>
          </button>
        )
      })}
    </section>
  )
}
