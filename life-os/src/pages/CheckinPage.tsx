import { useState } from 'react'
import type { Checkin, CheckinInput, EntryMode, Pain5, Scale5 } from '@/types'
import { PixelButton } from '@/components/pixel/PixelButton'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { PixelSparkle } from '@/components/pixel/PixelSparkle'
import {
  ChipRow,
  Divider,
  FieldRow,
  NumberField,
  ScalePips,
  StepField,
  YesNo,
} from '@/components/checkin/Fields'
import { QuickActions } from '@/components/checkin/QuickActions'
import { useCheckinForm } from '@/hooks/useCheckinForm'
import { haptic } from '@/hooks/useHaptic'
import { formatSleep, pixelDate, todayKey } from '@/lib/date'
import { modeMetaOrNull } from '@/lib/energy'
import { CONFIDENCE_LABEL, confidenceLevel, type ScoreContext } from '@/lib/scoring'
import { MODE_CHARACTER, characters, effects as fx, gear, icons, items, pets } from '@/lib/pixelAssets'
import type { PixelAsset } from '@/lib/pixelAssets'
import { cn } from '@/lib/cn'

const EXERCISE_TYPES: { value: string; label: string; icon: PixelAsset }[] = [
  { value: '클라이밍', label: '클라이밍', icon: icons.climbing },
  { value: '걷기', label: '걷기', icon: gear.sneakers },
  { value: '러닝', label: '러닝', icon: icons.exercise },
  { value: '헬스', label: '헬스', icon: gear.dumbbell },
  { value: '요가', label: '요가', icon: gear.yogaMat },
]

const TAG_OPTIONS: { value: string; label: string; icon?: PixelAsset }[] = [
  { value: '집', label: '집', icon: icons.home },
  { value: '회사', label: '회사', icon: icons.work },
  { value: '데이트', label: '데이트', icon: fx.heart },
  { value: '약속', label: '약속', icon: icons.camera },
  { value: '혼자', label: '혼자', icon: icons.music },
  { value: '아픈 날', label: '아픈 날', icon: icons.body },
]

interface Props {
  date?: string
  existing: Checkin | null
  scoreContext?: ScoreContext
  mounjaroEnabled?: boolean
  onSave: (input: CheckinInput) => Promise<Checkin>
  onSaved: (checkin: Checkin) => void
  onSaveWeight: (input: import('@/types').WeightInput) => Promise<unknown>
  onSaveMounjaro: (input: import('@/types').MounjaroInput) => Promise<unknown>
  onSaveEvent: (input: import('@/types').LifeEventInput) => Promise<unknown>
}

export function CheckinPage({
  date = todayKey(),
  existing,
  scoreContext,
  mounjaroEnabled = false,
  onSave,
  onSaved,
  onSaveWeight,
  onSaveMounjaro,
  onSaveEvent,
}: Props) {
  const { form, set, setMode, result, score } = useCheckinForm(date, existing, scoreContext)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const entryMode: EntryMode = form.entryMode ?? 'quick'
  const meta = modeMetaOrNull(result.mode)
  const character = result.mode ? MODE_CHARACTER[result.mode] : characters.idle

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

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-3">
        <div className="relative">
          <PixelImage asset={character} height={52} className="animate-floaty" />
          <PixelSparkle size={11} className="absolute -right-1 top-0" />
        </div>
        <div className="flex-1">
          <h1 className="font-pixel text-[16px] uppercase leading-none tracking-[0.04em]">
            Morning check-in
          </h1>
          <p className="body-ko mt-1.5">오늘을 시작하는 내 상태.</p>
        </div>
        <div className="text-right">
          <p className="plabel">{pixelDate(date)}</p>
          <p
            className="mt-1 font-pixel text-[20px] leading-none"
            style={{ color: meta?.hex ?? 'var(--ink-faint, #B9A79C)' }}
          >
            {score ?? '—'}
          </p>
        </div>
      </header>

      {/* Quick / Detailed */}
      <div className="flex gap-1.5">
        {(['quick', 'detailed'] as EntryMode[]).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={entryMode === m}
            onClick={() => {
              haptic()
              setMode(m)
            }}
            className={cn(
              'flex-1 rounded-px3 border-[1.5px] py-2 font-pixel text-[11px] uppercase tracking-[0.04em]',
              entryMode === m
                ? 'border-pinkdeep bg-pinksoft text-pinkdeep'
                : 'border-border bg-cream text-inkfaint',
            )}
          >
            {m === 'quick' ? 'Quick' : 'More details'}
          </button>
        ))}
      </div>

      {/* ── 회복 ── */}
      <PixelPanel title="Recovery" icon={icons.sleep}>
        <FieldRow
          icon={icons.sleep}
          label="잔 시간"
          filled={form.sleepHours != null}
          onClear={() => set('sleepHours', null)}
        >
          <StepField
            value={form.sleepHours}
            onChange={(v) => set('sleepHours', v)}
            format={formatSleep}
            ariaLabel="잔 시간"
            max={16}
          />
        </FieldRow>
        <Divider />
        <FieldRow
          icon={fx.sparkle01}
          label="일어난 느낌"
          hint="개운할수록 많이"
          filled={form.wakeFreshness != null}
          onClear={() => set('wakeFreshness', null)}
        >
          <ScalePips
            asset={fx.sparkle01}
            value={form.wakeFreshness}
            onChange={(v) => set('wakeFreshness', v as Scale5 | null)}
            label="일어난 느낌"
          />
        </FieldRow>
        <Divider />
        <FieldRow
          icon={icons.fatigue}
          label="피로도"
          hint="많을수록 피곤"
          filled={form.fatigue != null}
          onClear={() => set('fatigue', null)}
        >
          <ScalePips
            asset={icons.fatigue}
            value={form.fatigue}
            onChange={(v) => set('fatigue', v as Scale5 | null)}
            label="피로도"
          />
        </FieldRow>
        <Divider />
        <FieldRow
          icon={icons.mood}
          label="기분"
          filled={form.mood != null}
          onClear={() => set('mood', null)}
        >
          <ScalePips
            asset={icons.mood}
            value={form.mood}
            onChange={(v) => set('mood', v as Scale5 | null)}
            label="기분"
          />
        </FieldRow>

        <Divider />
        <FieldRow
          icon={icons.sleep}
          label="수면의 질"
          filled={form.sleepQuality != null}
          onClear={() => set('sleepQuality', null)}
        >
          <ScalePips
            asset={icons.sleep}
            value={form.sleepQuality}
            onChange={(v) => set('sleepQuality', v as Scale5 | null)}
            label="수면의 질"
          />
        </FieldRow>
      </PixelPanel>

      {/* ── 오늘 — Quick 에서도 늘 보이는 것들 ── */}
      <PixelPanel title="Today" icon={icons.mood}>
        <FieldRow
          icon={icons.focus}
          label="집중력"
          filled={form.focus != null}
          onClear={() => set('focus', null)}
        >
          <ScalePips
            asset={icons.focus}
            value={form.focus}
            onChange={(v) => set('focus', v as Scale5 | null)}
            label="집중력"
          />
        </FieldRow>
        <Divider />
        <FieldRow
          icon={icons.body}
          label="몸 통증"
          hint="없으면 0"
          filled={form.bodyPain != null}
          onClear={() => set('bodyPain', null)}
        >
          <ScalePips
            asset={icons.body}
            value={form.bodyPain}
            offset={1}
            max={6}
            size={17}
            onChange={(v) => set('bodyPain', v as Pain5 | null)}
            label="몸 통증"
          />
        </FieldRow>
        <Divider />
        <FieldRow
          icon={icons.appetite}
          label="식욕"
          filled={form.appetite != null}
          onClear={() => set('appetite', null)}
        >
          <ScalePips
            asset={icons.appetite}
            value={form.appetite}
            onChange={(v) => set('appetite', v as Scale5 | null)}
            label="식욕"
          />
        </FieldRow>
        <Divider />
        <FieldRow
          icon={fx.cloud}
          label="스트레스"
          hint="많을수록 높음"
          filled={form.stress != null}
          onClear={() => set('stress', null)}
        >
          <ScalePips
            asset={fx.cloud}
            value={form.stress}
            onChange={(v) => set('stress', v as Scale5 | null)}
            label="스트레스"
          />
        </FieldRow>
      </PixelPanel>

      {entryMode === 'detailed' && (
        <>
          {/* ── 몸 ── */}
          <PixelPanel title="Body" icon={icons.body}>
            <FieldRow
              icon={icons.focus}
              label="두통"
              filled={form.headache != null}
              onClear={() => set('headache', null)}
            >
              <ScalePips
                asset={icons.focus}
                value={form.headache}
                offset={1}
                max={6}
                size={17}
                onChange={(v) => set('headache', v as Pain5 | null)}
                label="두통"
              />
            </FieldRow>
            <Divider />
            <FieldRow
              icon={icons.appetite}
              label="메스꺼움"
              filled={form.nausea != null}
              onClear={() => set('nausea', null)}
            >
              <ScalePips
                asset={icons.appetite}
                value={form.nausea}
                offset={1}
                max={6}
                size={17}
                onChange={(v) => set('nausea', v as Pain5 | null)}
                label="메스꺼움"
              />
            </FieldRow>
            <Divider />
            <FieldRow
              icon={items.milk}
              label="더부룩함"
              filled={form.bloating != null}
              onClear={() => set('bloating', null)}
            >
              <ScalePips
                asset={items.milk}
                value={form.bloating}
                offset={1}
                max={6}
                size={17}
                onChange={(v) => set('bloating', v as Pain5 | null)}
                label="더부룩함"
              />
            </FieldRow>
            <Divider />
            <FieldRow
              icon={icons.food}
              label="소화"
              filled={form.digestion != null}
              onClear={() => set('digestion', null)}
            >
              <ScalePips
                asset={icons.food}
                value={form.digestion}
                onChange={(v) => set('digestion', v as Scale5 | null)}
                label="소화"
              />
            </FieldRow>
          </PixelPanel>

          {/* ── 마음 ── */}
          <PixelPanel title="Mind" icon={icons.focus}>
            <FieldRow
              icon={pets.catBox}
              label="불안"
              hint="많을수록 높음"
              filled={form.anxiety != null}
              onClear={() => set('anxiety', null)}
            >
              <ScalePips
                asset={pets.catBox}
                value={form.anxiety}
                onChange={(v) => set('anxiety', v as Scale5 | null)}
                label="불안"
              />
            </FieldRow>
            <Divider />
            <FieldRow
              icon={icons.energy}
              label="의욕"
              filled={form.motivation != null}
              onClear={() => set('motivation', null)}
            >
              <ScalePips
                asset={icons.energy}
                value={form.motivation}
                onChange={(v) => set('motivation', v as Scale5 | null)}
                label="의욕"
              />
            </FieldRow>
            <Divider />
            <FieldRow
              icon={icons.camera}
              label="사람 기운"
              hint="사람 만날 힘"
              filled={form.socialEnergy != null}
              onClear={() => set('socialEnergy', null)}
            >
              <ScalePips
                asset={icons.camera}
                value={form.socialEnergy}
                onChange={(v) => set('socialEnergy', v as Scale5 | null)}
                label="사람 만날 기운"
              />
            </FieldRow>
          </PixelPanel>

          {/* ── 연료 ── */}
          <PixelPanel title="Fuel" icon={icons.food}>
            <FieldRow
              icon={icons.food}
              label="식사 횟수"
              filled={form.mealsCount != null}
              onClear={() => set('mealsCount', null)}
            >
              <NumberField
                value={form.mealsCount}
                onChange={(v) => set('mealsCount', v)}
                suffix="끼"
                ariaLabel="식사 횟수"
                width="w-[64px]"
              />
            </FieldRow>
            <Divider />
            <FieldRow
              icon={items.onigiri}
              label="식사의 질"
              filled={form.mealQuality != null}
              onClear={() => set('mealQuality', null)}
            >
              <ScalePips
                asset={items.onigiri}
                value={form.mealQuality}
                onChange={(v) => set('mealQuality', v as Scale5 | null)}
                label="식사의 질"
              />
            </FieldRow>
            <Divider />
            <FieldRow
              icon={icons.caffeine}
              label="카페인"
              filled={form.caffeineConsumed != null}
              onClear={() => set('caffeineConsumed', null)}
            >
              <YesNo
                value={form.caffeineConsumed}
                onChange={(v) => set('caffeineConsumed', v)}
              />
            </FieldRow>
            {form.caffeineConsumed && (
              <div className="flex animate-risein items-center justify-between pl-7 pt-1">
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
            <FieldRow
              icon={items.smoothie}
              label="술"
              filled={form.alcohol != null}
              onClear={() => set('alcohol', null)}
            >
              <YesNo value={form.alcohol} onChange={(v) => set('alcohol', v)} />
            </FieldRow>
          </PixelPanel>

          {/* ── 활동 ── */}
          <PixelPanel title="Activity" icon={icons.exercise}>
            <FieldRow
              icon={icons.exercise}
              label="운동"
              filled={form.exercise != null}
              onClear={() => set('exercise', null)}
            >
              <YesNo value={form.exercise} onChange={(v) => set('exercise', v)} />
            </FieldRow>
            {form.exercise && (
              <div className="animate-risein pl-7">
                <ChipRow
                  options={EXERCISE_TYPES}
                  value={form.exerciseType ?? null}
                  onChange={(v) => set('exerciseType', v as string | null)}
                  ariaLabel="운동 종류"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[12px] text-inkdim">얼마나</span>
                  <NumberField
                    value={form.exerciseMinutes}
                    onChange={(v) => set('exerciseMinutes', v)}
                    suffix="분"
                    ariaLabel="운동 시간"
                    width="w-[70px]"
                  />
                </div>
              </div>
            )}
            <Divider />
            <FieldRow
              icon={fx.rainbow}
              label="밖에 나감"
              filled={form.outdoor != null}
              onClear={() => set('outdoor', null)}
            >
              <YesNo value={form.outdoor} onChange={(v) => set('outdoor', v)} />
            </FieldRow>
            <Divider />
            <FieldRow
              icon={icons.work}
              label="일한 시간"
              filled={form.workHours != null}
              onClear={() => set('workHours', null)}
            >
              <NumberField
                value={form.workHours}
                onChange={(v) => set('workHours', v)}
                suffix="시간"
                ariaLabel="일한 시간"
                width="w-[64px]"
                step="0.5"
              />
            </FieldRow>
          </PixelPanel>

          {/* ── 맥락 ── */}
          <PixelPanel title="Context" icon={icons.log}>
            <p className="plabel mb-1">Tags</p>
            <ChipRow
              options={TAG_OPTIONS}
              value={form.tags ?? []}
              onChange={(v) => set('tags', v as string[])}
              multi
              ariaLabel="오늘의 태그"
            />
            <div className="mt-2 border-t border-dashed border-border/70 pt-2">
              <p className="plabel mb-1">Highlight</p>
              <input
                type="text"
                value={form.highlight ?? ''}
                onChange={(e) => set('highlight', e.target.value)}
                maxLength={80}
                placeholder="오늘 기억에 남는 한 가지"
                className="w-full bg-transparent text-[14px] placeholder:text-inkfaint focus:outline-none"
              />
            </div>
          </PixelPanel>
        </>
      )}

      <PixelPanel title="Memo" icon={icons.work}>
        <textarea
          value={form.memo ?? ''}
          onChange={(e) => set('memo', e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="한 줄 메모를 적어보아요!"
          className="w-full resize-none bg-transparent text-[14px] leading-relaxed placeholder:text-inkfaint focus:outline-none"
        />
      </PixelPanel>

      {/* 얼마나 채웠는지 */}
      <div className="flex items-center gap-2 px-1">
        <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-border/40">
          <div
            className="h-full rounded-full bg-pink transition-[width] duration-300"
            style={{ width: `${Math.round(result.confidence * 100)}%` }}
          />
        </div>
        <span className="plabel">
          {result.filled}/{result.totalMetrics} · {CONFIDENCE_LABEL[confidenceLevel(result.confidence)]}
        </span>
      </div>

      <QuickActions
        mounjaroEnabled={mounjaroEnabled}
        onSaveWeight={onSaveWeight}
        onSaveMounjaro={onSaveMounjaro}
        onSaveEvent={onSaveEvent}
      />

      {error && (
        <p className="rounded-px3 border-[1.5px] border-pinkdeep bg-pinksoft px-3 py-2 text-[12px]">
          {error}
        </p>
      )}

      <PixelButton icon={icons.save} full disabled={saving} onClick={() => void submit()}>
        {saving ? 'Saving…' : 'Save Today!'}
      </PixelButton>

      <p className="px-2 text-center text-[11px] leading-relaxed text-inkdim">
        여기 숫자는 내가 적은 걸 보기 좋게 모아 둔 값이에요. 건강 진단이나 의학적 판단에는 쓰지 마세요.
      </p>
    </div>
  )
}
