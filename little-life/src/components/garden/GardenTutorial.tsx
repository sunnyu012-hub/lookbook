import { useState } from 'react'
import { Portal } from '@/components/ui/Portal'
import { Button } from '@/components/ui/Button'
import { useOverlay } from '@/hooks/useOverlay'
import { FIRST_SEEDS } from '@/lib/garden/crops'
import { findCollectionItem } from '@/lib/collection/catalog'

interface GardenTutorialProps {
  open: boolean
  onClose: () => void
}

interface Step {
  icon: string
  title: string
  lines: string[]
}

/**
 * 처음 들어왔을 때 네 마디.
 *
 * 세 번째 마디가 이 시스템에서 제일 중요한 말이다 —
 * "매일 돌보지 않아도 괜찮아요." 농사 게임을 해본 사람일수록
 * 그 말을 먼저 듣지 않으면 부담부터 느낀다.
 */
const STEPS: Step[] = [
  {
    icon: '🌱',
    title: '여기에 씨앗을 심을 수 있어',
    lines: ['빈 밭을 누르면 가진 씨앗이 나와.'],
  },
  {
    icon: '🕰️',
    title: '심어두면 알아서 자라',
    lines: ['앱을 닫아둬도 시간은 그대로 흘러.'],
  },
  {
    icon: '☁️',
    title: '매일 돌보지 않아도 괜찮아',
    lines: ['물을 주지 않아도 되고, 시들지도 않아.', '다 자라면 그때 와서 거두면 돼.'],
  },
  {
    icon: '✦',
    title: '현실에서 뭔가 하면',
    lines: [
      '퀘스트를 끝내면 가끔 씨앗이 생기고,',
      '정원의 것들도 조금씩 빨리 자라.',
    ],
  },
]

export function GardenTutorial({ open, onClose }: GardenTutorialProps) {
  const [index, setIndex] = useState(0)
  useOverlay(open, onClose)

  if (!open) return null

  const step = STEPS[index]
  const last = index === STEPS.length - 1
  const seedName = findCollectionItem(FIRST_SEEDS.itemId)?.nameKo ?? '씨앗'

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

          {/* 첫 마디에서 받은 것을 알려준다. 어디서 났는지 모르는 씨앗이
              가방에 들어 있으면 그건 선물이 아니라 버그처럼 보인다. */}
          {index === 0 && (
            <p className="mt-3 rounded-btn bg-sage-soft px-3 py-2 text-[12.5px] text-sage-deep">
              {seedName} {FIRST_SEEDS.count}개를 놓고 갔어
            </p>
          )}

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
            {last ? '정원 둘러보기' : '다음'}
          </Button>
        </div>
      </div>
    </Portal>
  )
}
