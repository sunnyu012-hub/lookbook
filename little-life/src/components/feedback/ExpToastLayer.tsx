import type { ExpToast } from '@/hooks/useFeedback'
import { EFFECT } from '@/lib/assets'

interface ExpToastLayerProps {
  toasts: ExpToast[]
}

/** 퀘스트를 완료하면 캐릭터 위로 "+20 EXP" 가 잠깐 떠올랐다 사라진다. */
export function ExpToastLayer({ toasts }: ExpToastLayerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[16%] z-10">
      {toasts.map((toast, i) => (
        <div
          key={toast.id}
          // 연달아 완료하면 같은 자리에 겹친다. 뒤에 뜬 것부터 살짝 아래로 밀어 둔다.
          style={{ top: `${i * 28}px` }}
          className="absolute left-1/2 flex animate-expfloat items-center gap-1 rounded-pill bg-surface px-3 py-1.5 shadow-lift ring-1 ring-line"
        >
          <img src={EFFECT.star} alt="" aria-hidden className="h-4 w-4 object-contain" />
          <span className="font-game text-[13px] font-medium leading-none text-coral-deep">
            +{toast.amount} EXP
          </span>
        </div>
      ))}
    </div>
  )
}
