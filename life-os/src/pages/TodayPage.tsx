import { useState } from 'react'
import type { Checkin } from '@/types'
import { RoomScene } from '@/components/pixel/RoomScene'
import { EnergyBar } from '@/components/pixel/EnergyBar'
import { PipRow } from '@/components/pixel/PipRow'
import { PixelButton } from '@/components/pixel/PixelButton'
import { PixelImage } from '@/components/pixel/PixelImage'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { PixelSparkle, SparkleBurst } from '@/components/pixel/PixelSparkle'
import { useCountUp } from '@/hooks/useCountUp'
import type { QuestStore } from '@/hooks/useQuests'
import { pixelDate, todayKey } from '@/lib/date'
import { modeMeta } from '@/lib/energy'
import { buildEffects } from '@/lib/effects'
import { questsFor, totalXp } from '@/lib/quests'
import { icons, ui } from '@/lib/pixelAssets'
import type { LevelState } from '@/lib/level'
import { cn } from '@/lib/cn'

interface Props {
  today: Checkin | null
  dayNumber: number
  loading: boolean
  onStartCheckin: () => void
  questStore: QuestStore
  level: LevelState
}

export function TodayPage({
  today,
  dayNumber,
  loading,
  onStartCheckin,
  questStore,
  level,
}: Props) {
  const meta = today ? modeMeta(today.mode) : null
  const score = useCountUp(today?.energyScore ?? 0, 700)
  const quests = questsFor(today?.mode ?? 'NORMAL')
  const done = questStore.doneFor(todayKey())
  const effects = today ? buildEffects(today) : []
  const [justDone, setJustDone] = useState<string | null>(null)

  const handleQuest = (id: string) => {
    questStore.toggle(todayKey(), id)
    if (!done.includes(id)) {
      setJustDone(id)
      setTimeout(() => setJustDone((cur) => (cur === id ? null : cur)), 900)
    }
  }

  return (
    <div className="space-y-3">
      <header className="flex items-end justify-between">
        <PixelImage asset={ui.logo} height={40} alt="Life OS" />
        <div className="text-right">
          <p className="font-pixel text-[12px] leading-none text-pinkdeep">
            LV.{level.level} · Day {String(dayNumber).padStart(3, '0')}
          </p>
          <p className="plabel mt-1.5">{pixelDate(todayKey())}</p>
        </div>
      </header>

      <RoomScene mode={today?.mode ?? null} />

      {loading ? (
        <p className="plabel py-6 text-center">Loading…</p>
      ) : today && meta ? (
        <>
          <PixelPanel>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-1.5">
                  <PixelImage asset={icons.energy} height={18} />
                  <span className="ptitle">Energy</span>
                  <PixelSparkle size={10} className="ml-auto" />
                </div>
                <EnergyBar score={today.energyScore} color={meta.hex} />
                <p className="mt-2 font-pixel text-[26px] leading-none">
                  {score}
                  <span className="ml-1 text-[12px] text-inkdim">/ 100</span>
                </p>
              </div>

              <div
                className="w-[38%] shrink-0 rounded-px3 px-2 py-2 text-center"
                style={{ backgroundColor: meta.soft }}
              >
                <p className="plabel">Today&apos;s Mode</p>
                <PixelImage asset={meta.pill} height={22} className="mx-auto mt-1.5" />
                <PixelImage asset={meta.icon} height={26} className="mx-auto mt-2" />
              </div>
            </div>
            <p className="body-ko mt-3 border-t border-dashed border-border pt-2.5">
              {meta.message}
            </p>
          </PixelPanel>

          <PixelPanel title="Player Status" icon={icons.mood}>
            <div className="space-y-2">
              <StatLine label="Mood" value={today.mood} asset={icons.mood} />
              <StatLine label="Focus" value={today.focus} asset={icons.focus} />
              <StatLine label="Body" value={5 - today.bodyPain} asset={icons.body} />
              <StatLine label="Appetite" value={today.appetite} asset={icons.appetite} />
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-dashed border-border pt-2.5">
              <PixelImage asset={icons.sleep} height={18} />
              <span className="plabel text-ink">Sleep</span>
              <span className="ml-auto font-pixel text-[13px]">{today.sleepHours}H</span>
            </div>
          </PixelPanel>

          {effects.length > 0 && (
            <PixelPanel title="Current Effects" icon={icons.energy} sparkle>
              <ul className="space-y-2">
                {effects.map((effect) => (
                  <li key={effect.key} className="flex items-center gap-2.5">
                    <PixelImage asset={effect.icon} height={22} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px]">{effect.note}</span>
                      <span className="plabel">{effect.label}</span>
                    </span>
                    <span
                      className={cn(
                        'font-pixel text-[12px]',
                        effect.delta > 0 ? 'text-mintdeep' : 'text-pinkdeep',
                      )}
                    >
                      Energy {effect.delta > 0 ? '+' : ''}
                      {effect.delta}
                    </span>
                  </li>
                ))}
              </ul>
            </PixelPanel>
          )}
        </>
      ) : (
        <PixelPanel title="No Save Yet" icon={icons.save}>
          <p className="body-ko">
            아직 오늘의 기록이 없어요.
            <br />
            상태를 저장하면 방과 캐릭터가 오늘 모습으로 바뀌어요.
          </p>
          <PixelButton icon={icons.save} full className="mt-3" onClick={onStartCheckin}>
            Save Today
          </PixelButton>
        </PixelPanel>
      )}

      <PixelPanel
        title="Today's Quest"
        icon={icons.xp}
        right={<span className="font-pixel text-[11px] text-peachdeep">+{totalXp(quests, done)} XP</span>}
      >
        <ul className="space-y-0.5">
          {quests.map((quest) => {
            const checked = done.includes(quest.id)
            return (
              <li key={quest.id}>
                <button
                  type="button"
                  onClick={() => handleQuest(quest.id)}
                  aria-pressed={checked}
                  className="relative flex w-full items-center gap-2.5 rounded-px3 px-1 py-2 text-left"
                >
                  <span
                    className={cn(
                      'relative flex h-5 w-5 shrink-0 items-center justify-center rounded-px2 border-[1.5px] transition-colors duration-150',
                      checked ? 'border-pinkdeep bg-pink' : 'border-borderdeep bg-cream',
                    )}
                  >
                    {checked && <Check />}
                    <SparkleBurst show={justDone === quest.id} />
                  </span>
                  <PixelImage asset={quest.icon} height={20} />
                  <span
                    className={cn(
                      'flex-1 text-[13px]',
                      checked ? 'text-inkfaint line-through' : 'text-ink',
                    )}
                  >
                    {quest.label}
                  </span>
                  <span className="font-pixel text-[10px] text-peachdeep">+{quest.xp} XP</span>
                  {justDone === quest.id && (
                    <span className="pointer-events-none absolute right-2 top-0 animate-xpfloat font-pixel text-[11px] text-pinkdeep">
                      +{quest.xp} XP
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </PixelPanel>

      {today && (
        <PixelButton tone="plain" full icon={icons.save} onClick={onStartCheckin}>
          Edit Today
        </PixelButton>
      )}
    </div>
  )
}

/** 체크 표시 — 시트에 체크 아이콘이 없어 UI 도형으로 그린다 */
function Check() {
  return (
    <span
      aria-hidden
      className="block h-[9px] w-[5px] rotate-45 border-b-[2px] border-r-[2px] border-white"
      style={{ marginTop: -2 }}
    />
  )
}

function StatLine({
  label,
  value,
  asset,
}: {
  label: string
  value: number
  asset: import('@/lib/pixelAssets').PixelAsset
}) {
  return (
    <div className="flex items-center gap-2">
      <PixelImage asset={asset} height={20} />
      <span className="plabel text-ink">{label}</span>
      <span className="ml-auto">
        <PipRow asset={asset} value={value} size={18} label={label} />
      </span>
    </div>
  )
}
