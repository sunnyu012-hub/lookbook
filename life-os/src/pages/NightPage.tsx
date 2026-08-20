import { useState } from 'react'
import type { Checkin, NightCheckout, NightCheckoutInput, Scale5 } from '@/types'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { PixelSparkle } from '@/components/pixel/PixelSparkle'
import { formatShort, todayKey } from '@/lib/date'
import { icons, pets } from '@/lib/pixelAssets'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

const RATINGS: { key: keyof NightCheckoutInput; label: string; hint?: string }[] = [
  { key: 'actualEnergy', label: '실제 에너지' },
  { key: 'daySatisfaction', label: '하루 만족도' },
  { key: 'actualMood', label: '기분' },
  { key: 'actualBody', label: '몸' },
  { key: 'actualStress', label: '스트레스', hint: '높을수록 힘들었던' },
]

interface Props {
  date?: string
  morning: Checkin | null
  existing: NightCheckout | null
  onSave: (input: NightCheckoutInput) => Promise<unknown>
  onDone: () => void
  onClose: () => void
}

/**
 * NIGHT CHECK-OUT — 하루를 닫는 기록.
 * 길면 안 된다. 빠른 별점 5개가 기본이고 글은 전부 선택이다.
 */
export function NightPage({ date = todayKey(), morning, existing, onSave, onDone, onClose }: Props) {
  const [form, setForm] = useState<NightCheckoutInput>(() => ({
    date,
    actualEnergy: existing?.actualEnergy ?? null,
    daySatisfaction: existing?.daySatisfaction ?? null,
    actualMood: existing?.actualMood ?? null,
    actualBody: existing?.actualBody ?? null,
    actualStress: existing?.actualStress ?? null,
    bestThing: existing?.bestThing ?? '',
    hardestThing: existing?.hardestThing ?? '',
    diary: existing?.diary ?? '',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof NightCheckoutInput>(key: K, value: NightCheckoutInput[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const filled = RATINGS.filter((r) => form[r.key] != null).length

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(form)
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했어요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="돌아가기"
          className="press h-8 w-8 rounded-px3 border-[1.5px] border-border bg-ivory font-pixel text-[12px] shadow-hard"
        >
          ‹
        </button>
        <div className="flex-1">
          <h1 className="font-pixel text-[15px] uppercase leading-none tracking-[0.04em]">
            Night check-out
          </h1>
          <p className="plabel mt-1.5">{formatShort(date)}</p>
        </div>
        <PixelImage asset={pets.catCurl} height={30} className="animate-breathe" />
      </header>

      <p className="ko px-1">오늘 하루는 실제로 어땠나요? 20초면 충분해요.</p>

      <PixelPanel>
        <ul className="divide-y divide-dashed divide-border/60">
          {RATINGS.map((row) => (
            <li key={String(row.key)} className="flex items-center gap-2 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] leading-tight">{row.label}</span>
                {row.hint && (
                  <span className="mt-0.5 block text-[10px] text-inkfaint">{row.hint}</span>
                )}
              </span>
              <Stars
                value={form[row.key] as Scale5 | null | undefined}
                onChange={(v) => set(row.key, v as never)}
                label={row.label}
              />
            </li>
          ))}
        </ul>
      </PixelPanel>

      <PixelPanel title="Optional" icon={icons.log}>
        <Field
          label="오늘 제일 좋았던 것"
          value={form.bestThing ?? ''}
          onChange={(v) => set('bestThing', v)}
          placeholder="점심 먹고 산책한 것"
        />
        <Field
          label="오늘 제일 힘들었던 것"
          value={form.hardestThing ?? ''}
          onChange={(v) => set('hardestThing', v)}
          placeholder="회의가 길었다"
        />
        <div className="pt-1">
          <p className="plabel mb-1">한 줄 일기</p>
          <textarea
            value={form.diary ?? ''}
            onChange={(e) => set('diary', e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="오늘의 한 줄"
            className="w-full resize-none bg-transparent text-[13.5px] leading-relaxed placeholder:text-inkfaint focus:outline-none"
          />
        </div>
      </PixelPanel>

      {morning?.energyScore != null && filled > 0 && (
        <p className="ko px-1 text-inkdim">
          아침에 적은 예상은 {morning.energyScore}점이었어요. 저장하면 오늘의 차이를 보여드릴게요.
        </p>
      )}

      {error && (
        <p className="rounded-px3 border-[1.5px] border-pinkdeep bg-pinksoft px-3 py-2 text-[12px]">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={() => {
          haptic()
          void submit()
        }}
        className="press flex w-full items-center justify-center gap-2 rounded-px4 border-[1.5px] border-pinkdeep bg-pink py-3 font-pixel text-[12px] uppercase tracking-[0.04em] text-white shadow-hardpink disabled:opacity-50"
      >
        <PixelSparkle size={11} />
        {saving ? 'Saving…' : '하루 마무리'}
      </button>

      <p className="px-2 pb-2 text-center text-[11px] leading-relaxed text-inkdim">
        적고 싶은 것만 적어도 괜찮아요. 빈칸은 그냥 비워 두면 돼요.
      </p>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="border-b border-dashed border-border/60 py-2 last:border-b-0">
      <p className="plabel mb-1">{label}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={80}
        placeholder={placeholder}
        aria-label={label}
        className="w-full bg-transparent text-[13.5px] placeholder:text-inkfaint focus:outline-none"
      />
    </div>
  )
}

/** 별 다섯 개 — 같은 별을 다시 누르면 지워진다 */
function Stars({
  value,
  onChange,
  label,
}: {
  value: Scale5 | null | undefined
  onChange: (v: Scale5 | null) => void
  label: string
}) {
  return (
    <span className="flex gap-0.5" role="group" aria-label={label}>
      {([1, 2, 3, 4, 5] as Scale5[]).map((n) => {
        const on = value != null && n <= value
        return (
          <button
            key={n}
            type="button"
            aria-label={`${label} ${n}`}
            aria-pressed={on}
            onClick={() => {
              haptic()
              onChange(value === n ? null : n)
            }}
            className={cn('rounded-px2 p-0.5', !on && 'opacity-25 saturate-50')}
          >
            <PixelImage asset={icons.xp} height={19} />
          </button>
        )
      })}
    </span>
  )
}
