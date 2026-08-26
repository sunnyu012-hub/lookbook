import { useState } from 'react'
import { Portal } from '@/components/ui/Portal'
import { Button } from '@/components/ui/Button'
import { useOverlay } from '@/hooks/useOverlay'
import { DAILY_ATTEMPTS } from '@/lib/quarry/derive'

interface QuarryTutorialProps {
  open: boolean
  onClose: () => void
}

/**
 * 처음 왔을 때 세 마디.
 *
 * 뭘 해야 하는지만 말한다. 여기가 위험하다거나 서둘러야 한다는 말은 안 한다 —
 * 그런 말을 하는 순간 놀러 오는 곳이 아니라 해야 하는 곳이 된다.
 */
const STEPS = [
  {
    icon: '⛏️',
    title: '돌 틈에 아직 남아 있어',
    lines: ['오래전에 쓰던 채석장이야.', '쓸 만한 재료가 조금 남아 있어.'],
  },
  {
    icon: '👀',
    title: `하루에 ${DAILY_ATTEMPTS}번`,
    lines: ['궁금한 곳을 골라 살펴볼 수 있어.', '자리마다 나오는 게 조금씩 달라.'],
  },
  {
    icon: '📖',
    title: '찾은 건 알아서 기록돼',
    lines: ['도감과 가방에 자동으로 들어가.', '안 와도 아무 일 없으니 편하게 들러.'],
  },
]

export function QuarryTutorial({ open, onClose }: QuarryTutorialProps) {
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
            {last ? '둘러보기' : '다음'}
          </Button>
        </div>
      </div>
    </Portal>
  )
}
