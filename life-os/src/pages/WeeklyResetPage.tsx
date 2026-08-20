/**
 * WEEKLY RESET — 일요일 저녁에 잠깐 쓰는 작은 다이어리.
 *
 * 평가표가 아니다. 숫자는 그냥 "이번 주엔 이런 게 남았어요" 이고,
 * 질문은 셋뿐이며 전부 비워 둬도 저장된다.
 */
import { useState } from 'react'
import type { WeeklyReset, WeeklyResetInput } from '@/types'
import type { WeekSummary } from '@/lib/analytics/weeklyReset'
import { MAX_FOCUS_DOMAINS, WEEKLY_RESET_XP } from '@/lib/analytics/weeklyReset'
import { DOMAINS, DOMAIN_META, type LifeDomain } from '@/lib/domains'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { PixelSparkle } from '@/components/pixel/PixelSparkle'
import { icons, pets } from '@/lib/pixelAssets'
import { formatShort } from '@/lib/date'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

interface Props {
  summary: WeekSummary
  existing: WeeklyReset | null
  onSave: (input: WeeklyResetInput & { avgEnergy: number | null; avgSleep: number | null }) => Promise<unknown>
  onDone: () => void
  onClose: () => void
}

export function WeeklyResetPage({ summary, existing, onSave, onDone, onClose }: Props) {
  const [good, setGood] = useState(existing?.goodText ?? '')
  const [hard, setHard] = useState(existing?.hardText ?? '')
  const [more, setMore] = useState(existing?.moreText ?? '')
  const [focus, setFocus] = useState<LifeDomain[]>(
    (existing?.focusDomains ?? []).filter((d): d is LifeDomain => d in DOMAIN_META),
  )
  const [saving, setSaving] = useState(false)

  const toggleFocus = (key: LifeDomain) => {
    haptic()
    setFocus((prev) =>
      prev.includes(key)
        ? prev.filter((d) => d !== key)
        : prev.length >= MAX_FOCUS_DOMAINS
          ? [...prev.slice(1), key]
          : [...prev, key],
    )
  }

  const save = async () => {
    setSaving(true)
    try {
      await onSave({
        weekStart: summary.weekStart,
        weekEnd: summary.weekEnd,
        goodText: good,
        hardText: hard,
        moreText: more,
        focusDomains: focus,
        avgEnergy: summary.avgEnergy,
        avgSleep: summary.avgSleepHours,
      })
      onDone()
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
            Weekly reset
          </h1>
          <p className="plabel mt-1.5">
            WEEK {summary.weekNo} · {formatShort(summary.weekStart)} — {formatShort(summary.weekEnd)}
          </p>
        </div>
        <PixelImage asset={pets.catSit} height={28} />
      </header>

      <p className="ko px-1">
        지난주를 채점하는 자리가 아니에요. 잠깐 돌아보고, 다음 주에 뭘 조금 더 챙기고 싶은지만
        생각하면 돼요.
      </p>

      {/* ── 자동 요약 */}
      <PixelPanel title="This week" icon={icons.energy} sparkle>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          <Stat label="Avg energy" value={summary.avgEnergy != null ? String(summary.avgEnergy) : '—'} />
          <Stat
            label="Avg sleep"
            value={summary.avgSleepHours != null ? formatHours(summary.avgSleepHours) : '—'}
          />
          <Stat label="Body" value={summary.bodyTrend} />
          <Stat label="Mind" value={summary.mindTrend} />
          <Stat label="Quests" value={String(summary.questCount)} />
          <Stat label="Check-in" value={`${summary.checkinDays} / ${summary.totalDays}일`} />
        </dl>

        <div className="mt-3 space-y-1.5 border-t border-dashed border-border pt-2.5">
          {summary.loudest && (
            <DomainLine label="기록이 많았던 곳" domain={summary.loudest} />
          )}
          {summary.quietest && summary.quietest !== summary.loudest && (
            <DomainLine label="조용했던 곳" domain={summary.quietest} quiet />
          )}
          <p className="ko pt-1 text-inkdim">{summary.headline}</p>
        </div>
      </PixelPanel>

      {/* ── 질문 세 개 */}
      <PixelPanel title="Three questions" icon={icons.save}>
        <Question
          label="WHAT FELT GOOD?"
          ko="이번 주 좋았던 것"
          value={good}
          onChange={setGood}
          placeholder="작은 것도 괜찮아요"
        />
        <Question
          label="WHAT FELT HARD?"
          ko="이번 주 힘들었던 것"
          value={hard}
          onChange={setHard}
          placeholder="그냥 적어 두기만 해도 돼요"
        />
        <Question
          label="WHAT DO YOU WANT MORE OF?"
          ko="다음 주에 조금 더 챙기고 싶은 것"
          value={more}
          onChange={setMore}
          placeholder="꼭 계획이 아니어도 괜찮아요"
          last
        />
      </PixelPanel>

      {/* ── 다음 주 영역 */}
      <PixelPanel
        title="Next week"
        icon={icons.xp}
        right={<span className="plabel">최대 {MAX_FOCUS_DOMAINS}개</span>}
      >
        <p className="ko mb-2.5 text-inkdim">
          고른 영역의 퀘스트가 다음 주에 조금 더 자주 보여요. 다른 영역이 사라지진 않아요.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DOMAINS.map((d) => {
            const on = focus.includes(d.key)
            return (
              <button
                key={d.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggleFocus(d.key)}
                className={cn(
                  'press flex items-center gap-1.5 rounded-full border-[1.5px] px-2.5 py-1.5',
                  'font-pixel text-[9px] uppercase tracking-[0.02em]',
                  on ? 'shadow-hard' : 'border-border bg-cream text-inkdim',
                )}
                style={on ? { borderColor: d.accent, backgroundColor: d.tint, color: d.accent } : undefined}
              >
                <PixelImage asset={d.icon} height={13} className={on ? undefined : 'opacity-40 saturate-0'} />
                {d.label}
              </button>
            )
          })}
        </div>
      </PixelPanel>

      <button
        type="button"
        onClick={() => {
          haptic()
          void save()
        }}
        disabled={saving}
        className="press flex w-full items-center justify-center gap-2 rounded-px4 border-[1.5px] border-pinkdeep bg-pink py-3.5 font-pixel text-[12px] uppercase tracking-[0.04em] text-white shadow-hard disabled:opacity-60"
      >
        <PixelSparkle size={11} />
        {existing ? '고쳐서 저장' : `이번 주 마무리 +${WEEKLY_RESET_XP} XP`}
      </button>

      <p className="pb-2 text-center text-[11px] leading-relaxed text-inkdim">
        빈칸으로 둬도 저장돼요. XP 는 한 주에 한 번만 붙어요.
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="plabel">{label}</dt>
      <dd className="mt-1 font-pixel text-[15px] leading-none">{value}</dd>
    </div>
  )
}

function DomainLine({
  label,
  domain,
  quiet,
}: {
  label: string
  domain: LifeDomain
  quiet?: boolean
}) {
  const meta = DOMAIN_META[domain]
  return (
    <p className="flex items-center gap-2 text-[12.5px]">
      <PixelImage asset={meta.icon} height={14} className={quiet ? 'opacity-45 saturate-50' : undefined} />
      <span className="text-inkdim">{label}</span>
      <span className="ml-auto font-pixel text-[10px]" style={{ color: meta.accent }}>
        {meta.label}
      </span>
    </p>
  )
}

function Question({
  label,
  ko,
  value,
  onChange,
  placeholder,
  last,
}: {
  label: string
  ko: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  last?: boolean
}) {
  return (
    <div className={cn('py-2', !last && 'border-b border-dashed border-border')}>
      <p className="plabel">{label}</p>
      <p className="mt-0.5 text-[11.5px] text-inkdim">{ko}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="mt-1.5 w-full resize-none bg-transparent text-[13.5px] leading-relaxed outline-none placeholder:text-inkfaint"
      />
    </div>
  )
}

const formatHours = (h: number) => {
  const hours = Math.floor(h)
  const minutes = Math.round((h - hours) * 60)
  return minutes ? `${hours}H ${minutes}M` : `${hours}H`
}
