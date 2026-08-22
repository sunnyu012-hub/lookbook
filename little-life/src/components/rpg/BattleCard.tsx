import type { Battle, BattleDef } from '@/types'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { RarityBadge } from '@/components/rpg/RarityBadge'
import { cn } from '@/components/ui/cn'

/** BOSS 만 따로 표시한다. MONSTER 는 배지 없이 둔다 — 대부분이 몬스터라 붙이면 시끄럽다. */
export function BossBadge() {
  return (
    <span className="shrink-0 rounded-pill bg-coral-deep px-2 py-0.5 text-[10px] font-medium text-surface">
      보스
    </span>
  )
}

/** 남은 HP 를 막대와 숫자로 같이 보여준다. */
export function HpBar({ hp, maxHp, thickness = 'sm' }: { hp: number; maxHp: number; thickness?: 'sm' | 'md' }) {
  return (
    <div>
      <ProgressBar
        value={maxHp === 0 ? 0 : hp / maxHp}
        barClassName="bg-coral"
        thickness={thickness}
        aria-label={`남은 HP ${hp} / ${maxHp}`}
      />
      <p className="mt-1 font-game text-[10px] leading-none text-inkfaint">
        HP {hp} / {maxHp}
      </p>
    </div>
  )
}

interface BattleCardProps {
  battle: Battle
  onOpen: (battle: Battle) => void
}

/** 진행 중인 한 판. 눌러서 상세 시트를 연다. */
export function BattleCard({ battle, onOpen }: BattleCardProps) {
  const done = battle.actions.filter((a) => a.doneAt).length
  const cleared = battle.status === 'CLEARED'

  return (
    <button
      type="button"
      onClick={() => onOpen(battle)}
      className={cn(
        'flex w-full items-center gap-3 rounded-card border px-3.5 py-3.5 text-left',
        'transition-transform duration-150 ease-out active:scale-[0.98]',
        cleared ? 'border-leaf-soft bg-leaf-soft/40' : 'border-line bg-surface shadow-soft',
      )}
    >
      <span
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[24px]',
          cleared ? 'bg-leaf-soft' : 'bg-canvas',
        )}
      >
        {battle.icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              'truncate text-[15px] font-semibold',
              cleared ? 'text-inkdim line-through' : 'text-ink',
            )}
          >
            {battle.name}
          </span>
          {battle.kind === 'BOSS' && <BossBadge />}
        </span>

        {cleared ? (
          <span className="mt-1 block text-[11px] font-medium text-leaf-deep">
            끝냈어
          </span>
        ) : (
          <span className="mt-1.5 block">
            <HpBar hp={battle.hp} maxHp={battle.maxHp} />
          </span>
        )}
      </span>

      <span className="shrink-0 font-game text-[11px] text-inkfaint">
        {done}/{battle.actions.length}
      </span>
    </button>
  )
}

interface BattleDefCardProps {
  def: BattleDef
  onStart: (def: BattleDef) => void
}

/** 아직 시작하지 않은 몬스터·보스. 눌러야만 시작된다. */
export function BattleDefCard({ def, onStart }: BattleDefCardProps) {
  return (
    <button
      type="button"
      onClick={() => onStart(def)}
      className={cn(
        'flex w-full items-center gap-3 rounded-card border border-dashed border-line bg-surface/70 px-3.5 py-3.5 text-left',
        'transition-transform duration-150 ease-out active:scale-[0.98]',
      )}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-canvas text-[24px] opacity-80">
        {def.icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-semibold text-ink">{def.name}</span>
          {def.kind === 'BOSS' && <BossBadge />}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-inkdim">{def.description}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1">
          <CategoryBadge category={def.category} />
          <span className="font-game text-[10px] text-inkfaint">HP {def.maxHp}</span>
          <RarityBadge rarity={def.guaranteedRarity} />
        </span>
      </span>

      <span className="shrink-0 rounded-pill bg-sunken px-2.5 py-1 text-[11px] font-medium text-inkdim">
        시작
      </span>
    </button>
  )
}
