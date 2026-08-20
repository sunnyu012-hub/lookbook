import { useEffect, useState } from 'react'
import type { DdayEvent, DdayInput, DdayKind, Preferences } from '@/types'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { NumberField } from '@/components/checkin/Fields'
import { ddayFrom } from '@/lib/dday'
import { formatShort, todayKey } from '@/lib/date'
import { effects as fx, icons, type PixelAsset } from '@/lib/pixelAssets'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

const KIND_META: Record<DdayKind, { label: string; icon: PixelAsset }> = {
  love: { label: '사랑', icon: fx.heart },
  health: { label: '건강', icon: icons.body },
  life: { label: '생활', icon: icons.home },
  goal: { label: '목표', icon: icons.xp },
}

interface Props {
  prefs: Preferences
  ddays: DdayEvent[]
  account: string | null
  onSave: (next: Preferences) => Promise<unknown>
  onSaveDday: (input: DdayInput & { id?: string }) => Promise<unknown>
  onRemoveDday: (id: string) => Promise<void>
  onSignOut: () => void
  onClose: () => void
}

export function SettingsPage({
  prefs,
  ddays,
  account,
  onSave,
  onSaveDday,
  onRemoveDday,
  onSignOut,
  onClose,
}: Props) {
  const [draft, setDraft] = useState<Preferences>(prefs)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setDraft(prefs), [prefs])

  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  const submit = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(draft)
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
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
          aria-label="닫기"
          className="press h-8 w-8 rounded-px3 border-[1.5px] border-border bg-ivory font-pixel text-[12px] shadow-hard"
        >
          ‹
        </button>
        <h1 className="font-pixel text-[16px] uppercase leading-none tracking-[0.04em]">
          Settings
        </h1>
      </header>

      <PixelPanel title="Me" icon={icons.home}>
        <Field label="이름">
          <TextInput
            value={draft.displayName ?? ''}
            onChange={(v) => set('displayName', v || null)}
            placeholder="뭐라고 부를까요?"
            ariaLabel="이름"
          />
        </Field>
        <Field label="Life OS 시작일">
          <DateInput
            value={draft.lifeOsStartDate}
            onChange={(v) => set('lifeOsStartDate', v)}
            ariaLabel="Life OS 시작일"
          />
        </Field>
        <Field label="키">
          <NumberField
            value={draft.heightCm}
            onChange={(v) => set('heightCm', v)}
            suffix="cm"
            ariaLabel="키"
            step="0.5"
            width="w-[74px]"
          />
        </Field>
      </PixelPanel>

      <PixelPanel title="Goals" icon={icons.xp}>
        <Field label="시작 체중">
          <NumberField
            value={draft.startingWeightKg}
            onChange={(v) => set('startingWeightKg', v)}
            suffix="kg"
            ariaLabel="시작 체중"
            step="0.1"
            width="w-[74px]"
          />
        </Field>
        <Field label="목표 체중">
          <NumberField
            value={draft.goalWeightKg}
            onChange={(v) => set('goalWeightKg', v)}
            suffix="kg"
            ariaLabel="목표 체중"
            step="0.1"
            width="w-[74px]"
          />
        </Field>
        <Field label="목표 수면">
          <NumberField
            value={draft.sleepGoalHours}
            onChange={(v) => set('sleepGoalHours', v ?? 8)}
            suffix="시간"
            ariaLabel="목표 수면 시간"
            step="0.5"
            width="w-[64px]"
          />
        </Field>
        <p className="mt-2 text-[11px] leading-relaxed text-inkfaint">
          목표는 점수를 계산할 때 쓰는 기준일 뿐이에요. 빨리 도달하는 걸 앱이 재촉하지 않아요.
        </p>
      </PixelPanel>

      <PixelPanel
        title="Mounjaro"
        icon={icons.log}
        right={
          <Toggle
            on={draft.mounjaroEnabled}
            onChange={(v) => set('mounjaroEnabled', v)}
            ariaLabel="투약 기록 사용"
          />
        }
      >
        {draft.mounjaroEnabled ? (
          <>
            <Field label="시작일">
              <DateInput
                value={draft.mounjaroStartDate}
                onChange={(v) => set('mounjaroStartDate', v)}
                ariaLabel="투약 시작일"
              />
            </Field>
            <Field label="현재 용량">
              <NumberField
                value={draft.mounjaroDoseMg}
                onChange={(v) => set('mounjaroDoseMg', v)}
                suffix="mg"
                ariaLabel="현재 용량"
                step="0.5"
                width="w-[70px]"
              />
            </Field>
            <Field label="주기">
              <NumberField
                value={draft.mounjaroIntervalDays}
                onChange={(v) => set('mounjaroIntervalDays', v ?? 7)}
                suffix="일"
                ariaLabel="투약 주기"
                width="w-[60px]"
              />
            </Field>
            <p className="mt-2 text-[11px] leading-relaxed text-inkfaint">
              여기 적은 값은 내가 기억하려고 적어 두는 정보예요. 이 앱은 의료 앱이 아니고, 용량이나
              투약 여부를 추천하지 않아요. 그건 담당 의료진과 정할 일이에요.
            </p>
          </>
        ) : (
          <p className="body-ko text-inkdim">켜면 투약 기록과 사이클 화면이 나타나요.</p>
        )}
      </PixelPanel>

      <PixelPanel
        title="Together"
        icon={fx.heart}
        right={
          <Toggle
            on={draft.relationshipEnabled}
            onChange={(v) => set('relationshipEnabled', v)}
            ariaLabel="D-Day 사용"
          />
        }
      >
        {draft.relationshipEnabled ? (
          <>
            <Field label="이름">
              <TextInput
                value={draft.partnerName ?? ''}
                onChange={(v) => set('partnerName', v || null)}
                placeholder="누구와의 날인가요?"
                ariaLabel="상대 이름"
              />
            </Field>
            <Field label="시작한 날">
              <DateInput
                value={draft.relationshipStartDate}
                onChange={(v) => set('relationshipStartDate', v)}
                ariaLabel="시작한 날"
              />
            </Field>
            {draft.relationshipStartDate && (
              <p className="mt-2 text-[12px] text-inkdim">
                오늘로 {ddayFrom(draft.relationshipStartDate).countLabel}이에요.
              </p>
            )}
          </>
        ) : (
          <p className="body-ko text-inkdim">켜면 오늘 화면 맨 위에 며칠째인지 나와요.</p>
        )}
      </PixelPanel>

      <DdayList ddays={ddays} onSave={onSaveDday} onRemove={onRemoveDday} />

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
        className="press w-full rounded-px4 border-[1.5px] border-pinkdeep bg-pink py-3 font-pixel text-[12px] uppercase tracking-[0.04em] text-white shadow-hardpink disabled:opacity-50"
      >
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save settings'}
      </button>

      <PixelPanel title="Account" icon={icons.save}>
        <p className="text-[12.5px] text-inkdim">{account ?? '로컬 저장 모드'}</p>
        {account && (
          <button
            type="button"
            onClick={onSignOut}
            className="press mt-2 w-full rounded-px3 border-[1.5px] border-border bg-ivory py-2.5 font-pixel text-[11px] uppercase text-inkdim"
          >
            Sign out
          </button>
        )}
      </PixelPanel>

      <p className="px-2 pb-2 text-center text-[11px] leading-relaxed text-inkdim">
        Life OS 는 의료 앱이 아니에요. 진단하거나 치료를 권하거나 약 용량을 정해 주지 않아요.
      </p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-dashed border-border/70 py-2 last:border-b-0">
      <span className="flex-1 text-[12.5px] text-ink">{label}</span>
      {children}
    </div>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  ariaLabel: string
}) {
  return (
    <input
      type="text"
      value={value}
      aria-label={ariaLabel}
      placeholder={placeholder}
      maxLength={40}
      onChange={(e) => onChange(e.target.value)}
      className="w-[150px] rounded-px2 border-[1.5px] border-border bg-cream px-2 py-1.5 text-right text-[13px] placeholder:text-inkfaint"
    />
  )
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

function Toggle({
  on,
  onChange,
  ariaLabel,
}: {
  on: boolean
  onChange: (v: boolean) => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={() => {
        haptic()
        onChange(!on)
      }}
      className={cn(
        'h-[22px] w-[38px] rounded-full border-[1.5px] p-[2px] transition-colors duration-150',
        on ? 'border-pinkdeep bg-pink' : 'border-border bg-cream',
      )}
    >
      <span
        className={cn(
          'block h-[14px] w-[14px] rounded-full bg-white transition-transform duration-150',
          on ? 'translate-x-[16px]' : 'translate-x-0',
        )}
      />
    </button>
  )
}

function DdayList({
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
