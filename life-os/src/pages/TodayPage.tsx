import { useState, type ReactNode } from 'react'
import type { Checkin } from '@/types'
import { RoomScene } from '@/components/pixel/RoomScene'
import { StatMeter, type MeterShape } from '@/components/pixel/StatMeter'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelSparkle, SparkleBurst } from '@/components/pixel/PixelSparkle'
import { SnapshotStrip, type SnapshotItem } from '@/components/pixel/SnapshotStrip'
import { useCountUp } from '@/hooks/useCountUp'
import type { QuestStore } from '@/hooks/useQuests'
import { formatSleep, pixelDate, todayKey } from '@/lib/date'
import { modeMetaOrNull } from '@/lib/energy'
import { buildEffects } from '@/lib/scoring/effects'
import type { ScoreContext } from '@/lib/scoring'
import { questsFor, totalXp } from '@/lib/quests'
import { icons, pets, type PixelAsset } from '@/lib/pixelAssets'
import type { LevelState } from '@/lib/level'
import { cn } from '@/lib/cn'

interface Props {
  today: Checkin | null
  dayNumber: number
  loading: boolean
  onStartCheckin: () => void
  questStore: QuestStore
  level: LevelState
  snapshot?: SnapshotItem[]
  scoreContext?: ScoreContext
}

export function TodayPage({
  today,
  dayNumber,
  loading,
  onStartCheckin,
  questStore,
  level,
  snapshot = [],
  scoreContext,
}: Props) {
  const meta = modeMetaOrNull(today?.mode)
  const score = useCountUp(today?.energyScore ?? 0, 700)
  const quests = questsFor(today?.mode ?? 'NORMAL')
  const done = questStore.doneFor(todayKey())
  const effects = today ? buildEffects(today, 4, scoreContext) : []
  const [justDone, setJustDone] = useState<string | null>(null)

  const handleQuest = (id: string) => {
    questStore.toggle(todayKey(), id)
    if (!done.includes(id)) {
      setJustDone(id)
      setTimeout(() => setJustDone((cur) => (cur === id ? null : cur)), 900)
    }
  }

  return (
    <div>
      {/* ── 01 헤더 ── */}
      <header className="flex items-start justify-between pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <PixelImage asset={icons.mood} height={16} />
            <h1 className="font-pixel text-[17px] uppercase leading-none tracking-[0.02em]">
              Life OS
            </h1>
            <PixelSparkle size={10} />
          </div>
          <p className="mt-1.5 text-[11px] tracking-tight text-inkfaint">my little life</p>
        </div>

        <div className="text-right">
          <p className="font-pixel text-[12px] leading-none text-pinkdeep">
            LV.{level.level} · Day {String(dayNumber).padStart(3, '0')}
          </p>
          <p className="plabel mt-1.5">{pixelDate(todayKey())}</p>
        </div>
      </header>

      {/* ── 02 방 (화면 끝까지) ── */}
      <div className="bleed">
        <RoomScene mode={today?.mode ?? null} />
      </div>

      {/* ── 02b 지금 내 삶 (한 줄) ── */}
      {snapshot.length > 0 && (
        <div className="pt-3">
          <SnapshotStrip items={snapshot} />
        </div>
      )}

      {loading ? (
        <p className="plabel py-10 text-center">Loading…</p>
      ) : (
        <>
          {/* ── 03 에너지 + 모드 (한 덩어리, 모드 색으로 물든 띠) ── */}
          <section
            className="bleed px-4 pb-3.5 pt-3"
            style={{ backgroundColor: meta ? meta.band : '#FBF3E7' }}
          >
            <div className="mb-2 flex items-center gap-1.5">
              <PixelImage asset={icons.energy} height={16} />
              <span className="plabel text-ink">Energy</span>
              {meta && (
                <span className="ml-auto flex items-center gap-1.5">
                  <PixelSparkle size={9} />
                  <PixelImage asset={meta.pill} height={20} />
                  <PixelSparkle size={9} variant={2} delay={600} />
                </span>
              )}
            </div>

            <div className="flex items-end gap-3">
              <div className="flex flex-1 gap-[3px]">
                {Array.from({ length: 10 }, (_, i) => (
                  <span
                    key={i}
                    className="h-[15px] flex-1 rounded-[2px] transition-colors duration-300"
                    style={{
                      backgroundColor:
                        today?.energyScore != null && i < Math.round(today.energyScore / 10)
                          ? meta!.hex
                          : 'rgba(107, 74, 61, 0.12)',
                    }}
                  />
                ))}
              </div>
              <p className="font-pixel text-[24px] leading-none tabular-nums">
                {today?.energyScore != null ? score : '--'}
                <span className="ml-0.5 text-[11px] text-inkdim">/100</span>
              </p>
            </div>

            <p className="ko mt-2.5">
              {meta ? meta.message : '아직 오늘 기록이 없어요. 상태를 저장하면 방이 오늘 모습으로 바뀌어요.'}
            </p>

            {!today && (
              <button
                type="button"
                onClick={onStartCheckin}
                className="press mt-3 flex w-full items-center justify-center gap-2 rounded-px4 border-[1.5px] border-pinkdeep bg-pink py-3 font-pixel text-[12px] uppercase tracking-[0.04em] text-white shadow-hardpink"
              >
                <PixelImage asset={icons.save} height={16} /> Save today
              </button>
            )}
          </section>

          {today && (
            <>
              {/* ── 04 오늘의 상태 ── */}
              <Section title="Today's status" sparkle>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Stat icon={icons.mood} label="Mood" value={today.mood} shape="heart" color="#F19DB0" />
                  <Stat icon={icons.focus} label="Focus" value={today.focus} shape="diamond" color="#7FB8DC" />
                  <Stat
                    icon={icons.body}
                    label="Body"
                    value={today.bodyPain == null ? null : 5 - today.bodyPain}
                    shape="bar"
                    color="#EFC15F"
                  />
                  <Stat
                    icon={icons.appetite}
                    label="Appetite"
                    value={today.appetite}
                    shape="dot"
                    color="#EFA477"
                  />
                  {today.sleepHours != null && (
                    <div className="col-span-2 flex items-center gap-2 pt-0.5">
                      <PixelImage asset={icons.sleep} height={18} />
                      <span className="plabel text-ink">Sleep</span>
                      <span className="ml-auto font-pixel text-[13px] tabular-nums">
                        {formatSleep(today.sleepHours)}
                      </span>
                    </div>
                  )}
                </div>
                {today.highlight && (
                  <p className="ko mt-3 border-l-[2px] border-pink/70 pl-2.5 text-inkdim">
                    {today.highlight}
                  </p>
                )}
              </Section>

              {/* ── 05 현재 효과 ── */}
              {effects.length > 0 && (
                <Section title="Current effects" sparkle>
                  <ul className="divide-y divide-dashed divide-border/70">
                    {effects.map((effect) => (
                      <li key={effect.key} className="flex items-center gap-2.5 py-2">
                        <PixelImage asset={effect.icon} height={22} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] leading-tight">
                            {effect.note}
                          </span>
                          <span className="plabel mt-1 block">{effect.label}</span>
                        </span>
                        <span
                          className={cn(
                            'font-pixel text-[13px] tabular-nums',
                            effect.delta > 0 ? 'text-mintdeep' : 'text-pinkdeep',
                          )}
                        >
                          {effect.delta > 0 ? '+' : ''}
                          {effect.delta}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </>
          )}

          {/* ── 06 오늘의 퀘스트 ── */}
          <section className="mt-5 rounded-px5 bg-pinksoft/70 px-3.5 py-3">
            <div className="mb-1 flex items-center gap-1.5">
              <PixelImage asset={icons.xp} height={16} />
              <h2 className="plabel text-ink">Today&apos;s quest</h2>
              <span className="ml-auto font-pixel text-[11px] text-peachdeep">
                {totalXp(quests, done)} XP
              </span>
            </div>

            <ul>
              {quests.map((quest) => {
                const checked = done.includes(quest.id)
                return (
                  <li key={quest.id}>
                    <button
                      type="button"
                      onClick={() => handleQuest(quest.id)}
                      aria-pressed={checked}
                      className="relative flex w-full items-center gap-2.5 py-2 text-left"
                    >
                      <span
                        className={cn(
                          'relative flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-all duration-150',
                          checked
                            ? 'scale-100 border-pinkdeep bg-pink'
                            : 'border-borderdeep bg-ivory',
                        )}
                      >
                        {checked && <Check />}
                        <SparkleBurst show={justDone === quest.id} />
                      </span>
                      <PixelImage
                        asset={quest.icon}
                        height={18}
                        className={cn(checked && 'opacity-55')}
                      />
                      <span
                        className={cn(
                          'flex-1 text-[13px] leading-tight transition-colors duration-150',
                          checked ? 'text-inkdim line-through' : 'text-ink',
                        )}
                      >
                        {quest.label}
                      </span>
                      <span
                        className={cn(
                          'font-pixel text-[10px] tabular-nums',
                          checked ? 'text-inkfaint' : 'text-peachdeep',
                        )}
                      >
                        +{quest.xp}
                      </span>
                      {justDone === quest.id && (
                        <span className="pointer-events-none absolute right-1 top-0 animate-xpfloat font-pixel text-[11px] text-pinkdeep">
                          +{quest.xp} XP
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* ── 07 오늘 기록 고치기 (보조 동작) ── */}
          {today && (
            <button
              type="button"
              onClick={onStartCheckin}
              className="press mt-4 flex w-full items-center justify-center gap-2 py-2 text-[12px] text-inkdim"
            >
              <PixelImage asset={icons.save} height={16} />
              오늘 기록 고치기 <span className="font-pixel text-[11px]">→</span>
            </button>
          )}

          {/* 고양이 한 마리로 화면을 닫는다 */}
          <div className="mt-1 flex justify-center opacity-70">
            <PixelImage asset={pets.catWalk} height={26} className="animate-floaty" />
          </div>
        </>
      )}
    </div>
  )
}

function Section({
  title,
  sparkle,
  children,
}: {
  title: string
  sparkle?: boolean
  children: ReactNode
}) {
  return (
    <section className="mt-5">
      <div className="mb-2.5 flex items-center gap-1.5">
        <h2 className="plabel text-ink">{title}</h2>
        {sparkle && <PixelSparkle size={9} className="ml-auto" />}
      </div>
      {children}
    </section>
  )
}

function Stat({
  icon,
  label,
  value,
  shape,
  color,
}: {
  icon: PixelAsset
  label: string
  /** 안 적은 항목은 눈금 대신 — 을 보여준다 */
  value: number | null | undefined
  shape: MeterShape
  color: string
}) {
  return (
    <div className="flex items-center gap-2">
      <PixelImage asset={icon} height={18} className={cn(value == null && 'opacity-40')} />
      <span className="plabel w-[54px] shrink-0">{label}</span>
      {value == null ? (
        <span className="text-[12px] text-inkfaint">—</span>
      ) : (
        <StatMeter value={value} shape={shape} color={color} />
      )}
    </div>
  )
}

/** 체크 표시 — 시트에 체크 아이콘이 없어 도형으로 그린다 */
function Check() {
  return (
    <span
      aria-hidden
      className="block h-[8px] w-[4px] rotate-45 border-b-[2px] border-r-[2px] border-white"
      style={{ marginTop: -2 }}
    />
  )
}
