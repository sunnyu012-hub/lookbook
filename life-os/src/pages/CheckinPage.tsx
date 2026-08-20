import { useState } from 'react'
import type { Checkin, CheckinInput, Pain5, Scale5 } from '@/types'
import { PipRow } from '@/components/pixel/PipRow'
import { PixelButton } from '@/components/pixel/PixelButton'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { PixelSparkle } from '@/components/pixel/PixelSparkle'
import { useCheckinForm } from '@/hooks/useCheckinForm'
import { haptic } from '@/hooks/useHaptic'
import { formatSleep, pixelDate, todayKey } from '@/lib/date'
import { modeMeta } from '@/lib/energy'
import { MODE_CHARACTER, gear, icons } from '@/lib/pixelAssets'
import type { PixelAsset } from '@/lib/pixelAssets'
import { cn } from '@/lib/cn'

const EXERCISE_TYPES: { label: string; icon: PixelAsset }[] = [
  { label: '클라이밍', icon: icons.climbing },
  { label: '걷기', icon: gear.sneakers },
  { label: '러닝', icon: icons.exercise },
  { label: '헬스', icon: gear.dumbbell },
  { label: '요가', icon: gear.yogaMat },
]

interface Props {
  date?: string
  existing: Checkin | null
  onSave: (input: CheckinInput) => Promise<Checkin>
  onSaved: (checkin: Checkin) => void
}

export function CheckinPage({ date = todayKey(), existing, onSave, onSaved }: Props) {
  const { form, set, score, mode } = useCheckinForm(date, existing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const meta = modeMeta(mode)

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      onSaved(await onSave(form))
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  const nudgeSleep = (delta: number) => {
    haptic()
    set('sleepHours', Math.min(14, Math.max(0, Math.round((form.sleepHours + delta) * 2) / 2)))
  }

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-3">
        <div className="relative">
          <PixelImage asset={MODE_CHARACTER[mode]} height={56} className="animate-floaty" />
          <PixelSparkle size={11} className="absolute -right-1 top-0" />
        </div>
        <div className="flex-1">
          <h1 className="font-pixel text-[16px] uppercase leading-none tracking-[0.04em]">
            Check-in
          </h1>
          <p className="body-ko mt-1.5">오늘의 상태를 저장할까요?</p>
        </div>
        <div className="text-right">
          <p className="plabel">{pixelDate(date)}</p>
          <p className="mt-1 font-pixel text-[20px] leading-none" style={{ color: meta.hex }}>
            {score}
          </p>
        </div>
      </header>

      <PixelPanel>
        <Row icon={icons.sleep} label="Sleep">
          <div className="flex items-center gap-2">
            <StepButton label="−" onClick={() => nudgeSleep(-0.5)} />
            <span className="w-[86px] text-center font-pixel text-[15px] leading-none">
              {formatSleep(form.sleepHours)}
            </span>
            <StepButton label="+" onClick={() => nudgeSleep(0.5)} />
          </div>
        </Row>

        <Divider />
        <Row icon={icons.sleep} label="Quality">
          <PipRow
            asset={icons.sleep}
            value={form.sleepQuality}
            size={20}
            onChange={(v) => set('sleepQuality', v as Scale5)}
            label="수면 질"
          />
        </Row>

        <Divider />
        <Row icon={icons.fatigue} label="Fatigue" hint="많을수록 피곤">
          <PipRow
            asset={icons.fatigue}
            value={form.fatigue}
            size={20}
            onChange={(v) => set('fatigue', v as Scale5)}
            label="피로도"
          />
        </Row>

        <Divider />
        <Row icon={icons.mood} label="Mood">
          <PipRow
            asset={icons.mood}
            value={form.mood}
            size={20}
            onChange={(v) => set('mood', v as Scale5)}
            label="기분"
          />
        </Row>

        <Divider />
        <Row icon={icons.body} label="Body" hint="가벼울수록 많이">
          <PipRow
            asset={icons.body}
            value={5 - form.bodyPain}
            size={20}
            onChange={(v) => set('bodyPain', (5 - v) as Pain5)}
            label="몸 상태"
          />
        </Row>

        <Divider />
        <Row icon={icons.focus} label="Focus">
          <PipRow
            asset={icons.focus}
            value={form.focus}
            size={20}
            onChange={(v) => set('focus', v as Scale5)}
            label="집중력"
          />
        </Row>

        <Divider />
        <Row icon={icons.appetite} label="Appetite">
          <PipRow
            asset={icons.appetite}
            value={form.appetite}
            size={20}
            onChange={(v) => set('appetite', v as Scale5)}
            label="식욕"
          />
        </Row>

        <Divider />
        <Row icon={icons.caffeine} label="Caffeine">
          <YesNo value={form.caffeineConsumed} onChange={(v) => set('caffeineConsumed', v)} />
        </Row>
        {form.caffeineConsumed && (
          <div className="flex animate-risein items-center justify-between pl-8 pt-2">
            <span className="text-[12px] text-inkdim">마신 시간</span>
            <input
              type="time"
              value={form.caffeineTime ?? ''}
              onChange={(e) => set('caffeineTime', e.target.value || null)}
              aria-label="카페인 마신 시간"
              className="rounded-px2 border-[1.5px] border-border bg-cream px-2 py-1 font-pixel text-[12px]"
            />
          </div>
        )}

        <Divider />
        <Row icon={icons.exercise} label="Exercise">
          <YesNo value={form.exercise} onChange={(v) => set('exercise', v)} />
        </Row>
        {form.exercise && (
          <div className="no-scrollbar -mx-1 flex animate-risein gap-1.5 overflow-x-auto px-1 pl-8 pt-2">
            {EXERCISE_TYPES.map((type) => {
              const active = form.exerciseType === type.label
              return (
                <button
                  key={type.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    haptic()
                    set('exerciseType', active ? null : type.label)
                  }}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-px3 border-[1.5px] px-2.5 py-1.5 text-[12px] transition-transform duration-150',
                    active
                      ? '-translate-y-[1px] border-pinkdeep bg-pinksoft'
                      : 'border-border bg-cream text-inkdim',
                  )}
                >
                  <PixelImage asset={type.icon} height={16} />
                  {type.label}
                </button>
              )
            })}
          </div>
        )}
      </PixelPanel>

      <PixelPanel title="Memo" icon={icons.work}>
        <textarea
          value={form.memo ?? ''}
          onChange={(e) => set('memo', e.target.value)}
          rows={2}
          maxLength={200}
          placeholder="한 줄 메모를 적어보아요!"
          className="w-full resize-none bg-transparent text-[14px] leading-relaxed placeholder:text-inkfaint focus:outline-none"
        />
      </PixelPanel>

      {error && (
        <p className="rounded-px3 border-[1.5px] border-pinkdeep bg-pinksoft px-3 py-2 text-[12px]">
          {error}
        </p>
      )}

      <PixelButton icon={icons.save} full disabled={saving} onClick={() => void submit()}>
        {saving ? 'Saving…' : 'Save Today!'}
      </PixelButton>

      <p className="px-2 text-center text-[11px] leading-relaxed text-inkdim">
        ENERGY 는 기록을 보기 좋게 만든 점수예요. 건강 진단이나 의학적 판단에는 쓰지 마세요.
      </p>
    </div>
  )
}

function Row({
  icon,
  label,
  hint,
  children,
}: {
  icon: PixelAsset
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      <PixelImage asset={icon} height={22} />
      <span className="w-[74px] shrink-0">
        <span className="plabel block text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-[10px] text-inkfaint">{hint}</span>}
      </span>
      <span className="ml-auto">{children}</span>
    </div>
  )
}

function Divider() {
  return <div className="my-1 border-t border-dashed border-border" />
}

function StepButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label === '+' ? '30분 늘리기' : '30분 줄이기'}
      className="press h-9 w-9 rounded-px3 border-[1.5px] border-border bg-cream font-pixel text-[14px] leading-none shadow-hard"
    >
      {label}
    </button>
  )
}

function YesNo({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-1.5">
      {[false, true].map((option) => (
        <button
          key={String(option)}
          type="button"
          aria-pressed={value === option}
          onClick={() => {
            haptic()
            onChange(option)
          }}
          className={cn(
            'rounded-px3 border-[1.5px] px-3 py-1.5 font-pixel text-[11px] uppercase',
            value === option
              ? 'border-pinkdeep bg-pinksoft text-pinkdeep'
              : 'border-border bg-cream text-inkfaint',
          )}
        >
          {option ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  )
}
