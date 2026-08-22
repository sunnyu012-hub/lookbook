import { useState } from 'react'
import type { RecommendSettings, UsageProfiles } from '@/types'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { cn } from '@/components/ui/cn'

interface RecommendSettingsCardProps {
  settings: RecommendSettings
  profiles: UsageProfiles
  onToggle: (on: boolean) => void
  onReset: () => void
}

/**
 * 퀘스트 추천 설정.
 *
 * 무엇을 보고 순서를 정하는지 숨기지 않는다. 끄고 싶으면 끌 수 있고,
 * 기록만 지울 수도 있다 — 퀘스트·EXP·반복·완료 기록은 그대로 남는다.
 */
export function RecommendSettingsCard({
  settings,
  profiles,
  onToggle,
  onReset,
}: RecommendSettingsCardProps) {
  const [confirming, setConfirming] = useState(false)
  const learned = Object.keys(profiles).length

  return (
    <>
      <Card className="py-4">
        <div className="flex items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-medium text-ink">사용 패턴 기반 추천</span>
            <span className="mt-0.5 block text-[12px] leading-relaxed text-inkdim">
              끄면 시간대에 맞는 기본 추천만 나와.
            </span>
          </span>

          <button
            type="button"
            role="switch"
            aria-checked={settings.personalized}
            aria-label="사용 패턴 기반 추천"
            onClick={() => onToggle(!settings.personalized)}
            className={cn(
              'relative h-7 w-12 shrink-0 rounded-pill transition-colors duration-200',
              settings.personalized ? 'bg-coral' : 'bg-sunken',
            )}
          >
            <span
              className={cn(
                'absolute top-1 h-5 w-5 rounded-full bg-surface shadow-soft transition-[left] duration-200',
                settings.personalized ? 'left-6' : 'left-1',
              )}
            />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
          <span className="min-w-0 flex-1 text-[12.5px] text-inkdim">
            {learned > 0 ? `${learned}가지를 기억하고 있어` : '아직 기억한 게 없어'}
          </span>
          <button
            type="button"
            disabled={learned === 0}
            onClick={() => setConfirming(true)}
            className="shrink-0 rounded-pill bg-sunken px-3 py-1.5 text-[12px] font-medium text-inkdim disabled:opacity-40"
          >
            추천 기록 초기화
          </button>
        </div>

        <p className="mt-3 text-[11.5px] leading-relaxed text-inkfaint">
          퀘스트 사용 기록은 이 기기에서 추천 순서를 정하는 데만 써. 밖으로 나가지 않아.
        </p>
      </Card>

      <ConfirmDialog
        open={confirming}
        title="추천 기록을 지울까?"
        description="퀘스트·EXP·반복·완료 기록은 그대로 남아. 추천 순서만 처음으로 돌아가."
        confirmLabel="초기화"
        onConfirm={() => {
          onReset()
          setConfirming(false)
        }}
        onCancel={() => setConfirming(false)}
      />
    </>
  )
}
