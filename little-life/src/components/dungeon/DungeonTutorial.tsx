import { useState } from 'react'
import { Portal } from '@/components/ui/Portal'
import { Button } from '@/components/ui/Button'
import { useOverlay } from '@/hooks/useOverlay'

interface DungeonTutorialProps {
  open: boolean
  onClose: () => void
}

/**
 * 처음 들어왔을 때 세 마디.
 *
 * 던전이라고 겁주지 않는다. 여기서 다치는 일도, 지고 나가는 일도 없다 —
 * 그 말을 굳이 하지 않아도 되게, 아예 그런 결의 말을 안 쓴다.
 * 마지막 한 마디는 "오늘 다 안 봐도 된다" 다. 그게 이 앱의 규칙이다.
 */
const STEPS = [
  {
    icon: '🚪',
    title: '오래 닫혀 있던 문',
    lines: ['안쪽에 작은 공간들이 이어져 있어.', '천천히 걸어 들어가면 돼.'],
  },
  {
    icon: '🔦',
    title: '자세히 볼 때만',
    lines: ['처음 보는 곳을 들여다볼 때', '탐험 에너지를 조금 써.'],
  },
  {
    icon: '🌙',
    title: '오늘 다 안 봐도 돼',
    lines: ['언제든 다시 올 수 있어.', '문은 이제 안 잠겨.'],
  },
]

export function DungeonTutorial({ open, onClose }: DungeonTutorialProps) {
  const [index, setIndex] = useState(0)
  useOverlay(open, onClose)

  if (!open) return null

  const step = STEPS[index]
  const last = index === STEPS.length - 1

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
        <div className="absolute inset-0 animate-fadein bg-ink/30 backdrop-blur-[2px]" aria-hidden />

        <div
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-[330px] animate-pop rounded-card bg-surface px-5 pb-5 pt-6 text-center shadow-lift"
        >
          <span className="text-[40px] leading-none">{step.icon}</span>
          <h2 className="mt-3 text-[17px] font-semibold text-ink">{step.title}</h2>
          {step.lines.map((line) => (
            <p key={line} className="mt-1 text-[13.5px] leading-relaxed text-inkdim">
              {line}
            </p>
          ))}

          <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
            {STEPS.map((s, i) => (
              <span
                key={s.title}
                className={`h-1.5 rounded-pill transition-all ${
                  i === index ? 'w-4 bg-coral' : 'w-1.5 bg-line'
                }`}
              />
            ))}
          </div>

          <Button
            size="lg"
            className="mt-4 w-full"
            onClick={() => (last ? onClose() : setIndex(index + 1))}
          >
            {last ? '들어가보기' : '다음'}
          </Button>
        </div>
      </div>
    </Portal>
  )
}
