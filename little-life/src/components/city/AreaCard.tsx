import type { AreaDef, CityEvent } from '@/types'
import { areaHighlights } from '@/lib/city/hub'
import { cn } from '@/components/ui/cn'

interface AreaCardProps {
  area: AreaDef
  isCurrent: boolean
  /** 지금은 문을 닫은 곳 */
  closed: boolean
  /** 오늘 이 동네에 걸린 것. 있으면 버프 대신 이 줄을 보여준다. */
  event: CityEvent | null
  /** 지금 여기 아니면 한 칸, 지금 여기면 한 줄 전부 */
  wide?: boolean
  onOpen: (area: AreaDef) => void
}

/**
 * 지도의 동네 한 칸.
 *
 * 예전에는 여섯 동네가 전부 같은 너비로 세로로 쌓였고, 카드마다 평판 막대 ·
 * 하트 · 이벤트 설명 · 어울리는 퀘스트 개수가 다 붙어 있었다. 그래서 지도를
 * 열면 읽을 게 먼저 나오고, 정작 "미나한테 말 걸기" 까지는 한참 걸렸다.
 *
 * 여기는 다섯 가지만 적는다 — 아이콘 · 이름 · 여기 뭐가 있는지 · 오늘 한 줄 · 상태.
 * 나머지는 눌러서 들어간 다음이다.
 */
export function AreaCard({ area, isCurrent, closed, event, wide, onOpen }: AreaCardProps) {
  // 반 칸짜리에는 둘까지. 셋째 이름은 어차피 잘린다.
  const highlights = areaHighlights(area, wide ? 3 : 2)

  return (
    <button
      type="button"
      onClick={() => onOpen(area)}
      className={cn(
        'flex h-full w-full flex-col rounded-card border px-4 py-4 text-left',
        'transition-transform duration-150 ease-out active:scale-[0.98]',
        wide ? 'min-h-[128px]' : 'min-h-[164px]',
        isCurrent
          ? 'border-coral bg-coral-soft/40 ring-[1.5px] ring-inset ring-coral'
          : 'border-line bg-surface shadow-soft',
        closed && !isCurrent && 'opacity-70',
      )}
    >
      <span className={cn('flex items-start gap-2', wide && 'items-center')}>
        <span className="text-[26px] leading-none">{area.icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-ink">{area.name}</span>
          {highlights.length > 0 && (
            <span className="mt-0.5 block truncate text-[11.5px] text-inkdim">
              {highlights.join(' · ')}
            </span>
          )}
        </span>
      </span>

      {/* 오늘만 참인 게 있으면 그게 버프보다 먼저다 */}
      <span className="mt-auto block pt-3">
        <span
          className={cn(
            'block text-[11.5px] leading-snug',
            event ? 'text-coral-deep' : 'text-inkdim',
          )}
        >
          {event ? `${event.icon} ${event.name}` : area.buffLabel}
        </span>
      </span>

      <span className="mt-2 block">
        {isCurrent ? (
          <StatusPill tone="coral">지금 여기</StatusPill>
        ) : closed ? (
          <StatusPill tone="muted">밤에 열려</StatusPill>
        ) : (
          <StatusPill tone="soft">들어가기</StatusPill>
        )}
      </span>
    </button>
  )
}

function StatusPill({
  tone,
  children,
}: {
  tone: 'coral' | 'muted' | 'soft'
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex h-8 items-center rounded-pill px-3 text-[11.5px] font-medium',
        tone === 'coral' && 'bg-coral text-surface',
        tone === 'muted' && 'bg-sunken text-inkfaint',
        tone === 'soft' && 'bg-sunken text-inkdim',
      )}
    >
      {children}
    </span>
  )
}
