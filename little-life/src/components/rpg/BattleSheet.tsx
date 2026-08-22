import type { Battle } from '@/types'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { RarityBadge } from '@/components/rpg/RarityBadge'
import { BossBadge, HpBar } from '@/components/rpg/BattleCard'
import { remainingDamage } from '@/lib/rpg/battle'
import { cn } from '@/components/ui/cn'

interface BattleSheetProps {
  battle: Battle | null
  onClose: () => void
  onAction: (battleId: string, actionId: string) => void
  onUndo: (battleId: string, actionId: string) => void
  onRemove: (battleId: string) => void
}

/**
 * 몬스터·보스 상세.
 *
 * 큰 일을 작은 행동으로 쪼개 놓은 목록이다. 하나 누를 때마다 HP 가 깎인다.
 * 시간 제한이 없고, 잘못 눌러도 바로 되돌릴 수 있다.
 */
export function BattleSheet({ battle, onClose, onAction, onUndo, onRemove }: BattleSheetProps) {
  if (!battle) return null

  const cleared = battle.status === 'CLEARED'
  const left = remainingDamage(battle)

  return (
    <BottomSheet open onClose={onClose} title={battle.name}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-16 w-16 shrink-0 items-center justify-center rounded-card text-[32px]',
            cleared ? 'bg-leaf-soft' : 'bg-canvas',
          )}
        >
          {battle.icon}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate text-[20px] font-semibold text-ink">{battle.name}</h2>
            {battle.kind === 'BOSS' && <BossBadge />}
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-inkdim">{battle.description}</p>
          <div className="mt-2">
            <CategoryBadge category={battle.category} />
          </div>
        </div>
      </div>

      <div className="mt-5">
        {cleared ? (
          <div className="rounded-card bg-leaf-soft px-4 py-3.5 text-center">
            <p className="text-[13px] font-medium text-leaf-deep">클리어</p>
            <p className="mt-1 text-[13.5px] text-ink">끝냈어. 이건 이제 안 봐도 돼.</p>
          </div>
        ) : (
          <HpBar hp={battle.hp} maxHp={battle.maxHp} thickness="md" />
        )}
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[13px] font-medium text-inkdim">
          {cleared ? '이렇게 끝냈어' : '할 수 있는 것'}
        </p>
        <ul className="space-y-1.5">
          {battle.actions.map((action) => {
            const done = action.doneAt !== null
            return (
              <li key={action.id}>
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-btn px-3.5 py-3',
                    done ? 'bg-leaf-soft/60' : 'bg-canvas',
                  )}
                >
                  <button
                    type="button"
                    disabled={done || cleared}
                    onClick={() => onAction(battle.id, action.id)}
                    aria-label={`${action.label} 하기`}
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[1.5px]',
                      'transition-transform duration-150 ease-out active:scale-[0.9]',
                      done
                        ? 'border-leaf bg-leaf text-surface'
                        : 'border-line bg-surface text-transparent',
                    )}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M5 12.5 L10 17.5 L19 7" />
                    </svg>
                  </button>

                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate text-[14px]',
                      done ? 'text-inkdim line-through' : 'text-ink',
                    )}
                  >
                    {action.label}
                  </span>

                  <span className="shrink-0 font-game text-[10px] text-inkfaint">
                    -{action.damage}
                  </span>

                  {done && !cleared && (
                    <button
                      type="button"
                      onClick={() => onUndo(battle.id, action.id)}
                      className="shrink-0 rounded-pill px-2 py-1 text-[11px] text-inkdim underline decoration-line underline-offset-2"
                    >
                      되돌리기
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        {!cleared && left < battle.hp && (
          <p className="mt-2 text-[12px] leading-relaxed text-inkfaint">
            남은 것만으로는 다 못 잡아. 되돌리기로 되살릴 수 있고, 그냥 두고 가도 괜찮아.
          </p>
        )}
      </div>

      <div className="mt-5 rounded-card bg-coral-soft/50 px-4 py-3.5">
        <p className="text-[12px] font-medium text-coral-deep">
          {cleared ? '받은 보상' : '다 잡으면'}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="font-game text-[13px] text-ink">+{battle.rewardExp} EXP</span>
          <span className="font-game text-[13px] text-ink">🪙 +{battle.rewardCoins}</span>
          <span className="flex items-center gap-1">
            <RarityBadge rarity={battle.guaranteedRarity} />
            {battle.bonusRarity && <RarityBadge rarity={battle.bonusRarity} />}
          </span>
        </div>
        <p className="mt-1.5 text-[12px] text-inkdim">
          {cleared ? '이미 받았어.' : '다 잡으면 아이템도 하나 확실히 나와.'}
        </p>
      </div>

      <div className="mt-6">
        <Button variant="soft" size="lg" className="w-full" onClick={() => onRemove(battle.id)}>
          {cleared ? '목록에서 치우기' : '오늘은 그만두기'}
        </Button>
        {!cleared && (
          <p className="mt-2 text-center text-[12px] text-inkfaint">
            그만둬도 아무 일 없어. 언제든 다시 시작할 수 있어.
          </p>
        )}
      </div>
    </BottomSheet>
  )
}
