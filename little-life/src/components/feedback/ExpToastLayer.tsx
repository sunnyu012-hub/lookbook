import type { ExpToast } from '@/hooks/useFeedback'

interface ExpToastLayerProps {
  toasts: ExpToast[]
}

/** 퀘스트를 완료하면 캐릭터 위로 "+20 EXP ✦" 가 잠깐 떠올랐다 사라진다. */
export function ExpToastLayer({ toasts }: ExpToastLayerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 top-2 z-10">
      {toasts.map((toast, i) => (
        <div
          key={toast.id}
          // 연달아 완료하면 같은 자리에 겹친다. 뒤에 뜬 것부터 살짝 아래로 밀어 둔다.
          style={{ top: `${i * 26}px` }}
          className="absolute left-1/2 animate-expfloat rounded-pill bg-ink px-3 py-1.5 font-game text-[13px] tracking-[0.06em] text-milk shadow-lift"
        >
          +{toast.amount} EXP ✦
        </div>
      ))}
    </div>
  )
}
