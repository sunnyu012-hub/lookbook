import { useEffect, useMemo, useState } from 'react'
import type { Quest, QuestDraft, QuestPackDef, RepeatRule, TimeBand } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { presetKey } from '@/lib/library/packs'
import { questKeyOf } from '@/lib/library/usage'
import { normalizeTitle } from '@/lib/suggest'
import { toDayKey } from '@/lib/date'
import { expForDifficulty } from '@/lib/difficulty'
import { CATEGORY_LABEL } from '@/lib/labels'
import { cn } from '@/components/ui/cn'

/**
 * 세트 하나를 펼친 화면.
 *
 * 체크해서 한 번에 넣는다. 각각 따로 설정하게 만들지 않는다 —
 * 다섯 개를 고르고 각각 반복을 정하라고 하면 그게 다시 일이 된다.
 */

type Mode = 'TODAY' | 'ROUTINE'

const FREQUENCIES: Array<{ label: string; rule: RepeatRule }> = [
  { label: '매일', rule: { kind: 'daily' } },
  { label: '평일', rule: { kind: 'weekdays' } },
  { label: '주말', rule: { kind: 'days', days: [5, 6] } },
  { label: '주 3회', rule: { kind: 'timesPerWeek', times: 3 } },
]

const TIMES: Array<{ label: string; value: TimeBand | 'ANY' }> = [
  { label: '아침', value: 'MORNING' },
  { label: '낮', value: 'DAY' },
  { label: '저녁', value: 'EVENING' },
  { label: '자기 전', value: 'NIGHT' },
  { label: '언제든', value: 'ANY' },
]

interface PackDetailSheetProps {
  pack: QuestPackDef | null
  quests: Quest[]
  onClose: () => void
  /** 잘못 골라 들어왔을 때 세트 목록으로 돌아간다 */
  onBack?: () => void
  onAdd: (drafts: QuestDraft[]) => void
}

export function PackDetailSheet({ pack, quests, onClose, onBack, onAdd }: PackDetailSheetProps) {
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<Mode>('TODAY')
  const [ruleIndex, setRuleIndex] = useState(0)
  const [time, setTime] = useState<TimeBand | 'ANY'>('ANY')

  // 다른 세트를 열면 처음부터
  useEffect(() => {
    setPicked(new Set())
    setMode('TODAY')
    setRuleIndex(0)
    setTime('ANY')
  }, [pack?.id])

  /** 오늘 이미 있는 것은 다시 넣지 않는다 */
  const alreadyToday = useMemo(() => {
    const today = toDayKey(new Date().toISOString())
    const keys = new Set<string>()
    for (const q of quests) {
      const isToday = !q.completed || (q.completedAt && toDayKey(q.completedAt) === today)
      if (!isToday) continue
      keys.add(questKeyOf(q))
      keys.add(normalizeTitle(q.title))
    }
    return keys
  }, [quests])

  if (!pack) return null

  const isTaken = (presetId: string, title: string) =>
    alreadyToday.has(presetKey(pack.id, presetId)) || alreadyToday.has(normalizeTitle(title))

  const selectable = pack.items.filter((i) => !isTaken(i.id, i.title))
  const allPicked = selectable.length > 0 && selectable.every((i) => picked.has(i.id))

  const toggle = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const submit = () => {
    const drafts: QuestDraft[] = pack.items
      .filter((i) => picked.has(i.id))
      .map((i) => ({
        title: i.title,
        category: i.category,
        difficulty: i.difficulty,
        sourcePackId: pack.id,
        sourcePresetId: presetKey(pack.id, i.id),
        ...(mode === 'ROUTINE'
          ? { repeat: FREQUENCIES[ruleIndex].rule, timeOfDay: time }
          : {}),
      }))
    if (drafts.length > 0) onAdd(drafts)
  }

  return (
    <BottomSheet open onClose={onClose} onBack={onBack} backLabel="세트 목록" title={pack.name}>
      <div className="flex items-start gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card bg-canvas text-[28px]">
          {pack.icon}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="text-[19px] font-semibold text-ink">{pack.name}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-inkdim">{pack.description}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-[13px] font-medium text-inkdim">할 것 고르기</p>
        <button
          type="button"
          onClick={() =>
            setPicked(allPicked ? new Set() : new Set(selectable.map((i) => i.id)))
          }
          className="rounded-pill bg-sunken px-3 py-1.5 text-[12px] font-medium text-inkdim"
        >
          {allPicked ? '전체 해제' : '전체 선택'}
        </button>
      </div>

      <ul className="mt-2 space-y-1.5">
        {pack.items.map((item) => {
          const taken = isTaken(item.id, item.title)
          const on = picked.has(item.id)

          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={taken}
                onClick={() => toggle(item.id)}
                aria-pressed={on}
                className={cn(
                  'flex w-full items-center gap-3 rounded-card border px-3.5 py-3 text-left',
                  'transition-transform duration-150 ease-out active:scale-[0.98]',
                  'disabled:active:scale-100',
                  taken
                    ? 'border-line bg-sunken/40'
                    : on
                      ? 'border-coral bg-coral-soft/30'
                      : 'border-line bg-surface',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-[1.5px] text-[13px]',
                    on ? 'border-coral bg-coral text-surface' : 'border-line bg-surface text-transparent',
                    taken && 'border-line bg-transparent',
                  )}
                >
                  ✓
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      'block truncate text-[14px]',
                      taken ? 'text-inkfaint' : 'text-ink',
                    )}
                  >
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-inkfaint">
                    {taken
                      ? '오늘 이미 추가된 퀘스트야'
                      : `${CATEGORY_LABEL[item.category]} · +${expForDifficulty(item.difficulty)} EXP`}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {/* 오늘만 / 루틴으로 */}
      <div className="mt-5">
        <p className="mb-2 text-[13px] font-medium text-inkdim">어떻게 추가할까?</p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['TODAY', '오늘만', '오늘 목록에 한 번'],
              ['ROUTINE', '루틴으로', '정한 날마다 알아서'],
            ] as Array<[Mode, string, string]>
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                'rounded-card border px-3.5 py-3 text-left',
                'transition-transform duration-150 ease-out active:scale-[0.97]',
                mode === value
                  ? 'border-coral bg-coral-soft/40 ring-[1.5px] ring-inset ring-coral'
                  : 'border-line bg-surface',
              )}
            >
              <span className="block text-[14px] font-semibold text-ink">{label}</span>
              <span className="mt-0.5 block text-[11.5px] text-inkdim">{hint}</span>
            </button>
          ))}
        </div>
      </div>

      {mode === 'ROUTINE' && (
        <div className="mt-4 space-y-3 rounded-card bg-canvas px-3.5 py-3.5">
          <div>
            <p className="mb-1.5 text-[12.5px] font-medium text-inkdim">얼마나 자주</p>
            <div className="flex flex-wrap gap-1.5">
              {FREQUENCIES.map((f, i) => (
                <Chip key={f.label} on={ruleIndex === i} onClick={() => setRuleIndex(i)}>
                  {f.label}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[12.5px] font-medium text-inkdim">언제쯤</p>
            <div className="flex flex-wrap gap-1.5">
              {TIMES.map((t) => (
                <Chip key={t.value} on={time === t.value} onClick={() => setTime(t.value)}>
                  {t.label}
                </Chip>
              ))}
            </div>
          </div>
          <p className="text-[11.5px] leading-relaxed text-inkfaint">
            시간대는 알림이 아니라 표시야. 정해둔 시각에 울리지 않아.
          </p>
        </div>
      )}

      <div className="sticky bottom-0 mt-5 bg-surface pb-1 pt-3">
        <Button
          size="lg"
          className="w-full"
          disabled={picked.size === 0}
          onClick={submit}
        >
          {picked.size === 0
            ? '고른 게 없어'
            : mode === 'TODAY'
              ? `선택한 ${picked.size}개 오늘에 추가`
              : `선택한 ${picked.size}개 루틴으로`}
        </Button>
      </div>
    </BottomSheet>
  )
}

function Chip({
  children,
  on,
  onClick,
}: {
  children: React.ReactNode
  on: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center rounded-pill px-3.5 text-[12.5px] font-medium',
        'transition-transform duration-150 ease-out active:scale-[0.96]',
        on ? 'bg-coral text-surface' : 'bg-surface text-inkdim ring-1 ring-inset ring-line',
      )}
    >
      {children}
    </button>
  )
}
