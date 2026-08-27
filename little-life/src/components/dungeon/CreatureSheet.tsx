import { useEffect, useState } from 'react'
import type { CreatureStepDef } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'

interface CreatureSheetProps {
  step: CreatureStepDef | null
  onClose: () => void
  /** 고른 갈래를 넘긴다. 갈래가 없으면 0. */
  onTake: (stepId: string, choiceIndex: number) => string[] | null
}

/**
 * 생명체와 한 걸음.
 *
 * ── 실패가 없다 ─────────────────────────────────────────
 *
 * 두 갈래가 나오는 자리가 있지만 어느 쪽도 틀린 쪽이 아니다.
 * 그래서 "다시 하기" 도, 확률 표시도, 결과 등급도 없다.
 *
 * ── 숫자를 안 보여준다 ──────────────────────────────────
 *
 * 친밀도도, 단계 이름도, "친해졌습니다" 도 없다.
 * 달라진 건 그 애가 한 행동이고, 그건 아래 문장이 이미 말하고 있다.
 *
 * 읽는 줄은 한 번에 다 뿌리지 않고 눌러서 넘긴다 — 짧은 문장이
 * 한 화면에 쏟아지면 그건 장면이 아니라 안내문이 된다.
 */
export function CreatureSheet({ step, onClose, onTake }: CreatureSheetProps) {
  /** 읽고 있는 줄까지. 앞의 줄은 위에 남는다. */
  const [shown, setShown] = useState(1)
  /** 버튼을 누른 뒤 이어지는 줄. 아직 안 눌렀으면 null. */
  const [after, setAfter] = useState<string[] | null>(null)

  useEffect(() => {
    setShown(1)
    setAfter(null)
  }, [step?.id])

  if (!step) return null

  const reading = after ?? step.lines
  const done = after !== null
  const more = shown < reading.length

  const take = (choiceIndex: number) => {
    const lines = onTake(step.id, choiceIndex)
    // 못 밟는 걸음이면 조용히 닫는다 — 오류 문구를 띄울 자리가 아니다.
    if (!lines) {
      onClose()
      return
    }
    setAfter(lines)
    setShown(1)
  }

  return (
    <BottomSheet open onClose={onClose} title={step.title}>
      <div className="text-center">
        <span className="block text-[44px] leading-none">{step.icon}</span>

        <div className="mt-3 space-y-1.5">
          {reading.slice(0, shown).map((line, i) => (
            <p
              key={`${line}-${i}`}
              className={
                i === shown - 1
                  ? 'text-[14px] leading-relaxed text-ink'
                  : 'text-[13px] leading-relaxed text-inkdim'
              }
            >
              {line}
            </p>
          ))}
        </div>

        {more ? (
          <Button size="lg" className="mt-4 w-full" onClick={() => setShown(shown + 1)}>
            계속
          </Button>
        ) : done ? (
          <Button size="lg" className="mt-4 w-full" onClick={onClose}>
            돌아가기
          </Button>
        ) : step.choices ? (
          <div className="mt-4 space-y-2">
            {step.choices.map((choice, i) => (
              <Button
                key={choice.label}
                variant={i === 0 ? 'primary' : 'soft'}
                size="lg"
                className="w-full"
                onClick={() => take(i)}
              >
                {choice.label}
              </Button>
            ))}
          </div>
        ) : (
          <Button size="lg" className="mt-4 w-full" onClick={() => take(0)}>
            {step.action}
          </Button>
        )}
      </div>
    </BottomSheet>
  )
}
