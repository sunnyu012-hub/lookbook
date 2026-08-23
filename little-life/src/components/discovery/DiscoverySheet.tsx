import { useState } from 'react'
import type { AppState, CompanionId, CompanionMemoryDef } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ItemIcon } from '@/components/collection/ItemIcon'
import { autoCollectionViews } from '@/lib/discovery/collections'
import { familiarityLine, secretItems, secretViews } from '@/lib/discovery/secrets'
import { companionViews, memoriesOf } from '@/lib/discovery/companions'
import { CompanionArt } from './CompanionArt'
import { cn } from '@/components/ui/cn'

interface DiscoverySheetProps {
  open: boolean
  state: AppState
  onClose: () => void
  onSetCompanion: (id: CompanionId | null) => void
  onPlay: (id: CompanionId) => void
}

type Tab = 'THEMES' | 'PLACES' | 'FRIENDS'

/**
 * 발견함.
 *
 * 하루에 세 개까지만 화면에 띄우기 때문에, 나머지를 볼 자리가 필요하다.
 * 여기서는 다 볼 수 있다 — 못 본 채로 지나가는 게 없어야 한다.
 */
export function DiscoverySheet({
  open,
  state,
  onClose,
  onSetCompanion,
  onPlay,
}: DiscoverySheetProps) {
  const [tab, setTab] = useState<Tab>('THEMES')
  if (!open) return null

  return (
    <BottomSheet open onClose={onClose} title="발견">
      <h2 className="text-[20px] font-semibold text-ink">발견</h2>
      <p className="mt-1 text-[13px] text-inkdim">지내다 보면 하나씩 생기는 것들.</p>

      <div className="mt-4 flex gap-1 rounded-pill bg-sunken p-1">
        {(
          [
            ['THEMES', '내 기록'],
            ['PLACES', '도시'],
            ['FRIENDS', '동료'],
          ] as Array<[Tab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'min-h-[36px] flex-1 rounded-pill text-[12.5px] font-medium transition-colors duration-200',
              tab === key ? 'bg-surface text-ink shadow-soft' : 'text-inkdim',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'THEMES' && <Themes state={state} />}
      {tab === 'PLACES' && <Places state={state} />}
      {tab === 'FRIENDS' && (
        <Friends state={state} onSetCompanion={onSetCompanion} onPlay={onPlay} />
      )}

      <p className="mt-5 text-center text-[12px] leading-relaxed text-inkfaint">
        여기 있는 건 전부 이미 한 것에서 나온 거야.
        <br />
        따로 할 일이 생기는 건 아니야.
      </p>
    </BottomSheet>
  )
}

/** 내 기록에서 앱이 알아본 것들 */
function Themes({ state }: { state: AppState }) {
  const views = autoCollectionViews(state).filter((v) => !v.hidden)

  if (views.length === 0) {
    return (
      <p className="mt-4 rounded-card border border-dashed border-line px-4 py-7 text-center text-[13px] leading-relaxed text-inkfaint">
        아직은 없어.
        <br />
        며칠 지내다 보면 앱이 알아서 찾아낼 거야.
      </p>
    )
  }

  return (
    <ul className="mt-4 space-y-2">
      {views.map(({ def, now, done }) => {
        const pct = Math.min(100, Math.round((now / def.target) * 100))
        return (
          <li
            key={def.id}
            className={cn('rounded-card px-3.5 py-3', done ? 'bg-sage-soft' : 'bg-surface border border-line')}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-[18px] leading-none">{def.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-medium text-ink">{def.name}</span>
                <span className="mt-0.5 block truncate text-[11.5px] text-inkdim">
                  {def.description}
                </span>
              </span>
              {done ? (
                <span className="shrink-0 font-game text-[10px] text-sage-deep">받았어</span>
              ) : (
                <span className="shrink-0 font-game text-[10.5px] text-inkdim">
                  {now}/{def.target}
                </span>
              )}
            </div>
            {!done && (
              <div className="mt-2 h-1 overflow-hidden rounded-pill bg-sunken">
                <div className="h-full rounded-pill bg-lavender" style={{ width: `${pct}%` }} />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** 도시 안쪽 */
function Places({ state }: { state: AppState }) {
  const views = secretViews(state).filter((v) => v.stage !== 'UNKNOWN')

  if (views.length === 0) {
    return (
      <p className="mt-4 rounded-card border border-dashed border-line px-4 py-7 text-center text-[13px] leading-relaxed text-inkfaint">
        아직 아는 곳이 없어.
        <br />한 동네에 좀 더 있어보면 뭔가 보일지도.
      </p>
    )
  }

  return (
    <ul className="mt-4 space-y-2">
      {views.map(({ def, stage, progress }) => (
        <li
          key={def.id}
          className={cn(
            'rounded-card px-3.5 py-3',
            stage === 'FOUND' ? 'border border-line bg-surface' : 'border border-dashed border-line bg-canvas',
          )}
        >
          <div className="flex items-center gap-2.5">
            <span className={cn('text-[18px] leading-none', stage !== 'FOUND' && 'opacity-45')}>
              {stage === 'FOUND' ? def.icon : '❔'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium text-ink">
                {stage === 'FOUND' ? def.name : '어딘가에'}
              </span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-inkdim">
                {stage === 'FOUND' ? def.description : def.hint}
              </span>
            </span>
          </div>

          {/* 숫자로 몇 번 남았는지 말하지 않는다. 그건 진행바지 발견이 아니다. */}
          {stage !== 'FOUND' && (
            <p className="mt-1.5 pl-[28px] text-[11px] text-inkfaint">
              {familiarityLine(progress)}
            </p>
          )}

          {stage === 'FOUND' && secretItems(def).length > 0 && (
            <div className="mt-2 flex gap-1.5 pl-[28px]">
              {secretItems(def).map((item) => (
                <span key={item.id} className="opacity-90">
                  <ItemIcon item={item} size="sm" />
                </span>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

/** 같이 다니는 아이들 */
function Friends({
  state,
  onSetCompanion,
  onPlay,
}: {
  state: AppState
  onSetCompanion: (id: CompanionId | null) => void
  onPlay: (id: CompanionId) => void
}) {
  const views = companionViews(state)
  const met = views.filter((v) => v.met)

  if (met.length === 0) {
    return (
      <p className="mt-4 rounded-card border border-dashed border-line px-4 py-7 text-center text-[13px] leading-relaxed text-inkfaint">
        아직 만난 애가 없어.
        <br />
        도시를 좀 더 돌아다니다 보면 어디선가 마주칠 거야.
      </p>
    )
  }

  return (
    <ul className="mt-4 space-y-2">
      {met.map(({ def, state: c, active, memories }) => (
        <li key={def.id} className="rounded-card border border-line bg-surface px-3.5 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-card bg-canvas text-[22px]">
              <CompanionArt def={def} className="h-12 w-12" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[14px] font-medium text-ink">{def.name}</span>
                {active && (
                  <span className="shrink-0 rounded-pill bg-coral-soft px-1.5 py-0.5 font-game text-[8.5px] text-coral-deep">
                    같이 다니는 중
                  </span>
                )}
              </span>
              <span className="mt-0.5 block truncate text-[11.5px] text-inkdim">
                {def.personality}
              </span>
            </span>

            <button
              type="button"
              onClick={() => onPlay(def.id)}
              className="shrink-0 rounded-btn bg-canvas px-3 py-2 text-[12px] text-inkdim active:scale-[0.96]"
            >
              인사
            </button>
          </div>

          {!active && (
            <button
              type="button"
              onClick={() => onSetCompanion(def.id)}
              className="mt-2 w-full rounded-btn bg-sunken py-2 text-[12px] font-medium text-inkdim active:scale-[0.98]"
            >
              같이 다니기
            </button>
          )}

          {/* 같이 지내다 남은 것.
              잠긴 건 바로 다음 하나만 보여준다 — 세 줄씩 회색으로 쌓아두면
              그건 기억이 아니라 체크리스트다. */}
          {visibleMemories(def.id, memories).length > 0 && (
            <ul className="mt-2.5 space-y-1.5">
              {visibleMemories(def.id, memories).map((m) => {
                const open = memories.some((x) => x.id === m.id)
                return (
                  <li
                    key={m.id}
                    className={cn(
                      'rounded-btn px-3 py-2 text-[11.5px] leading-snug',
                      open ? 'bg-canvas text-inkdim' : 'bg-sunken/40 text-inkfaint',
                    )}
                  >
                    {open ? (
                      <>
                        <span className="font-medium text-ink">{m.title}</span>
                        <br />
                        {m.text}
                      </>
                    ) : (
                      `조금 더 지내면 (${c?.friendship ?? 0}/${m.atFriendship})`
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </li>
      ))}
    </ul>
  )
}

/**
 * 화면에 올릴 기억들.
 *
 * 열린 것은 다 보여주고, 잠긴 것은 바로 다음 하나까지만.
 */
function visibleMemories(id: CompanionId, unlocked: CompanionMemoryDef[]) {
  const all = memoriesOf(id)
  const nextLocked = all.find((m) => !unlocked.some((u) => u.id === m.id))
  return all.filter((m) => unlocked.some((u) => u.id === m.id) || m.id === nextLocked?.id)
}
