import { useState } from 'react'
import { Portal } from '@/components/ui/Portal'
import { Button } from '@/components/ui/Button'
import { useOverlay } from '@/hooks/useOverlay'
import { DEFAULT_RECIPE_IDS, findKitchenRecipe } from '@/lib/kitchen/recipes'

interface KitchenTutorialProps {
  open: boolean
  onClose: () => void
}

/**
 * 처음 들어왔을 때 네 마디.
 *
 * 요리는 현실에서 뭘 하라는 게 아니라는 걸 먼저 말한다.
 * 정원에서 거둔 것이 여기서 다른 게 된다는 것, 그게 전부다.
 */
const STEPS = [
  {
    icon: '🍳',
    title: '정원에서 얻은 걸로 만들어',
    lines: ['거둔 작물이 여기서 다른 게 된다.'],
  },
  {
    icon: '📖',
    title: '아는 요리부터 시작해',
    lines: ['재료가 다 있는 것부터 위에 보여줄게.'],
  },
  {
    icon: '✦',
    title: '만들면 도감에 남아',
    lines: ['한 번 만든 요리는 계속 기억한다.', '음식을 다 써버려도 사라지지 않아.'],
  },
  {
    icon: '🌿',
    title: '새 요리는 정원에서 온다',
    lines: ['어떤 작물을 여러 번 거두면', '그걸로 만들 수 있는 게 하나씩 떠올라.'],
  },
]

export function KitchenTutorial({ open, onClose }: KitchenTutorialProps) {
  const [index, setIndex] = useState(0)
  useOverlay(open, onClose)

  if (!open) return null

  const step = STEPS[index]
  const last = index === STEPS.length - 1
  const knownNames = DEFAULT_RECIPE_IDS.map((id) => findKitchenRecipe(id)?.name ?? '')
    .filter(Boolean)
    .join(' · ')

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

          {/* 두 번째 마디에서 이미 아는 넷을 소개한다.
              발견 알림으로 네 장을 따로 띄우지 않는 이유가 이거다. */}
          {index === 1 && (
            <p className="mt-3 rounded-btn bg-coral-soft/50 px-3 py-2 text-[12px] leading-relaxed text-coral-deep">
              {knownNames}
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
            {last ? '뭘 만들지 볼까' : '다음'}
          </Button>
        </div>
      </div>
    </Portal>
  )
}
