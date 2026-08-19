import type { Checkin } from '@/types'
import { CharacterScene } from '@/components/pixel/CharacterScene'
import { EnergyBar } from '@/components/pixel/EnergyBar'
import { PipRow } from '@/components/pixel/PipRow'
import { PixelButton } from '@/components/pixel/PixelButton'
import { PixelIcon } from '@/components/pixel/PixelIcon'
import { PixelPanel } from '@/components/pixel/PixelPanel'
import { useCountUp } from '@/hooks/useCountUp'
import { useQuests } from '@/hooks/useQuests'
import { pixelDate, todayKey } from '@/lib/date'
import { modeMeta } from '@/lib/energy'
import { buildEffects } from '@/lib/effects'
import { questsFor, totalXp } from '@/lib/quests'
import { cn } from '@/lib/cn'

interface Props {
  today: Checkin | null
  dayNumber: number
  loading: boolean
  onStartCheckin: () => void
}

export function TodayPage({ today, dayNumber, loading, onStartCheckin }: Props) {
  const meta = today ? modeMeta(today.mode) : null
  const score = useCountUp(today?.energyScore ?? 0, 700)
  const quests = questsFor(today?.mode ?? 'NORMAL')
  const { done, toggle } = useQuests(todayKey())
  const effects = today ? buildEffects(today) : []

  return (
    <div className="space-y-3">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-pixel text-[18px] uppercase leading-none tracking-[0.04em]">
            Life OS
          </h1>
          <p className="plabel mt-2">Day {String(dayNumber).padStart(3, '0')}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <PixelIcon name="cloud" size={16} className="animate-drift" />
          <PixelIcon name="sun" size={16} />
          <p className="plabel ml-1 text-ink">{pixelDate(todayKey())}</p>
        </div>
      </header>

      <CharacterScene mode={today?.mode ?? null} />

      {loading ? (
        <p className="plabel animate-blinkfade py-6 text-center">Loading…</p>
      ) : today && meta ? (
        <>
          <PixelPanel title="Today's Mode" icon={meta.icon}>
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-px2 border-2 border-ink"
                style={{ backgroundColor: meta.soft }}
              >
                <PixelIcon name={meta.icon} size={24} />
              </span>
              <div>
                <p className="font-pixel text-[16px] uppercase leading-none" style={{ color: meta.hex }}>
                  {meta.label}
                </p>
                <p className="body-ko mt-1.5">{meta.message}</p>
              </div>
            </div>
          </PixelPanel>

          <PixelPanel title="Player Status" icon="heart">
            <div className="space-y-3">
              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="plabel text-ink">Energy</span>
                  <span className="font-pixel text-[15px] leading-none">
                    {score}
                    <span className="text-[10px] text-inkdim"> / 100</span>
                  </span>
                </div>
                <EnergyBar score={today.energyScore} color={meta.hex} />
              </div>

              <div className="grid grid-cols-3 gap-2 border-t-2 border-dashed border-ink/15 pt-3">
                <StatPips label="Mood" value={today.mood} on="heart" off="heart_off" />
                <StatPips label="Focus" value={today.focus} on="gem" off="gem_off" />
                <StatPips label="Body" value={5 - today.bodyPain} on="star" off="star_off" />
              </div>

              <div className="flex items-center justify-between border-t-2 border-dashed border-ink/15 pt-3">
                <span className="plabel text-ink">Sleep</span>
                <span className="font-pixel text-[13px]">{today.sleepHours}H</span>
              </div>
            </div>
          </PixelPanel>

          {effects.length > 0 && (
            <PixelPanel title="Current Effects" icon="sparkle">
              <ul className="space-y-2">
                {effects.map((effect) => (
                  <li key={effect.key} className="flex items-center gap-2">
                    <PixelIcon name={effect.icon} size={16} />
                    <span className="font-pixel text-[11px] uppercase">{effect.label}</span>
                    <span className="flex-1 truncate text-[11px] text-inkdim">{effect.note}</span>
                    <span
                      className={cn(
                        'font-pixel text-[12px]',
                        effect.delta > 0 ? 'text-sagedeep' : 'text-blushdeep',
                      )}
                    >
                      {effect.delta > 0 ? '+' : ''}
                      {effect.delta}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t-2 border-dashed border-ink/15 pt-2 text-[11px] leading-relaxed text-inkdim">
                오늘 기록이 ENERGY 에 어떻게 반영됐는지 보여주는 값이에요.
              </p>
            </PixelPanel>
          )}
        </>
      ) : (
        <PixelPanel title="No Save Yet" icon="floppy">
          <p className="body-ko">
            오늘의 캐릭터가 아직 깨어나지 않았어요.
            <br />
            상태를 저장하면 오늘의 모드가 정해져요.
          </p>
          <PixelButton icon="floppy" full className="mt-3" onClick={onStartCheckin}>
            Daily Save
          </PixelButton>
        </PixelPanel>
      )}

      <PixelPanel
        title="Daily Quest"
        icon="check"
        right={
          <span className="font-pixel text-[11px] text-inkdim">
            +{totalXp(quests, done)} XP
          </span>
        }
      >
        <ul className="space-y-1">
          {quests.map((quest) => {
            const checked = done.includes(quest.id)
            return (
              <li key={quest.id}>
                <button
                  type="button"
                  onClick={() => toggle(quest.id)}
                  aria-pressed={checked}
                  className="flex w-full items-center gap-2.5 rounded-px2 px-1 py-2 text-left"
                >
                  <span
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-px2 border-2 border-ink transition-colors duration-150',
                      checked ? 'bg-sage' : 'bg-cream',
                    )}
                  >
                    {checked && <PixelIcon name="check" size={16} className="animate-pop" />}
                  </span>
                  <PixelIcon name={quest.icon} size={16} />
                  <span
                    className={cn(
                      'flex-1 text-[13px]',
                      checked ? 'text-inkfaint line-through' : 'text-ink',
                    )}
                  >
                    {quest.label}
                  </span>
                  <span className="font-pixel text-[10px] text-inkdim">+{quest.xp} XP</span>
                </button>
              </li>
            )
          })}
        </ul>
      </PixelPanel>

      {today && (
        <button
          type="button"
          onClick={onStartCheckin}
          className="press w-full rounded-px3 border-2 border-ink bg-ivory py-3 font-pixel text-[11px] uppercase tracking-[0.06em]"
        >
          Edit Today&apos;s Save
        </button>
      )}
    </div>
  )
}

function StatPips({
  label,
  value,
  on,
  off,
}: {
  label: string
  value: number
  on: 'heart' | 'gem' | 'star'
  off: 'heart_off' | 'gem_off' | 'star_off'
}) {
  return (
    <div>
      <p className="plabel mb-1.5">{label}</p>
      <PipRow on={on} off={off} value={value} label={label} />
    </div>
  )
}
