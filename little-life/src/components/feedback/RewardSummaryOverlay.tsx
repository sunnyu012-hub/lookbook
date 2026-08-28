import { useEffect, useState } from 'react'
import type { DropResult, GrowthSnapshot, StatKey } from '@/types'
import type { BattleProgress } from '@/lib/rpg/link'
import { progressLine } from '@/lib/rpg/link'
import { findItem } from '@/lib/rpg/content'
import { findCollectionItem } from '@/lib/collection/catalog'
import { STAT_LABEL } from '@/lib/labels'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { EFFECT, UI } from '@/lib/assets'
import { cn } from '@/components/ui/cn'

/**
 * 퀘스트 하나로 무엇이 달라졌는지.
 *
 * 예전에는 캐릭터 위로 "+20 EXP" 만 잠깐 떴다. 코인은 어디에도 안 보였고,
 * 스탯이 올랐다는 건 ME 화면을 따로 열어야 알 수 있었다. 그래서 제일 중요한
 * 순간 — 미루던 걸 하나 끝낸 직후 — 에 앱이 해줄 말이 거의 없었다.
 *
 * 여기서는 **행동 전 → 행동 후** 를 같이 보여준다. 숫자 하나보다
 * "1,240 → 1,320" 이 훨씬 빨리 읽힌다.
 *
 * 팝업을 여러 개 띄우지 않는다. EXP · 코인 · 스탯 · 주운 것 · 몬스터 진행을
 * 한 장에 담고, 이번에 **변한 것만** 줄로 만든다.
 */

export interface RewardSummary {
  questTitle: string
  /** 이번에 오른 스탯. 어느 줄을 보여줄지 정한다. 얼마나 올랐는지는 before/after 로 잰다. */
  statKey: StatKey | null
  before: GrowthSnapshot
  after: GrowthSnapshot
  leveledUp: boolean
  /** 장비·수집품 드롭 */
  drops: DropResult[]
  /** 도감에 들어온 재료·씨앗 */
  collected: Array<{ itemId: string; isNew: boolean }>
  /** 이번 완료로 같이 깎인 몬스터·보스 */
  battles: BattleProgress[]
  /**
   * 등불 줄을 보여줄지.
   *
   * 등불은 퀘스트 완료로만 오르고 날이 바뀐다고 다시 차지 않는데,
   * 오르는 장면이 어디에도 안 보였다. 잠든 돌문에 들어가서 0 을 본
   * 다음에야 "왜 안 차지?" 가 된다. 그래서 오르는 순간에 적어둔다.
   *
   * 문을 아직 못 찾은 사람에게는 안 보여준다 — 쓸 데 없는 숫자다.
   */
  lanternKnown: boolean
}

interface RewardSummaryOverlayProps {
  summary: RewardSummary | null
  onClose: () => void
}

function pct(snapshot: GrowthSnapshot): number {
  if (snapshot.requiredExp <= 0) return 0
  return Math.min(1, Math.max(0, snapshot.currentExp / snapshot.requiredExp))
}

/** 이번에 얻은 것들의 이름. 장비든 도감 물건이든 사람에게는 그냥 "주운 것" 이다. */
function itemNames(summary: RewardSummary): string[] {
  const names: string[] = []
  for (const drop of summary.drops) {
    const def = findItem(drop.itemId)
    if (def) names.push(`${def.icon} ${def.name}`)
  }
  for (const got of summary.collected) {
    const def = findCollectionItem(got.itemId)
    if (def) names.push(def.nameKo)
  }
  return names
}

export function RewardSummaryOverlay({ summary, onClose }: RewardSummaryOverlayProps) {
  // 바가 이미 차 있는 채로 뜨면 "얼마나 찼는지" 가 안 보인다.
  // 완료 직전 위치에서 시작해서, 뜨자마자 완료 후 위치로 흐른다.
  const [filled, setFilled] = useState(false)

  useEffect(() => {
    if (!summary) {
      setFilled(false)
      return
    }
    const id = window.requestAnimationFrame(() => setFilled(true))
    return () => window.cancelAnimationFrame(id)
  }, [summary])

  if (!summary) return null

  const { before, after } = summary
  // 레벨이 올랐으면 이번 바는 끝까지 차는 것으로 보여준다. 90% 에서 15% 로
  // 줄어드는 그림은 사실이어도 "줄었다" 로 읽힌다.
  const target = summary.leveledUp ? 1 : pct(after)
  const value = filled ? target : pct(before)

  const statLabel = summary.statKey ? STAT_LABEL[summary.statKey] : null
  const names = itemNames(summary)

  /**
   * 전부 실제로 달라진 만큼으로 읽는다.
   *
   * 퀘스트 보상만 적으면 숫자가 서로 안 맞는 날이 있다 — 이 완료로 주간 목표가
   * 채워졌거나 도감 마일스톤이 열리면 코인이 그것까지 같이 들어오고,
   * 몬스터를 같이 넘겼으면 EXP 도 그쪽 몫이 붙는다. 그때 "+92" 라고 적어두고
   * 총액은 192 이 늘어 있으면, 읽는 사람 입장에서는 둘 중 하나가 거짓말이다.
   */
  const expGained = after.totalExp - before.totalExp
  const coinsGained = after.coins - before.coins
  const statGained = summary.statKey ? after.stat - before.stat : 0
  const lanternGained = after.lantern - before.lantern

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-7"
      role="status"
      aria-live="polite"
      onClick={onClose}
    >
      <div className="absolute inset-0 animate-fadein bg-ink/20 backdrop-blur-[2px]" aria-hidden />

      <div className="relative w-full max-w-[330px] animate-pop rounded-card border border-line bg-surface px-5 pb-5 pt-4 shadow-lift">
        {/* 무엇을 끝냈는지 */}
        <div className="flex items-start gap-2">
          <img src={UI.check} alt="" aria-hidden className="mt-0.5 h-5 w-5 shrink-0 object-contain" />
          <p className="min-w-0 flex-1 break-words text-[15px] font-semibold leading-snug text-ink">
            {summary.questTitle}
          </p>
        </div>

        {/* 레벨과 진행률 — 이 카드에서 제일 크게 읽혀야 하는 자리 */}
        <div className="mt-4 rounded-card bg-canvas px-3.5 py-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-game text-[15px] leading-none text-ink">
              {summary.leveledUp ? (
                <>
                  LV.{before.level}
                  <span className="mx-1 text-inkfaint">→</span>
                  <span className="text-coral-deep">LV.{after.level}</span>
                </>
              ) : (
                <>LV.{after.level}</>
              )}
            </span>
            <span className="font-game text-[11px] leading-none text-inkdim">
              {Math.round(pct(before) * 100)}%
              <span className="mx-1 text-inkfaint">→</span>
              {summary.leveledUp ? 100 : Math.round(pct(after) * 100)}%
            </span>
          </div>

          <ProgressBar
            className="mt-2"
            value={value}
            barClassName="bg-coral"
            aria-label={`${after.requiredExp} EXP 중 ${after.currentExp} EXP`}
          />

          {summary.leveledUp && (
            <p className="mt-2 flex items-center gap-1 text-[12px] text-coral-deep">
              <img src={EFFECT.sparkle} alt="" aria-hidden className="h-3.5 w-3.5 object-contain" />
              오늘 조금 더 자랐다. 다음 레벨은 {Math.round(pct(after) * 100)}% 부터.
            </p>
          )}
        </div>

        {/* 이번에 변한 것만 줄로 만든다 */}
        <dl className="mt-3 space-y-1.5">
          {expGained > 0 && <Row label="EXP" gain={`+${expGained}`} />}
          {coinsGained > 0 && (
            <Row
              label="코인"
              gain={`+${coinsGained}`}
              detail={`${before.coins.toLocaleString()} → ${after.coins.toLocaleString()}`}
            />
          )}
          {statLabel && statGained > 0 && (
            <Row
              label={statLabel}
              gain={`+${statGained}`}
              detail={`${before.stat} → ${after.stat}`}
            />
          )}
          {summary.lanternKnown && lanternGained > 0 && (
            <Row
              label="등불"
              gain={`+${lanternGained}`}
              detail={`${before.lantern} → ${after.lantern}`}
            />
          )}
          {names.length > 0 && (
            // 한 줄로 자르면 네 개를 주웠을 때 뒤의 두 개가 "…" 이 된다.
            // 뭘 주웠는지가 이 줄의 전부라서 두 줄까지는 내준다.
            <Row label="주운 것" gain={`×${names.length}`} detail={names.join(' · ')} wrap />
          )}
        </dl>

        {/* 이 행동으로 같이 줄어든 것들 */}
        {summary.battles.length > 0 && (
          <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
            {summary.battles.map((battle) => (
              <li key={battle.battleId} className="flex items-start gap-2">
                <span className="text-[18px] leading-none">{battle.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-medium text-ink">{battle.name}</span>
                    <span
                      className={cn(
                        'shrink-0 font-game text-[11px] leading-none',
                        battle.cleared ? 'text-leaf-deep' : 'text-inkdim',
                      )}
                    >
                      {battle.before}/{battle.total}
                      <span className="mx-1 text-inkfaint">→</span>
                      {battle.after}/{battle.total}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-inkdim">
                    {progressLine(battle)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Row({
  label,
  gain,
  detail,
  wrap,
}: {
  label: string
  gain: string
  detail?: string
  wrap?: boolean
}) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="w-[52px] shrink-0 text-[12.5px] text-inkdim">{label}</dt>
      <dd className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
        <span className="font-game text-[13px] leading-none text-ink">{gain}</span>
        {detail && (
          <span
            className={cn(
              'min-w-0 text-right font-game text-[11px] leading-snug text-inkfaint',
              wrap ? 'line-clamp-2 break-words' : 'truncate',
            )}
          >
            {detail}
          </span>
        )}
      </dd>
    </div>
  )
}
