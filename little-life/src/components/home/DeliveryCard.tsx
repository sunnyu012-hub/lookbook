import { useMemo } from 'react'
import type { AppState } from '@/types'
import { findCollectionItem } from '@/lib/collection/catalog'
import { pendingDelivery } from '@/lib/collection/delivery'

interface DeliveryCardProps {
  state: AppState
  onClaim: () => void
}

/**
 * 문 앞에 온 상자.
 *
 * 이 앱에서 유일하게 아무것도 안 하고 받는 것이다.
 * 그래서 열흘에 한 번쯤만 온다 — 매일 오면 그건 선물이 아니라 출석 체크고,
 * 안 받은 날이 손해가 된다.
 *
 * 안 받고 넘어가도 아무 말 안 한다. 다음 날이면 그냥 없어진다.
 *
 * 무엇이 왔는지는 열기 전에 알려주지 않는다. 미리 보여주면 받을지 말지를
 * 고르게 되고, 그러면 이건 선물이 아니라 또 하나의 선택이 된다.
 * 열고 나서 처음 보는 것이면 도감 연출이, 아는 것이면 한 줄 토스트가 뜬다.
 */
export function DeliveryCard({ state, onClaim }: DeliveryCardProps) {
  const delivery = useMemo(() => pendingDelivery(state), [state])
  if (!delivery) return null

  const item = findCollectionItem(delivery.itemId)
  if (!item) return null

  return (
    <section className="flex items-center gap-3 rounded-card border border-butter-deep/25 bg-butter-soft/50 px-3.5 py-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-surface text-[22px]">
        📦
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-ink">문 앞에 뭐가 와 있어.</p>
        <p className="mt-0.5 truncate text-[11.5px] text-inkdim">{delivery.from}</p>
      </div>

      <button
        type="button"
        onClick={onClaim}
        className="inline-flex min-h-[40px] shrink-0 items-center rounded-btn bg-coral px-4 text-[12.5px] font-medium text-surface shadow-[0_3px_0_0_rgba(217,108,97,0.5)] transition-transform duration-150 ease-out active:translate-y-[2px] active:scale-[0.97] active:shadow-none"
      >
        열어보기
      </button>
    </section>
  )
}
