import { useState } from 'react'
import type { DdayEvent, DdayInput, DdayKind } from '@/types'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { formatShort, todayKey } from '@/lib/date'
import { ddayFrom } from '@/lib/dday'
import { effects as fx, icons, type PixelAsset } from '@/lib/pixelAssets'
import { cn } from '@/lib/cn'

const KIND_META: Record<DdayKind, { label: string; icon: PixelAsset }> = {
  love: { label: '사랑', icon: fx.heart },
  health: { label: '건강', icon: icons.body },
  life: { label: '생활', icon: icons.home },
  goal: { label: '목표', icon: icons.xp },
}

function DateInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: string | null
  onChange: (v: string | null) => void
  ariaLabel: string
}) {
  return (
    <input
      type="date"
      value={value ?? ''}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value || null)}
      className="rounded-px2 border-[1.5px] border-border bg-cream px-2 py-1.5 font-pixel text-[12px]"
    />
  )
}

export function DdayPanel({
  ddays,
  onSave,
  onRemove,
}: {
  ddays: DdayEvent[]
  onSave: (input: DdayInput & { id?: string }) => Promise<unknown>
  onRemove: (id: string) => Promise<void>
}) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayKey())
  const [kind, setKind] = useState<DdayKind>('life')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!title.trim()) return
    setBusy(true)
    try {
      await onSave({
        title,
        startDate: date,
        kind,
        countMode: date > todayKey() ? 'until' : 'since',
        pinned: true,
        sortOrder: ddays.length,
      })
      setTitle('')
      setAdding(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <PixelPanel title="D-Day" icon={icons.xp}>
      {ddays.length === 0 && !adding && (
        <p className="body-ko text-inkdim">세고 싶은 날이 있으면 여기에 넣어 두세요.</p>
      )}

      <ul className="divide-y divide-dashed divide-border/70">
        {ddays.map((d) => {
          const r = ddayFrom(d.startDate, d.countMode)
          return (
            <li key={d.id} className="flex items-center gap-2 py-2">
              <PixelImage asset={KIND_META[d.kind].icon} height={16} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px]">{d.title}</span>
                <span className="plabel mt-0.5 block">{formatShort(d.startDate)}</span>
              </span>
              <span className="font-pixel text-[12px] text-pinkdeep">{r.label}</span>
              <button
                type="button"
                aria-label={`${d.title} 지우기`}
                onClick={() => void onRemove(d.id)}
                className="px-1 text-[15px] leading-none text-inkfaint"
              >
                ×
              </button>
            </li>
          )
        })}
      </ul>

      {adding ? (
        <div className="mt-2 space-y-2 border-t border-dashed border-border pt-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={40}
            placeholder="무슨 날인가요?"
            aria-label="D-Day 이름"
            className="w-full border-b border-dashed border-border bg-transparent pb-1.5 text-[14px] placeholder:text-inkfaint focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <DateInput value={date} onChange={(v) => setDate(v ?? todayKey())} ariaLabel="D-Day 날짜" />
            <div className="ml-auto flex gap-1">
              {(Object.keys(KIND_META) as DdayKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  aria-label={KIND_META[k].label}
                  onClick={() => setKind(k)}
                  className={cn(
                    'rounded-px2 border-[1.5px] p-1.5',
                    kind === k ? 'border-pinkdeep bg-pinksoft' : 'border-border bg-cream',
                  )}
                >
                  <PixelImage asset={KIND_META[k].icon} height={15} />
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !title.trim()}
              onClick={() => void submit()}
              className="press flex-1 rounded-px3 border-[1.5px] border-pinkdeep bg-pink py-2 font-pixel text-[11px] uppercase text-white disabled:opacity-45"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="press rounded-px3 border-[1.5px] border-border bg-ivory px-3 py-2 font-pixel text-[11px] uppercase text-inkdim"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="press mt-2 w-full rounded-px3 border-[1.5px] border-dashed border-borderdeep py-2 text-[12.5px] text-inkdim"
        >
          + D-Day 추가
        </button>
      )}
    </PixelPanel>
  )
}
