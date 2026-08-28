import type { DiscoveryNote } from '@/types'
import { cn } from '@/components/ui/cn'

interface DiscoveryCardsProps {
  notes: DiscoveryNote[]
  onDismiss: () => void
  /** 정원을 찾았다는 알림은 누르면 바로 그리로 간다 */
  onOpenGarden?: () => void
  /** 부엌도 마찬가지 */
  onOpenKitchen?: () => void
  onOpenQuarry?: () => void
}

/** 새 장소로 가는 길. 카드를 닫아도 이 문장이 기억에 남아야 한다. */
const WAY_IN: Record<string, string> = {
  'garden:opened': '지도 › 초록 공원 › 작은 정원',
  'quarry:opened': '지도 › 초록 공원 › 공원 바깥쪽 길',
  'dungeon:gate': '지도 › 초록 공원 › 잠든 돌문',
  'kitchen:opened': '홈 › 방 그림 왼쪽 아래 🍳 부엌',
}

/**
 * 새로 발견한 것 알림.
 *
 * 화면을 덮는 팝업이 아니다. 홈 위쪽에 작은 카드로 얹히고,
 * 누르면 사라진다. 안 눌러도 다음에 열면 없다.
 *
 * **새 장소만 예외다.** 정원·채석장·부엌·돌문은 실제로 가볼 때까지
 * 계속 뜬다 (lib/discovery/derive.ts 의 PLACE_VISITED). 한 번 뜨고
 * 사라지는 카드 한 장으로 알리기에는 너무 큰 것이라서 그렇다.
 * 그래서 여기서는 **어디로 가면 되는지**까지 적는다 — 카드를 닫은
 * 다음에도 혼자 찾아갈 수 있어야 한다.
 *
 * 업데이트 직후에는 예전 기록 덕에 여러 개가 한꺼번에 열리는데,
 * 그걸 다 띄우면 축하가 아니라 사고다. 그래서 위에서 세 개까지만 넘어온다.
 * (나머지는 발견함에 쌓인다 — lib/discovery/derive.ts)
 */

export function DiscoveryCards({
  notes,
  onDismiss,
  onOpenGarden,
  onOpenKitchen,
  onOpenQuarry,
}: DiscoveryCardsProps) {
  if (notes.length === 0) return null

  return (
    <section className="space-y-2">
      {notes.map((note) => {
        // 새 장소는 눌렀을 때 갈 데가 있다. 다른 알림은 읽고 지우는 게 전부다.
        // 부엌이 열렸다는 알림만 그렇고, 새 레시피 알림은 읽고 지우는 것이다.
        const opensGarden = note.kind === 'GARDEN' && onOpenGarden !== undefined
        const opensKitchen =
          note.kind === 'KITCHEN' && note.key === 'kitchen:opened' && onOpenKitchen !== undefined
        const opensQuarry = note.kind === 'QUARRY' && onOpenQuarry !== undefined
        const place = opensGarden || opensKitchen || opensQuarry
        const wayIn = WAY_IN[note.key]

        return (
          <button
            key={note.key}
            type="button"
            onClick={() => {
              onDismiss()
              if (opensGarden) onOpenGarden()
              if (opensKitchen) onOpenKitchen()
              if (opensQuarry) onOpenQuarry()
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
              {/* 길 안내는 눌러서 갈 수 있든 없든 적는다 — 돌문처럼 여기서
                  바로 못 가는 곳도 어디 있는지는 알아야 한다. */}
              {wayIn && (
                <span className="mt-1 block text-[11px] text-inkfaint">{wayIn}</span>
              )}
              {place && (
                <span className="mt-1 block text-[11.5px] font-medium text-sage-deep">
                  {opensKitchen
                    ? '부엌 열기 ›'
                    : opensQuarry
                      ? '채석장 가기 ›'
                      : '정원에 들어가기 ›'}
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
