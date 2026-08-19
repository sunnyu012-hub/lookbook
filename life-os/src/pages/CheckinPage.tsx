import { useState } from 'react'
import type { Checkin, CheckinInput, Pain5, Scale5 } from '@/types'
import { IconPicker, type IconOption } from '@/components/pixel/IconPicker'
import { PipRow } from '@/components/pixel/PipRow'
import { PixelButton } from '@/components/pixel/PixelButton'
import { PixelIcon } from '@/components/pixel/PixelIcon'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { useCheckinForm } from '@/hooks/useCheckinForm'
import { haptic } from '@/hooks/useHaptic'
import { formatSleep, pixelDate, todayKey } from '@/lib/date'
import { modeMeta } from '@/lib/energy'
import { cn } from '@/lib/cn'

const FATIGUE_OPTIONS: IconOption[] = [
  { value: 1, icon: 'face_great', caption: '쌩쌩해요' },
  { value: 2, icon: 'face_good', caption: '괜찮아요' },
  { value: 3, icon: 'face_ok', caption: '보통이에요' },
  { value: 4, icon: 'face_tired', caption: '피곤해요' },
  { value: 5, icon: 'face_gone', caption: '방전됐어요' },
]

const MOOD_OPTIONS: IconOption[] = [
  { value: 1, icon: 'rain', caption: '많이 가라앉음' },
  { value: 2, icon: 'cloud', caption: '조금 흐림' },
  { value: 3, icon: 'partly', caption: '그럭저럭' },
  { value: 4, icon: 'sun', caption: '좋음' },
  { value: 5, icon: 'sun_bright', caption: '아주 좋음' },
]

const EXERCISE_TYPES = ['걷기', '러닝', '헬스', '요가', '자전거', '수영', '기타']

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
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-pixel text-[18px] uppercase leading-none tracking-[0.04em]">
            Daily Save
          </h1>
          <p className="body-ko mt-2">오늘의 상태를 저장할까요?</p>
        </div>
        <div className="text-right">
          <p className="plabel">{pixelDate(date)}</p>
          <p className="font-pixel text-[22px] leading-none" style={{ color: meta.hex }}>
            {score}
          </p>
          <p className="plabel mt-1">{meta.label}</p>
        </div>
      </header>

      <PixelPanel title="Sleep" icon="moon">
        <div className="flex items-center justify-between">
          <StepButton label="−" onClick={() => nudgeSleep(-0.5)} />
          <p className="font-pixel text-[24px] leading-none tabular-nums">
            {formatSleep(form.sleepHours)}
          </p>
          <StepButton label="+" onClick={() => nudgeSleep(0.5)} />
        </div>
        <input
          type="range"
          min={0}
          max={14}
          step={0.5}
          value={form.sleepHours}
          onChange={(e) => set('sleepHours', Number(e.target.value))}
          aria-label="수면 시간"
          className="mt-3 h-6 w-full appearance-none rounded-px2 border-2 border-ink bg-creamdeep"
          style={{
            backgroundImage: `linear-gradient(to right, ${meta.hex} ${(form.sleepHours / 14) * 100}%, transparent ${(form.sleepHours / 14) * 100}%)`,
          }}
        />

        <div className="mt-4 flex items-center justify-between border-t-2 border-dashed border-ink/15 pt-3">
          <span className="plabel text-ink">Sleep Quality</span>
          <PipRow
            on="star"
            off="star_off"
            value={form.sleepQuality}
            onChange={(v) => set('sleepQuality', v as Scale5)}
            label="수면 질"
          />
        </div>
      </PixelPanel>

      <PixelPanel title="Fatigue" icon="bolt">
        <IconPicker
          options={FATIGUE_OPTIONS}
          value={form.fatigue}
          onChange={(v) => set('fatigue', v as Scale5)}
          label="피로도"
        />
      </PixelPanel>

      <PixelPanel title="Mood" icon="heart">
        <IconPicker
          options={MOOD_OPTIONS}
          value={form.mood}
          onChange={(v) => set('mood', v as Scale5)}
          label="기분"
        />
      </PixelPanel>

      <PixelPanel title="Body & Focus" icon="star">
        <div className="space-y-3">
          <StatRow label="Body" caption="몸이 가벼운 정도">
            <PipRow
              on="star"
              off="star_off"
              value={5 - form.bodyPain}
              onChange={(v) => set('bodyPain', (5 - v) as Pain5)}
              label="몸 상태"
            />
          </StatRow>
          <StatRow label="Focus" caption="집중이 잘 되는 정도">
            <PipRow
              on="gem"
              off="gem_off"
              value={form.focus}
              onChange={(v) => set('focus', v as Scale5)}
              label="집중력"
            />
          </StatRow>
          <StatRow label="Appetite" caption="식욕">
            <PipRow
              on="food"
              off="food_off"
              value={form.appetite}
              onChange={(v) => set('appetite', v as Scale5)}
              label="식욕"
            />
          </StatRow>
        </div>
      </PixelPanel>

      <PixelPanel title="Items" icon="coffee">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[13px]">
              <PixelIcon name="coffee" size={16} /> 카페인
            </span>
            <YesNo value={form.caffeineConsumed} onChange={(v) => set('caffeineConsumed', v)} />
          </div>
          {form.caffeineConsumed && (
            <div className="flex animate-rise items-center justify-between pl-6">
              <span className="text-[12px] text-inkdim">마신 시간</span>
              <input
                type="time"
                value={form.caffeineTime ?? ''}
                onChange={(e) => set('caffeineTime', e.target.value || null)}
                aria-label="카페인 마신 시간"
                className="rounded-px2 border-2 border-ink bg-cream px-2 py-1 font-pixel text-[12px]"
              />
            </div>
          )}

          <div className="flex items-center justify-between border-t-2 border-dashed border-ink/15 pt-3">
            <span className="flex items-center gap-2 text-[13px]">
              <PixelIcon name="dumbbell" size={16} /> 운동
            </span>
            <YesNo value={form.exercise} onChange={(v) => set('exercise', v)} />
          </div>
          {form.exercise && (
            <div className="no-scrollbar -mx-1 flex animate-rise gap-1.5 overflow-x-auto px-1 pl-6">
              {EXERCISE_TYPES.map((type) => {
                const active = form.exerciseType === type
                return (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      haptic()
                      set('exerciseType', active ? null : type)
                    }}
                    className={cn(
                      'shrink-0 rounded-px2 border-2 px-3 py-1.5 text-[12px]',
                      active ? 'border-ink bg-sage' : 'border-ink/20 bg-cream text-inkdim',
                    )}
                  >
                    {type}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </PixelPanel>

      <PixelPanel title="Note" icon="book">
        <textarea
          value={form.memo ?? ''}
          onChange={(e) => set('memo', e.target.value)}
          rows={2}
          maxLength={200}
          placeholder="오늘의 한 줄 (선택)"
          className="w-full resize-none bg-transparent text-[14px] leading-relaxed placeholder:text-inkfaint focus:outline-none"
        />
      </PixelPanel>

      {error && (
        <p className="rounded-px3 border-2 border-blushdeep bg-blush/25 px-3 py-2 text-[12px]">
          {error}
        </p>
      )}

      <PixelButton icon="floppy" full disabled={saving} onClick={() => void submit()}>
        {saving ? 'Saving…' : 'Save Today'}
      </PixelButton>

      <p className="px-2 text-center text-[11px] leading-relaxed text-inkdim">
        ENERGY 는 기록을 보기 좋게 만든 점수예요. 건강 진단이나 의학적 판단에는 쓰지 마세요.
      </p>
    </div>
  )
}

function StepButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label === '+' ? '30분 늘리기' : '30분 줄이기'}
      className="press h-11 w-11 rounded-px2 border-2 border-ink bg-cream font-pixel text-[16px] leading-none"
    >
      {label}
    </button>
  )
}

function StatRow({
  label,
  caption,
  children,
}: {
  label: string
  caption: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <p className="plabel text-ink">{label}</p>
        <p className="mt-1 text-[11px] text-inkdim">{caption}</p>
      </div>
      {children}
    </div>
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
            'rounded-px2 border-2 px-3 py-1.5 font-pixel text-[11px] uppercase',
            value === option ? 'border-ink bg-butter' : 'border-ink/20 bg-cream text-inkdim',
          )}
        >
          {option ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  )
}
