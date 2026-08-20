import { useMemo, useState } from 'react'
import type { Checkin, MounjaroInput, MounjaroLog, Preferences } from '@/types'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { NumberField } from '@/components/checkin/Fields'
import { formatShort, todayKey } from '@/lib/date'
import { cycleProfile, mounjaroCycle, sideEffectCounts } from '@/lib/analytics'
import { icons } from '@/lib/pixelAssets'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

const SIDE_EFFECTS = ['메스꺼움', '더부룩함', '두통', '피로', '변비', '식욕 없음']

/**
 * Mounjaro — 내가 적어 두는 기록장.
 * 이 앱은 의료 앱이 아니다. 용량이나 투약 여부를 추천하지 않는다.
 * "다음 예정일" 은 설정에 직접 넣은 주기로 날짜만 더한 값이다.
 */
export function MounjaroPanel({
  prefs,
  mounjaro,
  checkins,
  onSave,
  onRemove,
  onOpenSettings,
}: {
  prefs: Preferences
  mounjaro: MounjaroLog[]
  checkins: Checkin[]
  onSave: (input: MounjaroInput) => Promise<unknown>
  onRemove: (date: string) => Promise<void>
  onOpenSettings: () => void
}) {
  const today = todayKey()
  const cycle = useMemo(() => mounjaroCycle(mounjaro, prefs, today), [mounjaro, prefs, today])

  if (!prefs.mounjaroEnabled) {
    return (
      <button
        type="button"
        onClick={onOpenSettings}
        className="press flex w-full items-center justify-center gap-2 rounded-px4 border-[1.5px] border-dashed border-borderdeep bg-cream py-3 text-[12.5px] text-inkdim"
      >
        <PixelImage asset={icons.log} height={16} />
        투약 기록을 쓰려면 설정에서 켜 주세요
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <PixelPanel title="Cycle" icon={icons.log}>
        <div className="grid grid-cols-3 gap-2">
          <Cell label="Cycle day" value={cycle.cycleDay !== null ? `D+${cycle.cycleDay - 1}` : '—'} />
          <Cell
            label="Next"
            value={
              cycle.daysUntilNext !== null
                ? cycle.daysUntilNext >= 0
                  ? `${cycle.daysUntilNext}일 뒤`
                  : `${-cycle.daysUntilNext}일 지남`
                : '—'
            }
            sub={cycle.nextDate ? formatShort(cycle.nextDate) : undefined}
          />
          <Cell
            label="Logged dose"
            value={cycle.currentDoseMg !== null ? `${cycle.currentDoseMg}mg` : '—'}
            sub={cycle.lastDose ? formatShort(cycle.lastDose.date) : undefined}
          />
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed text-inkfaint">
          다음 날짜는 설정에 적어 둔 주기({cycle.intervalDays}일)로 더한 값이에요. 이 앱은 의료 앱이
          아니고, 투약 여부나 용량에 대해서는 어떤 판단도 하지 않아요.
        </p>
      </PixelPanel>

      <MounjaroSection
        logs={mounjaro}
        defaultDose={cycle.currentDoseMg ?? prefs.mounjaroDoseMg ?? null}
        onSave={onSave}
        onRemove={onRemove}
      />

      <CycleProfile checkins={checkins} logs={mounjaro} intervalDays={cycle.intervalDays} />

      <SideEffects logs={mounjaro} />
    </div>
  )
}

function Cell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-px3 bg-cream px-2 py-2">
      <p className="plabel truncate">{label}</p>
      <p className="mt-1 font-pixel text-[14px] leading-none tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-[10.5px] text-inkfaint">{sub}</p>}
    </div>
  )
}

function MounjaroSection({
  logs,
  defaultDose,
  onSave,
  onRemove,
}: {
  logs: MounjaroLog[]
  defaultDose: number | null
  onSave: (input: MounjaroInput) => Promise<unknown>
  onRemove: (date: string) => Promise<void>
}) {
  const today = todayKey()
  /** null = 새로 적는 중, 값이 있으면 그 기록을 고치는 중 */
  const [editing, setEditing] = useState<MounjaroLog | null>(null)

  const recent = useMemo(
    () => [...logs].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8),
    [logs],
  )

  return (
    <>
      <MounjaroForm
        key={editing?.id ?? 'new'}
        editing={editing}
        defaultDose={defaultDose}
        existingToday={logs.find((m) => m.date === today) ?? null}
        onCancelEdit={() => setEditing(null)}
        onSave={async (input) => {
          // 날짜를 바꿔서 고쳤으면 예전 날짜의 기록은 지운다 (하루에 한 건이라서)
          if (editing && editing.date !== input.date) await onRemove(editing.date)
          await onSave(input)
          setEditing(null)
        }}
      />

      {recent.length > 0 && (
        <PixelPanel title="Injection log" icon={icons.log}>
          <ul className="divide-y divide-dashed divide-border/70">
            {recent.map((log) => (
              <InjectionRow
                key={log.id}
                log={log}
                active={editing?.id === log.id}
                onEdit={() => setEditing(editing?.id === log.id ? null : log)}
                onRemove={() => onRemove(log.date)}
              />
            ))}
          </ul>
          {logs.length > recent.length && (
            <p className="plabel mt-2">최근 {recent.length}건만 보여요 · 전체 {logs.length}건</p>
          )}
        </PixelPanel>
      )}
    </>
  )
}

/** 기록 한 줄 — 고치기와 지우기. 지우기는 한 번 더 물어본다. */
function InjectionRow({
  log,
  active,
  onEdit,
  onRemove,
}: {
  log: MounjaroLog
  active: boolean
  onEdit: () => void
  onRemove: () => Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  return (
    <li
      className={cn(
        '-mx-1 flex items-center gap-2 rounded-px3 px-1 py-2',
        active && 'bg-pinksoft',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="plabel">{formatShort(log.date)}</span>
          <span className="font-pixel text-[12px] tabular-nums">{log.doseMg}mg</span>
        </span>
        {(log.sideEffects?.length ?? 0) > 0 && (
          <span className="mt-0.5 block truncate text-[11.5px] text-inkdim">
            {log.sideEffects!.join(' · ')}
          </span>
        )}
      </span>

      {confirming ? (
        <span className="flex items-center gap-1.5">
          <span className="text-[11.5px] text-inkdim">지울까요?</span>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              haptic()
              setBusy(true)
              void onRemove().finally(() => {
                setBusy(false)
                setConfirming(false)
              })
            }}
            className="press rounded-px2 border-[1.5px] border-pinkdeep bg-pink px-2.5 py-1 font-pixel text-[10px] uppercase text-white"
          >
            {busy ? '…' : 'Delete'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="press rounded-px2 border-[1.5px] border-border bg-cream px-2.5 py-1 font-pixel text-[10px] uppercase text-inkdim"
          >
            No
          </button>
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`${formatShort(log.date)} 기록 고치기`}
            aria-pressed={active}
            onClick={() => {
              haptic()
              onEdit()
            }}
            className={cn(
              'press rounded-px2 border-[1.5px] px-2.5 py-1 font-pixel text-[10px] uppercase',
              active ? 'border-pinkdeep bg-pink text-white' : 'border-border bg-cream text-inkdim',
            )}
          >
            {active ? 'Editing' : 'Edit'}
          </button>
          <button
            type="button"
            aria-label={`${formatShort(log.date)} 기록 지우기`}
            onClick={() => {
              haptic()
              setConfirming(true)
            }}
            className="px-1.5 text-[16px] leading-none text-inkfaint"
          >
            ×
          </button>
        </span>
      )}
    </li>
  )
}

function MounjaroForm({
  editing,
  defaultDose,
  existingToday,
  onSave,
  onCancelEdit,
}: {
  editing: MounjaroLog | null
  defaultDose: number | null
  existingToday: MounjaroLog | null
  onSave: (input: MounjaroInput) => Promise<unknown>
  onCancelEdit: () => void
}) {
  const base = editing ?? existingToday
  const [date, setDate] = useState(editing?.date ?? todayKey())
  const [dose, setDose] = useState<number | null>(base?.doseMg ?? defaultDose)
  const [selected, setSelected] = useState<string[]>(base?.sideEffects ?? [])
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (dose === null) return
    setBusy(true)
    try {
      await onSave({ date, doseMg: dose, sideEffects: selected })
      setDone(true)
      setTimeout(() => setDone(false), 1600)
    } finally {
      setBusy(false)
    }
  }

  const label = busy ? 'Saving…' : done ? 'Saved!' : editing ? 'Update log' : base ? 'Update log' : 'Save log'

  return (
    <PixelPanel
      title={editing ? 'Edit injection' : 'Log injection'}
      icon={icons.save}
      right={
        editing ? (
          <button
            type="button"
            onClick={onCancelEdit}
            className="press rounded-px2 border-[1.5px] border-border bg-cream px-2 py-1 font-pixel text-[9px] uppercase text-inkdim"
          >
            Cancel
          </button>
        ) : undefined
      }
    >
      {editing && (
        <p className="mb-2 text-[12px] text-inkdim">
          {formatShort(editing.date)} 기록을 고치는 중이에요. 날짜를 바꾸면 그날로 옮겨져요.
        </p>
      )}

      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          max={todayKey()}
          onChange={(e) => setDate(e.target.value)}
          aria-label="투약 날짜"
          className="rounded-px2 border-[1.5px] border-border bg-cream px-2 py-1.5 font-pixel text-[12px]"
        />
        <NumberField
          value={dose}
          onChange={setDose}
          suffix="mg"
          ariaLabel="용량"
          step="0.5"
          width="w-[70px]"
        />
      </div>

      <p className="plabel mt-3">그날 몸에서 느낀 것 (선택)</p>
      <div className="no-scrollbar -mx-1 mt-1 flex gap-1.5 overflow-x-auto px-1 py-1">
        {SIDE_EFFECTS.map((s) => {
          const active = selected.includes(s)
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => {
                haptic()
                setSelected(active ? selected.filter((x) => x !== s) : [...selected, s])
              }}
              className={cn(
                'shrink-0 rounded-px3 border-[1.5px] px-2.5 py-1.5 text-[12px]',
                active ? 'border-pinkdeep bg-pinksoft' : 'border-border bg-cream text-inkdim',
              )}
            >
              {s}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        disabled={busy || dose === null}
        onClick={() => void submit()}
        className="press mt-3 w-full rounded-px4 border-[1.5px] border-pinkdeep bg-pink py-2.5 font-pixel text-[11px] uppercase text-white disabled:opacity-45"
      >
        {label}
      </button>

      <p className="mt-2 text-[11px] leading-relaxed text-inkfaint">
        적어 두기만 하는 기록이에요. 용량이나 투약 여부는 앱이 정하지 않아요.
      </p>
    </PixelPanel>
  )
}

function CycleProfile({
  checkins,
  logs,
  intervalDays,
}: {
  checkins: Checkin[]
  logs: MounjaroLog[]
  intervalDays: number
}) {
  const profile = useMemo(
    () => cycleProfile(checkins, logs, intervalDays),
    [checkins, logs, intervalDays],
  )

  if (profile.length < 3) {
    return (
      <PixelPanel title="Cycle & condition" icon={icons.xp}>
        <p className="body-ko text-inkdim">
          사이클 일차별로 비교하려면 기록이 조금 더 필요해요. 지금은 아직 숫자를 보여 주지 않을게요.
        </p>
      </PixelPanel>
    )
  }

  const max = Math.max(...profile.map((p) => p.avgScore))

  return (
    <PixelPanel title="Cycle & condition" icon={icons.xp}>
      <ul className="space-y-1.5">
        {profile.map((p) => (
          <li key={p.day} className="flex items-center gap-2">
            <span className="plabel w-[42px] shrink-0">D+{p.day - 1}</span>
            <span className="h-[10px] flex-1 overflow-hidden rounded-full bg-border/35">
              <span
                className="block h-full rounded-full bg-sky"
                style={{ width: `${Math.round((p.avgScore / (max || 1)) * 100)}%` }}
              />
            </span>
            <span className="w-[52px] text-right font-pixel text-[11px] tabular-nums">
              {p.avgScore}
              <span className="ml-1 text-[9px] text-inkfaint">·{p.n}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-[11px] leading-relaxed text-inkfaint">
        같은 사이클 일차에 적힌 점수의 평균이에요. 옆의 작은 숫자는 그 날짜에 적은 날의 수예요.
        원인을 말해 주는 값이 아니라, 이 기록에서 그렇게 보였다는 뜻이에요.
      </p>
    </PixelPanel>
  )
}

function SideEffects({ logs }: { logs: MounjaroLog[] }) {
  const counts = useMemo(() => sideEffectCounts(logs), [logs])
  if (counts.length === 0) return null

  return (
    <PixelPanel title="Noted" icon={icons.body}>
      <ul className="flex flex-wrap gap-1.5">
        {counts.map((c) => (
          <li
            key={c.name}
            className="rounded-px3 bg-cream px-2.5 py-1.5 text-[12px] text-inkdim"
          >
            {c.name} <span className="font-pixel text-[11px] text-ink">{c.count}</span>
          </li>
        ))}
      </ul>
    </PixelPanel>
  )
}
