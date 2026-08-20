import { useMemo, useState } from 'react'
import type { Preferences, WeightInput, WeightLog } from '@/types'
import { LineChart } from '@/components/pixel/LineChart'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { NumberField } from '@/components/checkin/Fields'
import { formatShort, todayKey } from '@/lib/date'
import { goalProgress, loggingCadence, weightMilestones, weightSummary } from '@/lib/analytics'
import { effects as fx, items as pixelItems } from '@/lib/pixelAssets'
import { haptic } from '@/hooks/useHaptic'

/**
 * 체중 — 기록장에 가깝게.
 * 하루하루의 오르내림을 경고처럼 말하지 않고, 7일 평균으로 흐름만 보여준다.
 */
export function WeightPanel({
  prefs,
  weights,
  onSave,
  onRemove,
}: {
  prefs: Preferences
  weights: WeightLog[]
  onSave: (input: WeightInput) => Promise<unknown>
  onRemove: (date: string) => Promise<void>
}) {
  const today = todayKey()
  const summary = useMemo(() => weightSummary(weights, prefs, today), [weights, prefs, today])
  const progress = goalProgress(summary, prefs)
  const milestones = useMemo(() => weightMilestones(weights, prefs), [weights, prefs])
  const cadence = loggingCadence(weights)

  return (
    <div className="space-y-3">
      <PixelPanel title="Weight" icon={pixelItems.milk} sparkle>
        <div className="flex items-end gap-3">
          <p className="font-pixel text-[28px] leading-none tabular-nums">
            {summary.smoothed ?? '--'}
            <span className="ml-1 text-[12px] text-inkdim">kg</span>
          </p>
          <div className="flex-1 pb-1 text-right">
            {summary.change30 !== null && (
              <p className="text-[12px] text-inkdim">
                최근 30일 {summary.change30 > 0 ? '+' : ''}
                {summary.change30}kg
              </p>
            )}
            {summary.latest && (
              <p className="plabel mt-1">마지막 기록 {formatShort(summary.latest.date)}</p>
            )}
          </div>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-inkfaint">
          7일 평균이에요. 하루하루의 숫자는 물이나 식사만으로도 쉽게 오르내려서, 흐름만 보는 게 편해요.
        </p>

        <div className="mt-3">
          <LineChart
            points={summary.points}
            line={summary.line}
            color="#7DB994"
            ariaLabel="체중 흐름"
            guide={
              prefs.goalWeightKg != null
                ? { value: prefs.goalWeightKg, label: `목표 ${prefs.goalWeightKg}kg` }
                : null
            }
            format={(v) => `${Math.round(v * 10) / 10}kg`}
          />
        </div>

        {progress !== null && (
          <div className="mt-2">
            <div className="h-[8px] overflow-hidden rounded-full bg-border/40">
              <div
                className="h-full rounded-full bg-mint transition-[width] duration-500"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="plabel mt-1.5">
              시작 {prefs.startingWeightKg}kg → 목표 {prefs.goalWeightKg}kg ·{' '}
              {Math.round(progress * 100)}%
            </p>
          </div>
        )}

        <WeightForm
          existing={weights.find((w) => w.date === today) ?? null}
          onSave={onSave}
          onRemove={onRemove}
        />

        {cadence !== null && (
          <p className="mt-2 text-[11.5px] text-inkdim">
            평균 {cadence}일에 한 번 재고 있어요. {summary.count}번 기록했어요.
          </p>
        )}
      </PixelPanel>

      {milestones.length > 0 && (
        <PixelPanel title="Passed by" icon={fx.sparkle01}>
          <ul className="divide-y divide-dashed divide-border/70">
            {milestones.map((m) => (
              <li key={`${m.value}-${m.date}`} className="flex items-center gap-2 py-2">
                <PixelImage asset={fx.sparkle02} height={16} />
                <span className="text-[13px]">{m.label}</span>
                <span className="plabel ml-auto">{formatShort(m.date)}</span>
              </li>
            ))}
          </ul>
        </PixelPanel>
      )}
    </div>
  )
}

function WeightForm({
  existing,
  onSave,
  onRemove,
}: {
  existing: WeightLog | null
  onSave: (input: WeightInput) => Promise<unknown>
  onRemove: (date: string) => Promise<void>
}) {
  const [value, setValue] = useState<number | null>(existing?.weightKg ?? null)
  const [busy, setBusy] = useState(false)
  const today = todayKey()

  const submit = async () => {
    if (value === null) return
    setBusy(true)
    try {
      await onSave({ date: today, weightKg: value })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 flex items-center gap-2 border-t border-dashed border-border pt-3">
      <span className="text-[12.5px] text-inkdim">오늘</span>
      <NumberField
        value={value}
        onChange={setValue}
        suffix="kg"
        ariaLabel="오늘 체중"
        step="0.1"
        width="w-[78px]"
      />
      <button
        type="button"
        disabled={busy || value === null}
        onClick={() => {
          haptic()
          void submit()
        }}
        className="press ml-auto rounded-px3 border-[1.5px] border-pinkdeep bg-pink px-3 py-2 font-pixel text-[11px] uppercase text-white disabled:opacity-45"
      >
        {existing ? 'Update' : 'Save'}
      </button>
      {existing && (
        <button
          type="button"
          aria-label="오늘 체중 기록 지우기"
          onClick={() => void onRemove(today)}
          className="px-1 text-[15px] leading-none text-inkfaint"
        >
          ×
        </button>
      )}
    </div>
  )
}
