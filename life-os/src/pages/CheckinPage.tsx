import { useState } from 'react'
import type { Checkin, CheckinInput, Pain5, Scale5 } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card, CardLabel } from '@/components/ui/Card'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { Slider } from '@/components/ui/Slider'
import { Stepper } from '@/components/ui/Stepper'
import { Toggle } from '@/components/ui/Toggle'
import { useCheckinForm } from '@/hooks/useCheckinForm'
import { formatLong, todayKey } from '@/lib/date'
import { modeMeta } from '@/lib/energy'

const EXERCISE_TYPES = ['걷기', '러닝', '헬스', '요가', '자전거', '수영', '기타']

interface Props {
  date?: string
  existing: Checkin | null
  onSaved: (checkin: Checkin) => void
  onSave: (input: CheckinInput) => Promise<Checkin>
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
      setError(e instanceof Error ? e.message : '저장에 실패했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="label mb-2">CHECK-IN</p>
          <h1 className="font-display text-[30px] leading-none tracking-tight">
            {date === todayKey() ? '오늘의 기록' : formatLong(date)}
          </h1>
        </div>
        {/* 입력하는 동안 점수가 즉시 반응하는 작은 HUD */}
        <div className="text-right">
          <p className="tnum font-display text-[40px] leading-none" style={{ color: meta.hex }}>
            {score}
          </p>
          <p className="label mt-1">{meta.key}</p>
        </div>
      </header>

      <div className="space-y-3">
        <Card>
          <CardLabel>SLEEP</CardLabel>
          <div className="space-y-6">
            <Slider
              label="수면 시간"
              value={form.sleepHours}
              min={0}
              max={12}
              step={0.5}
              suffix="h"
              onChange={(v) => set('sleepHours', v)}
            />
            <Stepper
              label="수면 질"
              value={form.sleepQuality}
              captions={['많이 뒤척임', '설침', '보통', '괜찮음', '푹 잠']}
              accent={meta.hex}
              onChange={(v) => set('sleepQuality', v as Scale5)}
            />
          </div>
        </Card>

        <Card>
          <CardLabel>BODY &amp; MIND</CardLabel>
          <div className="space-y-6">
            <Stepper
              label="피로도"
              value={form.fatigue}
              captions={['거의 없음', '약간', '보통', '높음', '탈진']}
              accent={meta.hex}
              onChange={(v) => set('fatigue', v as Scale5)}
            />
            <Stepper
              label="몸의 통증"
              value={form.bodyPain}
              min={0}
              captions={['없음', '미미함', '약간', '거슬림', '아픔', '심함']}
              accent={meta.hex}
              onChange={(v) => set('bodyPain', v as Pain5)}
            />
            <Stepper
              label="기분"
              value={form.mood}
              captions={['많이 가라앉음', '가라앉음', '보통', '좋음', '아주 좋음']}
              accent={meta.hex}
              onChange={(v) => set('mood', v as Scale5)}
            />
            <Stepper
              label="집중력"
              value={form.focus}
              captions={['산만함', '낮음', '보통', '좋음', '몰입됨']}
              accent={meta.hex}
              onChange={(v) => set('focus', v as Scale5)}
            />
            <Stepper
              label="식욕"
              value={form.appetite}
              captions={['없음', '적음', '보통', '좋음', '아주 좋음']}
              accent={meta.hex}
              onChange={(v) => set('appetite', v as Scale5)}
            />
          </div>
        </Card>

        <Card>
          <CardLabel>HABITS</CardLabel>
          <div className="space-y-5">
            <Toggle
              label="카페인"
              value={form.caffeineConsumed}
              onChange={(v) => set('caffeineConsumed', v)}
            />
            {form.caffeineConsumed && (
              <div className="animate-fade flex items-center justify-between">
                <span className="text-[13px] text-muted">마신 시간</span>
                <input
                  type="time"
                  value={form.caffeineTime ?? ''}
                  onChange={(e) => set('caffeineTime', e.target.value || null)}
                  aria-label="카페인 마신 시간"
                  className="tnum rounded-xl border border-line bg-elevated px-3 py-2 text-[14px] text-paper"
                />
              </div>
            )}

            <div className="hairline pt-5">
              <Toggle label="운동" value={form.exercise} onChange={(v) => set('exercise', v)} />
            </div>
            {form.exercise && (
              <div className="animate-fade">
                <ChipGroup
                  options={EXERCISE_TYPES}
                  value={form.exerciseType}
                  onChange={(v) => set('exerciseType', v)}
                />
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardLabel>MEMO</CardLabel>
          <textarea
            value={form.memo ?? ''}
            onChange={(e) => set('memo', e.target.value)}
            rows={3}
            maxLength={200}
            placeholder="한 줄로 남겨두면 나중에 도움이 돼요 (선택)"
            className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-paper placeholder:text-faint focus:outline-none"
          />
        </Card>
      </div>

      {error && <p className="mt-4 text-center text-[13px] text-recovery">{error}</p>}

      <Button full className="mt-6" disabled={saving} onClick={() => void submit()}>
        {saving ? '저장 중…' : 'Save Check-in'}
      </Button>

      <p className="mt-4 text-center text-[11px] leading-relaxed text-faint">
        이 점수는 컨디션을 눈에 보이게 만드는 개인 기록용이에요. 의학적 진단이나 판단에는 쓰지 마세요.
      </p>
    </div>
  )
}
