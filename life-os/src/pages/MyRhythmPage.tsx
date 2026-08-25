/**
 * MY RHYTHM — 나는 언제 어떤가.
 *
 * 이 화면은 조용해야 한다 (계획서 100).
 * 발견도 아니고 해금도 아니다. 기록에서 나온 숫자를 그대로 보여 줄 뿐이다.
 *
 * 그래서 여기 없는 것들:
 *   NEW · 잠금 해제 · 반짝임 · 점수 · 등급 · "당신은 저녁형 인간입니다"
 *
 * 숫자 옆에는 늘 표본이 붙는다. 기록 여섯 개로 나온 평균을 크게 보여 주면
 * 사용자는 그걸 사실로 읽게 된다.
 */
import { useMemo, useState } from 'react'
import type { Checkin } from '@/types'
import type { MyTag, QuickLog } from '@/lib/os2/types'
import { useAnalysis } from '@/hooks/useAnalysis'
import {
  CONFIDENCE_LABEL,
  METRICS,
  NOT_ENOUGH,
  NOT_ENOUGH_SHORT,
  QUICK_LOG_METRICS,
  RELATION_LABEL,
  WINDOW_LABEL,
  describeDayType,
  describeResult,
  describeWindowChange,
  relationOf,
  sampleNote,
  signed,
  type AnalysisResult,
  type MetricKey,
  type WindowKey,
} from '@/lib/os2/analytics'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { icons } from '@/lib/pixelAssets'
import { haptic } from '@/hooks/useHaptic'
import { cn } from '@/lib/cn'

interface Props {
  logs: QuickLog[]
  checkins: Checkin[]
  myTags: MyTag[]
  onClose: () => void
}

const WINDOWS: WindowKey[] = ['7d', '30d', '90d']

export function MyRhythmPage({ logs, checkins, myTags, onClose }: Props) {
  const [windowKey, setWindowKey] = useState<WindowKey>('30d')
  const [metric, setMetric] = useState<MetricKey>('mood')
  const [detail, setDetail] = useState<string | null>(null)

  const analysis = useAnalysis({ logs, checkins, myTags, windowKey, metric })

  const current = useMemo(
    () => analysis.rhythm.metrics.find((m) => m.metric === metric),
    [analysis.rhythm, metric],
  )
  const dayType = useMemo(
    () => analysis.rhythm.dayType.find((d) => d.metric === metric),
    [analysis.rhythm, metric],
  )

  const def = METRICS[metric]

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="돌아가기"
          className="press relative h-8 w-8 rounded-px3 border-[1.5px] border-border bg-ivory font-pixel text-[12px] shadow-hard before:absolute before:-inset-2 before:content-['']"
        >
          ‹
        </button>
        <div className="flex-1">
          <h1 className="font-pixel text-[15px] uppercase leading-none tracking-[0.04em]">
            My rhythm
          </h1>
          <p className="plabel mt-1.5">{WINDOW_LABEL[windowKey]}</p>
        </div>
      </header>

      {/* 기간 */}
      <div className="flex gap-1.5" role="radiogroup" aria-label="분석 기간">
        {WINDOWS.map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={windowKey === key}
            onClick={() => {
              haptic()
              setWindowKey(key)
            }}
            className={cn(
              'press min-h-[44px] flex-1 rounded-px3 border-[1.5px] font-pixel text-[10px] uppercase',
              windowKey === key
                ? 'border-skydeep bg-skysoft text-skydeep'
                : 'border-border bg-ivory text-inkfaint',
            )}
          >
            {WINDOW_LABEL[key].replace('최근 ', '')}
          </button>
        ))}
      </div>

      {/* 무엇을 볼 것인가 */}
      <div className="flex gap-1.5" role="radiogroup" aria-label="분석할 값">
        {QUICK_LOG_METRICS.map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={metric === key}
            onClick={() => {
              haptic()
              setMetric(key)
              setDetail(null)
            }}
            className={cn(
              'press min-h-[44px] flex-1 rounded-px3 border-[1.5px] text-[12px]',
              metric === key
                ? 'border-pinkdeep bg-pinksoft text-pinkdeep'
                : 'border-border bg-ivory text-inkdim',
            )}
          >
            {METRICS[key].label}
          </button>
        ))}
      </div>

      {analysis.rhythm.activeDays < 3 ? (
        <PixelPanel title="My rhythm" icon={icons.mood}>
          <p className="text-[13px] leading-relaxed text-inkdim">{NOT_ENOUGH}</p>
        </PixelPanel>
      ) : (
        <>
          {/* 시간대 */}
          <PixelPanel
            title={`${def.label} · 시간대`}
            icon={icons.mood}
            right={
              <span className="font-pixel text-[9px] uppercase text-inkfaint">
                평균 {def.format(current?.baseline ?? 0)}
              </span>
            }
          >
            {current && current.slots.some((s) => s.result.confidence !== 'insufficient') ? (
              <div className="space-y-1.5">
                {current.slots.map((slot) => (
                  <SlotRow
                    key={slot.dayPart}
                    label={slot.label}
                    result={slot.result}
                    baseline={current.baseline}
                    scale={def.scale}
                    open={detail === `slot:${slot.dayPart}`}
                    onToggle={() => {
                      haptic()
                      setDetail((v) =>
                        v === `slot:${slot.dayPart}` ? null : `slot:${slot.dayPart}`,
                      )
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-inkdim">{NOT_ENOUGH}</p>
            )}
          </PixelPanel>

          {/* 평일 · 주말 */}
          {dayType && (
            <PixelPanel title="평일 · 주말" icon={icons.home}>
              {dayType.enough ? (
                <>
                  <div className="flex gap-2">
                    <SideBox
                      label="평일"
                      value={def.format(dayType.weekday.observed)}
                      note={sampleNote(dayType.weekday)}
                    />
                    <SideBox
                      label="주말"
                      value={def.format(dayType.weekend.observed)}
                      note={sampleNote(dayType.weekend)}
                    />
                  </div>
                  {Math.abs(dayType.difference) >= 0.05 && (
                    <p className="mt-2.5 text-[12.5px] leading-relaxed text-inkdim">
                      {describeDayType(def.label, dayType.difference > 0 ? '주말' : '평일')}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[13px] text-inkdim">{NOT_ENOUGH}</p>
              )}
            </PixelPanel>
          )}

          {/* 무엇과 함께 있을 때 */}
          <PixelPanel title="무엇과 함께 있을 때" icon={icons.log}>
            {analysis.ranked.length ? (
              <div className="space-y-1.5">
                {analysis.ranked.map((result) => (
                  <ContextRow
                    key={result.tagId}
                    result={result}
                    open={detail === `ctx:${result.tagId}`}
                    onToggle={() => {
                      haptic()
                      setDetail((v) => (v === `ctx:${result.tagId}` ? null : `ctx:${result.tagId}`))
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="text-[13px] leading-relaxed text-inkdim">{NOT_ENOUGH}</p>
            )}
          </PixelPanel>

          {/* 내가 만든 태그 */}
          {analysis.tags.length > 0 && (
            <PixelPanel title="내 태그" icon={icons.save}>
              <div className="space-y-1.5">
                {analysis.tags.slice(0, 6).map((result) => (
                  <ContextRow
                    key={result.myTagId}
                    result={result}
                    open={detail === `my:${result.myTagId}`}
                    onToggle={() => {
                      haptic()
                      setDetail((v) => (v === `my:${result.myTagId}` ? null : `my:${result.myTagId}`))
                    }}
                  />
                ))}
              </div>
            </PixelPanel>
          )}

          {/* 잠과 다음 날 */}
          {analysis.sleep.enough && (
            <PixelPanel title="잠과 다음 날" icon={icons.sleep}>
              <div className="space-y-1.5">
                {analysis.sleep.buckets.map((bucket) => (
                  <div
                    key={bucket.bucket.key}
                    className="flex items-baseline gap-2 rounded-px3 border-[1.5px] border-border bg-cream px-2.5 py-2"
                  >
                    <span className="flex-1 text-[12.5px] text-inkdim">{bucket.label}</span>
                    {bucket.confidence === 'insufficient' ? (
                      <span className="text-[11px] text-inkfaint">{NOT_ENOUGH_SHORT}</span>
                    ) : (
                      <>
                        <span className="font-pixel text-[12px] text-ink">
                          {METRICS[analysis.sleep.metric].format(bucket.observed)}
                        </span>
                        <span className="text-[11px] text-inkfaint">n={bucket.sampleCount}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11.5px] leading-relaxed text-inkfaint">
                수면 시간과 다음 날 {analysis.sleep.metricLabel} —{' '}
                {RELATION_LABEL[relationOf(analysis.sleep.r)]}
              </p>
            </PixelPanel>
          )}

          {/* 돌아오기까지 */}
          {analysis.recovery.enough && (
            <PixelPanel title="돌아오기까지" icon={icons.energy}>
              <p className="text-[13px] leading-relaxed text-inkdim">
                기운이 낮게 기록된 구간이 {analysis.recovery.recovered.length}번 있었고,
                <br />
                평소 수준으로 돌아오기까지 중앙값 {analysis.recovery.medianHours}시간이 걸렸어요.
              </p>
              <p className="mt-1.5 text-[11px] text-inkfaint">
                개인 평균 {analysis.recovery.baseline} 기준
              </p>
            </PixelPanel>
          )}

          {/* 기간 비교 */}
          {analysis.change?.enough && (
            <PixelPanel title="지난 기간과" icon={icons.xp}>
              <div className="flex gap-2">
                <SideBox
                  label={analysis.change.previous.label}
                  value={def.format(analysis.change.previous.observed)}
                  note={sampleNote(analysis.change.previous)}
                />
                <SideBox
                  label={analysis.change.current.label}
                  value={def.format(analysis.change.current.observed)}
                  note={sampleNote(analysis.change.current)}
                />
              </div>
              <p className="mt-2.5 text-[12.5px] leading-relaxed text-inkdim">
                {describeWindowChange(
                  def.label,
                  analysis.change.difference,
                  WINDOW_LABEL[windowKey].replace('최근 ', ''),
                )}
              </p>
            </PixelPanel>
          )}
        </>
      )}

      <p className="px-1 pb-2 text-[11px] leading-relaxed text-inkfaint">
        여기 있는 숫자는 남긴 기록에서 그대로 센 것이에요. 무엇이 무엇을 만들었는지는 알 수 없어요.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────

function SlotRow({
  label,
  result,
  baseline,
  scale,
  open,
  onToggle,
}: {
  label: string
  result: AnalysisResult
  baseline: number
  scale: [number, number]
  open: boolean
  onToggle: () => void
}) {
  const thin = result.confidence === 'insufficient'
  const def = METRICS[result.metric]
  const [min, max] = scale
  const fill = thin ? 0 : ((result.observed - min) / (max - min)) * 100
  const baseAt = ((baseline - min) / (max - min)) * 100

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        disabled={thin}
        className="press flex min-h-[44px] w-full items-center gap-2 text-left disabled:opacity-70"
      >
        <span className="w-9 shrink-0 text-[12px] text-inkdim">{label}</span>

        <span className="relative h-3.5 flex-1 overflow-hidden rounded-full border-[1.5px] border-border bg-cream">
          {!thin && (
            <span
              className="absolute inset-y-0 left-0 bg-sky"
              style={{ width: `${Math.max(2, Math.min(100, fill))}%` }}
            />
          )}
          {/* 개인 평균 자리 */}
          <span
            aria-hidden
            className="absolute inset-y-0 w-[1.5px] bg-inkfaint/60"
            style={{ left: `${Math.max(0, Math.min(100, baseAt))}%` }}
          />
        </span>

        <span className="w-16 shrink-0 text-right">
          {thin ? (
            <span className="text-[11px] text-inkfaint">{NOT_ENOUGH_SHORT}</span>
          ) : (
            <>
              <span className="font-pixel text-[12px] text-ink">{def.format(result.observed)}</span>
              {result.difference !== undefined && Math.abs(result.difference) >= 0.05 && (
                <span className="ml-1 text-[10px] text-inkfaint">{signed(result.difference)}</span>
              )}
            </>
          )}
        </span>
      </button>

      {open && <Detail result={result} />}
    </div>
  )
}

function ContextRow({
  result,
  open,
  onToggle,
}: {
  result: AnalysisResult & { adjusted?: { matchedOn: string; difference: number; baselineCount: number } }
  open: boolean
  onToggle: () => void
}) {
  const def = METRICS[result.metric]
  const diff = result.difference ?? 0

  return (
    <div className="rounded-px3 border-[1.5px] border-border bg-cream">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="press flex min-h-[44px] w-full items-center gap-2 px-2.5 py-2 text-left"
      >
        <span className="flex-1">
          <span className="block text-[13px] text-ink">{result.label}</span>
          <span className="mt-0.5 block text-[11px] text-inkfaint">{sampleNote(result)}</span>
        </span>
        <span className="text-right">
          <span className="block font-pixel text-[12px] text-ink">
            {def.format(result.observed)}
          </span>
          {Math.abs(diff) >= 0.05 && (
            <span
              className={cn(
                'mt-0.5 block text-[11px]',
                diff > 0 ? 'text-mintdeep' : 'text-peachdeep',
              )}
            >
              평균 {signed(diff)}
            </span>
          )}
        </span>
      </button>

      {open && <Detail result={result} />}
    </div>
  )
}

function Detail({
  result,
}: {
  result: AnalysisResult & { adjusted?: { matchedOn: string; difference: number; baselineCount: number } }
}) {
  const def = METRICS[result.metric]

  return (
    <div className="border-t border-dashed border-border px-2.5 py-2">
      <p className="text-[12.5px] leading-relaxed text-inkdim">{describeResult(result)}</p>

      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11.5px] text-inkfaint">
        <dt>평균</dt>
        <dd className="text-inkdim">
          {def.format(result.observed)}
          {result.baseline !== undefined && ` · 개인 평균 ${def.format(result.baseline)}`}
        </dd>
        <dt>중앙값</dt>
        <dd className="text-inkdim">{def.format(result.evidence.observed.median)}</dd>
        <dt>표본</dt>
        <dd className="text-inkdim">
          기록 {result.sampleCount}개 · {result.distinctDays}일
        </dd>
        <dt>데이터</dt>
        <dd className="text-inkdim">{CONFIDENCE_LABEL[result.confidence]}</dd>
        {result.adjusted && (
          <>
            <dt>같은 조건끼리</dt>
            <dd className="text-inkdim">
              {result.adjusted.matchedOn} 기준 {signed(result.adjusted.difference)}
              <span className="text-inkfaint"> (n={result.adjusted.baselineCount})</span>
            </dd>
          </>
        )}
      </dl>
    </div>
  )
}

const SideBox = ({ label, value, note }: { label: string; value: string; note: string }) => (
  <div className="flex-1 rounded-px3 border-[1.5px] border-border bg-cream px-2.5 py-2">
    <span className="plabel block">{label}</span>
    <span className="mt-1 block font-pixel text-[15px] text-ink">{value}</span>
    <span className="mt-0.5 block text-[11px] text-inkfaint">{note}</span>
  </div>
)

/** LIFE 화면에 들어갈 한 줄 */
export function MyRhythmPreview({
  logs,
  onOpen,
}: {
  logs: QuickLog[]
  onOpen: () => void
}) {
  const days = useMemo(() => new Set(logs.map((l) => l.date)).size, [logs])

  return (
    <button
      type="button"
      onClick={() => {
        haptic()
        onOpen()
      }}
      className="press flex min-h-[44px] w-full items-center gap-2 text-left"
    >
      <span className="flex-1">
        <span className="ptitle block normal-case">My rhythm</span>
        <span className="mt-1 block text-[12px] text-inkdim">
          {days >= 3
            ? `${days}일치 기록에서 시간대별 흐름을 봐요`
            : '기록이 조금 더 쌓이면 볼 수 있어요'}
        </span>
      </span>
      <span aria-hidden className="font-pixel text-[13px] text-inkfaint">
        ›
      </span>
    </button>
  )
}
