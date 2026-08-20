import { useState } from 'react'
import type { LifeEventInput, MounjaroInput, WeightInput } from '@/types'
import { PixelImage } from '@/components/pixel/PixelImage'
import { NumberField } from './Fields'
import { todayKey } from '@/lib/date'
import { icons, items, type PixelAsset } from '@/lib/pixelAssets'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

type Open = 'weight' | 'injection' | 'event' | null

/**
 * 체크인 화면에서 바로 적는 것들.
 * 컨디션 말고도 오늘 남길 게 있으면 여기서 한 줄로 끝낸다.
 */
export function QuickActions({
  mounjaroEnabled,
  onSaveWeight,
  onSaveMounjaro,
  onSaveEvent,
}: {
  mounjaroEnabled: boolean
  onSaveWeight: (input: WeightInput) => Promise<unknown>
  onSaveMounjaro: (input: MounjaroInput) => Promise<unknown>
  onSaveEvent: (input: LifeEventInput) => Promise<unknown>
}) {
  const [open, setOpen] = useState<Open>(null)
  const [done, setDone] = useState<Open>(null)

  const flash = (key: Open) => {
    setDone(key)
    setOpen(null)
    setTimeout(() => setDone((cur) => (cur === key ? null : cur)), 1800)
  }

  const actions: { key: Exclude<Open, null>; label: string; icon: PixelAsset }[] = [
    { key: 'weight', label: '체중', icon: items.milk },
    ...(mounjaroEnabled
      ? [{ key: 'injection' as const, label: '투약', icon: icons.log }]
      : []),
    { key: 'event', label: '오늘 있던 일', icon: icons.camera },
  ]

  return (
    <section>
      <p className="plabel mb-1.5">Also today</p>
      <div className="flex gap-1.5">
        {actions.map((a) => (
          <button
            key={a.key}
            type="button"
            aria-expanded={open === a.key}
            onClick={() => {
              haptic()
              setOpen(open === a.key ? null : a.key)
            }}
            className={cn(
              'press flex flex-1 items-center justify-center gap-1.5 rounded-px3 border-[1.5px] py-2 text-[12px]',
              open === a.key
                ? 'border-pinkdeep bg-pinksoft text-pinkdeep'
                : done === a.key
                  ? 'border-mintdeep bg-mintsoft text-mintdeep'
                  : 'border-border bg-cream text-inkdim',
            )}
          >
            <PixelImage asset={a.icon} height={15} />
            {done === a.key ? '적었어요' : `+ ${a.label}`}
          </button>
        ))}
      </div>

      {open === 'weight' && (
        <OneLine
          label="오늘 체중"
          suffix="kg"
          step="0.1"
          onSubmit={async (v) => {
            await onSaveWeight({ date: todayKey(), weightKg: v })
            flash('weight')
          }}
          onCancel={() => setOpen(null)}
        />
      )}

      {open === 'injection' && (
        <OneLine
          label="용량"
          suffix="mg"
          step="0.5"
          onSubmit={async (v) => {
            await onSaveMounjaro({ date: todayKey(), doseMg: v })
            flash('injection')
          }}
          onCancel={() => setOpen(null)}
        />
      )}

      {open === 'event' && (
        <TextLine
          placeholder="오늘 무슨 일이 있었나요?"
          onSubmit={async (text) => {
            await onSaveEvent({ date: todayKey(), title: text, category: 'note' })
            flash('event')
          }}
          onCancel={() => setOpen(null)}
        />
      )}
    </section>
  )
}

function OneLine({
  label,
  suffix,
  step,
  onSubmit,
  onCancel,
}: {
  label: string
  suffix: string
  step: string
  onSubmit: (value: number) => Promise<void>
  onCancel: () => void
}) {
  const [value, setValue] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <div className="mt-2 flex animate-risein items-center gap-2 rounded-px3 border-[1.5px] border-border bg-ivory px-3 py-2">
      <span className="text-[12.5px] text-inkdim">{label}</span>
      <NumberField
        value={value}
        onChange={setValue}
        suffix={suffix}
        ariaLabel={label}
        step={step}
        width="w-[76px]"
      />
      <button
        type="button"
        disabled={busy || value === null}
        onClick={() => {
          setBusy(true)
          void onSubmit(value as number).finally(() => setBusy(false))
        }}
        className="press ml-auto rounded-px3 border-[1.5px] border-pinkdeep bg-pink px-3 py-1.5 font-pixel text-[10px] uppercase text-white disabled:opacity-45"
      >
        Save
      </button>
      <button
        type="button"
        aria-label="닫기"
        onClick={onCancel}
        className="px-1 text-[15px] leading-none text-inkfaint"
      >
        ×
      </button>
    </div>
  )
}

function TextLine({
  placeholder,
  onSubmit,
  onCancel,
}: {
  placeholder: string
  onSubmit: (text: string) => Promise<void>
  onCancel: () => void
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <div className="mt-2 flex animate-risein items-center gap-2 rounded-px3 border-[1.5px] border-border bg-ivory px-3 py-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={80}
        placeholder={placeholder}
        aria-label="오늘 있던 일"
        className="min-w-0 flex-1 bg-transparent text-[13px] placeholder:text-inkfaint focus:outline-none"
      />
      <button
        type="button"
        disabled={busy || !text.trim()}
        onClick={() => {
          setBusy(true)
          void onSubmit(text.trim()).finally(() => setBusy(false))
        }}
        className="press rounded-px3 border-[1.5px] border-pinkdeep bg-pink px-3 py-1.5 font-pixel text-[10px] uppercase text-white disabled:opacity-45"
      >
        Save
      </button>
      <button
        type="button"
        aria-label="닫기"
        onClick={onCancel}
        className="px-1 text-[15px] leading-none text-inkfaint"
      >
        ×
      </button>
    </div>
  )
}
